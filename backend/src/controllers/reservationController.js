/**
 * reservationController.js — Fixed version
 *
 * Fixes applied:
 *  #4  — Overstay NaN: checkInTime could be null/undefined → guarded
 *  #14 — Inconsistent billing timestamps → always use reservation.checkInTime (set at QR scan)
 *  #3  — checkIn validates qrData is present and parseable before proceeding
 */

const Reservation = require('../models/Reservation');
const ParkingSpot = require('../models/ParkingSpot');
const User = require('../models/User');
const notificationService = require('../services/notificationService');
const socketService = require('../services/socketService');
const { recalculateUserBehavior } = require('../services/userBehaviorService');
const { updateSpotStatusFlags } = require('../services/reservationLifecycleService');
const logger = require('../config/logger');

// ─── Helper: Sync Admin Dashboard ────────────────────────────────────────────
const _emitSpotChange = (spot) => {
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
};

// ─── STAGE 1 -> 2: CONFIRM ARRIVAL ───────────────────────────────────────────
exports.confirmArrival = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id).populate('parkingSpot');
    if (!reservation) return res.status(404).json({ success: false, message: 'Reservation not found' });

    // ─── FIX #8: Authorization ────────────────────────────────────────────
    if (reservation.user.toString() !== req.user.id && req.user.userType !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (reservation.lifecycleStage !== 'booking') {
      return res.status(400).json({ success: false, message: 'Already confirmed or active' });
    }

    reservation.lifecycleStage = 'arrival_window';
    reservation.status = 'reserved';

    const gracePeriodEnd = new Date(reservation.scheduledArrival.getTime() + 15 * 60 * 1000);
    reservation.arrivalWindow.confirmedAt = new Date();
    reservation.arrivalWindow.endTime = gracePeriodEnd;
    reservation.arrivalConfirmedUntil = gracePeriodEnd;

    await reservation.save();

    try {
      await notificationService.sendNotification(
        reservation.user,
        'Spot Secured',
        `We've confirmed you're on your way! We'll hold Spot #${reservation.parkingSpot.spotNumber} until ${gracePeriodEnd.toLocaleTimeString()}.`,
        'arrival_confirmed',
        { spotNumber: reservation.parkingSpot.spotNumber }
      );
    } catch (notifErr) {
      // ─── FIX #18: Notification failures logged, not swallowed silently ───
      logger.error('notification_failed_confirm_arrival', { message: notifErr.message });
    }

    res.json({ success: true, message: 'Arrival confirmed. Grace period active.' });
  } catch (error) {
    logger.error('confirm_arrival_error', { message: error.message });
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ─── STAGE 2 -> 3: CHECK-IN (QR SCAN) ────────────────────────────────────────
exports.checkIn = async (req, res) => {
  try {
    // ─── FIX #3: Validate qrData is present ──────────────────────────────
    const { qrData } = req.body;
    if (!qrData) {
      return res.status(400).json({ success: false, message: 'qrData is required' });
    }

    let parsedData;
    try {
      parsedData = JSON.parse(qrData);
    } catch {
      return res.status(400).json({ success: false, message: 'Invalid QR code format' });
    }

    const reservationId = parsedData.reservationId || parsedData.bookingId;
    if (!reservationId) {
      return res.status(400).json({ success: false, message: 'Reservation ID not found in QR data' });
    }

    const reservation = await Reservation.findById(reservationId).populate('parkingSpot');
    if (!reservation) return res.status(404).json({ success: false, message: 'Reservation not found' });

    if (reservation.isExpired) {
      reservation.status = 'no-show';
      reservation.lifecycleStage = 'no_show';
      await reservation.save();
      return res.status(400).json({ success: false, message: 'Grace period expired. Spot released.' });
    }

    if (reservation.status === 'checked-in') {
      return res.status(400).json({ success: false, message: 'User already checked in' });
    }

    const now = new Date();

    reservation.lifecycleStage = 'active';
    reservation.status = 'checked-in';
    reservation.checkInTime = now;

    reservation.activeSession = {
      qrScannedAt: now,
      adminScannedBy: req.user.id,
      billingStartTime: now,
      estimatedCheckOut: new Date(now.getTime() + reservation.duration * 60000),
    };

    const spot = reservation.parkingSpot;
    spot.reservedSpaces = Math.max(0, spot.reservedSpaces - (reservation.quantity || 1));
    spot.occupiedSpaces += (reservation.quantity || 1);

    updateSpotStatusFlags(spot);
    await spot.save();
    await reservation.save();
    await recalculateUserBehavior(reservation.user);

    _emitSpotChange(spot);
    socketService.emitToUser(reservation.user.toString(), 'reservationStatusChanged', {
      reservationId: reservation._id,
      stage: 'active',
      checkInTime: now,
    });

    res.json({ success: true, message: 'Check-in successful. Timer started.', data: reservation });
  } catch (error) {
    logger.error('checkin_error', { message: error.message });
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ─── UNIFIED: HANDLE QR SCAN (Check-In or Check-Out) ─────────────────────────
exports.handleScan = async (req, res) => {
  try {
    const { qrData } = req.body;
    if (!qrData) return res.status(400).json({ success: false, message: 'qrData is required' });

    let parsedData;
    try {
      parsedData = JSON.parse(qrData);
    } catch {
      return res.status(400).json({ success: false, message: 'Invalid QR code format' });
    }

    const reservationId = parsedData.reservationId || parsedData.bookingId;
    if (!reservationId) return res.status(400).json({ success: false, message: 'Reservation ID not found' });

    const reservation = await Reservation.findById(reservationId).populate('parkingSpot');
    if (!reservation) return res.status(404).json({ success: false, message: 'Reservation not found' });

    // ROUTING: If not checked in → Check-In. If already checked in → Check-Out.
    if (reservation.status === 'reserved' || (reservation.status === 'pending' && reservation.paymentStatus === 'completed')) {
      return exports.checkIn(req, res);
    } else if (reservation.status === 'checked-in' || reservation.status === 'overstay') {
      req.params.id = reservationId;
      return exports.checkOut(req, res);
    } else {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot scan: Reservation is in '${reservation.status}' state` 
      });
    }
  } catch (error) {
    logger.error('handle_scan_error', { message: error.message });
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ─── STAGE 3 -> END: CHECK-OUT ───────────────────────────────────────────────
exports.checkOut = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id).populate('parkingSpot');
    if (!reservation || !['checked-in', 'overstay'].includes(reservation.status)) {
      return res.status(400).json({ success: false, message: 'Invalid check-out request' });
    }

    // ─── FIX #4: Guard against missing checkInTime to prevent NaN charges ───
    if (!reservation.checkInTime) {
      logger.error('checkout_missing_checkin_time', { reservationId: reservation._id });
      return res.status(400).json({
        success: false,
        message: 'Check-in time is missing on this reservation. Please contact support.',
      });
    }

    const checkOutTime = new Date();
    const actualMinutes = Math.ceil((checkOutTime - reservation.checkInTime) / (1000 * 60));
    const bookedMinutes = reservation.duration;

    // ─── FIX #4: Ensure actualMinutes is a valid number before calculating ─
    if (!isFinite(actualMinutes) || actualMinutes < 0) {
      logger.error('checkout_invalid_duration', { reservationId: reservation._id, actualMinutes });
      return res.status(500).json({
        success: false,
        message: 'Could not calculate parking duration. Please contact support.',
      });
    }

    const overstayMinutes = Math.max(0, actualMinutes - bookedMinutes - 15);
    const spotPrice = reservation.parkingSpot?.price;

    // ─── FIX #4: Guard against missing spot price ─────────────────────────
    if (overstayMinutes > 0 && (!spotPrice || !isFinite(spotPrice))) {
      logger.error('checkout_missing_spot_price', { reservationId: reservation._id });
      return res.status(500).json({
        success: false,
        message: 'Cannot calculate overstay charge — spot price unavailable. Please contact support.',
      });
    }

    const overstayCharge = overstayMinutes > 0
      ? Math.ceil(overstayMinutes / 60) * spotPrice
      : 0;

    const baseTotal = reservation.amountInfo?.totalAmount || 0;
    const finalAmount = baseTotal + overstayCharge;

    reservation.status = 'completed';
    reservation.lifecycleStage = 'completed';
    reservation.checkOutTime = checkOutTime;
    reservation.actualDuration = actualMinutes;
    reservation.amountInfo.finalAmount = finalAmount;
    reservation.overstayInfo = {
      overstayMinutes,
      overstayCharge,
      overstayPaid: overstayCharge === 0,
    };

    const spot = reservation.parkingSpot;
    spot.occupiedSpaces = Math.max(0, spot.occupiedSpaces - (reservation.quantity || 1));
    spot.availableSpaces += (reservation.quantity || 1);

    updateSpotStatusFlags(spot);
    await spot.save();
    await reservation.save();

    if (overstayCharge > 0) {
      await User.findByIdAndUpdate(reservation.user, { $inc: { overstayDebt: overstayCharge } });
      try {
        await notificationService.sendNotification(
          reservation.user,
          'Overstay Charge',
          `You parked for ${actualMinutes} mins. An overstay charge of NPR ${overstayCharge} has been added to your account.`,
          'overstay_alert',
          { overstayCharge }
        );
      } catch (notifErr) {
        // ─── FIX #18: Notification failure logged, not swallowed ──────────
        logger.error('notification_failed_overstay', { message: notifErr.message });
      }
    }

    _emitSpotChange(spot);
    res.json({
      success: true,
      message: 'Check-out complete',
      summary: {
        parkedTime: actualMinutes,
        overstay: overstayMinutes,
        additionalCharge: overstayCharge,
        finalTotal: finalAmount,
      },
    });
  } catch (error) {
    logger.error('checkout_error', { message: error.message });
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};