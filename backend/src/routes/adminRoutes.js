const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Reservation = require('../models/Reservation');
const ParkingSpot = require('../models/ParkingSpot');
const { protect, adminAuth } = require('../middleware/auth');

// Admin dashboard statistics
router.get('/stats', protect, adminAuth, async (req, res) => {
  try {
    const totalSpots = await ParkingSpot.countDocuments();
    const availableSpots = await ParkingSpot.countDocuments({ availableSpaces: { $gt: 0 }, isActive: true });
    const occupiedSpots = await ParkingSpot.countDocuments({ occupiedSpaces: { $gt: 0 } });
    const reservedSpots = await ParkingSpot.countDocuments({ reservedSpaces: { $gt: 0 } });
    const totalUsers = await User.countDocuments({ userType: 'user' });
    const totalAdmins = await User.countDocuments({ userType: 'admin' });
    const activeReservations = await Reservation.countDocuments({ status: 'reserved' });

    // Today's revenue: sum of finalAmount for completed reservations with check-out today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const revenueResult = await Reservation.aggregate([
      { $match: { status: 'completed', checkOutTime: { $gte: today, $lt: tomorrow } } },
      { $group: { _id: null, total: { $sum: '$finalAmount' } } }
    ]);
    const todayRevenue = revenueResult.length ? revenueResult[0].total : 0;

    res.json({
      success: true,
      data: {
        totalSpots,
        availableSpots,
        occupiedSpots,
        reservedSpots,
        totalUsers,
        totalAdmins,
        activeReservations,
        todayRevenue
      }
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all reservations (admin)
router.get('/reservations', protect, adminAuth, async (req, res) => {
  try {
    const reservations = await Reservation.find()
      .populate('user', 'name email phone')
      .populate('parkingSpot', 'locationName address')
      .sort('-createdAt');
    res.json({ success: true, data: reservations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all users (admin)
router.get('/users', protect, adminAuth, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort('-createdAt');
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update user role (admin only)
router.put('/users/:id/role', protect, adminAuth, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { userType: role },
      { new: true }
    ).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete user (admin only)
router.delete('/users/:id', protect, adminAuth, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    // Also delete user's reservations
    await Reservation.deleteMany({ user: req.params.id });
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
