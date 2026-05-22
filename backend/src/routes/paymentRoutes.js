/**
 * paymentRoutes.js — Fixed version
 *
 * Fixes applied:
 *  #12 — No rate limiting on payments → added express-rate-limit
 *  #3  — Missing input validation → added on both initiate + verify
 *  #13 — Amount validated before payment initiation
 *  #19 — Payment errors now return descriptive messages
 */

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');

const { protect } = require('../middleware/auth');
const khaltiService = require('../services/khaltiService');
const Reservation = require('../models/Reservation');
const User = require('../models/User');
const QRCode = require('qrcode');
const socketService = require('../services/socketService');
const notificationService = require('../services/notificationService');
const { holdSpotAtomically } = require('../services/reservationLifecycleService');
const jobSchedulerService = require('../services/jobSchedulerService');
const logger = require('../config/logger');

// ─── FIX #12: Rate limiting on payment endpoints ─────────────────────────────
// Prevents DOS and Khalti API quota exhaustion from hammering the endpoint.
const paymentRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,                   // max 20 payment attempts per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many payment requests. Please wait a few minutes and try again.',
  },
});
// ─────────────────────────────────────────────────────────────────────────────

// ─── Reusable validation error handler ───────────────────────────────────────
const validate = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, message: errors.array()[0].msg });
    return false;
  }
  return true;
};

// ─── Khalti Config Test ──────────────────────────────────────────────────────
router.get('/auth-test', (req, res) => {
  const hasSecret = Boolean((process.env.KHALTI_SECRET_KEY || '').trim());
  const mode = (process.env.KHALTI_MODE || 'test').toLowerCase();

  if (!hasSecret) {
    return res.status(500).json({
      success: false,
      message: 'KHALTI_SECRET_KEY is missing in backend .env',
    });
  }

  return res.json({
    success: true,
    message: 'Khalti configuration looks valid',
    mode,
  });
});

// ─── Initiate Khalti Payment ─────────────────────────────────────────────────
router.post(
  '/khalti/initiate',
  protect,
  paymentRateLimit,
  [
    // ─── FIX #3: Input validation ──────────────────────────────────────────
    body('reservationId')
      .notEmpty().withMessage('reservationId is required')
      .isMongoId().withMessage('reservationId must be a valid ID'),
  ],
  async (req, res) => {
    if (!validate(req, res)) return;
    try {
      const { reservationId } = req.body;

      let reservation = await Reservation.findById(reservationId).populate('parkingSpot');
      if (!reservation) {
        return res.status(404).json({ success: false, message: 'Reservation not found' });
      }

      // ─── FIX #8: Ownership check ───────────────────────────────────────
      if (reservation.user.toString() !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }

      if (reservation.status !== 'pending') {
        return res.status(400).json({
          success: false,
          // ─── FIX #19: Descriptive error message ───────────────────────
          message: `This reservation cannot be paid. It is currently "${reservation.status}". Only "pending" reservations can be paid.`,
        });
      }

      const user = await User.findById(req.user.id);

      // ─── FIX #13: Validate amount before calling Khalti ───────────────────
      const finalAmount =
        reservation.amountInfo?.totalAmount ||
        Math.ceil(reservation.duration / 60) * reservation.parkingSpot.price;

      if (!finalAmount || finalAmount <= 0 || !isFinite(finalAmount)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid reservation amount. Please cancel and recreate this reservation.',
        });
      }

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

      const payload = {
        return_url: `${frontendUrl}/payment-success?reservationId=${reservationId}`,
        website_url: frontendUrl,
        amount: Math.round(finalAmount * 100), // NPR → paisa
        purchase_order_id: reservation._id.toString(),
        purchase_order_name: `Parking Spot #${reservation.parkingSpot.spotNumber}`,
        customer_info: {
          name: user.name || 'Customer',
          email: user.email,
          phone: user.phone || '9800000000',
        },
      };

      const result = await khaltiService.initiatePayment(payload);

      if (result.success) {
        reservation.paymentMethod = 'khalti';
        reservation.paymentStatus = 'pending';
        await reservation.save();

        return res.json({
          success: true,
          payment_url: result.data.payment_url,
          pidx: result.data.pidx,
        });
      }

      // ─── FIX #19: Surface Khalti's actual error message ───────────────────
      return res.status(400).json({
        success: false,
        message: result.message || 'Khalti payment initiation failed. Please try again.',
      });

    } catch (error) {
      logger.error('payment_initiate_error', { message: error.message });
      return res.status(500).json({
        success: false,
        message: 'Server error during payment initiation. Please try again.',
      });
    }
  }
);

// ─── Verify Khalti Payment ───────────────────────────────────────────────────
router.post(
  '/khalti/verify',
  protect,
  paymentRateLimit,
  [
    // ─── FIX #3: Input validation ──────────────────────────────────────────
    body('reservationId')
      .notEmpty().withMessage('reservationId is required')
      .isMongoId().withMessage('reservationId must be a valid ID'),
    body('pidx')
      .notEmpty().withMessage('pidx is required')
      .isString().withMessage('pidx must be a string'),
  ],
  async (req, res) => {
    if (!validate(req, res)) return;
    try {
      const { reservationId, pidx } = req.body;

      let reservation = await Reservation.findById(reservationId).populate('parkingSpot');
      if (!reservation) {
        return res.status(404).json({ success: false, message: 'Reservation not found' });
      }

      // ─── FIX #8: Ownership check ───────────────────────────────────────
      if (reservation.user.toString() !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }

      const verification = await khaltiService.verifyPayment(pidx);

      if (!verification.success) {
        reservation.paymentStatus = 'failed';
        reservation.paymentMethod = 'khalti';
        await reservation.save();
        return res.status(400).json({
          success: false,
          // ─── FIX #19: Descriptive message ─────────────────────────────
          message: verification.message || 'Payment verification failed. Please contact support if money was deducted.',
        });
      }

      if (verification.data?.status !== 'Completed') {
        reservation.paymentStatus = 'failed';
        reservation.paymentMethod = 'khalti';
        await reservation.save();
        return res.status(400).json({
          success: false,
          message: `Payment not completed. Khalti status: "${verification.data?.status}". No charges were made.`,
        });
      }

      // ─── FIX #9: Only process if still pending (prevents double processing)
      // holdSpotAtomically uses a findOneAndUpdate with $gte check, so it's
      // atomic — concurrent requests for the same spot will get a "no longer
      // available" error from Mongo rather than double-booking.
      if (reservation.status === 'pending') {
        const held = await holdSpotAtomically({ reservationId, paymentMethod: 'khalti' });
        const parkingSpot = held.parkingSpot;
        reservation = held.reservation;
        reservation.paymentReference = verification.data?.transactionId || pidx;
        reservation.khaltiTransactionId = verification.data?.transactionId || null;

        const qrData = JSON.stringify({
          reservationId: reservation._id,
          bookingId: reservation._id,
          spotNumber: reservation.parkingSpot.spotNumber,
          location: reservation.parkingSpot.locationName,
        });
        reservation.qrCodeData = await QRCode.toDataURL(qrData);
        await reservation.save();
        await jobSchedulerService.scheduleReservationJobs(reservation);

        socketService.notifySpotStatusChanged({
          spotId: parkingSpot._id,
          spotNumber: parkingSpot.spotNumber,
          status: 'reserved',
          locationId: parkingSpot.location,
          availableSpaces: parkingSpot.availableSpaces,
          reservedSpaces: parkingSpot.reservedSpaces,
        });

        await notificationService.notifyPaymentConfirmation(
          req.user.id,
          reservation.amountInfo?.totalAmount || 0,
          parkingSpot.spotNumber,
          reservation.duration,
          reservation.paymentReference
        );

        socketService.notifyAdminNewBooking({
          bookingId: reservation._id,
          spotNumber: parkingSpot.spotNumber,
          userId: req.user.id,
          amount: reservation.amountInfo?.totalAmount || 0,
        });
      }

      return res.json({
        success: true,
        message: 'Payment verified successfully',
        data: {
          reservationId: reservation._id,
          transactionId: verification.data?.transactionId || null,
          amount: verification.data?.totalAmountNPR || reservation.amountInfo?.totalAmount,
        },
      });

    } catch (error) {
      logger.error('payment_verify_error', { message: error.message });
      return res.status(500).json({
        success: false,
        message: 'Server error during payment verification. If you were charged, please contact support with your transaction ID.',
      });
    }
  }
);

module.exports = router;