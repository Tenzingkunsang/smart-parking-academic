const cron = require('node-cron');
const ScheduledJob = require('../models/ScheduledJob');
const Reservation = require('../models/Reservation');
const notificationService = require('./notificationService');
const { releaseReservedSpotAndPromote } = require('./reservationLifecycleService');
const { recalculateUserBehavior } = require('./userBehaviorService');

async function scheduleReservationJobs(reservation) {
  const reminderAt = new Date(reservation.scheduledArrival.getTime() - 30 * 60 * 1000);
  const expiryAt = new Date(reservation.scheduledArrival.getTime() + 15 * 60 * 1000);

  if (reminderAt > new Date()) {
    await ScheduledJob.create({
      type: 'arrival_confirmation_reminder',
      reservationId: reservation._id,
      runAt: reminderAt,
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

  for (const job of jobs) {
    try {
      const reservation = await Reservation.findById(job.reservationId).populate('parkingSpot');
      if (!reservation) {
        job.status = 'cancelled';
        await job.save();
        continue;
      }

      if (job.type === 'arrival_confirmation_reminder') {
        if (reservation.status === 'reserved' && !reservation.checkInTime) {
          await notificationService.sendNotification(
            reservation.user,
            'Arrival reminder',
            `Your booking at Spot #${reservation.parkingSpot?.spotNumber || '-'} starts soon. Please confirm you are on your way.`,
            'arrival_confirmation',
            { reservationId: reservation._id },
            { sendEmail: false }
          );
        }
      }

      if (job.type === 'reservation_expiry_check') {
        if (reservation.status === 'reserved' && !reservation.checkInTime && new Date() > reservation.arrivalConfirmedUntil) {
          reservation.status = 'no-show';
          await reservation.save();
          await recalculateUserBehavior(reservation.user);
          await releaseReservedSpotAndPromote({ reservation, releaseReason: 'no_show' });
          await notificationService.sendNotification(
            reservation.user,
            'Reservation expired',
            'Your reservation was marked as no-show and the space was released.',
            'arrival_timeout',
            { reservationId: reservation._id },
            { sendEmail: false }
          );
        }
      }

      job.status = 'completed';
      await job.save();
    } catch (error) {
      job.status = 'failed';
      job.attempts += 1;
      job.lastError = error.message;
      await job.save();
    }
  }
}

function startScheduler() {
  cron.schedule('* * * * *', async () => {
    await runPendingJobs();
  });
  setTimeout(() => {
    runPendingJobs();
  }, 3000);
}

module.exports = {
  scheduleReservationJobs,
  cancelReservationJobs,
  runPendingJobs,
  startScheduler,
};
