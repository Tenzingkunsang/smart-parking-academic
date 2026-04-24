const mongoose = require('mongoose');

const scheduledJobSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['arrival_confirmation_reminder', 'reservation_expiry_check'],
      required: true,
    },
    reservationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reservation',
      required: true,
      index: true,
    },
    runAt: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'cancelled', 'failed'],
      default: 'pending',
      index: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    lastError: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

scheduledJobSchema.index({ type: 1, reservationId: 1, status: 1 });

module.exports = mongoose.model('ScheduledJob', scheduledJobSchema);
