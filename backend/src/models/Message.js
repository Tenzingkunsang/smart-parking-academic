const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  reservation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reservation',
    required: true,
    index: true,
  },
  // parkingSpot denormalized so business inbox queries skip the reservation join
  parkingSpot: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ParkingSpot',
    required: true,
    index: true,
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  senderRole: {
    type: String,
    enum: ['user', 'business_owner', 'admin'],
    required: true,
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000,
  },
  // isRead from the *recipient's* perspective
  isRead: { type: Boolean, default: false },
}, { timestamps: true });

// Compound index: fast thread fetch + unread count per spot
messageSchema.index({ reservation: 1, createdAt: 1 });
messageSchema.index({ parkingSpot: 1, isRead: 1, senderRole: 1 });

module.exports = mongoose.model('Message', messageSchema);
