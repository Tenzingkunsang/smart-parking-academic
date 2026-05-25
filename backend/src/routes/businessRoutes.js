/**
 * businessRoutes.js
 *
 * All endpoints scoped to a business_owner.
 * Business owners can only see and manage spots they own,
 * and reservations at those spots.
 *
 * Admins pass all ownership checks (bypass via requireSpotOwner).
 *
 * Route prefix: /api/v1/business
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const ParkingSpot   = require('../models/ParkingSpot');
const Reservation   = require('../models/Reservation');
const User          = require('../models/User');
const notificationService = require('../services/notificationService');
const { protect, businessOwnerAuth, requireSpotOwner } = require('../middleware/auth');
const { updateSpotStatusFlags } = require('../services/reservationLifecycleService');
const { releaseReservedSpotAndPromote } = require('../services/reservationLifecycleService');
const reservationController = require('../controllers/reservationController');
const jobSchedulerService = require('../services/jobSchedulerService');
const { calculateCheckoutBilling } = require('../utils/billing');
const { verifyQrPayload } = require('../utils/qrSecurity');
const { recalculateUserBehavior } = require('../services/userBehaviorService');
const logger = require('../config/logger');

const Message = require('../models/Message');
const ALLOW_LEGACY_QR = String(process.env.QR_ALLOW_LEGACY || 'true').toLowerCase() !== 'false';

// Helper: get spot IDs owned by this user
async function ownedSpotIds(userId) {
  const spots = await ParkingSpot.find({ owner: userId }).select('_id');
  return spots.map((s) => s._id);
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /business/me  — own profile + business info
// ─────────────────────────────────────────────────────────────────────────────
router.get('/me', protect, businessOwnerAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password -refreshTokens');
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /business/me  — update own business profile
router.put('/me', protect, businessOwnerAuth, async (req, res) => {
  try {
    const { businessName, businessAddress, businessPhone, businessEmail } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        $set: {
          'businessProfile.businessName':    businessName    ?? undefined,
          'businessProfile.businessAddress': businessAddress ?? undefined,
          'businessProfile.businessPhone':   businessPhone   ?? undefined,
          'businessProfile.businessEmail':   businessEmail   ?? undefined,
        },
      },
      { new: true }
    ).select('-password -refreshTokens');
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /business/stats  — revenue + occupancy for own spots only
// ─────────────────────────────────────────────────────────────────────────────
router.get('/stats', protect, businessOwnerAuth, async (req, res) => {
  try {
    const spotIds = req.user.userType === 'admin'
      ? (await ParkingSpot.find().select('_id')).map((s) => s._id)
      : await ownedSpotIds(req.user.id);

    if (spotIds.length === 0) {
      return res.json({
        success: true,
        data: {
          totalSpots: 0, activeReservations: 0,
          todayRevenue: 0, totalRevenue: 0,
          todayOverstayRevenue: 0, noShowCount: 0,
          peakUsageByHour: [], topSpots: [],
        },
      });
    }

    const today    = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      totalSpots,
      activeReservations,
      revenueResult,
      totalRevenueResult,
      overstayResult,
      noShowCount,
      peakUsageByHour,
      topSpots,
    ] = await Promise.all([
      ParkingSpot.countDocuments({ _id: { $in: spotIds } }),
      Reservation.countDocuments({ parkingSpot: { $in: spotIds }, status: { $in: ['reserved', 'checked-in', 'overstay'] } }),
      Reservation.aggregate([
        { $match: { parkingSpot: { $in: spotIds }, status: 'completed', checkOutTime: { $gte: today, $lt: tomorrow } } },
        { $group: { _id: null, total: { $sum: '$amountInfo.finalAmount' } } },
      ]),
      Reservation.aggregate([
        { $match: { parkingSpot: { $in: spotIds }, status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amountInfo.finalAmount' } } },
      ]),
      Reservation.aggregate([
        { $match: { parkingSpot: { $in: spotIds }, status: 'completed', checkOutTime: { $gte: today, $lt: tomorrow }, 'overstayInfo.overstayCharge': { $gt: 0 } } },
        { $group: { _id: null, total: { $sum: '$overstayInfo.overstayCharge' } } },
      ]),
      Reservation.countDocuments({ parkingSpot: { $in: spotIds }, status: 'no-show' }),
      Reservation.aggregate([
        { $match: { parkingSpot: { $in: spotIds }, checkInTime: { $ne: null } } },
        { $group: { _id: { $hour: '$checkInTime' }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
      Reservation.aggregate([
        { $match: { parkingSpot: { $in: spotIds }, status: { $in: ['completed', 'no-show'] } } },
        { $group: { _id: '$parkingSpot', bookings: { $sum: 1 }, revenue: { $sum: '$amountInfo.finalAmount' } } },
        { $sort: { revenue: -1 } },
        { $limit: 5 },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        totalSpots,
        activeReservations,
        todayRevenue:         revenueResult[0]?.total || 0,
        totalRevenue:         totalRevenueResult[0]?.total || 0,
        todayOverstayRevenue: overstayResult[0]?.total || 0,
        noShowCount,
        peakUsageByHour,
        topSpots,
      },
    });
  } catch (err) {
    logger.error('business_stats_error', { message: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// SPOTS — CRUD for own parking spots
// ─────────────────────────────────────────────────────────────────────────────

// GET /business/spots
router.get('/spots', protect, businessOwnerAuth, async (req, res) => {
  try {
    const filter = req.user.userType === 'admin' ? {} : { owner: req.user.id };
    const spots = await ParkingSpot.find(filter).sort('-createdAt');
    res.json({ success: true, data: spots });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /business/spots  — create a new spot (owner = this user)
router.post('/spots', protect, businessOwnerAuth, async (req, res) => {
  try {
    const {
      locationName, address, lat, lng,
      price = 50, totalSpaces = 10,
      vehicleTypes = ['all'], features = [],
      spotNumber,
    } = req.body;

    if (!locationName || !address || lat == null || lng == null) {
      return res.status(400).json({ success: false, message: 'locationName, address, lat, lng are required' });
    }

    const spot = await ParkingSpot.create({
      locationName,
      address,
      location: { lat: parseFloat(lat), lng: parseFloat(lng) },
      price: parseFloat(price),
      totalSpaces: parseInt(totalSpaces, 10),
      availableSpaces: parseInt(totalSpaces, 10),
      vehicleTypes,
      features,
      spotNumber: spotNumber ?? null,
      owner: req.user.userType === 'admin' ? null : req.user.id,
      isActive: true,
    });

    res.status(201).json({ success: true, data: spot });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /business/spots/:spotId  — edit own spot
router.put('/spots/:spotId', protect, businessOwnerAuth, requireSpotOwner, async (req, res) => {
  try {
    const spot = req.spot; // pre-loaded by requireSpotOwner
    const allowed = ['locationName', 'address', 'price', 'vehicleTypes', 'features', 'isActive', 'spotNumber'];
    allowed.forEach((k) => { if (req.body[k] !== undefined) spot[k] = req.body[k]; });

    if (req.body.lat != null && req.body.lng != null) {
      spot.location = { lat: parseFloat(req.body.lat), lng: parseFloat(req.body.lng) };
    }
    if (req.body.totalSpaces != null) {
      const diff = parseInt(req.body.totalSpaces, 10) - spot.totalSpaces;
      spot.totalSpaces     = parseInt(req.body.totalSpaces, 10);
      spot.availableSpaces = Math.max(0, spot.availableSpaces + diff);
    }

    await spot.save();
    res.json({ success: true, data: spot });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /business/spots/:spotId  — delete own spot (only if no active reservations)
router.delete('/spots/:spotId', protect, businessOwnerAuth, requireSpotOwner, async (req, res) => {
  try {
    const activeCount = await Reservation.countDocuments({
      parkingSpot: req.spot._id,
      status: { $in: ['pending', 'reserved', 'checked-in', 'overstay'] },
    });
    if (activeCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete: ${activeCount} active reservation(s) exist for this spot.`,
      });
    }
    await ParkingSpot.findByIdAndDelete(req.spot._id);
    res.json({ success: true, message: 'Spot deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// RESERVATIONS — scoped to own spots
// ─────────────────────────────────────────────────────────────────────────────

// GET /business/reservations
router.get('/reservations', protect, businessOwnerAuth, async (req, res) => {
  try {
    const spotIds = req.user.userType === 'admin'
      ? (await ParkingSpot.find().select('_id')).map((s) => s._id)
      : await ownedSpotIds(req.user.id);

    const reservations = await Reservation.find({ parkingSpot: { $in: spotIds } })
      .populate('user', 'name email phone')
      .populate('parkingSpot', 'locationName spotNumber price')
      .sort('-createdAt');

    res.json({ success: true, data: reservations });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /business/reservations/:id
router.get('/reservations/:id', protect, businessOwnerAuth, async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id)
      .populate('user', 'name email phone vehicleNumber violationCount overstayDebt penaltyActive')
      .populate('parkingSpot', 'locationName spotNumber price totalSpaces owner');

    if (!reservation) return res.status(404).json({ success: false, message: 'Reservation not found' });

    // Ownership check: is this spot owned by this business owner?
    if (
      req.user.userType !== 'admin' &&
      reservation.parkingSpot?.owner?.toString() !== req.user.id
    ) {
      return res.status(403).json({ success: false, message: 'Not your spot' });
    }

    res.json({ success: true, data: reservation });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// QR LOOKUP — verify QR and return reservation (ownership-gated)
// POST /business/qr-lookup
// ─────────────────────────────────────────────────────────────────────────────
router.post('/qr-lookup', protect, businessOwnerAuth, async (req, res) => {
  try {
    const { qrData } = req.body;
    if (!qrData) return res.status(400).json({ success: false, message: 'qrData is required' });

    let parsedData;
    try {
      parsedData = verifyQrPayload(qrData, { allowLegacy: ALLOW_LEGACY_QR, maxAgeMs: null });
    } catch (e) {
      return res.status(e.statusCode || 400).json({ success: false, message: e.message });
    }

    const reservation = await Reservation.findById(parsedData.reservationId)
      .populate('parkingSpot')
      .populate('user', 'name email phone vehicleNumber');

    if (!reservation) return res.status(404).json({ success: false, message: 'Reservation not found' });

    // Ownership check
    if (
      req.user.userType !== 'admin' &&
      reservation.parkingSpot?.owner?.toString() !== req.user.id
    ) {
      return res.status(403).json({ success: false, message: 'This reservation is not for your spot' });
    }

    res.json({ success: true, data: reservation });
  } catch (err) {
    logger.error('business_qr_lookup_error', { message: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// MANUAL CHECK-IN  — POST /business/reservations/:id/checkin
// ─────────────────────────────────────────────────────────────────────────────
router.post('/reservations/:id/checkin', protect, businessOwnerAuth, async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id).populate('parkingSpot user');
    if (!reservation) return res.status(404).json({ success: false, message: 'Reservation not found' });

    // Ownership check
    if (
      req.user.userType !== 'admin' &&
      reservation.parkingSpot?.owner?.toString() !== req.user.id
    ) {
      return res.status(403).json({ success: false, message: 'Not your spot' });
    }

    if (reservation.status !== 'reserved') {
      return res.status(400).json({ success: false, message: `Cannot check in — status is ${reservation.status}` });
    }

    const qty = reservation.quantity || 1;
    const spot = reservation.parkingSpot;
    spot.reservedSpaces = Math.max(0, spot.reservedSpaces - qty);
    spot.occupiedSpaces += qty;
    updateSpotStatusFlags(spot);
    await spot.save();

    const now = new Date();
    reservation.checkInTime   = now;
    reservation.status        = 'checked-in';
    reservation.lifecycleStage = 'active';
    reservation.activeSession = {
      qrScannedAt:       now,
      adminScannedBy:    req.user.id,
      billingStartTime:  now,
      estimatedCheckOut: new Date(now.getTime() + reservation.duration * 60000),
    };
    await reservation.save();

    res.json({
      success: true,
      action: 'checkin',
      data: { spotNumber: spot.spotNumber, location: spot.locationName, checkInTime: reservation.checkInTime },
    });

    // Fire-and-forget: defer slow ops after response is sent.
    setImmediate(async () => {
      try { await recalculateUserBehavior(reservation.user._id); } catch (e) { logger.error('business_checkin_behavior_failed', { message: e.message }); }
      try {
        await notificationService.sendNotification(
          reservation.user._id,
          'Checked In',
          `You have been checked in to Spot #${spot.spotNumber} at ${spot.locationName}. Your parking timer has started.`,
          'admin_action',
          { reservationId: reservation._id, spotNumber: spot.spotNumber }
        );
      } catch (notifErr) {
        logger.error('business_checkin_notification_failed', { message: notifErr.message });
      }
    });
  } catch (err) {
    logger.error('business_checkin_error', { message: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// MANUAL CHECK-OUT  — POST /business/reservations/:id/checkout
// ─────────────────────────────────────────────────────────────────────────────
router.post('/reservations/:id/checkout', protect, businessOwnerAuth, async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id).populate('parkingSpot user');
    if (!reservation) return res.status(404).json({ success: false, message: 'Reservation not found' });

    if (
      req.user.userType !== 'admin' &&
      reservation.parkingSpot?.owner?.toString() !== req.user.id
    ) {
      return res.status(403).json({ success: false, message: 'Not your spot' });
    }

    if (!['checked-in', 'overstay'].includes(reservation.status)) {
      return res.status(400).json({ success: false, message: `Cannot check out — status is ${reservation.status}` });
    }

    const checkOutTime = new Date();
    const billing = calculateCheckoutBilling({
      reservation,
      spot: reservation.parkingSpot,
      user: reservation.user,
      checkOutTime,
    });

    const qty = reservation.quantity || 1;
    const spot = reservation.parkingSpot;
    spot.occupiedSpaces = Math.max(0, spot.occupiedSpaces - qty);
    spot.availableSpaces += qty;
    updateSpotStatusFlags(spot);
    await spot.save();

    reservation.checkOutTime   = checkOutTime;
    reservation.actualDuration = billing.actualMinutes;
    reservation.amountInfo.finalAmount = billing.finalAmount;
    reservation.status         = 'completed';
    reservation.lifecycleStage = 'completed';
    reservation.overtimeApplied = billing.overstayMinutes > 0;
    reservation.overstayInfo = {
      overstayMinutes: billing.overstayMinutes,
      overstayCharge:  billing.overstayCharge,
      overstayPaid:    billing.overstayCharge === 0,
    };
    await reservation.save();

    res.json({
      success: true,
      action: 'checkout',
      data: {
        actualDuration: billing.actualMinutes,
        overstayMinutes: billing.overstayMinutes,
        overstayCharge: billing.overstayCharge,
        finalAmount: billing.finalAmount,
      },
    });

    // Fire-and-forget: defer slow ops after response is sent.
    setImmediate(async () => {
      if (billing.overstayCharge > 0) {
        try { await User.findByIdAndUpdate(reservation.user._id, { $inc: { overstayDebt: billing.overstayCharge } }); }
        catch (e) { logger.error('business_checkout_debt_failed', { message: e.message }); }
      }
      try { await recalculateUserBehavior(reservation.user._id); } catch (e) { logger.error('business_checkout_behavior_failed', { message: e.message }); }
      try {
        const msg = billing.overstayCharge > 0
          ? `You've been checked out. Parked: ${billing.actualMinutes} min, overstay: ${billing.overstayMinutes} min. Overstay charge: NPR ${billing.overstayCharge}. Total: NPR ${billing.finalAmount}.`
          : `You've been checked out. Parked: ${billing.actualMinutes} min. Total: NPR ${billing.finalAmount}.`;
        await notificationService.sendNotification(
          reservation.user._id,
          'Checked Out',
          msg,
          billing.overstayCharge > 0 ? 'overstay_alert' : 'admin_action',
          { reservationId: reservation._id, finalAmount: billing.finalAmount }
        );
      } catch (notifErr) {
        logger.error('business_checkout_notification_failed', { message: notifErr.message });
      }
    });
  } catch (err) {
    logger.error('business_checkout_error', { message: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// FORCE-CANCEL  — POST /business/reservations/:id/force-cancel
// ─────────────────────────────────────────────────────────────────────────────
router.post('/reservations/:id/force-cancel', protect, businessOwnerAuth, async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id).populate('parkingSpot user');
    if (!reservation) return res.status(404).json({ success: false, message: 'Reservation not found' });

    if (
      req.user.userType !== 'admin' &&
      reservation.parkingSpot?.owner?.toString() !== req.user.id
    ) {
      return res.status(403).json({ success: false, message: 'Not your spot' });
    }

    const cancellable = ['pending', 'reserved', 'checked-in', 'overstay'];
    if (!cancellable.includes(reservation.status)) {
      return res.status(400).json({ success: false, message: `Cannot cancel in '${reservation.status}' state` });
    }

    const { reason = 'Cancelled by venue' } = req.body;
    const priorStatus = reservation.status;
    const wasCheckedIn = ['checked-in', 'overstay'].includes(priorStatus);
    const qty = reservation.quantity || 1;

    // Aggregation pipeline ensures counters never go below 0.
    await ParkingSpot.findByIdAndUpdate(
      reservation.parkingSpot._id,
      wasCheckedIn
        ? [{ $set: { availableSpaces: { $add: ['$availableSpaces', qty] }, occupiedSpaces: { $max: [0, { $subtract: ['$occupiedSpaces', qty] }] } } }]
        : [{ $set: { availableSpaces: { $add: ['$availableSpaces', qty] }, reservedSpaces: { $max: [0, { $subtract: ['$reservedSpaces', qty] }] } } }]
    );

    reservation.status = 'cancelled';
    reservation.lifecycleStage = 'cancelled';
    reservation.noShowInfo = { markedAt: new Date(), reason: 'admin_cancelled' };
    await reservation.save();

    await jobSchedulerService.cancelReservationJobs(reservation._id);

    const spot = await ParkingSpot.findById(reservation.parkingSpot._id);
    if (spot) { updateSpotStatusFlags(spot); await spot.save(); }

    try {
      await notificationService.sendNotification(
        reservation.user._id,
        'Reservation Cancelled by Venue',
        `Your reservation for Spot #${reservation.parkingSpot.spotNumber} at ${reservation.parkingSpot.locationName} has been cancelled. Reason: ${reason}.`,
        'admin_action',
        { reservationId: reservation._id, reason }
      );
    } catch (notifErr) {
      logger.error('business_force_cancel_notification_failed', { message: notifErr.message });
    }

    await releaseReservedSpotAndPromote({ reservation, releaseReason: 'admin_cancelled', skipCounters: true, priorStatus });

    res.json({ success: true, message: 'Reservation cancelled.', data: reservation });
  } catch (err) {
    logger.error('business_force_cancel_error', { message: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// SEND NOTIFICATION  — POST /business/reservations/:id/send-notification
// ─────────────────────────────────────────────────────────────────────────────
router.post('/reservations/:id/send-notification', protect, businessOwnerAuth, async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id).populate('parkingSpot user');
    if (!reservation) return res.status(404).json({ success: false, message: 'Reservation not found' });

    if (
      req.user.userType !== 'admin' &&
      reservation.parkingSpot?.owner?.toString() !== req.user.id
    ) {
      return res.status(403).json({ success: false, message: 'Not your spot' });
    }

    const { title = 'Message from Venue', message } = req.body;
    if (!message) return res.status(400).json({ success: false, message: 'message is required' });

    await notificationService.sendNotification(
      reservation.user._id, title, message, 'admin_action',
      { reservationId: reservation._id }
    );

    res.json({ success: true, message: 'Notification sent.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// MESSAGING — business owner ↔ user
// ─────────────────────────────────────────────────────────────────────────────

// GET /business/messages  — all threads with at least one unread user message
router.get('/messages', protect, businessOwnerAuth, async (req, res) => {
  try {
    const spotIds = req.user.userType === 'admin'
      ? await ParkingSpot.find().distinct('_id')
      : await ownedSpotIds(req.user.id);

    // Get distinct reservation IDs that have messages on this owner's spots
    const reservationIds = await Message.distinct('reservation', { parkingSpot: { $in: spotIds } });

    // For each reservation, grab latest message + unread count
    const threads = await Message.aggregate([
      { $match: { parkingSpot: { $in: spotIds } } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$reservation',
          lastMessage:  { $first: '$$ROOT' },
          unreadCount:  { $sum: { $cond: [{ $and: [{ $eq: ['$senderRole', 'user'] }, { $eq: ['$isRead', false] }] }, 1, 0] } },
          total:        { $sum: 1 },
        },
      },
      { $sort: { 'lastMessage.createdAt': -1 } },
      { $limit: 100 },
    ]);

    // Populate reservation + user info
    const populated = await Reservation.populate(threads, [
      { path: '_id', model: 'Reservation', select: 'status scheduledArrival vehiclePlate' },
      { path: 'lastMessage.sender', model: 'User', select: 'name' },
    ]);

    // Also grab user info per reservation
    const reservationDocs = await Reservation.find({ _id: { $in: reservationIds } })
      .populate('user', 'name email')
      .populate('parkingSpot', 'locationName spotNumber')
      .select('user parkingSpot status scheduledArrival vehiclePlate');

    const reservationMap = Object.fromEntries(reservationDocs.map((r) => [r._id.toString(), r]));

    const result = threads.map((t) => ({
      reservationId: t._id,
      reservation:   reservationMap[t._id.toString()],
      lastMessage:   t.lastMessage,
      unreadCount:   t.unreadCount,
      total:         t.total,
    }));

    res.json({ success: true, data: result });
  } catch (err) {
    logger.error('business_messages_list_error', { message: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /business/messages/unread-count — badge for sidebar
router.get('/messages/unread-count', protect, businessOwnerAuth, async (req, res) => {
  try {
    const spotIds = req.user.userType === 'admin'
      ? await ParkingSpot.find().distinct('_id')
      : await ownedSpotIds(req.user.id);

    const count = await Message.countDocuments({
      parkingSpot: { $in: spotIds },
      senderRole:  'user',
      isRead:      false,
    });
    res.json({ success: true, data: { count } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /business/messages/reservation/:id — full thread
router.get('/messages/reservation/:id', protect, businessOwnerAuth, async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id).populate('parkingSpot');
    if (!reservation) return res.status(404).json({ success: false, message: 'Reservation not found.' });

    // Ownership check
    if (
      req.user.userType !== 'admin' &&
      reservation.parkingSpot?.owner?.toString() !== req.user.id
    ) {
      return res.status(403).json({ success: false, message: 'Not your spot.' });
    }

    const messages = await Message.find({ reservation: req.params.id })
      .populate('sender', 'name')
      .sort('createdAt');

    // Mark user messages as read now that venue is viewing
    await Message.updateMany(
      { reservation: req.params.id, senderRole: 'user', isRead: false },
      { $set: { isRead: true } }
    );

    res.json({ success: true, data: messages });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /business/messages/reservation/:id — venue replies to user
router.post('/messages/reservation/:id', protect, businessOwnerAuth, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) {
      return res.status(400).json({ success: false, message: 'Message content is required.' });
    }

    const reservation = await Reservation.findById(req.params.id).populate('parkingSpot');
    if (!reservation) return res.status(404).json({ success: false, message: 'Reservation not found.' });

    if (
      req.user.userType !== 'admin' &&
      reservation.parkingSpot?.owner?.toString() !== req.user.id
    ) {
      return res.status(403).json({ success: false, message: 'Not your spot.' });
    }

    const message = await Message.create({
      reservation:  reservation._id,
      parkingSpot:  reservation.parkingSpot._id,
      sender:       req.user.id,
      senderRole:   req.user.userType === 'admin' ? 'admin' : 'business_owner',
      content:      content.trim(),
    });

    const populated = await message.populate('sender', 'name');
    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
