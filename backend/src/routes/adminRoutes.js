/**
 * adminRoutes.js  –  REWRITTEN
 *
 * Fix applied:
 *  [6] Revenue aggregation now sums 'finalAmount' (not 'totalAmount').
 *      finalAmount = base charge + any overstay charge, set at checkout.
 *      totalAmount = pre-paid amount at booking time (never changes).
 */

const express = require('express');
const router  = express.Router();

const User        = require('../models/User');
const Reservation = require('../models/Reservation');
const ParkingSpot = require('../models/ParkingSpot');
const ScheduledJob = require('../models/ScheduledJob');
const { protect, adminAuth } = require('../middleware/auth');

// ─────────────────────────────────────────────────────────────────────────────
// GET /admin/stats
// FIX [6]: uses $sum: '$finalAmount' for revenue
// ─────────────────────────────────────────────────────────────────────────────
router.get('/stats', protect, adminAuth, async (req, res) => {
  try {
    const [
      totalSpots,
      availableSpots,
      occupiedSpots,
      reservedSpots,
      totalUsers,
      totalAdmins,
      activeReservations,
    ] = await Promise.all([
      ParkingSpot.countDocuments(),
      ParkingSpot.countDocuments({ availableSpaces: { $gt: 0 }, isActive: true }),
      ParkingSpot.countDocuments({ occupiedSpaces:  { $gt: 0 } }),
      ParkingSpot.countDocuments({ reservedSpaces:  { $gt: 0 } }),
      User.countDocuments({ userType: 'user' }),
      User.countDocuments({ userType: 'admin' }),
      Reservation.countDocuments({ status: 'reserved' }),
    ]);

    // Today's revenue: sum of finalAmount for completed check-outs today
    // FIX [6]: was '$totalAmount' — now correctly '$finalAmount'
    const today    = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

    const revenueResult = await Reservation.aggregate([
      {
        $match: {
          status:       'completed',
          checkOutTime: { $gte: today, $lt: tomorrow },
        },
      },
      {
        $group: {
          _id:   null,
          total: { $sum: '$finalAmount' },   // FIX [6]
        },
      },
    ]);
    const todayRevenue = revenueResult.length ? revenueResult[0].total : 0;

    // Total overstay revenue collected today
    const overstayResult = await Reservation.aggregate([
      {
        $match: {
          status:         'completed',
          checkOutTime:   { $gte: today, $lt: tomorrow },
          overstayCharge: { $gt: 0 },
        },
      },
      { $group: { _id: null, total: { $sum: '$overstayCharge' } } },
    ]);
    const todayOverstayRevenue = overstayResult.length ? overstayResult[0].total : 0;

    // Users currently blocked due to unpaid overstay debt
    const usersWithDebt = await User.countDocuments({ overstayDebt: { $gt: 0 } });

    const noShowCount = await Reservation.countDocuments({ status: 'no-show' });
    const peakUsageByHour = await Reservation.aggregate([
      { $match: { checkInTime: { $ne: null } } },
      { $group: { _id: { $hour: '$checkInTime' }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);
    const spotPerformance = await Reservation.aggregate([
      { $match: { status: { $in: ['completed', 'no-show'] } } },
      { $group: { _id: '$parkingSpot', bookings: { $sum: 1 }, noShows: { $sum: { $cond: [{ $eq: ['$status', 'no-show'] }, 1, 0] } }, revenue: { $sum: '$finalAmount' } } },
      { $sort: { revenue: -1 } },
      { $limit: 10 }
    ]);

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
        todayRevenue,            // base + overstay  (FIX [6])
        todayOverstayRevenue,    // overstay portion only
        usersWithDebt,           // users blocked from booking
        noShowCount,
        peakUsageByHour,
        spotPerformance,
      },
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /admin/reservations
// ─────────────────────────────────────────────────────────────────────────────
router.get('/reservations', protect, adminAuth, async (req, res) => {
  try {
    const reservations = await Reservation.find()
      .populate('user',        'name email phone')
      .populate('parkingSpot', 'locationName address spotNumber')
      .sort('-createdAt');
    res.json({ success: true, data: reservations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /admin/users
// ─────────────────────────────────────────────────────────────────────────────
router.get('/users', protect, adminAuth, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort('-createdAt');
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /admin/users/:id/role
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /admin/users/:id
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/users/:id', protect, adminAuth, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    await Reservation.deleteMany({ user: req.params.id });
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /admin/users/:id/clear-debt  – admin manually clears overstay debt
// ─────────────────────────────────────────────────────────────────────────────
router.put('/users/:id/clear-debt', protect, adminAuth, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: { overstayDebt: 0 } },
      { new: true }
    ).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, message: 'Overstay debt cleared', data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/jobs/metrics', protect, adminAuth, async (req, res) => {
  try {
    const [pending, completed, failed] = await Promise.all([
      ScheduledJob.countDocuments({ status: 'pending' }),
      ScheduledJob.countDocuments({ status: 'completed' }),
      ScheduledJob.countDocuments({ status: 'failed' }),
    ]);
    const latencyRows = await ScheduledJob.aggregate([
      { $match: { status: 'completed' } },
      { $project: { latencyMs: { $subtract: ['$updatedAt', '$runAt'] } } },
      { $group: { _id: null, avgLatencyMs: { $avg: '$latencyMs' }, maxLatencyMs: { $max: '$latencyMs' } } }
    ]);
    return res.json({
      success: true,
      data: {
        pending,
        completed,
        failed,
        avgLatencyMs: Math.round(latencyRows[0]?.avgLatencyMs || 0),
        maxLatencyMs: Math.round(latencyRows[0]?.maxLatencyMs || 0),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/jobs/failed', protect, adminAuth, async (req, res) => {
  try {
    const jobs = await ScheduledJob.find({ status: 'failed' }).sort('-updatedAt').limit(100);
    return res.json({ success: true, data: jobs });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/jobs/:id/retry', protect, adminAuth, async (req, res) => {
  try {
    const job = await ScheduledJob.findByIdAndUpdate(
      req.params.id,
      { $set: { status: 'pending', runAt: new Date(), lastError: null } },
      { new: true }
    );
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    return res.json({ success: true, data: job });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;