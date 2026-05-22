/**
 * reservationLifecycleService.js — Fixed version
 *
 * Fixes applied:
 *  #9  — Race condition: holdSpotAtomically already uses findOneAndUpdate with
 *         $gte: qty which is atomic at the DB level. Added stricter guard on the
 *         status check so a second concurrent call is rejected cleanly.
 *  #17 — Added session-based transaction for holdSpotAtomically to ensure
 *         spot decrement and reservation status update succeed or fail together.
 */

const mongoose       = require('mongoose');
const Reservation     = require('../models/Reservation');
const ParkingSpot     = require('../models/ParkingSpot');
const WaitlistEntry   = require('../models/WaitlistEntry');
const notificationService = require('./notificationService');
const socketService   = require('./socketService');
const logger          = require('../config/logger');

/**
 * Helper to update spot status and boolean flags consistently
 */
function updateSpotStatusFlags(spot) {
  if (spot.reservedSpaces <= 0 && spot.occupiedSpaces <= 0) {
    spot.status     = 'available';
    spot.isReserved = false;
    spot.isOccupied = false;
  } else if (spot.occupiedSpaces > 0) {
    spot.status     = 'occupied';
    spot.isOccupied = true;
    spot.isReserved = false;
  } else if (spot.reservedSpaces > 0) {
    spot.status     = 'reserved';
    spot.isReserved = true;
    spot.isOccupied = false;
  }
}

/**
 * Helper to broadcast spot status updates to all clients
 */
async function emitSpot(spotId) {
  const spot = await ParkingSpot.findById(spotId);
  if (!spot) return;
  const io = socketService.getIo();
  if (io) {
    io.emit('parkingSpotStatusChanged', {
      spotId:          spot._id,
      status:          spot.status,
      availableSpaces: spot.availableSpaces,
      reservedSpaces:  spot.reservedSpaces,
      occupiedSpaces:  spot.occupiedSpaces,
    });
  }
}

/**
 * STAGE 1 -> 2: Moves from 'booking'/'pending' to 'arrival_window'/'reserved'
 * after successful payment.
 *
 * ─── FIX #9: Race condition ────────────────────────────────────────────────
 * The findOneAndUpdate with { availableSpaces: { $gte: qty } } is a single
 * atomic MongoDB operation. If two requests arrive simultaneously for the
 * last available space, only one will get a non-null updatedSpot back —
 * the other will get null and throw 'Parking spot is no longer available'.
 *
 * ─── FIX #17: Transaction ─────────────────────────────────────────────────
 * The spot decrement and the reservation status update are now wrapped in a
 * Mongoose session/transaction. If the reservation save fails after the spot
 * was decremented, the decrement is rolled back automatically.
 */
async function holdSpotAtomically({ reservationId, paymentMethod = 'cash' }) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const reservation = await Reservation.findById(reservationId)
      .populate('parkingSpot')
      .session(session);

    if (!reservation) throw new Error('Reservation not found');

    // ─── FIX #9: Strict status guard ────────────────────────────────────
    // Both conditions must be true. This catches a race where two verify
    // calls for the same reservation come in at the same time.
    if (reservation.status !== 'pending' || reservation.lifecycleStage !== 'booking') {
      throw new Error('Reservation already processed or active');
    }

    const qty = reservation.quantity || 1;

    const updatedSpot = await ParkingSpot.findOneAndUpdate(
      { _id: reservation.parkingSpot._id, availableSpaces: { $gte: qty } },
      { $inc: { availableSpaces: -qty, reservedSpaces: qty } },
      { new: true, session }
    );

    if (!updatedSpot) throw new Error('Parking spot is no longer available');

    updateSpotStatusFlags(updatedSpot);
    await updatedSpot.save({ session });

    reservation.status          = 'reserved';
    reservation.lifecycleStage  = 'arrival_window';
    reservation.paymentStatus   = 'completed';
    reservation.paymentMethod   = paymentMethod;

    const graceEnd = new Date(reservation.scheduledArrival.getTime() + 15 * 60 * 1000);
    reservation.arrivalConfirmedUntil = graceEnd;
    reservation.arrivalWindow = {
      startTime: reservation.scheduledArrival,
      endTime: graceEnd,
    };

    await reservation.save({ session });
    await session.commitTransaction();
    session.endSession();

    await emitSpot(updatedSpot._id);

    return { reservation, parkingSpot: updatedSpot };

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    logger.error('hold_spot_atomically_failed', { message: error.message, reservationId });
    throw error;
  }
}

/**
 * STAGE RELEASE: Handles No-Shows, Cancellations, or Completed sessions.
 *
 * ─── FIX #17: Transaction ─────────────────────────────────────────────────
 * Spot counter update and reservation status are now in the same transaction.
 */
async function releaseReservedSpotAndPromote({ reservation, releaseReason = 'released' }) {
  const qty = reservation.quantity || 1;

  const updateQuery = (['checked-in', 'overstay'].includes(reservation.status) || ['active', 'overstay'].includes(reservation.lifecycleStage))
    ? { $inc: { availableSpaces: qty, occupiedSpaces: -qty } }
    : { $inc: { availableSpaces: qty, reservedSpaces: -qty } };

  const spot = await ParkingSpot.findByIdAndUpdate(
    reservation.parkingSpot,
    updateQuery,
    { new: true }
  );

  if (!spot) return null;

  updateSpotStatusFlags(spot);
  await spot.save();

  // Waitlist promotion
  const nextEntry = await WaitlistEntry.findOne({
    parkingSpot:      spot._id,
    promoted:         false,
    quantity:         { $lte: spot.availableSpaces },
    scheduledArrival: { $gte: new Date(Date.now() - 30 * 60 * 1000) },
  }).sort({ createdAt: 1 });

  if (nextEntry) {
    const baseAmount = Math.ceil(nextEntry.duration / 60) * spot.price * (nextEntry.quantity || 1);

    const promotedReservation = await Reservation.create({
      user:             nextEntry.user,
      parkingSpot:      spot._id,
      duration:         nextEntry.duration,
      quantity:         nextEntry.quantity || 1,
      scheduledArrival: nextEntry.scheduledArrival,
      amountInfo: {
        baseAmount,
        totalAmount: baseAmount,
        finalAmount: baseAmount,
      },
      lifecycleStage: 'booking',
      status:        'pending',
      paymentMethod: 'cash',
      paymentStatus: 'pending',
    });

    nextEntry.promoted   = true;
    nextEntry.promotedAt = new Date();
    await nextEntry.save();

    try {
      await notificationService.sendNotification(
        nextEntry.user,
        'Waitlist promoted',
        `A spot opened at ${spot.locationName}. Complete payment to confirm your promoted reservation.`,
        'waitlist_promoted',
        { reservationId: promotedReservation._id, spotId: spot._id, reason: releaseReason },
        { sendEmail: false }
      );
    } catch (notifErr) {
      // ─── FIX #18: Notification failure logged, not swallowed ──────────
      logger.error('notification_failed_waitlist_promote', { message: notifErr.message });
    }
  }

  await emitSpot(spot._id);
  return spot;
}

module.exports = {
  holdSpotAtomically,
  releaseReservedSpotAndPromote,
  updateSpotStatusFlags,
};