const mongoose = require('mongoose');

const waitlistEntrySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    parkingSpot: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ParkingSpot',
      required: true,
      index: true,
    },
    scheduledArrival: {
      type: Date,
      required: true,
    },
    duration: {
      type: Number,
      required: true,
      min: 30,
    },
    quantity: {
      type: Number,
      default: 1,
    },
    promoted: {
      type: Boolean,
      default: false,
    },
    promotedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

waitlistEntrySchema.index({ user: 1, parkingSpot: 1, promoted: 1 });

module.exports = mongoose.model('WaitlistEntry', waitlistEntrySchema);
