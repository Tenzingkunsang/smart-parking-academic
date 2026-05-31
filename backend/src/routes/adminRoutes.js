

const express = require('express');
const router  = express.Router();

const User        = require('../models/User');
const Reservation = require('../models/Reservation');
const ParkingSpot = require('../models/ParkingSpot');
const ScheduledJob = require('../models/ScheduledJob');
const AuthAuditLog = require('../models/AuthAuditLog');
const FailedRefund = require('../models/FailedRefund');
const userController = require('../controllers/userController');
const reservationController = require('../controllers/reservationController');
const notificationService = require('../services/notificationService');
const { releaseReservedSpotAndPromote, updateSpotStatusFlags } = require('../services/reservationLifecycleService');
const jobSchedulerService = require('../services/jobSchedulerService');
const { protect, adminAuth } = require('../middleware/auth');
const logger = require('../config/logger');


router.put('/users/:id/reset-violations', protect, adminAuth, userController.resetViolations);



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
      Reservation.countDocuments({ status: { $in: ['reserved', 'checked-in', 'overstay'] } }),
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
          total: { $sum: '$amountInfo.finalAmount' },  // nested field
        },
      },
    ]);
    const todayRevenue = revenueResult.length ? revenueResult[0].total : 0;

    const totalRevenueResult = await Reservation.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amountInfo.finalAmount' } } },
    ]);
    const totalRevenue = totalRevenueResult.length ? totalRevenueResult[0].total : 0;

    // BUG-H5: match on the nested path `overstayInfo.overstayCharge`, not the
    // non-existent top-level `overstayCharge` field that always evaluated to null.
    const overstayResult = await Reservation.aggregate([
      {
        $match: {
          status:                       'completed',
          checkOutTime:                 { $gte: today, $lt: tomorrow },
          'overstayInfo.overstayCharge': { $gt: 0 },
        },
      },
      { $group: { _id: null, total: { $sum: '$overstayInfo.overstayCharge' } } },
    ]);
    const todayOverstayRevenue = overstayResult.length ? overstayResult[0].total : 0;

    // Users currently blocked due to unpaid overstay debt
    const usersWithDebt = await User.countDocuments({ overstayDebt: { $gt: 0 } });

    const noShowCount = await Reservation.countDocuments({ status: 'no-show' });
    // BUG-M5: count system-wide pending refunds so the dashboard card is accurate.
    const pendingRefundsCount = await Reservation.countDocuments({
      status: 'cancelled',
      'refundInfo.refundStatus': 'pending',
    });
    const peakUsageByHour = await Reservation.aggregate([
      { $match: { checkInTime: { $ne: null } } },
      { $group: { _id: { $hour: '$checkInTime' }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);
    const spotPerformance = await Reservation.aggregate([
      { $match: { status: { $in: ['completed', 'no-show'] } } },
      { $group: { _id: '$parkingSpot', bookings: { $sum: 1 }, noShows: { $sum: { $cond: [{ $eq: ['$status', 'no-show'] }, 1, 0] } }, revenue: { $sum: '$amountInfo.finalAmount' } } },
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
        totalRevenue,
        todayOverstayRevenue,    // overstay portion only
        usersWithDebt,           // users blocked from booking
        noShowCount,
        pendingRefundsCount,
        peakUsageByHour,
        spotPerformance,
      },
    });
  } catch (error) {
    // BUG-M6: use winston logger, not console.error.
    logger.error('admin_stats_error', { message: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /admin/reservations
// ─────────────────────────────────────────────────────────────────────────────
// BUG-H3: honour ?limit=N so the dashboard can request only the last 5 rows
// without downloading the entire reservation collection.
router.get('/reservations', protect, adminAuth, async (req, res) => {
  try {
    const limitParam = parseInt(req.query.limit, 10);
    const query = Reservation.find()
      .populate('user',        'name email phone')
      .populate('parkingSpot', 'locationName address spotNumber')
      .sort('-createdAt');
    if (Number.isFinite(limitParam) && limitParam > 0) query.limit(limitParam);
    const reservations = await query;
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
    if (!['user', 'admin', 'business_owner'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role. Must be user, admin, or business_owner' });
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

router.get('/security/auth-logs', protect, adminAuth, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit || 100), 200);
    const logs = await AuthAuditLog.find()
      .populate('user', 'email userType')
      .sort('-createdAt')
      .limit(limit);
    return res.json({ success: true, data: logs });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Bug Task-6: admin endpoints to inspect + retry failed refunds.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/refunds/failed', protect, adminAuth, async (req, res) => {
  try {
    const status = req.query.status;
    const filter = status ? { status } : {};
    const items = await FailedRefund.find(filter)
      .populate('user', 'name email')
      .populate('reservation', 'amountInfo paymentMethod status')
      .sort('-createdAt')
      .limit(200);
    return res.json({ success: true, data: items });
  } catch (error) {
    logger.error('list_failed_refunds_error', { message: error.message });
    return res.status(500).json({ success: false, message: 'Could not list failed refunds.' });
  }
});

router.post('/refunds/failed/:id/retry', protect, adminAuth, async (req, res) => {
  try {
    const record = await FailedRefund.findById(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Failed refund record not found.' });
    if (record.status === 'resolved') {
      return res.status(400).json({ success: false, message: 'This refund is already resolved.' });
    }
    record.status = 'retrying';
    record.attempts = (record.attempts || 0) + 1;
    record.lastAttemptAt = new Date();
    await record.save();

    // Bookings are non-refundable — just mark the record resolved so it clears from the queue.
    record.status = 'resolved';
    record.resolvedAt = new Date();
    record.resolvedBy = req.user.id;
    record.errorMessage = 'Marked resolved by admin — refunds no longer applicable.';
    await record.save();
    return res.json({ success: true, message: 'Record marked as resolved.' });
  } catch (error) {
    logger.error('retry_failed_refund_error', { message: error.message });
    return res.status(500).json({ success: false, message: 'Retry failed.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Business owner management — admin only
// ─────────────────────────────────────────────────────────────────────────────

// GET /admin/business-owners  — list all business owner accounts
router.get('/business-owners', protect, adminAuth, async (req, res) => {
  try {
    const owners = await User.find({ userType: 'business_owner' })
      .select('-password -refreshTokens')
      .sort('-createdAt');
    res.json({ success: true, data: owners });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /admin/users/:id/verify-business  — approve or suspend a business owner
router.put('/users/:id/verify-business', protect, adminAuth, async (req, res) => {
  try {
    const { verified, suspend } = req.body;
    const update = {};
    if (verified !== undefined) update['businessProfile.verified'] = Boolean(verified);
    if (suspend !== undefined)  update['businessProfile.suspendedAt'] = suspend ? new Date() : null;

    const user = await User.findByIdAndUpdate(req.params.id, { $set: update }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /admin/spots/:spotId/assign-owner  — assign/remove a parking spot owner
router.put('/spots/:spotId/assign-owner', protect, adminAuth, async (req, res) => {
  try {
    const { ownerId } = req.body; // null to unassign (make platform spot)
    if (ownerId) {
      const owner = await User.findById(ownerId);
      if (!owner || owner.userType !== 'business_owner') {
        return res.status(400).json({ success: false, message: 'ownerId must be a valid business_owner account' });
      }
    }
    const spot = await ParkingSpot.findByIdAndUpdate(
      req.params.spotId,
      { $set: { owner: ownerId || null } },
      { new: true }
    );
    if (!spot) return res.status(404).json({ success: false, message: 'Spot not found' });
    res.json({ success: true, data: spot });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /admin/reservations/:id  — full detail for one reservation
// ─────────────────────────────────────────────────────────────────────────────
router.get('/reservations/:id', protect, adminAuth, async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id)
      .populate('user', 'name email phone vehicleNumber overstayDebt violationCount penaltyActive')
      .populate('parkingSpot', 'locationName address spotNumber price totalSpaces');
    if (!reservation) return res.status(404).json({ success: false, message: 'Reservation not found' });
    res.json({ success: true, data: reservation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /admin/reservations/:id/checkin  — admin manual check-in
// ─────────────────────────────────────────────────────────────────────────────
router.post('/reservations/:id/checkin', protect, adminAuth, (req, res) => {
  req.params.id = req.params.id;
  return reservationController.adminCheckIn(req, res);
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /admin/reservations/:id/checkout  — admin manual check-out
// ─────────────────────────────────────────────────────────────────────────────
router.post('/reservations/:id/checkout', protect, adminAuth, (req, res) => {
  return reservationController.adminCheckOut(req, res);
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /admin/reservations/:id/force-cancel
// Cancels ANY active status (reserved, checked-in, overstay) with admin reason.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/reservations/:id/force-cancel', protect, adminAuth, async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id).populate('parkingSpot user');
    if (!reservation) return res.status(404).json({ success: false, message: 'Reservation not found' });

    const cancellableStatuses = ['pending', 'reserved', 'checked-in', 'overstay'];
    if (!cancellableStatuses.includes(reservation.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel reservation in '${reservation.status}' state.`,
      });
    }

    const { reason = 'Cancelled by admin' } = req.body;
    const priorStatus = reservation.status;
    const qty = reservation.quantity || 1;

    // 'pending' reservations have not had holdSpotAtomically called yet —
    // no counters were decremented, so touching them here would corrupt the spot.
    const heldCounters = priorStatus !== 'pending';
    if (heldCounters) {
      const wasCheckedIn = ['checked-in', 'overstay'].includes(priorStatus);
      await ParkingSpot.findByIdAndUpdate(
        reservation.parkingSpot._id,
        wasCheckedIn
          ? { $inc: { availableSpaces: qty, occupiedSpaces: -qty } }
          : { $inc: { availableSpaces: qty, reservedSpaces: -qty } },
      );
    }

    reservation.status = 'cancelled';
    reservation.lifecycleStage = 'cancelled';
    reservation.noShowInfo = {
      markedAt: new Date(),
      reason: 'admin_cancelled',
    };
    await reservation.save();

    await jobSchedulerService.cancelReservationJobs(reservation._id);

    // Rebuild spot status flags
    const spot = await ParkingSpot.findById(reservation.parkingSpot._id);
    if (spot) {
      updateSpotStatusFlags(spot);
      await spot.save();
    }

    // Notify user
    try {
      await notificationService.sendNotification(
        reservation.user._id,
        'Reservation Cancelled by Admin',
        `Your reservation for Spot #${reservation.parkingSpot.spotNumber} has been cancelled by an administrator. Reason: ${reason}. Please contact support if you have questions.`,
        'admin_action',
        { reservationId: reservation._id, reason, spotNumber: reservation.parkingSpot.spotNumber }
      );
    } catch (notifErr) {
      logger.error('force_cancel_notification_failed', { message: notifErr.message });
    }

    // skipCounters only when we already updated counters above (i.e. was not pending)
    await releaseReservedSpotAndPromote({
      reservation,
      releaseReason: 'admin_cancelled',
      skipCounters: heldCounters,
      priorStatus,
    });

    res.json({ success: true, message: 'Reservation force-cancelled.', data: reservation });
  } catch (error) {
    logger.error('force_cancel_error', { message: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /admin/reservations/:id  — admin edit reservation fields
// Editable: duration, scheduledArrival, vehiclePlate, adminNote,
//           amountInfo.finalAmount (override), status (limited transitions)
// ─────────────────────────────────────────────────────────────────────────────
router.put('/reservations/:id', protect, adminAuth, async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id).populate('parkingSpot user');
    if (!reservation) return res.status(404).json({ success: false, message: 'Reservation not found' });

    const {
      duration,
      scheduledArrival,
      vehiclePlate,
      adminNote,
      overrideFinalAmount,
    } = req.body;

    const changes = [];

    if (duration !== undefined) {
      const d = parseInt(duration, 10);
      if (!isNaN(d) && d >= 15 && d <= 1440) {
        reservation.duration = d;
        // Recalculate estimated checkout if checked in
        if (reservation.checkInTime && reservation.activeSession) {
          reservation.activeSession.estimatedCheckOut = new Date(
            new Date(reservation.checkInTime).getTime() + d * 60000
          );
        }
        changes.push(`duration → ${d} min`);
      }
    }

    if (scheduledArrival !== undefined) {
      const dt = new Date(scheduledArrival);
      if (!isNaN(dt.getTime())) {
        reservation.scheduledArrival = dt;
        changes.push(`scheduledArrival → ${dt.toISOString()}`);
      }
    }

    if (vehiclePlate !== undefined) {
      reservation.vehiclePlate = String(vehiclePlate).trim().toUpperCase();
      changes.push(`vehiclePlate → ${reservation.vehiclePlate}`);
    }

    if (adminNote !== undefined) {
      reservation.adminNote = String(adminNote).trim();
      changes.push(`adminNote updated`);
    }

    if (overrideFinalAmount !== undefined) {
      const amt = parseFloat(overrideFinalAmount);
      if (!isNaN(amt) && amt >= 0) {
        reservation.amountInfo.finalAmount = amt;
        changes.push(`finalAmount overridden → NPR ${amt}`);
      }
    }

    await reservation.save();

    // Notify user if meaningful fields changed
    if (changes.length > 0) {
      try {
        await notificationService.sendNotification(
          reservation.user._id,
          'Reservation Updated by Admin',
          `Your reservation for Spot #${reservation.parkingSpot?.spotNumber} has been updated by admin. Changes: ${changes.join(', ')}.`,
          'admin_action',
          { reservationId: reservation._id, changes }
        );
      } catch (notifErr) {
        logger.error('reservation_edit_notification_failed', { message: notifErr.message });
      }
    }

    res.json({
      success: true,
      message: `Reservation updated. Changes: ${changes.join(', ') || 'none'}`,
      data: reservation,
    });
  } catch (error) {
    logger.error('admin_edit_reservation_error', { message: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /admin/reservations/:id/send-notification  — push custom message to user
// ─────────────────────────────────────────────────────────────────────────────
router.post('/reservations/:id/send-notification', protect, adminAuth, async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id).populate('user', '_id name');
    if (!reservation) return res.status(404).json({ success: false, message: 'Reservation not found' });

    const { title = 'Admin Message', message } = req.body;
    if (!message) return res.status(400).json({ success: false, message: 'message is required' });

    await notificationService.sendNotification(
      reservation.user._id,
      title,
      message,
      'admin_action',
      { reservationId: reservation._id }
    );

    res.json({ success: true, message: 'Notification sent.' });
  } catch (error) {
    logger.error('admin_send_notification_error', { message: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;