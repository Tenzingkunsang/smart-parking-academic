const express = require('express');
const router = express.Router();
const {
  getPeakDemand,
  getSmartInsights,
  getSystemStatus,
} = require('../controllers/adminAnalyticsController');
const { protect, adminAuth } = require('../middleware/auth');

router.get('/peak-demand', protect, adminAuth, getPeakDemand);
router.get('/insights', protect, adminAuth, getSmartInsights);
router.get('/system-status', protect, adminAuth, getSystemStatus);

module.exports = router;
