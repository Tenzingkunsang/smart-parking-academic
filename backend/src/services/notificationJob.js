const cron = require('node-cron');
const Reservation = require('../models/Reservation');
const notificationService = require('./notificationService');
const logger = require('../config/logger');

// Feature 7: Multiple Notifications Schedule
// 1 hour before, 30 mins before, 15 mins before, 5 mins before, at booking start time
const notifyAtInterval = async (minutes, type, title, msgTemplate) => {
  try {
    const targetTime = new Date(Date.now() + minutes * 60 * 1000);
    const windowStart = new Date(targetTime.getTime() - 30 * 1000); // 30 sec buffer
    const windowEnd = new Date(targetTime.getTime() + 30 * 1000);
    
    const reservations = await Reservation.find({
      status: 'reserved',
      scheduledArrival: { $gte: windowStart, $lte: windowEnd },
      [`notificationsSent.${type}`]: { $ne: true } // Prevent duplicate sends
    }).populate('parkingSpot');

    for (const res of reservations) {
      // Guard: skip if parkingSpot was deleted (populate returns null)
      if (!res.parkingSpot) {
        logger.warn('notification_job_spot_missing', { reservationId: res._id });
        continue;
      }
      await notificationService.sendNotification(
        res.user,
        title,
        msgTemplate(res.parkingSpot.spotNumber),
        type,
        { reservationId: res._id }
      );
    }
  } catch (error) {
    logger.error('notification_job_error', { error: error.message });
  }
};

const startNotificationJobs = () => {
  cron.schedule('* * * * *', () => {
    // 60 minutes before
    notifyAtInterval(60, 't_minus_60', 'Upcoming Reservation', (spot) => `Your parking at Node #${spot} begins in 1 hour.`);
    
    // 30 minutes before
    notifyAtInterval(30, 't_minus_30', 'Reservation Reminder', (spot) => `Your parking at Node #${spot} begins in 30 minutes.`);
    
    // 15 minutes before
    notifyAtInterval(15, 't_minus_15', 'Grid Alert', (spot) => `Your parking at Node #${spot} begins in 15 minutes. Prepare for check-in.`);
    
    // 5 minutes before
    notifyAtInterval(5, 't_minus_5', 'Check-In Protocol', (spot) => `Your parking at Node #${spot} begins in 5 minutes!`);
    
    // 0 minutes (At start time)
    notifyAtInterval(0, 't_minus_0', 'Temporal Link Active', (spot) => `Your reservation time has started for Node #${spot}. You have a 15-minute grace period.`);
  });
};

module.exports = { startNotificationJobs };
