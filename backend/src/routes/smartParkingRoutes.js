const express = require('express');
const router = express.Router();
const {
  getSmartNearbySpots,
  getSpotReviews,
  createReview,
} = require('../controllers/smartParkingController');
const { protect } = require('../middleware/auth');

// Bug HIGH-3 / NEW: never use a no-op fallback for auth. If the import fails,
// the file should fail loudly at startup rather than silently bypassing security.

router.get('/nearby', getSmartNearbySpots);
router.get('/:id/reviews', getSpotReviews);
router.post('/:id/reviews', protect, createReview);

module.exports = router;
