const ParkingSpot = require('../models/ParkingSpot');
const QRCode = require('qrcode');
const socketService = require('../services/socketService');

// @desc    Get all parking spots
exports.getParkingSpots = async (req, res) => {
  try {
    const spots = await ParkingSpot.find({}).sort('spotNumber');
    res.status(200).json({
      success: true,
      count: spots.length,
      data: spots
    });
  } catch (error) {
    console.error('Error in getParkingSpots:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get available parking spots
exports.getAvailableSpots = async (req, res) => {
  try {
    const { vehicleType } = req.query;
    let query = { 
      isOccupied: false, 
      isReserved: false 
    };
    
    if (vehicleType) {
      query.vehicleType = vehicleType;
    }
    
    const spots = await ParkingSpot.find(query).sort('spotNumber');
    res.status(200).json({
      success: true,
      count: spots.length,
      data: spots
    });
  } catch (error) {
    console.error('Error in getAvailableSpots:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single parking spot
exports.getParkingSpot = async (req, res) => {
  try {
    const spot = await ParkingSpot.findById(req.params.id);
    if (!spot) {
      return res.status(404).json({
        success: false,
        message: 'Parking spot not found'
      });
    }
    res.status(200).json({
      success: true,
      data: spot
    });
  } catch (error) {
    console.error('Error in getParkingSpot:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create new parking spot (Admin only)
exports.createParkingSpot = async (req, res) => {
  try {
    const { spotNumber, locationName, price, vehicleType, location, qrCode } = req.body;
    
    // Validate required fields
    if (!spotNumber || !locationName || !location || !location.lat || !location.lng) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: spotNumber, locationName, location.lat, location.lng'
      });
    }
    
    // Check if spot already exists
    const existingSpot = await ParkingSpot.findOne({ spotNumber });
    if (existingSpot) {
      return res.status(400).json({
        success: false,
        message: `Spot number ${spotNumber} already exists`
      });
    }
    
    // Generate QR code if not provided
    let qrCodeData = qrCode;
    if (!qrCodeData) {
      const qrData = JSON.stringify({ 
        spotNumber, 
        locationName,
        lat: location.lat,
        lng: location.lng
      });
      qrCodeData = await QRCode.toDataURL(qrData);
    }
    
    const spot = await ParkingSpot.create({
      spotNumber,
      locationName,
      price: price || 50,
      vehicleType: vehicleType || 'car',
      location,
      qrCode: qrCodeData,
      isOccupied: false,
      isReserved: false
    });
    
    res.status(201).json({
      success: true,
      message: 'Parking spot created successfully',
      data: spot
    });
  } catch (error) {
    console.error('Error in createParkingSpot:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update parking spot (Admin only)
exports.updateParkingSpot = async (req, res) => {
  try {
    const spot = await ParkingSpot.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!spot) {
      return res.status(404).json({
        success: false,
        message: 'Parking spot not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Parking spot updated successfully',
      data: spot
    });
  } catch (error) {
    console.error('Error in updateParkingSpot:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete parking spot (Admin only)
exports.deleteParkingSpot = async (req, res) => {
  try {
    const spot = await ParkingSpot.findByIdAndDelete(req.params.id);
    
    if (!spot) {
      return res.status(404).json({
        success: false,
        message: 'Parking spot not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Parking spot deleted successfully'
    });
  } catch (error) {
    console.error('Error in deleteParkingSpot:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update spot status (Admin only)
exports.updateSpotStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status || !['available', 'reserved', 'occupied', 'maintenance'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be: available, reserved, occupied, maintenance'
      });
    }
    
    const spot = await ParkingSpot.findById(req.params.id);
    
    if (!spot) {
      return res.status(404).json({
        success: false,
        message: 'Parking spot not found'
      });
    }
    
    // Update status
    spot.status = status;
    spot.isOccupied = status === 'occupied';
    spot.isReserved = status === 'reserved';
    
    await spot.save();

    const io = socketService.getIo();
    if (io) io.emit('parkingSpotStatusChanged', { spotId: spot._id, status: spot.status });
    
    res.status(200).json({
      success: true,
      message: `Spot status updated to ${status}`,
      data: spot
    });
  } catch (error) {
    console.error('Error in updateSpotStatus:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
