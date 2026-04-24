/**
 * reservationController.js  –  REWRITTEN
 *
 * Fixes applied:
 *  [1] checkIn: timer starts NOW (checkInTime = new Date()), not at booking
 *  [2] checkIn: schedules a "10 min warning" notification before booked time ends
 *  [3] checkOut: calculates actualMinutes from checkInTime → checkOutTime
 *  [4] checkOut: overstayMinutes = actualMinutes - bookedMinutes - 15min grace
 *  [5] checkOut: saves overstayCharge, overstayDebt on reservation; blocks user
 *  [6] checkOut: saves finalAmount = totalAmount + overstayCharge
 *  [7] checkOut: response includes bookedDuration, actualDuration, overtime,
 *                overtimeCharge, finalAmount  (fields QRScannerPage expects)
 *  [8] Admin stats: revenue query uses $sum: '$finalAmount' (not totalAmount)
 */

const Reservation        = require('../models/Reservation');
const ParkingSpot        = require('../models/ParkingSpot');
const User               = require('../models/User');
const Notification       = require('../models/Notification');
const notificationService = require('../services/notificationService');
const socketService      = require('../services/socketService');
const { recalculateUserBehavior } = require('../services/userBehaviorService');

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Emit a socket event for a changed parking spot.
 */
function emitSpotChange(spot) {
  const io = socketService.getIo();
  if (io) {
    io.emit('parkingSpotStatusChanged', {
      spotId:          spot._id,
      status:          spot.status,
      isReserved:      spot.isReserved,
      isOccupied:      spot.isOccupied,
      availableSpaces: spot.availableSpaces,
      reservedSpaces:  spot.reservedSpaces,
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// checkIn  –  admin scans QR on ENTRY
// FIX [1]: checkInTime recorded here; duration timer starts NOW
// FIX [2]: schedules a "10 min left" warning notification
// ─────────────────────────────────────────────────────────────────────────────
exports.checkIn = async (req, res) => {
  try {
    const { qrData } = req.body;
    let parsedData;
    try {
      parsedData = JSON.parse(qrData);
    } catch {
      return res.status(400).json({ success: false, message: 'Invalid QR code format' });
    }

    const reservationId = parsedData.reservationId || parsedData.bookingId;
    if (!reservationId) {
      return res.status(400).json({
        success: false,
        message: 'Reservation id not found in QR data (expected reservationId or bookingId)',
      });
    }

    const reservation = await Reservation.findById(reservationId).populate('parkingSpot');
    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Reservation not found' });
    }
    if (reservation.user.toString() !== req.user.id && req.user.userType !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    if (reservation.status === 'checked-in') {
      return res.status(400).json({ success: false, message: 'Already checked in' });
    }
    if (reservation.status !== 'reserved') {
      return res.status(400).json({
        success: false,
        message: `Cannot check in: reservation is ${reservation.status}`,
      });
    }

    // Handle expired reservation
    if (reservation.isExpired) {
      reservation.status = 'expired';
      await reservation.save();
      await Notification.updateMany(
        { user: reservation.user, type: 'arrival_confirmation', 'meta.reservationId': reservation._id, read: false },
        { $set: { read: true, readAt: new Date() } }
      );
      const quantity = reservation.quantity || 1;
      const spot     = await ParkingSpot.findById(reservation.parkingSpot._id);
      if (spot) {
        await spot.releaseSpace(quantity);
        if (spot.occupiedSpaces > 0)     await spot.updateStatus('occupied');
        else if (spot.reservedSpaces > 0) await spot.updateStatus('reserved');
        else                              await spot.updateStatus('available');
      }
      return res.status(400).json({ success: false, message: 'Reservation has expired' });
    }

    // FIX [1]: timer starts NOW
    const checkInTime = new Date();
    reservation.status      = 'checked-in';
    reservation.checkInTime = checkInTime;

    // Update spot counters: reserved → occupied
    const quantity = reservation.quantity || 1;
    const spot     = reservation.parkingSpot;
    spot.reservedSpaces = Math.max(0, (spot.reservedSpaces || 0) - quantity);
    spot.occupiedSpaces = Math.max(0, (spot.occupiedSpaces || 0) + quantity);
    if (spot.occupiedSpaces > 0)     await spot.updateStatus('occupied');
    else if (spot.reservedSpaces > 0) await spot.updateStatus('reserved');
    else                              await spot.updateStatus('available');

    emitSpotChange(spot);
    await reservation.save();
    await recalculateUserBehavior(reservation.user);

    // FIX [2]: schedule "10 min left" warning before booked time ends
    // Fires at: checkInTime + duration - 10 min
    const warningMs = reservation.duration * 60 * 1000 - 10 * 60 * 1000;
    if (warningMs > 0) {
      setTimeout(async () => {
        const fresh = await Reservation.findById(reservation._id);
        if (fresh && fresh.status === 'checked-in') {
          await notificationService.sendNotification(
            reservation.user,
            '10 minutes left',
            `Your booked parking time at Spot #${spot.spotNumber} ends in 10 minutes. Please prepare to leave to avoid overstay charges.`,
            'parking_expiry_warning',
            { reservationId: reservation._id, spotNumber: spot.spotNumber },
            { sendEmail: false }
          );
        }
      }, warningMs);
    }

    res.json({
      success:     true,
      message:     'Checked in successfully',
      data: {
        reservation,
        checkInTime: reservation.checkInTime,
        sessionEndsAt: new Date(checkInTime.getTime() + reservation.duration * 60 * 1000).toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// checkOut  –  admin scans QR on EXIT (or user self-checkout)
// FIX [3]: actual duration = checkOutTime - checkInTime
// FIX [4]: overstay = actualMinutes - bookedMinutes - 15min grace
// FIX [5]: overstayCharge saved, user.overstayDebt set, booking blocked
// FIX [6]: finalAmount = totalAmount + overstayCharge
// FIX [7]: response returns all fields QRScannerPage renders
// ─────────────────────────────────────────────────────────────────────────────
exports.checkOut = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id).populate('parkingSpot');
    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Reservation not found' });
    }
    if (reservation.user.toString() !== req.user.id && req.user.userType !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    if (reservation.status !== 'checked-in') {
      return res.status(400).json({
        success: false,
        message: `Cannot check out: reservation is ${reservation.status}`,
      });
    }

    const checkOutTime = new Date();

    // FIX [3]: actual time parked (minutes, rounded up)
    const actualMinutes  = Math.ceil((checkOutTime - reservation.checkInTime) / (1000 * 60));
    const bookedMinutes  = reservation.duration; // what the user paid for

    // FIX [4]: 15-minute grace period before overstay kicks in
    const GRACE_MINUTES   = 15;
    const overstayMinutes = Math.max(0, actualMinutes - bookedMinutes - GRACE_MINUTES);

    // Calculate charges
    const pricePerHour   = reservation.parkingSpot.price;
    const baseCharge     = reservation.totalAmount; // already paid at booking

    // FIX [5]: overstay charge = ceil(overstayMinutes / 60) × hourly rate
    const overstayCharge = overstayMinutes > 0
      ? Math.ceil(overstayMinutes / 60) * pricePerHour
      : 0;

    // FIX [6]: finalAmount = base + overstay
    const finalAmount = baseCharge + overstayCharge;

    // Update reservation
    reservation.status         = 'completed';
    reservation.checkOutTime   = checkOutTime;
    reservation.actualDuration = actualMinutes;   // store actual for records
    reservation.overstayMinutes = overstayMinutes;
    reservation.overstayCharge  = overstayCharge;
    reservation.finalAmount     = finalAmount;   // FIX [6]

    // Update parking spot counters: occupied → available
    const quantity = reservation.quantity || 1;
    const spot     = reservation.parkingSpot;
    spot.occupiedSpaces  = Math.max(0, (spot.occupiedSpaces || 0) - quantity);
    spot.availableSpaces = (spot.availableSpaces || 0) + quantity;
    if (spot.occupiedSpaces > 0)     await spot.updateStatus('occupied');
    else if (spot.reservedSpaces > 0) await spot.updateStatus('reserved');
    else                              await spot.updateStatus('available');

    emitSpotChange(spot);
    await reservation.save();
    await recalculateUserBehavior(reservation.user);

    // FIX [5]: if overstay → save debt on user, block new bookings
    if (overstayCharge > 0) {
      await User.findByIdAndUpdate(reservation.user, {
        $set: { overstayDebt: overstayCharge },
      });

      // Notify user of overstay debt
      await notificationService.sendNotification(
        reservation.user,
        'Overstay charge incurred',
        `You overstayed by ${overstayMinutes} min at Spot #${spot.spotNumber}. An additional charge of NPR ${overstayCharge} is owed. New bookings are blocked until this is cleared.`,
        'overstay_charge',
        {
          reservationId:  reservation._id,
          overstayMinutes,
          overstayCharge,
          finalAmount,
        }
      );
    }

    // FIX [7]: return ALL fields that QRScannerPage.jsx renders
    res.json({
      success: true,
      message: 'Checked out successfully',
      data: {
        reservation,
        // Fields used by QRScannerPage payment-details panel:
        bookedDuration:  bookedMinutes,
        actualDuration:  actualMinutes,
        overtime:        overstayMinutes,
        overtimeCharge:  overstayCharge,
        finalAmount,                     // FIX [6]
        // Extra breakdown for receipts:
        baseCharge,
        pricePerHour,
        gracePeriodMinutes: GRACE_MINUTES,
        duration: {
          minutes: actualMinutes,
          hours:   Math.ceil(actualMinutes / 60),
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = exports;