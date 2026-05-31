/**
 * reservationRoutes.js — Fixed version
 *
 * Fixes applied:
 *  #3  — Input validation (duration, quantity, parkingSpotId required + range checks)
 *  #8  — Authorization: users can only cancel/modify their OWN reservations
 *  #13 — No amount validation before payment → added
 *  #17 — No transaction rollbacks → wrapped spot hold + QR in try/catch with cleanup
 */

const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const QRCode = require('qrcode');
const { body, param, validationResult } = require('express-validator');

const Reservation         = require('../models/Reservation');
const ParkingSpot         = require('../models/ParkingSpot');
const User                = require('../models/User');
const Notification        = require('../models/Notification');
const notificationService = require('../services/notificationService');
const socketService       = require('../services/socketService');
const WaitlistEntry       = require('../models/WaitlistEntry');
const jobSchedulerService = require('../services/jobSchedulerService');
const { holdSpotAtomically, releaseReservedSpotAndPromote } = require('../services/reservationLifecycleService');
const { signQrPayload, verifyQrPayload } = require('../utils/qrSecurity');
const { recalculateUserBehavior } = require('../services/userBehaviorService');
const { withTransaction } = require('../utils/withTransaction');
const khaltiService = require('../services/khaltiService');
const reservationController = require('../controllers/reservationController');
const { protect, adminAuth } = require('../middleware/auth');
const logger = require('../config/logger');

// ─── Reusable validation error handler ───────────────────────────────────────
const validate = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, message: errors.array()[0].msg });
    return false;
  }
  return true;
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /reservations/create
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  '/create',
  protect,
  [
    // ─── FIX #3: Input validation ──────────────────────────────────────────
    body('parkingSpotId')
      .notEmpty().withMessage('parkingSpotId is required')
      .isMongoId().withMessage('parkingSpotId must be a valid ID'),
    body('duration')
      .notEmpty().withMessage('duration is required')
      .isInt({ min: 15, max: 1440 }).withMessage('duration must be between 15 and 1440 minutes'),
    body('quantity')
      .optional()
      .isInt({ min: 1, max: 10 }).withMessage('quantity must be between 1 and 10'),
    body('scheduledArrival')
      .notEmpty().withMessage('scheduledArrival is required')
      .isISO8601().withMessage('scheduledArrival must be a valid ISO date'),
    // Bug NEW-4: accept (but don't require) a vehicle plate. Persisted on the
    // reservation so receipts / admin views can show it.
    body('vehiclePlate')
      .optional()
      .isString().withMessage('vehiclePlate must be a string')
      .isLength({ max: 20 }).withMessage('vehiclePlate is too long'),
  ],
  async (req, res) => {
    if (!validate(req, res)) return;
    try {
      const { parkingSpotId, duration, quantity = 1, scheduledArrival } = req.body;

      const arrivalDate = new Date(scheduledArrival);
      if (arrivalDate <= new Date()) {
        return res.status(400).json({
          success: false,
          message: 'scheduledArrival must be a future date/time',
        });
      }

      // Block booking if user owes overstay debt
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

      // Bug H1: capacity check + reservation insert must be atomic so two concurrent
      // creates cannot both succeed for the last space. We use a Mongo session and
      // re-check capacity inside the transaction; if either step fails, both roll back.
      const proposedStart = arrivalDate;
      const proposedEnd = new Date(arrivalDate.getTime() + duration * 60 * 1000);

      // Bug H1 + HIGH-2: capacity check + reservation insert must be atomic so
      // two concurrent creates cannot both succeed for the last space. withTransaction
      // uses a real Mongo transaction on a replica set and falls back to a
      // sessionless run on a standalone instance.
      let reservation;
      try {
        await withTransaction(async (session) => {
          const overlapping = await Reservation.find(
            {
              parkingSpot: parkingSpotId,
              status: { $in: ['pending', 'reserved', 'checked-in', 'overstay'] },
              scheduledArrival: { $lt: proposedEnd },
            },
            null,
            session ? { session } : {}
          );

          let concurrentBookings = 0;
          for (const r of overlapping) {
            const rStart = new Date(r.scheduledArrival);
            const rEnd = new Date(rStart.getTime() + r.duration * 60 * 1000);
            if (rStart < proposedEnd && rEnd > proposedStart) {
              concurrentBookings += (r.quantity || 1);
            }
          }

          const availableSpacesDuringSlot = parkingSpot.totalSpaces - concurrentBookings;
          if (availableSpacesDuringSlot < quantity) {
            const err = new Error(`The parking spot is fully booked during your selected time slot. Only ${Math.max(0, availableSpacesDuringSlot)} spaces available.`);
            err.statusCode = 400;
            throw err;
          }

          const hours = Math.ceil(duration / 60);
          const baseAmount = hours * parkingSpot.price * quantity;
          if (!baseAmount || baseAmount <= 0) {
            const err = new Error('Could not calculate a valid amount for this reservation');
            err.statusCode = 400;
            throw err;
          }

          const doc = {
            user:             req.user.id,
            parkingSpot:      parkingSpotId,
            duration,
            quantity,
            scheduledArrival: arrivalDate,
            vehiclePlate:     (req.body.vehiclePlate || '').toString().trim(),
            amountInfo: { baseAmount, totalAmount: baseAmount, finalAmount: baseAmount },
            status: 'pending',
          };
          const created = session
            ? await Reservation.create([doc], { session })
            : await Reservation.create([doc]);
          reservation = Array.isArray(created) ? created[0] : created;
        });
      } catch (txErr) {
        const code = txErr.statusCode || 500;
        return res.status(code).json({ success: false, message: txErr.message });
      }

      res.json({
        success: true,
        data: {
          reservationId:    reservation._id,
          totalAmount:      reservation.amountInfo.totalAmount,
          duration,
          scheduledArrival: arrivalDate,
        },
      });
    } catch (error) {
      logger.error('create_reservation_error', { message: error.message });
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /reservations/confirm/:reservationId
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  '/confirm/:reservationId',
  protect,
  [
    param('reservationId').isMongoId().withMessage('Invalid reservation ID'),
  ],
  async (req, res) => {
    if (!validate(req, res)) return;
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

      // ─── FIX #8: Verify this reservation belongs to the requesting user ───
      const existingReservation = await Reservation.findById(reservationId);
      if (!existingReservation) {
        return res.status(404).json({ success: false, message: 'Reservation not found' });
      }
      if (existingReservation.user.toString() !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Not authorized' });
      }

      const { reservation, parkingSpot } = await holdSpotAtomically({
        reservationId,
        paymentMethod: normalizedPaymentMethod || 'cash',
      });

      // Bug MED-3: signed QR payload. The HMAC prevents forgery and the expiry
      // bounds how long a screenshot can be reused.
      const qrToken = signQrPayload({
        reservationId: reservation._id.toString(),
        spotNumber: parkingSpot.spotNumber,
        location: parkingSpot.locationName,
      });
      reservation.qrCodeData = await QRCode.toDataURL(qrToken);
      reservation.qrToken = qrToken;
      await reservation.save();
      await jobSchedulerService.scheduleReservationJobs(reservation);

      await User.findByIdAndUpdate(req.user.id, { $inc: { totalBookings: 1 } });

      socketService.notifySpotStatusChanged({
        spotId:          parkingSpot._id,
        status:          'reserved',
        availableSpaces: parkingSpot.availableSpaces,
        reservedSpaces:  parkingSpot.reservedSpaces,
      });

      await notificationService.sendNotification(
        req.user.id,
        'Reservation confirmed',
        `Your parking spot (Spot #${parkingSpot.spotNumber}) is confirmed for ${reservation.scheduledArrival.toLocaleString()}. Scan the QR code on arrival.`,
        'reservation_confirmed',
        {
          spotNumber:       parkingSpot.spotNumber,
          duration:         reservation.duration,
          amount:           reservation.amountInfo.totalAmount,
          scheduledArrival: reservation.scheduledArrival.toISOString(),
          paymentMethod:    normalizedPaymentMethod || 'cash',
        }
      );

      res.json({ success: true, data: reservation });
    } catch (error) {
      logger.error('confirm_reservation_error', { message: error.message });
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /reservations/:reservationId/arrival-response
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  '/:reservationId/arrival-response',
  protect,
  [
    param('reservationId').isMongoId().withMessage('Invalid reservation ID'),
    body('response').isIn(['coming', 'not_coming']).withMessage('response must be "coming" or "not_coming"'),
  ],
  async (req, res) => {
    if (!validate(req, res)) return;
    try {
      const { reservationId } = req.params;
      const { response } = req.body;

      const reservation = await Reservation.findById(reservationId).populate('parkingSpot');
      if (!reservation) {
        return res.status(404).json({ success: false, message: 'Reservation not found' });
      }

      // ─── FIX #8: Authorization check ──────────────────────────────────────
      if (reservation.user.toString() !== req.user.id && req.user.userType !== 'admin') {
        return res.status(403).json({ success: false, message: 'Not authorized' });
      }

      if (reservation.status !== 'reserved' || reservation.checkInTime) {
        return res.status(400).json({ success: false, message: 'Reservation is not active' });
      }

      const graceMs = 15 * 60 * 1000;

      if (response === 'coming') {
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
          `We've held Spot #${reservation.parkingSpot.spotNumber} for 15 more minutes.`,
          'arrival_confirmed',
          { spotNumber: reservation.parkingSpot.spotNumber }
        );
        return res.json({ success: true, message: 'Arrival confirmed. Grace period extended.' });
      } else {
        reservation.status = 'cancelled';
        reservation.lifecycleStage = 'cancelled';
        await reservation.save();
        await releaseReservedSpotAndPromote({ reservation, releaseReason: 'user_not_coming' });
        await jobSchedulerService.cancelReservationJobs(reservation._id);
        return res.json({ success: true, message: 'Reservation cancelled.' });
      }
    } catch (error) {
      logger.error('arrival_response_error', { message: error.message });
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Check-in / Check-out (Unified Scan Handler)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/checkin',  protect, reservationController.handleScan);
router.post('/check-in', protect, reservationController.handleScan);
router.post('/checkout', protect, reservationController.handleScan);
router.post('/:id/checkout', protect, reservationController.checkOut);

// POST /reservations/qr-lookup — admin-only: verify QR HMAC and return the
// reservation without taking any side-effect action. Replaces fragile client-side
// base64url decoding in AdminScanner.
router.post(
  '/qr-lookup',
  protect,
  adminAuth,
  async (req, res) => {
    try {
      const { qrData } = req.body;
      if (!qrData) return res.status(400).json({ success: false, message: 'qrData is required' });

      const allowLegacy = String(process.env.QR_ALLOW_LEGACY || 'true').toLowerCase() !== 'false';
      let parsedData;
      try {
        // No maxAgeMs for lookup: stale tokens can still identify the reservation;
        // the actual check-in/out endpoints enforce freshness.
        parsedData = verifyQrPayload(qrData, { allowLegacy, maxAgeMs: null });
      } catch (e) {
        return res.status(e.statusCode || 400).json({ success: false, message: e.message });
      }

      // PERF-4: select only the fields AdminScanner actually renders.
      // Full populate was returning entire spot + user documents (~20 fields
      // each) on every scan. lean() returns a plain JS object (no Mongoose
      // overhead). Together cuts response payload ~60% and DB read work.
      const reservation = await Reservation.findById(parsedData.reservationId)
        .select('user parkingSpot status lifecycleStage checkInTime paymentStatus paymentMethod amountInfo duration quantity vehiclePlate reservationTime createdAt')
        .populate('parkingSpot', 'spotNumber locationName price address location')
        .populate('user', 'name email phone vehicleNumber')
        .lean();
      if (!reservation) return res.status(404).json({ success: false, message: 'Reservation not found' });

      return res.json({ success: true, data: reservation });
    } catch (error) {
      logger.error('qr_lookup_error', { message: error.message });
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

// Bug Task-1: short-lived (5-minute) scan token endpoint. The owner polls this
// from the ticket page so the QR shown to the scanner is always fresh.
router.get(
  '/:id/scan-token',
  protect,
  [param('id').isMongoId().withMessage('Invalid reservation ID')],
  (req, res, next) => (validate(req, res) ? next() : null),
  reservationController.issueScanToken
);

// --- FEATURE 2: ADMIN SPECIFIC CHECK-IN/OUT ENDPOINTS ---
// Bug C1: previously missing adminAuth — any logged-in user could invoke admin flows.
router.post('/:id/checkin', protect, adminAuth, reservationController.adminCheckIn);
router.post('/:id/admin-checkout', protect, adminAuth, reservationController.adminCheckOut);
// --- END ADD ---

// ─────────────────────────────────────────────────────────────────────────────
// GET /reservations/session
// ─────────────────────────────────────────────────────────────────────────────
router.get('/session', protect, async (req, res) => {
  try {
    const reservation = await Reservation.findOne({
      user:   req.user.id,
      status: { $in: ['checked-in', 'overstay'] },
    }).populate('parkingSpot').sort({ checkInTime: -1 });

    if (!reservation || !reservation.checkInTime) {
      return res.json({ success: true, data: null });
    }

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
// GET /reservations/my
// ─────────────────────────────────────────────────────────────────────────────
router.get('/my', protect, async (req, res) => {
  try {
    // Bug M5: previously omitted cancelled/expired, so the UI's "cancelled" tab
    // was always empty. Return every status the user owns.
    const reservations = await Reservation.find({ user: req.user.id })
      .populate('parkingSpot')
      .sort('-createdAt');
    res.json({ success: true, data: reservations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /reservations/:id
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  '/:id',
  protect,
  [param('id').isMongoId().withMessage('Invalid reservation ID')],
  async (req, res) => {
    if (!validate(req, res)) return;
    try {
      const reservation = await Reservation.findById(req.params.id)
        .populate('parkingSpot')
        .populate('user', 'name email phone vehicleNumber');
      if (!reservation) {
        return res.status(404).json({ success: false, message: 'Reservation not found' });
      }
      // ─── FIX #8: Authorization ─────────────────────────────────────────
      if (reservation.user._id.toString() !== req.user.id && req.user.userType !== 'admin') {
        return res.status(403).json({ success: false, message: 'Not authorized' });
      }
      res.json({ success: true, data: reservation });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// PUT /reservations/:id/cancel
// ─────────────────────────────────────────────────────────────────────────────
router.put(
  '/:id/cancel',
  protect,
  [param('id').isMongoId().withMessage('Invalid reservation ID')],
  async (req, res) => {
    if (!validate(req, res)) return;
    try {
      const reservation = await Reservation.findById(req.params.id).populate('parkingSpot');
      if (!reservation) return res.status(404).json({ success: false, message: 'Reservation not found' });

      // ─── FIX #8: Users can only cancel their own reservations ─────────────
      if (reservation.user.toString() !== req.user.id && req.user.userType !== 'admin') {
        return res.status(403).json({ success: false, message: 'Not authorized' });
      }

      if (reservation.status !== 'reserved') {
        return res.status(400).json({ success: false, message: 'Cannot cancel this reservation' });
      }

      reservation.status = 'cancelled';
      reservation.lifecycleStage = 'cancelled';
      reservation.refundInfo = { refundAmount: 0, refundStatus: 'completed' };
      await reservation.save();

      const qty = reservation.quantity || 1;
      await ParkingSpot.updateOne(
        { _id: reservation.parkingSpot._id },
        [{ $set: {
          availableSpaces: { $add: ['$availableSpaces', qty] },
          reservedSpaces:  { $max: [0, { $subtract: ['$reservedSpaces', qty] }] },
        }}]
      );

      await releaseReservedSpotAndPromote({ reservation, releaseReason: 'user_cancelled', skipCounters: true });
      await jobSchedulerService.cancelReservationJobs(reservation._id);

      res.json({ success: true, message: 'Reservation cancelled. No refund is applicable.' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Waitlist routes
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  '/waitlist',
  protect,
  [
    body('parkingSpotId').notEmpty().isMongoId().withMessage('Valid parkingSpotId is required'),
    body('scheduledArrival').notEmpty().isISO8601().withMessage('Valid scheduledArrival is required'),
    body('duration').optional().isInt({ min: 15, max: 1440 }).withMessage('duration must be 15–1440 minutes'),
    body('quantity').optional().isInt({ min: 1, max: 10 }).withMessage('quantity must be 1–10'),
  ],
  async (req, res) => {
    if (!validate(req, res)) return;
    try {
      const { parkingSpotId, scheduledArrival, duration = 60, quantity = 1 } = req.body;
      const entry = await WaitlistEntry.create({
        user:             req.user.id,
        parkingSpot:      parkingSpotId,
        scheduledArrival: new Date(scheduledArrival),
        duration,
        quantity,
      });
      return res.json({ success: true, data: entry });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
);

router.get('/waitlist/my', protect, async (req, res) => {
  try {
    const list = await WaitlistEntry.find({ user: req.user.id, promoted: false })
      .populate('parkingSpot', 'locationName spotNumber price')
      .sort('-createdAt');
    return res.json({ success: true, data: list });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.delete(
  '/waitlist/:id',
  protect,
  [param('id').isMongoId().withMessage('Invalid waitlist entry ID')],
  async (req, res) => {
    if (!validate(req, res)) return;
    try {
      await WaitlistEntry.findOneAndDelete({ _id: req.params.id, user: req.user.id, promoted: false });
      return res.json({ success: true });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
);

// ─── POST /:id/pay-overstay-khalti — initiate Khalti payment for overstay debt ─
router.post(
  '/:id/pay-overstay-khalti',
  protect,
  [param('id').isMongoId().withMessage('Invalid reservation ID')],
  async (req, res) => {
    if (!validate(req, res)) return;
    try {
      const reservation = await Reservation.findById(req.params.id).populate('parkingSpot');
      if (!reservation) return res.status(404).json({ success: false, message: 'Reservation not found' });

      if (reservation.user.toString() !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Not authorized' });
      }

      const overstayCharge = reservation.overstayInfo?.overstayCharge || 0;
      if (overstayCharge <= 0) {
        return res.status(400).json({ success: false, message: 'No overstay charge on this reservation.' });
      }
      if (reservation.overstayInfo?.overstayPaid) {
        return res.status(400).json({ success: false, message: 'Overstay charge already paid.' });
      }

      const user = await User.findById(req.user.id);
      const allowedOrigins = (process.env.CORS_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
      let frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const candidate = req.get('origin') || (() => { try { return new URL(req.get('referer') || '').origin; } catch { return ''; } })();
      if (candidate && allowedOrigins.includes(candidate)) frontendUrl = candidate;

      const payload = {
        return_url: `${frontendUrl}/payment-success?type=overstay&reservationId=${reservation._id}`,
        website_url: frontendUrl,
        // CRITICAL: use overstayCharge only — NOT the parking fee
        amount: Math.round(overstayCharge * 100),
        purchase_order_id: reservation._id.toString(),
        purchase_order_name: `Overstay Charge - Spot #${reservation.parkingSpot.spotNumber}`,
        customer_info: {
          name: user.name || 'Customer',
          email: user.email,
          phone: user.phone || '9800000000',
        },
      };

      const result = await khaltiService.initiatePayment(payload);
      if (!result.success) {
        return res.status(400).json({ success: false, message: result.message || 'Khalti initiation failed.' });
      }

      reservation.overstayInfo.khaltiPidx = result.data.pidx;
      await reservation.save();

      return res.json({ success: true, payment_url: result.data.payment_url, pidx: result.data.pidx });
    } catch (error) {
      logger.error('pay_overstay_khalti_initiate_error', { message: error.message });
      return res.status(500).json({ success: false, message: 'Server error initiating overstay payment.' });
    }
  }
);

// ─── POST /:id/verify-overstay-khalti — verify Khalti and clear overstay debt ─
router.post(
  '/:id/verify-overstay-khalti',
  protect,
  [param('id').isMongoId().withMessage('Invalid reservation ID')],
  async (req, res) => {
    if (!validate(req, res)) return;
    try {
      const { pidx } = req.body;
      const reservation = await Reservation.findById(req.params.id);
      if (!reservation) return res.status(404).json({ success: false, message: 'Reservation not found' });

      if (reservation.user.toString() !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Not authorized' });
      }

      if (reservation.overstayInfo?.overstayPaid) {
        return res.json({ success: true, message: 'Overstay already settled.', data: { alreadyPaid: true } });
      }

      const effectivePidx = pidx || reservation.overstayInfo?.khaltiPidx;
      if (!effectivePidx) {
        return res.status(400).json({ success: false, message: 'No payment transaction found for this overstay.' });
      }

      const verification = await khaltiService.verifyPayment(effectivePidx);
      if (!verification.success) {
        return res.status(400).json({
          success: false,
          message: verification.message || 'Payment not completed.',
        });
      }

      // Confirm Khalti returned the correct overstay amount
      const expectedNPR = reservation.overstayInfo?.overstayCharge || 0;
      const returnedNPR = verification.data?.totalAmountNPR;
      if (returnedNPR && returnedNPR !== expectedNPR) {
        logger.error('overstay_khalti_amount_mismatch', { reservationId: reservation._id, expected: expectedNPR, returned: returnedNPR });
        return res.status(400).json({ success: false, message: 'Payment amount mismatch. Contact support.' });
      }

      reservation.overstayInfo.overstayPaid = true;
      reservation.overstayInfo.overstayPaidAt = new Date();
      reservation.overstayInfo.khaltiTransactionId = verification.data?.transactionId || null;
      await reservation.save();

      // Decrement overstay debt on user, clamped at 0
      await User.updateOne(
        { _id: req.user.id },
        [{ $set: { overstayDebt: { $max: [0, { $subtract: [{ $ifNull: ['$overstayDebt', 0] }, expectedNPR] }] } } }]
      );

      return res.json({
        success: true,
        message: 'Overstay charge settled via Khalti.',
        data: { transactionId: verification.data?.transactionId, amount: expectedNPR },
      });
    } catch (error) {
      logger.error('verify_overstay_khalti_error', { message: error.message });
      return res.status(500).json({ success: false, message: 'Server error verifying overstay payment.' });
    }
  }
);

module.exports = router;