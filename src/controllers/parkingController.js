const ParkingSpot = require('../models/ParkingSpot');
const Reservation = require('../models/Reservation');

// @desc    Get all parking spots
// @route   GET /api/parking/spots
// @access  Public
exports.getParkingSpots = async (req, res) => {
  try {
    const spots = await ParkingSpot.find().sort({ spotNumber: 1 });
    
    const available = spots.filter(s => !s.isOccupied && !s.isReserved).length;
    const occupied = spots.filter(s => s.isOccupied).length;
    const reserved = spots.filter(s => s.isReserved).length;
    
    res.json({
      success: true,
      summary: {
        total: spots.length,
        available,
        occupied,
        reserved
      },
      data: spots
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Reserve a parking spot
// @route   POST /api/parking/reserve
// @access  Private
exports.reserveSpot = async (req, res) => {
  try {
    const { spotNumber, duration } = req.body;
    const userId = req.user.id;
    
    // Find the spot
    const spot = await ParkingSpot.findOne({ spotNumber });
    if (!spot) {
      return res.status(404).json({
        success: false,
        message: 'Parking spot not found'
      });
    }
    
    // Check if spot is available
    if (spot.isOccupied) {
      return res.status(400).json({
        success: false,
        message: 'Parking spot is already occupied'
      });
    }
    
    if (spot.isReserved) {
      return res.status(400).json({
        success: false,
        message: 'Parking spot is already reserved'
      });
    }
    
    // Calculate expiry time (default 15 minutes)
    const reservationExpiry = new Date();
    reservationExpiry.setMinutes(reservationExpiry.getMinutes() + (duration || 15));
    
    // Reserve the spot
    spot.isReserved = true;
    spot.reservedBy = userId;
    spot.reservationExpiry = reservationExpiry;
    await spot.save();
    
    // Create reservation record
    const reservation = new Reservation({
      user: userId,
      parkingSpot: spot._id,
      duration: duration || 60,
      status: 'reserved',
      qrCodeData: `SMARTPARK:${spot._id}:${userId}:${Date.now()}`
    });
    await reservation.save();
    
    res.json({
      success: true,
      message: 'Parking spot reserved successfully',
      reservation: {
        id: reservation._id,
        spotNumber: spot.spotNumber,
        reservedUntil: reservationExpiry,
        qrCodeData: reservation.qrCodeData,
        instructions: 'Show QR code at parking entrance'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get user's reservations
// @route   GET /api/parking/my-reservations
// @access  Private
exports.getMyReservations = async (req, res) => {
  try {
    const reservations = await Reservation.find({ user: req.user.id })
      .populate('parkingSpot', 'spotNumber vehicleType')
      .sort({ reservationTime: -1 });
    
    res.json({
      success: true,
      count: reservations.length,
      data: reservations
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Initialize parking spots (for testing)
// @route   POST /api/parking/init
// @access  Public (for testing)
exports.initializeSpots = async (req, res) => {
  try {
    await ParkingSpot.deleteMany({});
    
    const spots = [];
    for (let i = 1; i <= 10; i++) {
      const spot = new ParkingSpot({
        spotNumber: i,
        vehicleType: i === 1 ? 'disabled' :
                    i === 2 ? 'electric' :
                    i <= 4 ? 'motorcycle' : 'car',
        qrCode: `SP-QR-${i}-${Date.now()}`
      });
      await spot.save();
      spots.push(spot);
    }
    
    res.json({
      success: true,
      message: 'Initialized 10 parking spots',
      data: spots
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
