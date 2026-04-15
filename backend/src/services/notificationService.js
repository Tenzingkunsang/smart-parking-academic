const Notification = require('../models/Notification');
const User = require('../models/User');
const emailService = require('./emailService');

async function getUserForNotifications(userId) {
  // Keep this small and consistent for performance
  return User.findById(userId).select('name email').lean();
}

async function createInAppNotification({ userId, type, title, message, meta = {} }) {
  const notification = await Notification.create({
    user: userId,
    type,
    title,
    message,
    meta
  });
  return notification;
}

async function sendNotificationEmail({ userId, type, meta = {} }) {
  const user = await getUserForNotifications(userId);
  if (!user?.email) return false;

  try {
    // Email templates are optional; if configuration is missing, EmailService will safely return false.
    switch (type) {
      case 'payment_confirmed': {
        const { amount, spotNumber, duration, receiptNumber } = meta;
        return await emailService.sendPaymentConfirmation(
          user.email,
          user.name || 'Customer',
          amount ?? 0,
          spotNumber ?? 'N/A',
          duration ?? 0,
          receiptNumber ?? 'N/A'
        );
      }
      case 'parking_update': {
        const { spotNumber, status } = meta;
        return await emailService.sendParkingAlert(
          user.email,
          user.name || 'Customer',
          spotNumber ?? 'N/A',
          status ?? 'available'
        );
      }
      default: {
        // Generic fallback uses subject/text as HTML template title
        const title = meta?.title || 'SmartPark Notification';
        const text = meta?.message || 'You have a new notification in SmartPark.';
        return await emailService.sendEmail(user.email, title, text);
      }
    }
  } catch (e) {
    console.error('Email notification failed:', e.message);
    return false;
  }
}

async function sendNotification(userId, title, message, type = 'system', meta = {}, { sendEmail = true } = {}) {
  const notification = await createInAppNotification({
    userId,
    type,
    title,
    message,
    meta
  });

  if (sendEmail) {
    // Fire-and-forget is fine here; we still return success even if email fails.
    sendNotificationEmail({
      userId,
      type,
      meta: { ...meta, title, message }
    }).catch(() => {});
  }

  return notification;
}

async function getUserNotifications(userId, { limit = 20, skip = 0, unreadOnly = false, type } = {}) {
  const query = { user: userId };
  if (unreadOnly) query.read = false;
  if (type) query.type = type;

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Notification.countDocuments(query),
    Notification.countDocuments({ user: userId, read: false, ...(type ? { type } : {}) })
  ]);

  return {
    notifications,
    pagination: {
      total,
      unreadCount,
      limit,
      skip
    }
  };
}

async function markAsRead(notificationId, userId) {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, user: userId },
    { $set: { read: true, readAt: new Date() } },
    { new: true }
  ).lean();

  return notification;
}

async function markAllAsRead(userId) {
  return Notification.updateMany(
    { user: userId, read: false },
    { $set: { read: true, readAt: new Date() } }
  );
}

async function deleteNotification(notificationId, userId) {
  return Notification.findOneAndDelete({ _id: notificationId, user: userId }).lean();
}

async function notifyParkingAlert(userId, spotNumber, status) {
  return sendNotification(
    userId,
    `Parking spot update`,
    `Parking spot ${spotNumber} is now ${status}.`,
    'parking_update',
    { spotNumber, status, title: 'Parking Update', message: `Parking spot ${spotNumber} is now ${status}.` }
  );
}

async function notifyPaymentConfirmation(userId, amount, spotNumber, duration, receiptNumber) {
  const receipt = receiptNumber || 'N/A';
  const nAmount = amount ?? 0;
  return sendNotification(
    userId,
    'Payment confirmed',
    `Your payment is confirmed. Reservation is ready for spot ${spotNumber}.`,
    'payment_confirmed',
    { amount: nAmount, spotNumber, duration, receiptNumber: receipt, title: 'Payment Confirmed', message: 'Your payment is confirmed.' }
  );
}

async function notifyBookingReminder(userId, spotNumber, startTime, duration) {
  return sendNotification(
    userId,
    'Booking reminder',
    `Reminder: your parking at spot ${spotNumber} starts soon.`,
    'booking_reminder',
    { spotNumber, startTime, duration }
  );
}

async function notifyExpiryWarning(userId, spotNumber, expiryTime) {
  return sendNotification(
    userId,
    'Booking expiring soon',
    `Heads up: your booking for spot ${spotNumber} expires soon.`,
    'expiry_warning',
    { spotNumber, expiryTime }
  );
}

module.exports = {
  sendNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  notifyParkingAlert,
  notifyPaymentConfirmation,
  notifyBookingReminder,
  notifyExpiryWarning
};