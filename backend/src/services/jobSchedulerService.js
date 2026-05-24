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

  await ScheduledJob.create({
    type: 'reservation_expiry_check',
    reservationId: reservation._id,
    runAt: expiryAt,
  });
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

      job.status = 'completed';
      await job.save();
    } catch (error) {
      console.error(`Error processing job ${job._id}:`, error);
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
    });
    
    if (expired.length === 0) return;

    const io = socketService.getIo();
    
    for (const res of expired) {
      // Mark as overstay
      res.status = 'overstay';
      res.lifecycleStage = 'overstay';
      await res.save();
      
      // Emit to user via socket if socket exists
      if (io) {
        socketService.emitToUser(res.user.toString(), 'sessionExpired', { 
          reservationId: res._id,
          message: 'Your parking session has ended'
        });
      }
    }
  } catch (error) {
    console.error('Error checking expired sessions:', error);
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