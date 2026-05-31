
const mongoose = require('mongoose');

const failedRefundSchema = new mongoose.Schema({
  reservation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reservation',
    required: true,
    index: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  amount: { type: Number, required: true, min: 0 },
  refundPercent: { type: Number, default: 0 },
  method: {
    type: String,
    enum: ['khalti', 'wallet', 'cash'],
    required: true,
  },
  reason: { type: String, default: '' },
  errorMessage: { type: String, default: '' },
  errorCode: { type: String, default: '' },
  payload: { type: mongoose.Schema.Types.Mixed }, // raw upstream response, if any
  attempts: { type: Number, default: 1 },
  lastAttemptAt: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ['pending', 'retrying', 'resolved', 'manual_review'],
    default: 'pending',
    index: true,
  },
  resolvedAt: { type: Date, default: null },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
}, { timestamps: true, collection: 'failedrefunds' });

failedRefundSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('FailedRefund', failedRefundSchema);
