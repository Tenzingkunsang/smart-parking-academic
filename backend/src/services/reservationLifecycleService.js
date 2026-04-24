const Reservation = require('../models/Reservation');
const ParkingSpot = require('../models/ParkingSpot');
const WaitlistEntry = require('../models/WaitlistEntry');
const notificationService = require('./notificationService');
const socketService = require('./socketService');

async function emitSpot(spotId) {
  const spot = await ParkingSpot.findById(spotId);
  if (!spot) return;
  const io = socketService.getIo();
  if (io) {
    io.emit('parkingSpotStatusChanged', {
      spotId: spot._id,
      status: spot.status,
      availableSpaces: spot.availableSpaces,
      reservedSpaces: spot.reservedSpaces,
      occupiedSpaces: spot.occupiedSpaces,
    });
  }
}

async function holdSpotAtomically({ reservationId, paymentMethod = 'cash' }) {
  const reservation = await Reservation.findById(reservationId).populate('parkingSpot');
  if (!reservation) throw new Error('Reservation not found');
  if (reservation.status !== 'pending') throw new Error('Reservation already processed');

  const qty = reservation.quantity || 1;
  const updatedSpot = await ParkingSpot.findOneAndUpdate(
    { _id: reservation.parkingSpot._id, availableSpaces: { $gte: qty } },
    {
      $inc: { availableSpaces: -qty, reservedSpaces: qty },
      $set: { isReserved: true, status: 'reserved' },
    },
    { new: true }
  );
  if (!updatedSpot) throw new Error('Parking spot is no longer available');

  reservation.status = 'reserved';
  reservation.paymentStatus = 'completed';
  reservation.paymentMethod = paymentMethod;
  reservation.arrivalConfirmedUntil = new Date(reservation.scheduledArrival.getTime() + 15 * 60 * 1000);
  await reservation.save();

  await emitSpot(updatedSpot._id);
  return { reservation, parkingSpot: updatedSpot };
}

async function releaseReservedSpotAndPromote({ reservation, releaseReason = 'released' }) {
  const qty = reservation.quantity || 1;
  const spot = await ParkingSpot.findByIdAndUpdate(
    reservation.parkingSpot,
    {
      $inc: { availableSpaces: qty, reservedSpaces: -qty },
    },
    { new: true }
  );
  if (!spot) return null;

  if (spot.reservedSpaces <= 0 && spot.occupiedSpaces <= 0) {
    spot.status = 'available';
    spot.isReserved = false;
    spot.isOccupied = false;
  } else if (spot.reservedSpaces > 0) {
    spot.status = 'reserved';
    spot.isReserved = true;
  }
  await spot.save();

  const nextEntry = await WaitlistEntry.findOne({
    parkingSpot: spot._id,
    promoted: false,
    quantity: { $lte: spot.availableSpaces },
    scheduledArrival: { $gte: new Date(Date.now() - 30 * 60 * 1000) },
  }).sort({ createdAt: 1 });

  if (nextEntry) {
    const totalAmount = Math.ceil(nextEntry.duration / 60) * spot.price * (nextEntry.quantity || 1);
    const promotedReservation = await Reservation.create({
      user: nextEntry.user,
      parkingSpot: spot._id,
      duration: nextEntry.duration,
      quantity: nextEntry.quantity || 1,
      scheduledArrival: nextEntry.scheduledArrival,
      totalAmount,
      finalAmount: totalAmount,
      status: 'pending',
      paymentMethod: 'cash',
      paymentStatus: 'pending',
    });
    nextEntry.promoted = true;
    nextEntry.promotedAt = new Date();
    await nextEntry.save();
    await notificationService.sendNotification(
      nextEntry.user,
      'Waitlist promoted',
      `A spot opened at ${spot.locationName}. Complete payment to confirm your promoted reservation.`,
      'waitlist_promoted',
      { reservationId: promotedReservation._id, spotId: spot._id, reason: releaseReason },
      { sendEmail: false }
    );
  }

  await emitSpot(spot._id);
  return spot;
}

module.exports = {
  holdSpotAtomically,
  releaseReservedSpotAndPromote,
};
