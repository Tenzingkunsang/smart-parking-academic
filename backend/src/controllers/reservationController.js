const Reservation = require('../models/Reservation');
const ParkingSpot = require('../models/ParkingSpot');
const Notification = require('../models/Notification');
const socketService = require('../services/socketService');

// @desc    Create new reservation
exports.createReservation = async (req, res) => {
  try {
    const { parkingSpotId, duration } = req.body;
    
    // Check parking spot
    const parkingSpot = await ParkingSpot.findById(parkingSpotId);
    if (!parkingSpot) {
      return res.status(404).json({ 
        success: false, 
        message: 'Parking spot not found' 
      });
    }
    
    // Check availability
    if (!parkingSpot.isAvailable) {
      return res.status(400).json({ 
        success: false, 
        message: 'Parking spot is not available' 
      });
    }
    
    // Check if user has active reservation
    const activeReservation = await Reservation.findOne({
      user: req.user.id,
      status: { $in: ['reserved', 'checked-in'] }
    });
    
    if (activeReservation) {
      return res.status(400).json({ 
        success: false, 
        message: 'You already have an active reservation' 
      });
    }
    
    // Create reservation
    const reservation = new Reservation({
      user: req.user.id,
      parkingSpot: parkingSpotId,
      duration: duration || 60
    });
    
    // Generate QR code
    const QRCode = require('qrcode');
    const qrData = JSON.stringify({
      reservationId: reservation._id,
      spotNumber: parkingSpot.spotNumber,
      userId: req.user.id,
      timestamp: new Date().toISOString()
    });
    
    reservation.qrCodeData = await QRCode.toDataURL(qrData);
    
    // Calculate total amount
    const hours = Math.ceil(reservation.duration / 60);
    reservation.totalAmount = hours * parkingSpot.price;
    
    // Mark spot as reserved
    parkingSpot.isReserved = true;
    parkingSpot.status = 'reserved';
    await parkingSpot.save();
    
    await reservation.save();
    
    // 🔥 EMIT SOCKET EVENT FOR REAL-TIME UPDATE 🔥
    const io = socketService.getIo();
    if (io) {
      io.emit('parkingSpotStatusChanged', {
        spotId: parkingSpot._id,
        status: 'reserved',
        isReserved: true,
        isOccupied: false,
        availableSpaces: parkingSpot.availableSpaces
      });
      console.log(`📡 Socket emitted: Spot ${parkingSpot.spotNumber} reserved`);
    }
    
    // Populate parking spot details
    await reservation.populate('parkingSpot');
    
    res.status(201).json({ 
      success: true, 
      message: 'Reservation created successfully',
      data: reservation 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Cancel reservation
exports.cancelReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id).populate('parkingSpot');
    
    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found'
      });
    }
    
    if (reservation.user.toString() !== req.user.id && req.user.userType !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }
    
    if (reservation.status !== 'reserved') {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel: reservation is ${reservation.status}`
      });
    }
    
    // Update reservation
    reservation.status = 'cancelled';
    
    // Free up parking spot
    const parkingSpot = await ParkingSpot.findById(reservation.parkingSpot._id);
    if (parkingSpot) {
      parkingSpot.isReserved = false;
      parkingSpot.status = 'available';
      await parkingSpot.save();
      
      // 🔥 EMIT SOCKET EVENT FOR REAL-TIME UPDATE 🔥
      const io = socketService.getIo();
      if (io) {
        io.emit('parkingSpotStatusChanged', {
          spotId: parkingSpot._id,
          status: 'available',
          isReserved: false,
          isOccupied: false
        });
        console.log(`📡 Socket emitted: Spot ${parkingSpot.spotNumber} cancelled/available`);
      }
    }
    
    await reservation.save();
    
    res.json({
      success: true,
      message: 'Reservation cancelled successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Check in
exports.checkIn = async (req, res) => {
  try {
    const { qrData } = req.body;
    let parsedData;
    try {
      parsedData = JSON.parse(qrData);
    } catch (e) {
      return res.status(400).json({
        success: false,
        message: 'Invalid QR code format'
      });
    }

    const reservationId = parsedData.reservationId || parsedData.bookingId;
    if (!reservationId) {
      return res.status(400).json({
        success: false,
        message: 'Reservation id not found in QR data (expected reservationId or bookingId)'
      });
    }

    const reservation = await Reservation.findById(reservationId)
      .populate('parkingSpot');
    
    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found'
      });
    }
    
    if (reservation.user.toString() !== req.user.id && req.user.userType !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }
    
    if (reservation.status === 'checked-in') {
      return res.status(400).json({
        success: false,
        message: 'Already checked in'
      });
    }

    if (reservation.status !== 'reserved') {
      return res.status(400).json({
        success: false,
        message: `Cannot check in: reservation is ${reservation.status}`
      });
    }
    
    if (reservation.isExpired) {
      reservation.status = 'expired';
      await reservation.save();

      // Mark pending arrival confirmation notifications as read
      await Notification.updateMany(
        { user: reservation.user, type: 'arrival_confirmation', 'meta.reservationId': reservation._id, read: false },
        { $set: { read: true, readAt: new Date() } }
      );

      const quantity = reservation.quantity || 1;
      const spot = await ParkingSpot.findById(reservation.parkingSpot._id);
      if (spot) {
        // Release reserved capacity for this reservation.
        await spot.releaseSpace(quantity);

        // Pick correct legacy flags based on remaining counters.
        if (spot.occupiedSpaces > 0) await spot.updateStatus('occupied');
        else if (spot.reservedSpaces > 0) await spot.updateStatus('reserved');
        else await spot.updateStatus('available');
      }
      
      return res.status(400).json({
        success: false,
        message: 'Reservation has expired'
      });
    }
    
    // Update reservation
    reservation.status = 'checked-in';
    reservation.checkInTime = new Date();
    
    // Update parking spot
    {
      const quantity = reservation.quantity || 1;
      const spot = reservation.parkingSpot;
      // Move this reservation capacity from reserved -> occupied.
      spot.reservedSpaces = Math.max(0, (spot.reservedSpaces || 0) - quantity);
      spot.occupiedSpaces = Math.max(0, (spot.occupiedSpaces || 0) + quantity);

      // Keep legacy flags aligned with counters.
      if (spot.occupiedSpaces > 0) await spot.updateStatus('occupied');
      else if (spot.reservedSpaces > 0) await spot.updateStatus('reserved');
      else await spot.updateStatus('available');
    }
    
    // 🔥 EMIT SOCKET EVENT FOR REAL-TIME UPDATE 🔥
    const io = socketService.getIo();
    if (io) {
      const spot = reservation.parkingSpot;
      io.emit('parkingSpotStatusChanged', {
        spotId: reservation.parkingSpot._id,
        status: spot.status,
        isReserved: spot.isReserved,
        isOccupied: spot.isOccupied
      });
    }
    
    await reservation.save();
    
    res.json({
      success: true,
      message: 'Checked in successfully',
      data: {
        reservation,
        checkInTime: reservation.checkInTime
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Check out
exports.checkOut = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id)
      .populate('parkingSpot');
    
    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found'
      });
    }
    
    if (reservation.user.toString() !== req.user.id && req.user.userType !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }
    
    if (reservation.status !== 'checked-in') {
      return res.status(400).json({
        success: false,
        message: `Cannot check out: reservation is ${reservation.status}`
      });
    }
    
    // Calculate duration and cost
    const checkOutTime = new Date();
    const durationMinutes = Math.ceil((checkOutTime - reservation.checkInTime) / (1000 * 60));
    const hours = Math.ceil(durationMinutes / 60);
    const cost = hours * reservation.parkingSpot.price;
    
    // Update reservation
    reservation.status = 'completed';
    reservation.checkOutTime = checkOutTime;
    reservation.totalAmount = cost;
    
    // Update parking spot
    {
      const quantity = reservation.quantity || 1;
      const spot = reservation.parkingSpot;
      // Move this reservation capacity from occupied -> available.
      spot.occupiedSpaces = Math.max(0, (spot.occupiedSpaces || 0) - quantity);
      spot.availableSpaces = (spot.availableSpaces || 0) + quantity;

      // Keep legacy flags aligned with counters.
      if (spot.occupiedSpaces > 0) await spot.updateStatus('occupied');
      else if (spot.reservedSpaces > 0) await spot.updateStatus('reserved');
      else await spot.updateStatus('available');
    }
    
    // 🔥 EMIT SOCKET EVENT FOR REAL-TIME UPDATE 🔥
    const io = socketService.getIo();
    if (io) {
      const spot = reservation.parkingSpot;
      io.emit('parkingSpotStatusChanged', {
        spotId: reservation.parkingSpot._id,
        status: spot.status,
        isReserved: spot.isReserved,
        isOccupied: spot.isOccupied
      });
    }
    
    await reservation.save();
    
    res.json({
      success: true,
      message: 'Checked out successfully',
      data: {
        reservation,
        duration: {
          minutes: durationMinutes,
          hours: hours
        },
        cost: cost
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = exports;
