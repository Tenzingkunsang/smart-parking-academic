const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const khaltiService = require('../services/khaltiService');
const Reservation = require('../models/Reservation');
const User = require('../models/User');
const QRCode = require('qrcode');
const ParkingSpot = require('../models/ParkingSpot');
const socketService = require('../services/socketService');
const notificationService = require('../services/notificationService');

// ─── Khalti Config Test ──────────────────────────────────────────────────────
router.get('/auth-test', (req, res) => {
  const hasSecret = Boolean((process.env.KHALTI_SECRET_KEY || '').trim());
  const mode = (process.env.KHALTI_MODE || 'test').toLowerCase();

  if (!hasSecret) {
    return res.status(500).json({
      success: false,
      message: 'KHALTI_SECRET_KEY is missing in backend .env'
    });
  }

  return res.json({
    success: true,
    message: 'Khalti configuration looks valid',
    mode
  });
});

// ─── Initiate Khalti Payment ─────────────────────────────────────────────────
router.post('/khalti/initiate', protect, async (req, res) => {
  try {
    const { reservationId } = req.body;

    if (!reservationId) {
      return res.status(400).json({
        success: false,
        message: 'Reservation ID is required'
      });
    }

    const reservation = await Reservation.findById(reservationId).populate('parkingSpot');
    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found'
      });
    }

    // Ownership check
    if (reservation.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Only pending reservations can be paid
    if (reservation.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Reservation cannot be paid. Current status: ${reservation.status}`
      });
    }

    const user = await User.findById(req.user.id);

    // Calculate final amount — fallback if totalAmount is missing
    const finalAmount =
      reservation.totalAmount ||
      Math.ceil(reservation.duration / 60) * reservation.parkingSpot.price;

    if (!finalAmount || finalAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid reservation amount'
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
        phone: user.phone || '9800000000'
      }
    };

    const result = await khaltiService.initiatePayment(payload);

    if (result.success) {
      reservation.paymentMethod = 'khalti';
      reservation.paymentStatus = 'pending';
      await reservation.save();

      return res.json({
        success: true,
        payment_url: result.data.payment_url,
        pidx: result.data.pidx
      });
    }

    return res.status(401).json({
      success: false,
      message: result.message || 'Failed to initiate Khalti payment'
    });

  } catch (error) {
    console.error('[Payment] Initiate error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error during payment initiation'
    });
  }
});

// ─── Verify Khalti Payment ───────────────────────────────────────────────────
router.post('/khalti/verify', protect, async (req, res) => {
  try {
    const { reservationId, pidx } = req.body;

    if (!reservationId || !pidx) {
      return res.status(400).json({
        success: false,
        message: 'reservationId and pidx are both required'
      });
    }

    const reservation = await Reservation.findById(reservationId).populate('parkingSpot');
    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found'
      });
    }

    // Ownership check
    if (reservation.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Verify with Khalti
    const verification = await khaltiService.verifyPayment(pidx);

    if (!verification.success) {
      reservation.paymentStatus = 'failed';
      reservation.paymentMethod = 'khalti';
      await reservation.save();
      return res.status(400).json({
        success: false,
        message: verification.message || 'Payment verification failed'
      });
    }

    // ✅ FIXED: status is inside verification.data
    if (verification.data?.status !== 'Completed') {
      reservation.paymentStatus = 'failed';
      reservation.paymentMethod = 'khalti';
      await reservation.save();
      return res.status(400).json({
        success: false,
        message: `Payment not completed. Status: ${verification.data?.status}`
      });
    }

    // Only process if reservation is still pending (prevent double processing)
    if (reservation.status === 'pending') {
      const parkingSpot = await ParkingSpot.findById(reservation.parkingSpot._id);
      const quantity = reservation.quantity || 1;

      if (!parkingSpot || parkingSpot.availableSpaces < quantity) {
        return res.status(400).json({
          success: false,
          message: 'Parking spot is no longer available'
        });
      }

      // Update parking spot availability
      parkingSpot.availableSpaces -= quantity;
      parkingSpot.reservedSpaces += quantity;
      parkingSpot.isReserved = true;
      parkingSpot.status = 'reserved';
      await parkingSpot.save();

      // ✅ FIXED: transactionId is inside verification.data
      reservation.status = 'reserved';
      reservation.paymentStatus = 'completed';
      reservation.paymentMethod = 'khalti';
      reservation.paymentReference = verification.data?.transactionId || pidx;

      // Store Khalti transaction ID for refunds
      reservation.khaltiTransactionId = verification.data?.transactionId || null;

      // Generate QR code for check-in
      const qrData = JSON.stringify({
        bookingId: reservation._id,
        spotNumber: reservation.parkingSpot.spotNumber,
        location: reservation.parkingSpot.locationName
      });
      reservation.qrCodeData = await QRCode.toDataURL(qrData);
      await reservation.save();

      // ✅ FIXED: use socketService helper instead of raw io.emit
      socketService.notifySpotStatusChanged({
        spotId: parkingSpot._id,
        spotNumber: parkingSpot.spotNumber,
        status: 'reserved',
        locationId: parkingSpot.location,
        availableSpaces: parkingSpot.availableSpaces,
        reservedSpaces: parkingSpot.reservedSpaces
      });

      // Send in-app notification + email to user
      await notificationService.notifyPaymentConfirmation(
        req.user.id,
        reservation.totalAmount,
        parkingSpot.spotNumber,
        reservation.duration,
        reservation.paymentReference
      );

      // Notify admin of new booking
      socketService.notifyAdminNewBooking({
        bookingId: reservation._id,
        spotNumber: parkingSpot.spotNumber,
        userId: req.user.id,
        amount: reservation.totalAmount
      });
    }

    // ✅ FIXED: amount is inside verification.data as totalAmountNPR
    return res.json({
      success: true,
      message: 'Payment verified successfully',
      data: {
        reservationId: reservation._id,
        transactionId: verification.data?.transactionId || null,
        amount: verification.data?.totalAmountNPR || reservation.totalAmount
      }
    });

  } catch (error) {
    console.error('[Payment] Verify error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error during payment verification'
    });
  }
});

module.exports = router;