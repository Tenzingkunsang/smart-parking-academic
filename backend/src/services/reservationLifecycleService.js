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

const Reservation     = require('../models/Reservation');
const ParkingSpot     = require('../models/ParkingSpot');
const WaitlistEntry   = require('../models/WaitlistEntry');
const User            = require('../models/User');
const notificationService = require('./notificationService');
const socketService   = require('./socketService');
const logger          = require('../config/logger');
const { withTransaction } = require('../utils/withTransaction');

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
  // Bug HIGH-2: prefer a real transaction on replica sets, fall back gracefully
  // for standalone Mongo. Either way the $gte guard on availableSpaces is atomic
  // at the document level, so no two concurrent callers can both succeed.
  let resultReservation = null;
  let resultSpot = null;
  try {
    await withTransaction(async (session) => {
      const sessionOpt = session ? { session } : {};
      const reservation = session
        ? await Reservation.findById(reservationId).populate('parkingSpot').session(session)
        : await Reservation.findById(reservationId).populate('parkingSpot');

      if (!reservation) throw new Error('Reservation not found');
      if (reservation.status !== 'pending' || reservation.lifecycleStage !== 'booking') {
        throw new Error('Reservation already processed or active');
      }

      const qty = reservation.quantity || 1;

      const updatedSpot = await ParkingSpot.findOneAndUpdate(
        { _id: reservation.parkingSpot._id, availableSpaces: { $gte: qty } },
        { $inc: { availableSpaces: -qty, reservedSpaces: qty } },
        { new: true, ...sessionOpt }
      );
      if (!updatedSpot) throw new Error('Parking spot is no longer available');

      updateSpotStatusFlags(updatedSpot);
      await updatedSpot.save(sessionOpt);

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

      await reservation.save(sessionOpt);
      resultReservation = reservation;
      resultSpot = updatedSpot;
    });
  } catch (error) {
    logger.error('hold_spot_atomically_failed', { message: error.message, reservationId });
    throw error;
  }

  await emitSpot(resultSpot._id);
  return { reservation: resultReservation, parkingSpot: resultSpot };
}

/**
 * STAGE RELEASE: Handles No-Shows, Cancellations, or Completed sessions.
 *
 * ─── ROBUST RELEASE LOGIC ─────────────────────────────────────────────────
 * Determines if the reservation was checked-in or active based on its stage:
 *  - If checked-in/overstay: decrements occupiedSpaces, increments availableSpaces
 *  - If reserved/no-show: decrements reservedSpaces, increments availableSpaces
 * Both pathways update counters atomically and rebuild status flags.
 */
async function releaseReservedSpotAndPromote({ reservation, releaseReason = 'released', skipCounters = false, priorStatus = null }) {
  const qty = reservation.quantity || 1;

  // Bug H6: if the caller already mutated reservation.status (e.g. set it to 'cancelled'
  // before calling us), use the passed priorStatus to decide which counter to decrement.
  const statusForDecision = priorStatus || reservation.status;
  const wasCheckedIn = ['checked-in', 'overstay'].includes(statusForDecision) ||
                       ['active', 'overstay'].includes(reservation.lifecycleStage);

  // Bug H3: when the caller already decremented counters inside its own transaction,
  // skip the $inc to avoid double-release. We still rebuild status flags + promote waitlist.
  const spot = skipCounters
    ? await ParkingSpot.findById(reservation.parkingSpot)
    : await ParkingSpot.findByIdAndUpdate(
        reservation.parkingSpot,
        wasCheckedIn
          ? { $inc: { availableSpaces: qty, occupiedSpaces: -qty } }
          : { $inc: { availableSpaces: qty, reservedSpaces: -qty } },
        { new: true }
      );

  if (!spot) {
    logger.warn('release_spot_not_found', { parkingSpotId: reservation.parkingSpot, reservationId: reservation._id });
    return null;
  }

  // Rebuild status flags based on final counter states
  updateSpotStatusFlags(spot);
  await spot.save();

  logger.info('space_released', { 
    spotId: spot._id, 
    reservationId: reservation._id, 
    reason: releaseReason,
    wasCheckedIn,
    availableNow: spot.availableSpaces,
    reservedNow: spot.reservedSpaces,
    occupiedNow: spot.occupiedSpaces
  });

  // Waitlist promotion: find next eligible entry
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

    logger.info('waitlist_promoted', { entryId: nextEntry._id, reservationId: promotedReservation._id });

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
      logger.error('notification_failed_waitlist_promote', { message: notifErr.message });
    }
  }

  await emitSpot(spot._id);
  return spot;
}

/**
 * UNIFIED NO-SHOW PROCESSING
 * 
 * Handles the complete no-show lifecycle:
 *  1. Mark reservation as no-show with proper stage transitions
 *  2. Increment user violation count, apply penalty if >= 3 violations
 *  3. Release the held space and promote waitlist
 *  4. Recalculate user's punctuality behavior rate
 *  5. Broadcast status updates over Socket.io
 *  6. Send email/notification timeout alerts
 */
async function processNoShow(reservationId) {
  try {
    // Bug Task-4: race-safe transition. The reallocation watcher and the
    // scheduled-job worker can both fire for the same reservation. Using
    // findOneAndUpdate with a status filter means exactly one caller wins —
    // the loser receives `null` and exits cleanly without double-incrementing
    // violations or double-releasing the spot.
    const reservation = await Reservation.findOneAndUpdate(
      {
        _id: reservationId,
        status: { $in: ['reserved', 'pending'] },
      },
      {
        $set: {
          status: 'no-show',
          lifecycleStage: 'no_show',
          'noShowInfo.markedAt': new Date(),
          'noShowInfo.reason': 'grace_period_expired',
        },
      },
      { new: true }
    ).populate('user parkingSpot');

    if (!reservation) {
      // Either it doesn't exist or another worker already handled it.
      const existing = await Reservation.findById(reservationId).select('status');
      if (existing) {
        logger.info('process_no_show_already_processed', { reservationId, currentStatus: existing.status });
        return existing;
      }
      logger.warn('process_no_show_reservation_not_found', { reservationId });
      return null;
    }

    logger.info('reservation_marked_no_show', { reservationId });

    // Bug Task-3 + Task-4: violation increment and penalty flagging in a single
    // atomic op via aggregation pipeline. This avoids a read-modify-write race.
    const userUpdate = await User.findOneAndUpdate(
      { _id: reservation.user._id },
      [{
        $set: {
          violationCount: { $add: [{ $ifNull: ['$violationCount', 0] }, 1] },
          penaltyActive: {
            $cond: [
              { $gte: [{ $add: [{ $ifNull: ['$violationCount', 0] }, 1] }, 3] },
              true,
              { $ifNull: ['$penaltyActive', false] },
            ],
          },
          penaltyExpiry: {
            $cond: [
              {
                $and: [
                  { $gte: [{ $add: [{ $ifNull: ['$violationCount', 0] }, 1] }, 3] },
                  { $ne: [{ $ifNull: ['$penaltyActive', false] }, true] },
                ],
              },
              new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              { $ifNull: ['$penaltyExpiry', null] },
            ],
          },
        },
      }],
      { new: true }
    );
    const user = userUpdate;
    if (user?.penaltyActive) {
      logger.warn('user_penalty_applied', {
        userId: user._id,
        violationCount: user.violationCount,
        penaltyExpiresAt: user.penaltyExpiry,
      });
    }

    // Release the held space and promote waitlist
    await releaseReservedSpotAndPromote({ reservation, releaseReason: 'no_show' });

    // Recalculate user's punctuality behavior
    if (user) {
      const { recalculateUserBehavior } = require('./userBehaviorService');
      await recalculateUserBehavior(user._id);
    }

    // Broadcast real-time status update
    const io = socketService.getIo();
    if (io) {
      io.emit('reservationStatusChanged', {
        reservationId: reservation._id,
        status: 'no-show',
        lifecycleStage: 'no_show',
        violationCount: user?.violationCount,
        penaltyActive: user?.penaltyActive
      });
    }

    // Send timeout notification
    try {
      await notificationService.sendNotification(
        reservation.user._id,
        'Reservation Expired - No Show',
        `You did not arrive within the 15-minute grace period for Spot #${reservation.parkingSpot?.spotNumber || 'N/A'}. Your spot has been released. Violation count: ${user?.violationCount || 0}/3`,
        'arrival_timeout',
        { 
          reservationId: reservation._id, 
          violationCount: user?.violationCount,
          spotNumber: reservation.parkingSpot?.spotNumber,
          date: reservation.scheduledArrival
        }
      );
    } catch (notifErr) {
      logger.error('notification_failed_no_show', { 
        reservationId, 
        message: notifErr.message 
      });
    }

    return reservation;

  } catch (error) {
    logger.error('process_no_show_error', { 
      reservationId, 
      message: error.message, 
      stack: error.stack 
    });
    throw error;
  }
}

module.exports = {
  holdSpotAtomically,
  releaseReservedSpotAndPromote,
  updateSpotStatusFlags,
  processNoShow,
};