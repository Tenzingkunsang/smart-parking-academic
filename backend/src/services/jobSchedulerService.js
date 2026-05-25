const cron = require('node-cron');
const ScheduledJob = require('../models/ScheduledJob');
const Reservation = require('../models/Reservation');
const notificationService = require('./notificationService');
const socketService = require('./socketService'); 
const { releaseReservedSpotAndPromote, processNoShow } = require('./reservationLifecycleService');
const { recalculateUserBehavior } = require('./userBehaviorService');
const logger = require('../config/logger');

/**
 * Schedules the 3-Stage lifecycle tasks.
 */
async function scheduleReservationJobs(reservation) {
  // Job 1: Reminder 30 minutes before the booking starts
  const reminderFirstAt = new Date(reservation.scheduledArrival.getTime() - 30 * 60 * 1000);
  // Job 2: Final reminder 10 minutes before booking starts
  const reminderFinalAt = new Date(reservation.scheduledArrival.getTime() - 10 * 60 * 1000);
  // Job 3: Expiry check 15 minutes AFTER the booking starts (The Grace Period)
  const expiryAt = new Date(reservation.scheduledArrival.getTime() + 15 * 60 * 1000);

  const now = new Date();
  if (reminderFirstAt > now) {
    await ScheduledJob.create({
      type: 'arrival_confirmation_reminder',
      reservationId: reservation._id,
      runAt: reminderFirstAt,
    });
  }
  if (reminderFinalAt > now) {
    await ScheduledJob.create({
      type: 'arrival_confirmation_reminder',
      reservationId: reservation._id,
      runAt: reminderFinalAt,
    });
  }

  // Only schedule the expiry sweeper if the grace period is still in the future.
  // Otherwise a late payment (e.g. cash settled hours after the original slot)
  // would immediately fire processNoShow on the next cron tick — see Bug 1.
  if (expiryAt > now) {
    await ScheduledJob.create({
      type: 'reservation_expiry_check',
      reservationId: reservation._id,
      runAt: expiryAt,
    });
  }
}

async function cancelReservationJobs(reservationId) {
  await ScheduledJob.updateMany(
    { reservationId, status: 'pending' },
    { $set: { status: 'cancelled' } }
  );
}

async function runPendingJobs() {
  const jobs = await ScheduledJob.find({
    status: 'pending',
    runAt: { $lte: new Date() },
  })
    .sort({ runAt: 1 })
    .limit(100);

  const io = socketService.getIo();

  for (const job of jobs) {
    try {
      const reservation = await Reservation.findById(job.reservationId).populate('parkingSpot');
      
      // If reservation is completed, cancelled, or already a no-show, skip the job
      if (!reservation || ['completed', 'cancelled', 'no-show'].includes(reservation.status)) {
        job.status = 'cancelled';
        await job.save();
        continue;
      }

      // --- JOB 1: ARRIVAL REMINDER ---
      if (job.type === 'arrival_confirmation_reminder') {
        // Send reminder if user hasn't checked in yet
        // (covers both 'booking' and 'arrival_window' lifecycle stages)
        if (!reservation.checkInTime && reservation.status === 'reserved') {
          const minsToArrival = Math.round((new Date(reservation.scheduledArrival) - new Date()) / 60000);
          const label = minsToArrival > 0 ? `in ${minsToArrival} mins` : 'now';
          await notificationService.sendNotification(
            reservation.user,
            'Reminder: Your parking starts soon',
            `Your booking for Spot #${reservation.parkingSpot?.spotNumber || '-'} starts ${label}. Please head to the gate and scan your QR code.`,
            'arrival_confirmation_required',
            { reservationId: reservation._id, minsToArrival }
          );
        }
      }

      // --- JOB 2: EXPIRY CHECK (The Grace Period Finisher) ---
      if (job.type === 'reservation_expiry_check') {
        // If they are still in 'booking' or 'arrival_window' but haven't SCANNED (checkInTime is null)
        if (!reservation.checkInTime && reservation.lifecycleStage !== 'active') {
          // Use the unified, transaction-backed processNoShow function
          await processNoShow(reservation._id);
        }
      }

      // --- JOB 3: OVERSTAY REMINDER ---
      // Fires every 30 minutes while the user is still in overstay.
      // Cancelled automatically if user checks out (cancelReservationJobs).
      if (job.type === 'overstay_reminder') {
        if (reservation.status === 'overstay') {
          const checkInTime = reservation.checkInTime ? new Date(reservation.checkInTime) : null;
          const overstayMinutes = checkInTime
            ? Math.max(0, Math.round((new Date() - checkInTime) / 60000) - reservation.duration)
            : 0;
          const spotNum = reservation.parkingSpot?.spotNumber || '?';
          const hourlyRate = reservation.parkingSpot?.price || 0;
          const overstayHours = overstayMinutes > 0 ? Math.ceil(overstayMinutes / 60) : 0;
          const estimatedCharge = Math.round(overstayHours * hourlyRate * 1.5);

          try {
            await notificationService.sendNotification(
              reservation.user,
              `⚠️ Still in Overstay — ${overstayMinutes} min`,
              `You have been in overstay for ${overstayMinutes} minutes at Spot #${spotNum}. Estimated additional charge so far: NPR ${estimatedCharge}. Check out now to stop charges.`,
              'overstay_alert',
              {
                reservationId: reservation._id,
                overstayMinutes,
                estimatedCharge,
                spotNumber: spotNum,
              }
            );
          } catch (notifErr) {
            logger.error('overstay_reminder_notification_failed', {
              reservationId: reservation._id,
              message: notifErr.message,
            });
          }

          // Real-time socket push so the UI ticker updates
          if (io) {
            socketService.emitToUser(reservation.user.toString(), 'overstayUpdate', {
              reservationId: reservation._id,
              overstayMinutes,
              estimatedCharge,
            });
          }
        }
        // If already checked out / completed, the job just completes — no action needed.
      }

      job.status = 'completed';
      await job.save();
    } catch (error) {
      logger.error('job_processing_failed', { jobId: job._id, type: job.type, message: error.message });
      job.status = 'failed';
      job.attempts += 1;
      job.lastError = error.message;
      await job.save();
    }
  }
}

async function checkExpiredSessions() {
  try {
    const now = new Date();
    // Find all 'checked-in' reservations where estimatedCheckOut < now
    const expired = await Reservation.find({
      status: 'checked-in',
      'activeSession.estimatedCheckOut': { $lt: now }
    }).populate('parkingSpot', 'spotNumber locationName price');

    if (expired.length === 0) return;

    const io = socketService.getIo();

    for (const res of expired) {
      // Mark as overstay
      res.status = 'overstay';
      res.lifecycleStage = 'overstay';
      await res.save();

      const spotNum = res.parkingSpot?.spotNumber || '?';
      const overstayRate = res.parkingSpot?.price
        ? `NPR ${Math.round(res.parkingSpot.price * 1.5)}/hr`
        : 'extra charges';

      // Notify user they are now in overstay and accruing charges
      try {
        await notificationService.sendNotification(
          res.user,
          '⚠️ Overstay Alert — You Are Being Charged',
          `Your booked time for Spot #${spotNum} has ended. You are now in OVERSTAY and accruing extra charges at ${overstayRate}. Please check out immediately to minimise extra fees.`,
          'overstay_alert',
          {
            reservationId: res._id,
            spotNumber: spotNum,
            overstayRate,
            checkOutUrl: `/my-reservations/${res._id}`,
          }
        );
      } catch (notifErr) {
        logger.error('overstay_notification_failed', { reservationId: res._id, message: notifErr.message });
      }

      // Emit real-time socket event so the user's active session page updates immediately
      if (io) {
        socketService.emitToUser(res.user.toString(), 'sessionExpired', {
          reservationId: res._id,
          status: 'overstay',
          message: `⚠️ Overstay! Extra charges at ${overstayRate} are now accruing.`,
        });
        io.emit('reservationStatusChanged', {
          reservationId: res._id,
          status: 'overstay',
          lifecycleStage: 'overstay',
        });
      }

      // Schedule a recurring overstay reminder every 30 minutes so the user
      // keeps getting nudged until they check out. Cap at 4 reminders (2 hrs).
      for (let i = 1; i <= 4; i++) {
        const runAt = new Date(now.getTime() + i * 30 * 60 * 1000);
        await ScheduledJob.create({
          type: 'overstay_reminder',
          reservationId: res._id,
          runAt,
        });
      }
    }
  } catch (error) {
    logger.error('check_expired_sessions_error', { message: error.message });
  }
}

function startScheduler() {
  cron.schedule('* * * * *', async () => {
    await runPendingJobs();
    await checkExpiredSessions();
  });
  
  setTimeout(() => {
    runPendingJobs();
    checkExpiredSessions();
  }, 3000);
}

module.exports = {
  scheduleReservationJobs,
  cancelReservationJobs,
  runPendingJobs,
  startScheduler,
};