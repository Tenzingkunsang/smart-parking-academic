/**
 * reservationRoutes.js  –  REWRITTEN
 *
 * Fixes applied:
 *  [1] Booking requires scheduledArrival (date+time picked by user)
 *  [2] totalAmount set at booking; finalAmount calculated at checkout (base + overstay)
 *  [3] overstayMinutes / overstayCharge / overstayDebt fields populated on checkout
 *  [4] User blocked from new bookings while overstayDebt > 0
 *  [5] QRScannerPage fields (bookedDuration, actualDuration, overtime, overtimeCharge,
 *      finalAmount) are all returned by the checkout response
 *  [6] Admin stats now sums finalAmount (not totalAmount)
 *  [7] Arrival notification references scheduledArrival, not reservationTime
 */

const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');

const Reservation   = require('../models/Reservation');
const ParkingSpot   = require('../models/ParkingSpot');
const User          = require('../models/User');
const Notification  = require('../models/Notification');
const notificationService = require('../services/notificationService');
const socketService       = require('../services/socketService');
const WaitlistEntry = require('../models/WaitlistEntry');
const jobSchedulerService = require('../services/jobSchedulerService');
const { holdSpotAtomically, releaseReservedSpotAndPromote } = require('../services/reservationLifecycleService');
const reservationController = require('../controllers/reservationController');
const { protect } = require('../middleware/auth');

// ─────────────────────────────────────────────────────────────────────────────
// POST /reservations/create
// Creates a PENDING reservation (no spot held yet). Requires scheduledArrival.
// FIX [1]: user now picks date + time + duration in the frontend BookingModal.
// FIX [4]: blocks booking if user has unpaid overstay debt.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/create', protect, async (req, res) => {
  try {
    const { parkingSpotId, duration, quantity = 1, scheduledArrival } = req.body;

    // FIX [1]: scheduledArrival is required
    if (!scheduledArrival) {
      return res.status(400).json({
        success: false,
        message: 'scheduledArrival (ISO date string) is required',
      });
    }
    const arrivalDate = new Date(scheduledArrival);
    if (isNaN(arrivalDate.getTime()) || arrivalDate <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'scheduledArrival must be a valid future date/time',
      });
    }

    // FIX [4]: block booking if user owes overstay debt
    const user = await User.findById(req.user.id);
    if (user.overstayDebt && user.overstayDebt > 0) {
      return res.status(403).json({
        success: false,
        message: `You have an unpaid overstay debt of NPR ${user.overstayDebt}. Please clear it before making a new booking.`,
        overstayDebt: user.overstayDebt,
      });
    }

    const parkingSpot = await ParkingSpot.findById(parkingSpotId);
    if (!parkingSpot) {
      return res.status(404).json({ success: false, message: 'Parking spot not found' });
    }
    if (parkingSpot.availableSpaces < quantity) {
      return res.status(400).json({
        success: false,
        message: `Only ${parkingSpot.availableSpaces} spaces available`,
      });
    }

    const hours = Math.ceil(duration / 60);
    // FIX [2]: totalAmount is the pre-paid base amount; finalAmount set at checkout
    const totalAmount = hours * parkingSpot.price * quantity;

    const reservation = new Reservation({
      user:             req.user.id,
      parkingSpot:      parkingSpotId,
      duration,         // booked minutes
      quantity,
      scheduledArrival: arrivalDate,   // FIX [1]
      totalAmount,                     // FIX [2]: pre-paid base
      finalAmount:      totalAmount,   // FIX [6]: will be updated at checkout
      status:           'pending',
    });
    await reservation.save();

    res.json({
      success: true,
      data: {
        reservationId: reservation._id,
        totalAmount,
        duration,
        scheduledArrival: arrivalDate,
      },
    });
  } catch (error) {
    console.error('Create reservation error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /reservations/confirm/:reservationId
// Called after Khalti payment verification (or cash). Marks spot as reserved.
// FIX [7]: arrival notification uses scheduledArrival, not reservationTime.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/confirm/:reservationId', protect, async (req, res) => {
  try {
    const { reservationId } = req.params;
    const { paymentMethod } = req.body;
    const normalizedPaymentMethod = paymentMethod === 'pay_on_spot' ? 'cash' : paymentMethod;

    if (normalizedPaymentMethod === 'khalti') {
      return res.status(400).json({
        success: false,
        message: 'Use Khalti verify endpoint to confirm this reservation',
      });
    }

    const { reservation, parkingSpot } = await holdSpotAtomically({
      reservationId,
      paymentMethod: normalizedPaymentMethod || 'cash',
    });

    // Generate QR code
    const qrData = JSON.stringify({
      reservationId: reservation._id.toString(),
      bookingId:     reservation._id.toString(),
      spotNumber:    parkingSpot.spotNumber,
      location:      parkingSpot.locationName,
    });
    reservation.qrCodeData = await QRCode.toDataURL(qrData);
    await reservation.save();
    await jobSchedulerService.scheduleReservationJobs(reservation);

    await User.findByIdAndUpdate(req.user.id, { $inc: { totalBookings: 1 } });

    // Real-time socket update
    const io = socketService.getIo();
    if (io) {
      io.emit('parkingSpotStatusChanged', {
        spotId:          parkingSpot._id,
        status:          'reserved',
        availableSpaces: parkingSpot.availableSpaces,
        reservedSpaces:  parkingSpot.reservedSpaces,
      });
    }

    // Confirmation notification
    await notificationService.sendNotification(
      req.user.id,
      'Reservation confirmed',
      `Your parking spot (Spot #${parkingSpot.spotNumber}) is confirmed for ${reservation.scheduledArrival.toLocaleString()}. Scan the QR code on arrival.`,
      'reservation_confirmed',
      {
        spotNumber:       parkingSpot.spotNumber,
        duration:         reservation.duration,
        amount:           reservation.totalAmount,
        scheduledArrival: reservation.scheduledArrival.toISOString(),
        paymentMethod: normalizedPaymentMethod || 'cash',
      }
    );

    res.json({ success: true, data: reservation });
  } catch (error) {
    console.error('Confirm error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /reservations/:reservationId/arrival-response
// User replies "coming" or "not_coming" to the pre-arrival notification.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:reservationId/arrival-response', protect, async (req, res) => {
  try {
    const { reservationId } = req.params;
    const { response } = req.body; // 'coming' | 'not_coming'

    if (!['coming', 'not_coming'].includes(response)) {
      return res.status(400).json({ success: false, message: 'Invalid response value' });
    }

    const reservation = await Reservation.findById(reservationId).populate('parkingSpot');
    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Reservation not found' });
    }
    if (reservation.user.toString() !== req.user.id && req.user.userType !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    if (reservation.status !== 'reserved' || reservation.checkInTime) {
      return res.status(400).json({ success: false, message: 'Reservation is not active' });
    }

    const graceMs = 15 * 60 * 1000;

    if (response === 'coming') {
      // Extend the grace window from now
      reservation.arrivalConfirmedUntil = new Date(Date.now() + graceMs);
      await reservation.save();
      await jobSchedulerService.cancelReservationJobs(reservation._id);
      await jobSchedulerService.scheduleReservationJobs(reservation);

      await Notification.updateMany(
        { user: req.user.id, type: 'arrival_confirmation', 'meta.reservationId': reservation._id, read: false },
        { $set: { read: true, readAt: new Date() } }
      );
      await notificationService.sendNotification(
        req.user.id,
        'Arrival confirmed',
        'Thanks! Your spot is held. Check in with your QR code when you arrive.',
        'arrival_confirmation',
        { reservationId: reservation._id, expiresAt: reservation.arrivalConfirmedUntil.toISOString() },
        { sendEmail: false }
      );
      return res.json({ success: true, data: { arrivalConfirmedUntil: reservation.arrivalConfirmedUntil } });
    }

    // not_coming → release spot immediately
    reservation.status = 'no-show';
    const quantity    = reservation.quantity || 1;
    const parkingSpot = reservation.parkingSpot;
    if (parkingSpot) await releaseReservedSpotAndPromote({ reservation, releaseReason: 'arrival_not_coming' });
    await Notification.updateMany(
      { user: req.user.id, type: 'arrival_confirmation', 'meta.reservationId': reservation._id, read: false },
      { $set: { read: true, readAt: new Date() } }
    );
    await notificationService.sendNotification(
      req.user.id,
      'Spot released',
      'You told us you are not coming. Your parking spot has been released.',
      'arrival_timeout',
      { reservationId: reservation._id, action: 'not_coming' },
      { sendEmail: false }
    );
    await reservation.save();
    await jobSchedulerService.cancelReservationJobs(reservation._id);
    return res.json({ success: true });
  } catch (error) {
    console.error('Arrival response error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /reservations/pending/:reservationId  – cancel before payment
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/pending/:reservationId', protect, async (req, res) => {
  try {
    await Reservation.findByIdAndDelete(req.params.reservationId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Backward-compatible alias for older frontend clients.
router.post('/create-pending', protect, async (req, res) => {
  req.url = '/create';
  return router.handle(req, res);
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /reservations/checkin   – admin QR scan on ENTRY
// FIX [1]: checkInTime = NOW (timer starts here, not at booking)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/checkin', protect, reservationController.checkIn);

// ─────────────────────────────────────────────────────────────────────────────
// POST /reservations/:id/checkout   – user-initiated checkout by reservation id
// POST /reservations/checkout       – admin QR scan on EXIT
// FIX [1][2][3][5][6]: overstay logic, debt, correct field names
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:id/checkout', protect, reservationController.checkOut);

router.post('/checkout', protect, async (req, res, next) => {
  try {
    const { qrData } = req.body || {};
    let parsedData;
    try {
      parsedData = JSON.parse(qrData || '');
    } catch {
      return res.status(400).json({ success: false, message: 'Invalid QR code format' });
    }
    const rid = parsedData.reservationId || parsedData.bookingId;
    if (!rid) {
      return res.status(400).json({ success: false, message: 'Reservation id not found in QR data' });
    }
    req.params.id = rid;
    return reservationController.checkOut(req, res, next);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /reservations/session  – active checked-in session for home screen timer
// ─────────────────────────────────────────────────────────────────────────────
router.get('/session', protect, async (req, res) => {
  try {
    const reservation = await Reservation.findOne({
      user:   req.user.id,
      status: 'checked-in',
    }).populate('parkingSpot').sort({ checkInTime: -1 });

    if (!reservation || !reservation.checkInTime) {
      return res.json({ success: true, data: null });
    }

    // Session end = checkInTime + bookedDuration
    const sessionEndsAt = new Date(
      reservation.checkInTime.getTime() + reservation.duration * 60 * 1000
    );

    return res.json({
      success: true,
      data: { reservation, sessionEndsAt: sessionEndsAt.toISOString() },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /reservations/my  – user's own reservation history
// ─────────────────────────────────────────────────────────────────────────────
router.get('/my', protect, async (req, res) => {
  try {
    const reservations = await Reservation.find({
      user:   req.user.id,
      status: { $in: ['reserved', 'checked-in', 'completed'] },
    }).populate('parkingSpot').sort('-createdAt');
    res.json({ success: true, data: reservations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /reservations/:id/cancel  – cancel a confirmed reservation
// ─────────────────────────────────────────────────────────────────────────────
router.put('/:id/cancel', protect, async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id).populate('parkingSpot');
    if (!reservation) return res.status(404).json({ success: false });
    if (reservation.status !== 'reserved') {
      return res.status(400).json({ success: false, message: 'Cannot cancel this reservation' });
    }

    reservation.status = 'cancelled';
    await reservation.save();
    await releaseReservedSpotAndPromote({ reservation, releaseReason: 'user_cancelled' });
    await jobSchedulerService.cancelReservationJobs(reservation._id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/waitlist', protect, async (req, res) => {
  try {
    const { parkingSpotId, scheduledArrival, duration = 60, quantity = 1 } = req.body || {};
    if (!parkingSpotId || !scheduledArrival) {
      return res.status(400).json({ success: false, message: 'parkingSpotId and scheduledArrival are required' });
    }
    const entry = await WaitlistEntry.create({
      user: req.user.id,
      parkingSpot: parkingSpotId,
      scheduledArrival: new Date(scheduledArrival),
      duration,
      quantity,
    });
    return res.json({ success: true, data: entry });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /reservations/:id/pay-overstay  – user pays their overstay debt
// FIX [4]: clears overstayDebt so user can book again
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:id/pay-overstay', protect, async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) return res.status(404).json({ success: false, message: 'Reservation not found' });
    if (reservation.user.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    if (!reservation.overstayCharge || reservation.overstayCharge <= 0) {
      return res.status(400).json({ success: false, message: 'No overstay charge on this reservation' });
    }

    // Mark overstay as paid and clear the user's debt
    reservation.overstayPaid = true;
    await reservation.save();

    await User.findByIdAndUpdate(req.user.id, { $set: { overstayDebt: 0 } });

    res.json({ success: true, message: 'Overstay charge settled. You may now make new bookings.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;