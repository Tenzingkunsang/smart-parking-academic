/**
 * messageRoutes.js
 * User-facing messaging endpoints (user ↔ venue/business owner).
 * Route prefix: /api/v1/messages
 */

const express    = require('express');
const router     = express.Router();
const Message    = require('../models/Message');
const Reservation = require('../models/Reservation');
const { protect } = require('../middleware/auth');

// ─────────────────────────────────────────────────────────────────────────────
// POST /messages/reservation/:id
// User sends a message to the venue for a specific reservation.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/reservation/:id', protect, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) {
      return res.status(400).json({ success: false, message: 'Message content is required.' });
    }
    if (content.trim().length > 1000) {
      return res.status(400).json({ success: false, message: 'Message too long (max 1000 characters).' });
    }

    const reservation = await Reservation.findById(req.params.id).populate('parkingSpot');
    if (!reservation) return res.status(404).json({ success: false, message: 'Reservation not found.' });

    // Users can only message about their own reservation
    if (reservation.user.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }

    // Disallow messaging for terminal states
    if (['cancelled', 'expired'].includes(reservation.status)) {
      return res.status(400).json({ success: false, message: 'Cannot send messages for a cancelled reservation.' });
    }

    const message = await Message.create({
      reservation:  reservation._id,
      parkingSpot:  reservation.parkingSpot._id,
      sender:       req.user.id,
      senderRole:   'user',
      content:      content.trim(),
    });

    const populated = await message.populate('sender', 'name');
    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /messages/reservation/:id
// Fetch entire thread for a reservation (user must own it).
// Marks business/admin messages as read when user fetches.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/reservation/:id', protect, async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) return res.status(404).json({ success: false, message: 'Reservation not found.' });

    if (reservation.user.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }

    const messages = await Message.find({ reservation: req.params.id })
      .populate('sender', 'name')
      .sort('createdAt');

    // Mark venue replies as read now that the user is viewing the thread
    await Message.updateMany(
      { reservation: req.params.id, senderRole: { $in: ['business_owner', 'admin'] }, isRead: false },
      { $set: { isRead: true } }
    );

    res.json({ success: true, data: messages });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /messages/unread-count
// How many unread replies the user has from venues.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/unread-count', protect, async (req, res) => {
  try {
    const reservationIds = await Reservation.find({ user: req.user.id }).distinct('_id');
    const count = await Message.countDocuments({
      reservation: { $in: reservationIds },
      senderRole:  { $in: ['business_owner', 'admin'] },
      isRead: false,
    });
    res.json({ success: true, data: { count } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
