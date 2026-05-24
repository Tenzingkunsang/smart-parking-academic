const mongoose = require('mongoose');
const ParkingSpot = require('../models/ParkingSpot');
const Review = require('../models/Review');

/**
 * GET /api/v1/parking/smart/nearby?lat=..&lng=..&maxDistance=5000
 *
 * Aggregation pipeline:
 *   $geoNear  -> compute `distance` (meters) from user coordinates
 *   $lookup   -> pull reviews for each spot
 *   $addFields-> averageRating + reviewCount + smartScore (lower = better)
 *   $sort     -> ascending smartScore
 *
 * Smart Score (normalized so lower is better):
 *   (distanceNorm * 0.6) + (priceNorm * 0.2) + ((5 - rating)/5 * 0.2)
 */
exports.getSmartNearbySpots = async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const maxDistance = parseInt(req.query.maxDistance, 10) || 10000; // meters
    const limit = parseInt(req.query.limit, 10) || 25;

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return res.status(400).json({ success: false, message: 'lat and lng are required' });
    }

    const pipeline = [
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [lng, lat] },
          distanceField: 'distance',
          maxDistance,
          spherical: true,
          query: { isActive: true }
        }
      },
      {
        $lookup: {
          from: 'reviews',
          localField: '_id',
          foreignField: 'parkingSpot',
          as: 'reviews'
        }
      },
      {
        $addFields: {
          averageRating: {
            $cond: [
              { $gt: [{ $size: '$reviews' }, 0] },
              { $avg: '$reviews.rating' },
              0
            ]
          },
          reviewCount: { $size: '$reviews' },
          latestReview: { $arrayElemAt: [
            { $slice: [
              { $sortArray: { input: '$reviews', sortBy: { createdAt: -1 } } },
              1
            ] },
            0
          ] }
        }
      },
      {
        $addFields: {
          // Normalize each component into 0..1 so weights are meaningful.
          smartScore: {
            $add: [
              { $multiply: [{ $divide: ['$distance', maxDistance] }, 0.6] },
              { $multiply: [{ $divide: [{ $ifNull: ['$price', 0] }, 200] }, 0.2] },
              { $multiply: [{ $divide: [{ $subtract: [5, '$averageRating'] }, 5] }, 0.2] }
            ]
          }
        }
      },
      { $sort: { smartScore: 1 } },
      { $limit: limit },
      {
        $project: {
          reviews: 0
        }
      }
    ];

    const spots = await ParkingSpot.aggregate(pipeline);

    return res.json({ success: true, count: spots.length, data: spots });
  } catch (err) {
    console.error('[smartParking] getSmartNearbySpots error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/v1/parking/smart/:id/reviews
 */
exports.getSpotReviews = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid spot id' });
    }
    const reviews = await Review.find({ parkingSpot: id })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
    return res.json({ success: true, data: reviews });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/v1/parking/smart/:id/reviews   { rating, comment }
 * Expects req.user from auth middleware.
 */
exports.createReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid spot id' });
    }
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be 1-5' });
    }
    const review = await Review.create({
      parkingSpot: id,
      user: req.user._id || req.user.id,
      userName: req.user.name || req.user.email,
      rating,
      comment
    });
    return res.status(201).json({ success: true, data: review });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
