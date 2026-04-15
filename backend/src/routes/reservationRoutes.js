const express = require('express');
const router = express.Router();
const Reservation = require('../models/Reservation');
const ParkingSpot = require('../models/ParkingSpot');
const User = require('../models/User');
const Notification = require('../models/Notification');
const QRCode = require('qrcode');
const { protect } = require('../middleware/auth');
const socketService = require('../services/socketService');
const notificationService = require('../services/notificationService');
const reservationController = require('../controllers/reservationController');

// Create PENDING reservation (does NOT reserve spot)
router.post('/create-pending', protect, async (req, res) => {
  try {
    const { parkingSpotId, duration, quantity = 1 } = req.body;
    
    const parkingSpot = await ParkingSpot.findById(parkingSpotId);
    if (!parkingSpot) {
      return res.status(404).json({ success: false, message: 'Parking spot not found' });
    }
    
    if (parkingSpot.availableSpaces < quantity) {
      return res.status(400).json({ success: false, message: `Only ${parkingSpot.availableSpaces} spaces available` });
    }
    
    const hours = Math.ceil(duration / 60);
    const totalAmount = hours * parkingSpot.price * quantity;
    
    const reservation = new Reservation({
      user: req.user.id,
      parkingSpot: parkingSpotId,
      duration,
      quantity,
      totalAmount,
      status: 'pending'
    });
    
    await reservation.save();
    
    res.json({
      success: true,
      data: {
        reservationId: reservation._id,
        totalAmount,
        duration
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Confirm reservation (NOW reserve the spot)
router.post('/confirm/:reservationId', protect, async (req, res) => {
  try {
    const { reservationId } = req.params;
    const { paymentMethod } = req.body;

    // Khalti reservations must be confirmed only after server-side verification.
    if (paymentMethod === 'khalti') {
      return res.status(400).json({
        success: false,
        message: 'Use Khalti verify endpoint to confirm this reservation',
      });
    }
    
    const reservation = await Reservation.findById(reservationId).populate('parkingSpot');
    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Reservation not found' });
    }
    
    if (reservation.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Reservation already processed' });
    }
    
    const parkingSpot = reservation.parkingSpot;
    const quantity = reservation.quantity || 1;
    
    // Reserve the spot
    parkingSpot.availableSpaces -= quantity;
    parkingSpot.reservedSpaces += quantity;
    parkingSpot.isReserved = true;
    parkingSpot.status = 'reserved';
    await parkingSpot.save();
    
    // Update reservation
    reservation.status = 'reserved';
    reservation.paymentStatus = 'completed';
    reservation.paymentMethod = paymentMethod;

    // Start (or reset) the dynamic reallocation timer:
    // user gets a grace window to confirm they're coming before we reallocate.
    const graceMs = 15 * 60 * 1000;
    reservation.arrivalConfirmedUntil = new Date(reservation.reservationTime.getTime() + graceMs);
    
    // Generate QR code
    const qrData = JSON.stringify({
      reservationId: reservation._id.toString(),
      bookingId: reservation._id.toString(),
      spotNumber: parkingSpot.spotNumber,
      location: parkingSpot.locationName
    });
    reservation.qrCodeData = await QRCode.toDataURL(qrData);
    await reservation.save();
    
    // Update user bookings count
    await User.findByIdAndUpdate(req.user.id, { $inc: { totalBookings: 1 } });
    
    // Emit socket event for real-time update
    const io = socketService.getIo();
    if (io) {
      io.emit('parkingSpotStatusChanged', {
        spotId: parkingSpot._id,
        status: 'reserved',
        availableSpaces: parkingSpot.availableSpaces,
        reservedSpaces: parkingSpot.reservedSpaces
      });
      console.log('📡 Socket emitted: spot reserved');
    }

    // Notify user (in-app + optional email) that their booking is confirmed
    await notificationService.sendNotification(
      req.user.id,
      'Reservation confirmed',
      `Your parking spot (Spot #${parkingSpot.spotNumber}) is ready. Scan the QR code when you arrive.`,
      'reservation_confirmed',
      {
        spotNumber: parkingSpot.spotNumber,
        duration: reservation.duration,
        amount: reservation.totalAmount,
        paymentMethod
      }
    );

    // Ask the user to confirm arrival (for dynamic reallocation).
    // If they don't respond in time, the scheduler will reallocate the spot.
    await notificationService.sendNotification(
      req.user.id,
      'Confirm you’re coming',
      'We saved your spot. Please confirm if you are coming so we can keep your reservation. If you don\'t respond, the spot may be reallocated to another user.',
      'arrival_confirmation',
      {
        reservationId: reservation._id,
        expiresAt: reservation.arrivalConfirmedUntil.toISOString()
      }
    );
    
    res.json({ success: true, data: reservation });
  } catch (error) {
    console.error('Error confirming:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Confirm "I'm coming" (extends timer) or "Not coming" (reallocate immediately)
router.post('/:reservationId/arrival-response', protect, async (req, res) => {
  try {
    const { reservationId } = req.params;
    const { response } = req.body; // 'coming' | 'not_coming'

    if (!response || !['coming', 'not_coming'].includes(response)) {
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
      reservation.arrivalConfirmedUntil = new Date(Date.now() + graceMs);
      await reservation.save();

      // Mark previous arrival confirmations for this reservation as read
      await Notification.updateMany(
        { user: req.user.id, type: 'arrival_confirmation', 'meta.reservationId': reservation._id, read: false },
        { $set: { read: true, readAt: new Date() } }
      );

      // Create a fresh timer notification (so the UI countdown resets)
      await notificationService.sendNotification(
        req.user.id,
        'Arrival confirmed',
        'Thanks! Your arrival timer has been extended. Please check in using your QR code before the new deadline.',
        'arrival_confirmation',
        {
          reservationId: reservation._id,
          expiresAt: reservation.arrivalConfirmedUntil.toISOString()
        },
        { sendEmail: false }
      );

      return res.json({ success: true, data: { arrivalConfirmedUntil: reservation.arrivalConfirmedUntil } });
    }

    // response === 'not_coming'
    reservation.status = 'no-show';
    const quantity = reservation.quantity || 1;

    const parkingSpot = reservation.parkingSpot;
    if (parkingSpot) {
      await parkingSpot.releaseSpace(quantity);
      if (parkingSpot.reservedSpaces <= 0) {
        await parkingSpot.updateStatus('available');
      } else {
        await parkingSpot.updateStatus('reserved');
      }

      // Real-time update
      const io = socketService.getIo();
      if (io) {
        io.emit('parkingSpotStatusChanged', {
          spotId: parkingSpot._id,
          status: parkingSpot.status,
          availableSpaces: parkingSpot.availableSpaces,
          reservedSpaces: parkingSpot.reservedSpaces
        });
      }
    }

    // Mark previous arrival confirmations as read
    await Notification.updateMany(
      { user: req.user.id, type: 'arrival_confirmation', 'meta.reservationId': reservation._id, read: false },
      { $set: { read: true, readAt: new Date() } }
    );

    await notificationService.sendNotification(
      req.user.id,
      'Spot reallocated',
      'You told us you are not coming. Your parking spot has been released for other users.',
      'arrival_timeout',
      { reservationId: reservation._id, action: 'not_coming' },
      { sendEmail: false }
    );

    await reservation.save();
    return res.json({ success: true });
  } catch (error) {
    console.error('Arrival response error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Cancel pending reservation
router.delete('/pending/:reservationId', protect, async (req, res) => {
  try {
    await Reservation.findByIdAndDelete(req.params.reservationId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// QR/admin check-in endpoint
router.post('/checkin', protect, reservationController.checkIn);

// User checkout by reservation id
router.post('/:id/checkout', protect, reservationController.checkOut);

// QR/admin checkout endpoint accepts { qrData }
router.post('/checkout', protect, async (req, res, next) => {
  try {
    const { qrData } = req.body || {};
    let parsedData;

    try {
      parsedData = JSON.parse(qrData || '');
    } catch (e) {
      return res.status(400).json({
        success: false,
        message: 'Invalid QR code format',
      });
    }

    const rid = parsedData.reservationId || parsedData.bookingId;
    if (!rid) {
      return res.status(400).json({
        success: false,
        message: 'Reservation id not found in QR data',
      });
    }

    req.params.id = rid;
    return reservationController.checkOut(req, res, next);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Active parking session (checked-in) for home screen timer + quick actions
router.get('/session', protect, async (req, res) => {
  try {
    const reservation = await Reservation.findOne({
      user: req.user.id,
      status: 'checked-in',
    })
      .populate('parkingSpot')
      .sort({ checkInTime: -1 });

    if (!reservation || !reservation.checkInTime) {
      return res.json({ success: true, data: null });
    }

    const endsAt = new Date(reservation.checkInTime.getTime() + reservation.duration * 60 * 1000);
    return res.json({
      success: true,
      data: {
        reservation,
        sessionEndsAt: endsAt.toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get user's reservations
router.get('/my', protect, async (req, res) => {
  try {
    const reservations = await Reservation.find({ 
      user: req.user.id,
      status: { $in: ['reserved', 'checked-in', 'completed'] }
    }).populate('parkingSpot').sort('-createdAt');
    res.json({ success: true, data: reservations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Cancel confirmed reservation
router.put('/:id/cancel', protect, async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id).populate('parkingSpot');
    if (!reservation) return res.status(404).json({ success: false });
    
    if (reservation.status !== 'reserved') {
      return res.status(400).json({ success: false, message: 'Cannot cancel' });
    }
    
    const parkingSpot = reservation.parkingSpot;
    const quantity = reservation.quantity || 1;
    
    // Release the spot
    parkingSpot.availableSpaces += quantity;
    parkingSpot.reservedSpaces -= quantity;
    if (parkingSpot.reservedSpaces === 0) {
      parkingSpot.isReserved = false;
      parkingSpot.status = 'available';
    }
    await parkingSpot.save();
    
    reservation.status = 'cancelled';
    await reservation.save();
    
    // Emit socket event
    const io = socketService.getIo();
    if (io) {
      io.emit('parkingSpotStatusChanged', {
        spotId: parkingSpot._id,
        status: 'available',
        availableSpaces: parkingSpot.availableSpaces,
        reservedSpaces: parkingSpot.reservedSpaces
      });
      console.log('📡 Socket emitted: spot available');
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
