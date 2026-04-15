const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const NotificationService = require('../services/notificationService');

// All routes require authentication
router.use(protect);

// Get user notifications
router.get('/', async (req, res) => {
  try {
    const { limit, skip, unreadOnly, type } = req.query;
    const result = await NotificationService.getUserNotifications(req.user.id, {
      limit: limit ? parseInt(limit) : 20,
      skip: skip ? parseInt(skip) : 0,
      unreadOnly: unreadOnly === 'true',
      type
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications'
    });
  }
});

// Get unread count
router.get('/unread/count', async (req, res) => {
  try {
    const unread = await NotificationService.getUserNotifications(req.user.id, {
      limit: 1,
      unreadOnly: true
    });

    res.json({
      success: true,
      data: { unreadCount: unread.pagination.unreadCount }
    });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get unread count'
    });
  }
});

// Mark all as read
router.put('/read/all', async (req, res) => {
  try {
    const result = await NotificationService.markAllAsRead(req.user.id);

    res.json({
      success: true,
      data: { modifiedCount: result.modifiedCount }
    });
  } catch (error) {
    console.error('Error marking all as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark all as read'
    });
  }
});

// Mark single notification as read
router.put('/:id/read', async (req, res) => {
  try {
    const notification = await NotificationService.markAsRead(req.params.id, req.user.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.json({
      success: true,
      data: notification
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read'
    });
  }
});

// Delete notification
router.delete('/:id', async (req, res) => {
  try {
    const notification = await NotificationService.deleteNotification(req.params.id, req.user.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete notification'
    });
  }
});

module.exports = router;

