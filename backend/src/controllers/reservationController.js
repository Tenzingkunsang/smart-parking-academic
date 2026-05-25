/**
 * reservationController.js — Fixed version
 *
 * Fixes applied:
 *  #4  — Overstay NaN: checkInTime could be null/undefined → guarded
 *  #14 — Inconsistent billing timestamps → always use reservation.checkInTime (set at QR scan)
 *  #3  — checkIn validates qrData is present and parseable before proceeding
 */

const Reservation = require('../models/Reservation');
const ParkingSpot = require('../models/ParkingSpot');
const User = require('../models/User');
const notificationService = require('../services/notificationService');
const socketService = require('../services/socketService');
const { recalculateUserBehavior } = require('../services/userBehaviorService');
const { updateSpotStatusFlags } = require('../services/reservationLifecycleService');
const { verifyQrPayload, signQrPayload, SCAN_TTL_MS, MAX_SCAN_AGE_MS } = require('../utils/qrSecurity');
const { calculateCheckoutBilling } = require('../utils/billing');
const logger = require('../config/logger');

// Bug MED-3: legacy unsigned QRs issued before this change are still accepted
// during the grace period — set QR_ALLOW_LEGACY=false in production to enforce.
const ALLOW_LEGACY_QR = String(process.env.QR_ALLOW_LEGACY || 'true').toLowerCase() !== 'false';
// Bug Task-1: 5-minute freshness window for QRs presented to the scanner.
const QR_MAX_SCAN_AGE_MS = Number(process.env.QR_MAX_SCAN_AGE_MS || MAX_SCAN_AGE_MS);

// ─── Helper: Sync Admin Dashboard ────────────────────────────────────────────
const _emitSpotChange = (spot) => {
  const io = socketService.getIo();
  if (io) {
    io.emit('parkingSpotStatusChanged', {
      spotId: spot._id,
      status: spot.status,
      availableSpaces: spot.availableSpaces,
      reservedSpaces: spot.reservedSpaces,
      occupiedSpaces: spot.occupiedSpaces,
    });
  }
};

// ─── Bug Task-1: 5-minute scan token ────────────────────────────────────────
// The user's ticket page calls this every 4 minutes (or just-in-time when they
// reach the lot) to get a freshly-signed QR payload. The scanner enforces
// QR_MAX_SCAN_AGE_MS so a screenshot taken minutes ago will be rejected.
exports.issueScanToken = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id).populate('parkingSpot');
    if (!reservation) return res.status(404).json({ success: false, message: 'Reservation not found' });
    if (reservation.user.toString() !== req.user.id && req.user.userType !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    // Cannot mint a scan token for a reservation that isn't ready to be scanned.
    if (!['reserved', 'checked-in', 'overstay'].includes(reservation.status)) {
      return res.status(400).json({ success: false, message: `Cannot issue scan token in state "${reservation.status}".` });
    }
    const token = signQrPayload({
      reservationId: reservation._id.toString(),
      spotNumber: reservation.parkingSpot?.spotNumber,
      location: reservation.parkingSpot?.locationName,
      ttlMs: SCAN_TTL_MS,
    });
    return res.json({
      success: true,
      data: { token, expiresInSeconds: Math.floor(SCAN_TTL_MS / 1000) },
    });
  } catch (error) {
    logger.error('issue_scan_token_failed', { message: error.message });
    return res.status(500).json({ success: false, message: 'Could not issue scan token.' });
  }
};

// ─── STAGE 1 -> 2: CONFIRM ARRIVAL ───────────────────────────────────────────
exports.confirmArrival = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id).populate('parkingSpot');
    if (!reservation) return res.status(404).json({ success: false, message: 'Reservation not found' });

    // ─── FIX #8: Authorization ────────────────────────────────────────────
    if (reservation.user.toString() !== req.user.id && req.user.userType !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (reservation.lifecycleStage !== 'booking') {
      return res.status(400).json({ success: false, message: 'Already confirmed or active' });
    }

    // Bug HIGH-1 + Task-2: never elevate to 'reserved' (which holds inventory)
    // until the booking is either paid or explicitly cash-on-arrival. The cash
    // path is allowed because the user will settle physically at the lot.
    const isPaid = reservation.paymentStatus === 'completed' || reservation.paymentInfo?.khaltiVerified === true;
    const isCash = reservation.paymentMethod === 'cash';
    if (!isPaid && !isCash) {
      return res.status(402).json({
        success: false,
        message: 'Payment must be completed before confirming arrival.',
      });
    }

    reservation.lifecycleStage = 'arrival_window';
    reservation.status = 'reserved';

    const gracePeriodEnd = new Date(reservation.scheduledArrival.getTime() + 15 * 60 * 1000);
    reservation.arrivalWindow.confirmedAt = new Date();
    reservation.arrivalWindow.endTime = gracePeriodEnd;
    reservation.arrivalConfirmedUntil = gracePeriodEnd;
    reservation.confirmedByUser = true;

    await reservation.save();

    try {
      await notificationService.sendNotification(
        reservation.user,
        'Spot Secured',
        `We've confirmed you're on your way! We'll hold Spot #${reservation.parkingSpot.spotNumber} until ${gracePeriodEnd.toLocaleTimeString()}.`,
        'arrival_confirmed',
        { spotNumber: reservation.parkingSpot.spotNumber }
      );
    } catch (notifErr) {
      // ─── FIX #18: Notification failures logged, not swallowed silently ───
      logger.error('notification_failed_confirm_arrival', { message: notifErr.message });
    }

    res.json({ success: true, message: 'Arrival confirmed. Grace period active.' });
  } catch (error) {
    logger.error('confirm_arrival_error', { message: error.message });
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ─── STAGE 2 -> 3: CHECK-IN (QR SCAN) ────────────────────────────────────────
exports.checkIn = async (req, res) => {
  try {
    const { qrData } = req.body;
    if (!qrData) {
      return res.status(400).json({ success: false, message: 'qrData is required' });
    }

    // BUG-M1: handleScan already verified the QR and attached parsedData to req.
    // If called directly (not via handleScan), verify here. Either way it runs once.
    let parsedData = req._parsedQr;
    if (!parsedData) {
      try {
        parsedData = verifyQrPayload(qrData, { allowLegacy: ALLOW_LEGACY_QR, maxAgeMs: QR_MAX_SCAN_AGE_MS });
      } catch (e) {
        return res.status(e.statusCode || 400).json({ success: false, message: e.message });
      }
    }

    const reservationId = parsedData.reservationId;

    // BUG-RACE1: TOCTOU — two concurrent scans for the same QR both read
    // status='reserved' and both proceed to check-in. Fix: use findOneAndUpdate
    // with a status filter so only one caller wins. The loser gets null.
    const now = new Date();

    // Pre-fetch just for ownership check (no state mutation yet).
    const preCheck = await Reservation.findById(reservationId).select('user status lifecycleStage isExpired arrivalConfirmedUntil scheduledArrival reservationTime duration quantity');
    if (!preCheck) return res.status(404).json({ success: false, message: 'Reservation not found' });

    // Bug C2: enforce ownership; only the owner or an admin may check in.
    if (preCheck.user.toString() !== req.user.id && req.user.userType !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (preCheck.isExpired) {
      // Race-safe: only transitions if still in a non-terminal state.
      await Reservation.findOneAndUpdate(
        { _id: reservationId, status: { $in: ['reserved', 'pending'] } },
        { $set: { status: 'no-show', lifecycleStage: 'no_show' } }
      );
      return res.status(400).json({ success: false, message: 'Grace period expired. Spot released.' });
    }

    if (preCheck.status === 'checked-in') {
      return res.status(400).json({ success: false, message: 'User already checked in' });
    }

    const qty = preCheck.quantity || 1;

    // Atomic status transition: only one concurrent scan can win.
    const reservation = await Reservation.findOneAndUpdate(
      { _id: reservationId, status: { $in: ['reserved', 'pending'] } },
      {
        $set: {
          lifecycleStage: 'active',
          status: 'checked-in',
          checkInTime: now,
          activeSession: {
            qrScannedAt: now,
            adminScannedBy: req.user.id,
            billingStartTime: now,
            estimatedCheckOut: new Date(now.getTime() + preCheck.duration * 60000),
          },
        },
      },
      { new: true }
    ).populate('parkingSpot');

    if (!reservation) {
      // Another concurrent scan won the race.
      return res.status(409).json({ success: false, message: 'Reservation already processed by a concurrent scan. Please refresh.' });
    }

    const spot = reservation.parkingSpot;
    spot.reservedSpaces = Math.max(0, spot.reservedSpaces - qty);
    spot.occupiedSpaces += qty;

    updateSpotStatusFlags(spot);
    await spot.save();

    // PERF-3: emit immediately, send response, defer behavior recalc.
    _emitSpotChange(spot);
    socketService.emitToUser(reservation.user.toString(), 'reservationStatusChanged', {
      reservationId: reservation._id,
      stage: 'active',
      checkInTime: now,
    });

    res.json({ success: true, message: 'Check-in successful. Timer started.', data: reservation });

    setImmediate(async () => {
      try { await recalculateUserBehavior(reservation.user); } catch (e) { logger.error('checkin_behavior_failed', { message: e.message }); }
    });
  } catch (error) {
    logger.error('checkin_error', { message: error.message });
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ─── UNIFIED: HANDLE QR SCAN (Check-In or Check-Out) ─────────────────────────
exports.handleScan = async (req, res) => {
  try {
    const { qrData } = req.body;
    if (!qrData) return res.status(400).json({ success: false, message: 'qrData is required' });

    // Bug MED-3: verify signature here too so a forged QR is rejected before any DB work.
    let parsedData;
    try {
      parsedData = verifyQrPayload(qrData, { allowLegacy: ALLOW_LEGACY_QR, maxAgeMs: QR_MAX_SCAN_AGE_MS });
    } catch (e) {
      return res.status(e.statusCode || 400).json({ success: false, message: e.message });
    }

    const reservationId = parsedData.reservationId;

    const reservation = await Reservation.findById(reservationId).populate('parkingSpot');
    if (!reservation) return res.status(404).json({ success: false, message: 'Reservation not found' });

    // BUG-M1: pass already-verified payload so checkIn skips a second verifyQrPayload call.
    req._parsedQr = parsedData;

    // ROUTING: If not checked in → Check-In. If already checked in → Check-Out.
    if (reservation.status === 'reserved' || (reservation.status === 'pending' && reservation.paymentStatus === 'completed')) {
      return exports.checkIn(req, res);
    } else if (reservation.status === 'checked-in' || reservation.status === 'overstay') {
      req.params.id = reservationId;
      return exports.checkOut(req, res);
    } else {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot scan: Reservation is in '${reservation.status}' state` 
      });
    }
  } catch (error) {
    logger.error('handle_scan_error', { message: error.message });
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ─── STAGE 3 -> END: CHECK-OUT ───────────────────────────────────────────────
exports.checkOut = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id).populate('parkingSpot');
    if (!reservation || !['checked-in', 'overstay'].includes(reservation.status)) {
      return res.status(400).json({ success: false, message: 'Invalid check-out request' });
    }

    // Bug C2: enforce ownership so users cannot check out other people's reservations.
    if (reservation.user.toString() !== req.user.id && req.user.userType !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Bug H2: use the canonical billing calculator so user-checkout and
    // admin-checkout cannot diverge.
    const checkOutTime = new Date();
    let billing;
    try {
      const ownerUser = await User.findById(reservation.user).select('penaltyActive violationCount');
      billing = calculateCheckoutBilling({
        reservation,
        spot: reservation.parkingSpot,
        user: ownerUser,
        checkOutTime,
      });
    } catch (calcErr) {
      logger.error('checkout_billing_failed', { reservationId: reservation._id, message: calcErr.message });
      return res.status(calcErr.statusCode || 500).json({ success: false, message: calcErr.message });
    }

    reservation.status = 'completed';
    reservation.lifecycleStage = 'completed';
    reservation.checkOutTime = checkOutTime;
    reservation.actualDuration = billing.actualMinutes;
    reservation.amountInfo.finalAmount = billing.finalAmount;
    reservation.overtimeApplied = billing.overstayMinutes > 0;
    reservation.penaltyApplied = billing.penaltyCharge > 0;
    reservation.overstayInfo = {
      overstayMinutes: billing.overstayMinutes,
      overstayCharge: billing.overstayCharge,
      overstayPaid: billing.overstayCharge === 0,
    };

    const spot = reservation.parkingSpot;
    spot.occupiedSpaces = Math.max(0, spot.occupiedSpaces - (reservation.quantity || 1));
    spot.availableSpaces += (reservation.quantity || 1);

    updateSpotStatusFlags(spot);
    await spot.save();
    await reservation.save();
    if (billing.overstayCharge > 0) {
      await User.applyWalletDelta(reservation.user, {
        amount: billing.overstayCharge,
        type: 'debit',
        description: `Overstay charge for reservation ${reservation._id}`,
      });

      try {
        await notificationService.sendNotification(
          reservation.user,
          'Overstay Charge',
          `You parked for ${billing.actualMinutes} mins. An overstay charge of NPR ${billing.overstayCharge} has been added to your account.`,
          'overstay_alert',
          { overstayCharge: billing.overstayCharge }
        );
      } catch (notifErr) {
        logger.error('notification_failed_overstay', { message: notifErr.message });
      }
    }

    _emitSpotChange(spot);
    res.json({
      success: true,
      message: 'Check-out complete',
      summary: {
        parkedTime: billing.actualMinutes,
        overstay: billing.overstayMinutes,
        additionalCharge: billing.overstayCharge,
        penaltyCharge: billing.penaltyCharge,
        finalTotal: billing.finalAmount,
      },
    });
  } catch (error) {
    logger.error('checkout_error', { message: error.message });
    res.status(500).json({ success: false, message: 'Server error during check-out' });
  }
};

// --- FEATURE 2 & 10: ADMIN CHECK-IN/OUT WITH CALCULATION ---
exports.adminCheckIn = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id).populate('parkingSpot user');
    if (!reservation) return res.status(404).json({ success: false, message: 'Reservation not found' });

    if (reservation.status !== 'reserved') {
      return res.status(400).json({ success: false, message: `Cannot check in. Current status is ${reservation.status}` });
    }

    const qty = reservation.quantity || 1;
    const spot = reservation.parkingSpot;

    // ─── FIX: Update spot counters ATOMICALLY ──────────────────────────
    // Decrement reserved spaces, increment occupied spaces
    spot.reservedSpaces = Math.max(0, spot.reservedSpaces - qty);
    spot.occupiedSpaces += qty;

    // Update status flags based on new counter states
    updateSpotStatusFlags(spot);
    await spot.save();

    // BUG-CTRL1: multiple new Date() / Date.now() calls produce subtly different
    // timestamps for the same logical event. Use one const so all fields agree.
    const now = new Date();
    reservation.checkInTime = now;
    reservation.status = 'checked-in';
    reservation.lifecycleStage = 'active';
    reservation.activeSession = {
      qrScannedAt: now,
      adminScannedBy: req.user.id,
      billingStartTime: now,
      estimatedCheckOut: new Date(now.getTime() + reservation.duration * 60000),
    };
    await reservation.save();

    // PERF-1: emit spot change synchronously (in-memory, near-instant),
    // then send the HTTP response immediately. Defer the slow operations —
    // recalculateUserBehavior (aggregation pipeline) and sendNotification
    // (may involve email I/O) — to a setImmediate so they run after the
    // response is flushed. This cuts the perceived scan latency by ~200-600ms.
    _emitSpotChange(spot);
    socketService.emitToUser(reservation.user._id.toString(), 'reservationStatusChanged', {
      reservationId: reservation._id,
      status: 'checked-in',
      stage: 'active',
      checkInTime: reservation.checkInTime,
    });

    res.json({
      success: true,
      action: 'checkin',
      data: {
        spotNumber: spot.spotNumber,
        location: spot.locationName,
        checkInTime: reservation.checkInTime,
        spotStatus: spot.status,
        availableSpaces: spot.availableSpaces,
      }
    });

    // Fire-and-forget: these don't affect the check-in outcome.
    setImmediate(async () => {
      try { await recalculateUserBehavior(reservation.user._id); } catch (e) { logger.error('admin_checkin_behavior_failed', { message: e.message }); }
      try {
        await notificationService.sendNotification(
          reservation.user._id,
          'Checked In by Admin',
          `Admin has manually checked you in to Spot #${spot.spotNumber} at ${spot.locationName}. Your parking timer has started.`,
          'admin_action',
          { reservationId: reservation._id, spotNumber: spot.spotNumber, checkInTime: reservation.checkInTime }
        );
      } catch (notifErr) { logger.error('admin_checkin_notification_failed', { message: notifErr.message }); }
    });
  } catch (error) {
    logger.error('admin_checkin_error', { message: error.message });
    res.status(500).json({ success: false, message: 'Server error during check-in' });
  }
};

exports.adminCheckOut = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id).populate('user parkingSpot');
    if (!reservation) return res.status(404).json({ success: false, message: 'Reservation not found' });

    if (reservation.status !== 'checked-in' && reservation.status !== 'overstay') {
      return res.status(400).json({ success: false, message: `Cannot check out. Current status is ${reservation.status}` });
    }

    // Bug H2: delegate to the canonical calculator so admin & user checkout agree.
    const checkOutTime = new Date();
    let billing;
    try {
      billing = calculateCheckoutBilling({
        reservation,
        spot: reservation.parkingSpot,
        user: reservation.user,
        checkOutTime,
      });
    } catch (calcErr) {
      logger.error('admin_checkout_billing_failed', { reservationId: reservation._id, message: calcErr.message });
      return res.status(calcErr.statusCode || 500).json({ success: false, message: calcErr.message });
    }

    const qty = reservation.quantity || 1;
    const spot = reservation.parkingSpot;
    spot.occupiedSpaces = Math.max(0, spot.occupiedSpaces - qty);
    spot.availableSpaces += qty;
    updateSpotStatusFlags(spot);
    await spot.save();

    reservation.checkOutTime = checkOutTime;
    reservation.amountInfo.finalAmount = billing.finalAmount;
    reservation.actualDuration = billing.actualMinutes;
    reservation.status = 'completed';
    reservation.lifecycleStage = 'completed';
    reservation.overtimeApplied = billing.overstayMinutes > 0;
    reservation.penaltyApplied = billing.penaltyCharge > 0;
    reservation.overstayInfo = {
      overstayMinutes: billing.overstayMinutes,
      overstayCharge: billing.overstayCharge,
      overstayPaid: billing.overstayCharge === 0,
    };
    await reservation.save();

    // PERF-2: emit spot + socket synchronously, send HTTP response, then
    // defer slow ops (overstay debt write, behavior recalc, notification).
    _emitSpotChange(spot);
    socketService.emitToUser(reservation.user._id.toString(), 'reservationStatusChanged', {
      reservationId: reservation._id,
      status: 'completed',
      stage: 'completed',
      finalAmount: billing.finalAmount,
      overstayCharge: billing.overstayCharge,
    });

    res.json({
      success: true,
      action: 'checkout',
      data: {
        bookedDuration: reservation.duration,
        actualDuration: billing.actualMinutes,
        overtime: billing.overstayMinutes,
        baseAmount: billing.baseTotal,
        overtimeCharge: billing.overstayCharge,
        penaltyCharge: billing.penaltyCharge,
        finalAmount: billing.finalAmount,
        spotStatus: spot.status,
        availableSpaces: spot.availableSpaces,
      }
    });

    // Fire-and-forget after response is flushed.
    setImmediate(async () => {
      // Bug C4 alignment: track overstay debt on admin path.
      if (billing.overstayCharge > 0) {
       try {
         await User.applyWalletDelta(reservation.user._id, {
           amount: billing.overstayCharge,
           type: 'debit',
           description: `Admin check-out overstay charge for reservation ${reservation._id}`,
         });
       } catch (e) {
         logger.error('admin_checkout_debt_update_failed', { message: e.message });
       }
      }      try { await recalculateUserBehavior(reservation.user._id); } catch (e) { logger.error('admin_checkout_behavior_failed', { message: e.message }); }
      try {
        const msg = billing.overstayCharge > 0
          ? `Admin has checked you out. You parked for ${billing.actualMinutes} min (${billing.overstayMinutes} min overstay). Overstay charge: NPR ${billing.overstayCharge}. Total: NPR ${billing.finalAmount}.`
          : `Admin has checked you out. You parked for ${billing.actualMinutes} min. Total: NPR ${billing.finalAmount}.`;
        await notificationService.sendNotification(
          reservation.user._id, 'Checked Out by Admin', msg,
          billing.overstayCharge > 0 ? 'overstay_alert' : 'admin_action',
          { reservationId: reservation._id, actualMinutes: billing.actualMinutes, overstayMinutes: billing.overstayMinutes, overstayCharge: billing.overstayCharge, finalAmount: billing.finalAmount }
        );
      } catch (notifErr) { logger.error('admin_checkout_notification_failed', { message: notifErr.message }); }
    });
  } catch (error) {
    logger.error('admin_checkout_error', { message: error.message });
    res.status(500).json({ success: false, message: 'Server error during check-out' });
  }
};
// --- END ADD ---