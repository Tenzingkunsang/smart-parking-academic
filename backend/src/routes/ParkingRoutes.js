const express = require('express');
const router = express.Router();
const ParkingSpot = require('../models/ParkingSpot');

// @route   GET /api/parking/spots
// @desc    Get all parking spots
router.get('/spots', async (req, res) => {
  try {
    const spots = await ParkingSpot.find({}).sort('spotNumber');
    res.status(200).json({
      success: true,
      count: spots.length,
      data: spots
    });
  } catch (error) {
    console.error('Error fetching spots:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/parking/available
// @desc    Get availablende parking spots
router.get('/available', async (req, res) => {
  try {
    const spots = await ParkingSpot.find({ 
      isOccupied: false, 
      isReserved: false,
      status: 'available'
    }).sort('spotNumber');
    res.status(200).json({
      success: true,
      count: spots.length,
      data: spots
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/parking/spots/:id
// @desc    Get single parking spot
router.get('/spots/:id', async (req, res) => {
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
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/parking/spots
// @desc    Create a new parking spot (Admin / dashboard)
// Body must match ParkingSpot schema: locationName, address, location.lat/lng, totalSpaces, etc.
router.post('/spots', async (req, res) => {
  try {
    const {
      locationName,
      address,
      price,
      vehicleType,
      location,
      totalSpaces,
      spotNumber,
      lat,
      lng
    } = req.body;

    const latNum = parseFloat(location?.lat ?? lat);
    const lngNum = parseFloat(location?.lng ?? lng);

    if (!locationName || typeof locationName !== 'string' || !locationName.trim()) {
      return res.status(400).json({
        success: false,
        message: 'locationName is required'
      });
    }

    const addr = (address || location?.address || '').trim();
    if (!addr) {
      return res.status(400).json({
        success: false,
        message: 'address is required'
      });
    }

    if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
      return res.status(400).json({
        success: false,
        message: 'Valid latitude and longitude are required (location.lat, location.lng or lat, lng)'
      });
    }

    let numSpot = spotNumber;
    if (numSpot != null && numSpot !== '') {
      numSpot = Number(numSpot);
      if (!Number.isFinite(numSpot)) {
        return res.status(400).json({ success: false, message: 'spotNumber must be a number' });
      }
      const existingSpot = await ParkingSpot.findOne({ spotNumber: numSpot });
      if (existingSpot) {
        return res.status(400).json({
          success: false,
          message: 'Spot number already exists'
        });
      }
    } else {
      const last = await ParkingSpot.findOne({ spotNumber: { $ne: null } })
        .sort({ spotNumber: -1 })
        .select('spotNumber')
        .lean();
      numSpot = last && last.spotNumber != null ? last.spotNumber + 1 : 1;
    }

    const total = Math.max(1, parseInt(totalSpaces, 10) || 10);
    const vt = vehicleType === 'motorcycle' ? 'motorcycle' : 'car';

    const spot = await ParkingSpot.create({
      spotNumber: numSpot,
      locationName: locationName.trim(),
      address: addr,
      location: { lat: latNum, lng: lngNum },
      totalSpaces: total,
      availableSpaces: total,
      reservedSpaces: 0,
      occupiedSpaces: 0,
      price: price != null && price !== '' ? Number(price) : 50,
      vehicleType: vt,
      vehicleTypes: [vt],
      isOccupied: false,
      isReserved: false,
      status: 'available',
      isActive: true
    });

    res.status(201).json({
      success: true,
      data: spot
    });
  } catch (error) {
    console.error('POST /parking/spots:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   DELETE /api/parking/spots/:id
// @desc    Delete a parking spot
router.delete('/spots/:id', async (req, res) => {
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
      message: 'Parking spot deleted'
    });
  } catch (error) {
    console.error('DELETE /parking/spots/:id:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
