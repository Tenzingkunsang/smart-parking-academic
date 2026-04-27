const mongoose = require('mongoose');

const authAuditLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    event: {
      type: String,
      required: true,
      enum: [
        'register_success',
        'login_success',
        'login_failed',
        'account_locked',
        'refresh_success',
        'refresh_reuse_detected',
        'logout',
      ],
      index: true,
    },
    requestId: { type: String, default: '' },
    ipAddress: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AuthAuditLog', authAuditLogSchema);
