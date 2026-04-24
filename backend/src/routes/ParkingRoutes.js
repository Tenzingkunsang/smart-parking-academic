const express = require('express');
const router = express.Router();
const ParkingSpot = require('../models/ParkingSpot');
const Reservation = require('../models/Reservation');

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

// Smart recommendations: occupancy + time-of-day + user behavior.
router.get('/recommendations', async (req, res) => {
  try {
    const hour = new Date().getHours();
    const peakFactor = hour >= 8 && hour <= 11 ? 1.2 : hour >= 17 && hour <= 20 ? 1.15 : 1;
    const spots = await ParkingSpot.find({ isActive: true }).lean();
    const topNoShowSpots = await Reservation.aggregate([
      { $match: { status: 'no-show' } },
      { $group: { _id: '$parkingSpot', noShows: { $sum: 1 }, total: { $sum: 1 } } }
    ]);
    const noShowMap = new Map(topNoShowSpots.map((s) => [String(s._id), s.noShows / Math.max(1, s.total)]));

    const ranked = spots
      .map((s) => {
        const availRatio = (s.availableSpaces || 0) / Math.max(1, s.totalSpaces || 1);
        const noShowPenalty = noShowMap.get(String(s._id)) || 0;
        const featureBonus = (s.features || []).length * 0.03;
        const score =
          (availRatio * 0.5 + (1 / Math.max(1, s.price || 50)) * 20 * 0.2 + featureBonus * 0.1) * peakFactor -
          noShowPenalty * 0.2;
        return { ...s, recommendationScore: Number(score.toFixed(3)) };
      })
      .sort((a, b) => b.recommendationScore - a.recommendationScore)
      .slice(0, 10);

    return res.json({ success: true, data: ranked });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
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

// @route   PUT /api/parking/spots/:id
// @desc    Update a parking spot
router.put('/spots/:id', async (req, res) => {
  try {
    const update = { ...req.body };
    if (update.location) {
      update.location.lat = Number(update.location.lat);
      update.location.lng = Number(update.location.lng);
    }
    if (update.totalSpaces != null) update.totalSpaces = Number(update.totalSpaces);
    if (update.availableSpaces != null) update.availableSpaces = Number(update.availableSpaces);
    if (update.price != null) update.price = Number(update.price);

    const spot = await ParkingSpot.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true
    });
    if (!spot) {
      return res.status(404).json({ success: false, message: 'Parking spot not found' });
    }
    return res.json({ success: true, data: spot });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/parking/spots/:id/status
// @desc    Update spot status and availability flags
router.put('/spots/:id/status', async (req, res) => {
  try {
    const { status } = req.body || {};
    if (!['available', 'reserved', 'occupied', 'maintenance'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    const spot = await ParkingSpot.findById(req.params.id);
    if (!spot) {
      return res.status(404).json({ success: false, message: 'Parking spot not found' });
    }
    spot.status = status;
    spot.isReserved = status === 'reserved';
    spot.isOccupied = status === 'occupied';
    await spot.save();
    return res.json({ success: true, data: spot });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
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
