const express = require('express');
const { protect } = require('../middleware/auth');
const userController = require('../controllers/userController');

const router = express.Router();

router.get('/profile', protect, userController.getProfile);
router.put('/profile', protect, userController.updateProfile);
router.put('/change-password', protect, userController.changePassword);

module.exports = router;
