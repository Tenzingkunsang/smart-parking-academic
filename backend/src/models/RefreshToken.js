const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true, index: true },
    status: {
      type: String,
      enum: ['active', 'rotated', 'revoked', 'reused'],
      default: 'active',
      index: true,
    },
    expiresAt: { type: Date, required: true, index: true },
    rotatedAt: { type: Date, default: null },
    revokedAt: { type: Date, default: null },
    replacedByTokenId: { type: mongoose.Schema.Types.ObjectId, ref: 'RefreshToken', default: null },
    userAgent: { type: String, default: '' },
    ipAddress: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);
