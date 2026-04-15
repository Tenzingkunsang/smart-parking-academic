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

// Initiate Khalti payment
router.post('/khalti/initiate', protect, async (req, res) => {
  try {
    const { reservationId } = req.body;
    
    if (!reservationId) {
      return res.status(400).json({ success: false, message: 'Reservation ID required' });
    }
    
    const reservation = await Reservation.findById(reservationId).populate('parkingSpot');
    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Reservation not found' });
    }

    // Verify ownership
    if (reservation.user.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (reservation.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Reservation cannot be paid in status: ${reservation.status}`
      });
    }

    const user = await User.findById(req.user.id);
    
    // Ensure we have a valid amount in Paisa (Amount * 100)
    const finalAmount = reservation.totalAmount || (Math.ceil(reservation.duration / 60) * reservation.parkingSpot.price);
    
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const payload = {
      return_url: `${frontendUrl}/payment-success?reservationId=${reservationId}`,
      website_url: frontendUrl,
      amount: Math.round(finalAmount * 100), 
      purchase_order_id: reservation._id.toString(),
      purchase_order_name: `Parking Spot #${reservation.parkingSpot.spotNumber}`,
      customer_info: {
        name: user.name || "Customer",
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
        payment_url: result.payment_url,
        pidx: result.pidx
      });
    }

    // If Khalti returns "Invalid Token", it will land here with the specific message
    res.status(401).json({ success: false, message: result.message });

  } catch (error) {
    console.error('Payment Route Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/khalti/verify', protect, async (req, res) => {
  try {
    const { reservationId, pidx } = req.body;

    if (!reservationId || !pidx) {
      return res.status(400).json({
        success: false,
        message: 'reservationId and pidx are required'
      });
    }

    const reservation = await Reservation.findById(reservationId).populate('parkingSpot');
    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Reservation not found' });
    }

    if (reservation.user.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const verification = await khaltiService.verifyPayment(pidx);
    if (!verification.success) {
      reservation.paymentStatus = 'failed';
      reservation.paymentMethod = 'khalti';
      await reservation.save();
      return res.status(400).json({ success: false, message: verification.message });
    }

    if (verification.status !== 'Completed') {
      reservation.paymentStatus = 'failed';
      reservation.paymentMethod = 'khalti';
      await reservation.save();
      return res.status(400).json({
        success: false,
        message: `Payment not completed. Current status: ${verification.status}`
      });
    }

    if (reservation.status === 'pending') {
      const parkingSpot = await ParkingSpot.findById(reservation.parkingSpot._id);
      const quantity = reservation.quantity || 1;

      if (!parkingSpot || parkingSpot.availableSpaces < quantity) {
        return res.status(400).json({
          success: false,
          message: 'Parking spot is no longer available'
        });
      }

      parkingSpot.availableSpaces -= quantity;
      parkingSpot.reservedSpaces += quantity;
      parkingSpot.isReserved = true;
      parkingSpot.status = 'reserved';
      await parkingSpot.save();

      reservation.status = 'reserved';
      reservation.paymentStatus = 'completed';
      reservation.paymentMethod = 'khalti';
      reservation.paymentReference = verification.transactionId || pidx;

      const qrData = JSON.stringify({
        bookingId: reservation._id,
        spotNumber: reservation.parkingSpot.spotNumber,
        location: reservation.parkingSpot.locationName
      });
      reservation.qrCodeData = await QRCode.toDataURL(qrData);
      await reservation.save();

      const io = socketService.getIo();
      if (io) {
        io.emit('parkingSpotStatusChanged', {
          spotId: parkingSpot._id,
          status: 'reserved',
          availableSpaces: parkingSpot.availableSpaces,
          reservedSpaces: parkingSpot.reservedSpaces
        });
      }

      // In-app (and optional Gmail) notification to the user
      await notificationService.notifyPaymentConfirmation(
        req.user.id,
        reservation.totalAmount,
        parkingSpot.spotNumber,
        reservation.duration,
        reservation.paymentReference
      );
    }

    return res.json({
      success: true,
      message: 'Payment verified successfully',
      data: {
        reservationId: reservation._id,
        transactionId: verification.transactionId || null,
        amount: verification.totalAmount || reservation.totalAmount
      }
    });
  } catch (error) {
    console.error('Khalti verify route error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;