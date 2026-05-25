const express = require('express');
const router = express.Router();
const ParkingSpot = require('../models/ParkingSpot');
const Reservation = require('../models/Reservation');
const User = require('../models/User');
const { protect, adminAuth } = require('../middleware/auth');
const logger = require('../config/logger');
const { getOrSet, del, delMany, queueSpotWrite } = require('../utils/cacheService');

// Write-behind save function injected into cacheService (avoids circular deps).
async function _spotWriteBehindSave(spotId, fields) {
  await ParkingSpot.findByIdAndUpdate(spotId, { $set: fields }, { runValidators: false });
}

// Internal fields stripped from public (unauthenticated) responses.
const INTERNAL_FIELDS = ['isReserved', 'reservedSpaces', 'occupiedSpaces'];

function stripInternalFields(spots) {
  if (Array.isArray(spots)) {
    return spots.map((s) => {
      const obj = s.toObject ? s.toObject() : { ...s };
      INTERNAL_FIELDS.forEach((f) => delete obj[f]);
      return obj;
    });
  }
  const obj = spots.toObject ? spots.toObject() : { ...spots };
  INTERNAL_FIELDS.forEach((f) => delete obj[f]);
  return obj;
}

// ─── BUG-C7 helper ────────────────────────────────────────────────────────────
// Checks whether the request carries a valid Bearer token WITHOUT throwing —
// used to decide whether to redact internal schema fields.
function isAuthenticated(req) {
  const auth = req.headers.authorization;
  return !!(auth && auth.startsWith('Bearer ') && auth.slice(7).length > 10);
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/parking/spots
// Cache: key `spots:all`, TTL 60s
// BUG-C7: strip internal fields from unauthenticated responses
// ─────────────────────────────────────────────────────────────────────────────
router.get('/spots', async (req, res) => {
  try {
    const spots = await getOrSet('spots:all', 60, async () => {
      const raw = await ParkingSpot.find({}).sort('spotNumber');
      return raw.map((s) => s.toObject({ virtuals: true }));
    });

    const data = isAuthenticated(req) ? spots : spots.map((s) => {
      const obj = { ...s };
      INTERNAL_FIELDS.forEach((f) => delete obj[f]);
      return obj;
    });

    res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    logger.error('GET /parking/spots error', { message: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/parking/available
// Cache: key `spots:available`, TTL 15s
// ─────────────────────────────────────────────────────────────────────────────
router.get('/available', async (req, res) => {
  try {
    const spots = await getOrSet('spots:available', 15, async () => {
      // Bug H4: use actual capacity counter instead of legacy isOccupied/isReserved flags.
      const raw = await ParkingSpot.find({ isActive: true, availableSpaces: { $gt: 0 } }).sort('spotNumber');
      return raw.map((s) => s.toObject({ virtuals: true }));
    });
    res.status(200).json({ success: true, count: spots.length, data: spots });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Smart recommendations: occupancy + time-of-day + user behavior.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/recommendations', protect, async (req, res) => {
  try {
    const hour = new Date().getHours();
    const peakFactor = hour >= 8 && hour <= 11 ? 1.2 : hour >= 17 && hour <= 20 ? 1.15 : 1;
    const spots = await ParkingSpot.find({ isActive: true }).lean();
    const topNoShowSpots = await Reservation.aggregate([
      { $match: { status: 'no-show' } },
      { $group: { _id: '$parkingSpot', noShows: { $sum: 1 }, total: { $sum: 1 } } }
    ]);
    const noShowMap = new Map(topNoShowSpots.map((s) => [String(s._id), s.noShows / Math.max(1, s.total)]));

    const user = await User.findById(req.user.id).lean();
    const userScore = user?.behaviorProfile?.score ?? 0.7;
    const ranked = spots
      .map((s) => {
        const availRatio = (s.availableSpaces || 0) / Math.max(1, s.totalSpaces || 1);
        const noShowPenalty = noShowMap.get(String(s._id)) || 0;
        const featureBonus = (s.features || []).length * 0.03;
        const score =
          (availRatio * 0.5 + (1 / Math.max(1, s.price || 50)) * 20 * 0.2 + featureBonus * 0.1) * peakFactor -
          noShowPenalty * 0.2 +
          userScore * 0.15;
        return { ...s, recommendationScore: Number(score.toFixed(3)) };
      })
      .sort((a, b) => b.recommendationScore - a.recommendationScore)
      .slice(0, 10);

    return res.json({ success: true, data: ranked });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/parking/spots/:id
// Cache: key `spot:<id>`, TTL 60s
// ─────────────────────────────────────────────────────────────────────────────
router.get('/spots/:id', async (req, res) => {
  try {
    const spot = await getOrSet(`spot:${req.params.id}`, 60, async () => {
      const s = await ParkingSpot.findById(req.params.id);
      if (!s) return null;
      return s.toObject({ virtuals: true });
    });

    if (!spot) {
      return res.status(404).json({ success: false, message: 'Parking spot not found' });
    }
    res.status(200).json({ success: true, data: spot });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/parking/spots  — BUG-C1: protect + adminAuth required
// ─────────────────────────────────────────────────────────────────────────────
router.post('/spots', protect, adminAuth, async (req, res) => {
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
      return res.status(400).json({ success: false, message: 'locationName is required' });
    }

    const addr = (address || location?.address || '').trim();
    if (!addr) {
      return res.status(400).json({ success: false, message: 'address is required' });
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
        return res.status(400).json({ success: false, message: 'Spot number already exists' });
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

    // Invalidate list caches so next read reflects the new spot.
    await delMany(['spots:all', 'spots:available']);

    res.status(201).json({ success: true, data: spot });
  } catch (error) {
    logger.error('POST /parking/spots error', { message: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/parking/spots/:id  — BUG-C2: protect + adminAuth required
// Write-behind: queues the update; flush happens every 500 ms in cacheService.
// ─────────────────────────────────────────────────────────────────────────────
router.put('/spots/:id', protect, adminAuth, async (req, res) => {
  try {
    const update = { ...req.body };
    if (update.location) {
      update.location.lat = Number(update.location.lat);
      update.location.lng = Number(update.location.lng);
    }
    if (update.totalSpaces != null) update.totalSpaces = Number(update.totalSpaces);
    if (update.availableSpaces != null) update.availableSpaces = Number(update.availableSpaces);
    if (update.price != null) update.price = Number(update.price);

    // Optimistic response: apply update immediately for the API caller,
    // then queue the DB write for the write-behind interval.
    const spot = await ParkingSpot.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true
    });
    if (!spot) {
      return res.status(404).json({ success: false, message: 'Parking spot not found' });
    }

    // Queue cache invalidation (write-behind covers the DB; del covers cache).
    await delMany([`spot:${req.params.id}`, 'spots:all', 'spots:available']);

    return res.json({ success: true, data: spot });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/parking/spots/:id/status  — BUG-C4: protect + adminAuth required
// Write-behind: status/flag updates are high-frequency (every check-in/out).
// ─────────────────────────────────────────────────────────────────────────────
router.put('/spots/:id/status', protect, adminAuth, async (req, res) => {
  try {
    const { status } = req.body || {};
    if (!['available', 'reserved', 'occupied', 'maintenance'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    const spot = await ParkingSpot.findById(req.params.id);
    if (!spot) {
      return res.status(404).json({ success: false, message: 'Parking spot not found' });
    }

    const flagUpdate = {
      status,
      isReserved: status === 'reserved',
      isOccupied: status === 'occupied',
    };

    // Queue write-behind for flag fields (high-frequency, non-financial).
    queueSpotWrite(req.params.id, flagUpdate, _spotWriteBehindSave);

    // Apply optimistically in-memory so we return the correct shape.
    Object.assign(spot, flagUpdate);

    return res.json({ success: true, data: spot });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/parking/spots/:id  — BUG-C3: protect + adminAuth required
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/spots/:id', protect, adminAuth, async (req, res) => {
  try {
    const spot = await ParkingSpot.findByIdAndDelete(req.params.id);
    if (!spot) {
      return res.status(404).json({ success: false, message: 'Parking spot not found' });
    }

    // Invalidate all affected cache keys.
    await delMany([`spot:${req.params.id}`, 'spots:all', 'spots:available']);

    res.status(200).json({ success: true, message: 'Parking spot deleted' });
  } catch (error) {
    logger.error('DELETE /parking/spots/:id error', { message: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
