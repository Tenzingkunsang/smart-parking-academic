const express = require('express');
const {
  getParkingSpots,
  reserveSpot,
  getMyReservations,
  initializeSpots
} = require('../controllers/parkingController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.get('/spots', getParkingSpots);
router.post('/init', initializeSpots); // For testing only

// Protected routes (require authentication)
router.post('/reserve', authenticateToken, reserveSpot);
router.get('/my-reservations', authenticateToken, getMyReservations);

module.exports = router;
