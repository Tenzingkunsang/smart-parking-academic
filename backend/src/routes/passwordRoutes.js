const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const crypto = require('crypto');
const { body } = require('express-validator');
const validateRequest = require('../middleware/validateRequest');
const logger = require('../config/logger');

// Bug C3: hash reset tokens at rest. We email the raw token but store sha256(token)
// so a DB leak does not allow account takeover.
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

// Bug C3: rate-limit reset endpoints to slow brute-force / spam.
const resetRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many reset requests. Please try again later.' },
});

const isStrongPassword = (password = '') =>
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(password);

router.post('/forgot-password', resetRateLimit, [body('email').isEmail().withMessage('Valid email required')], validateRequest, async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an email address'
      });
    }
    
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.json({
        success: true,
        message: 'If the account exists, a password reset link has been sent.'
      });
    }
    
    // Generate reset token (raw for email, hashed for storage — Bug C3)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpire = Date.now() + 3600000; // 1 hour

    user.resetPasswordToken = hashToken(resetToken);
    user.resetPasswordExpire = resetExpire;
    await user.save();

    // Bug L2: use FRONTEND_URL env var; localhost is a dev fallback only.
    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
    const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;
    logger.info('password_reset_requested', { email: (email || '').trim().toLowerCase() });
    
    res.json({
      success: true,
      message: 'If the account exists, a password reset link has been sent.',
      ...(process.env.NODE_ENV !== 'production' ? { resetLink: resetUrl } : {})
    });
    
  } catch (error) {
    logger.error('forgot_password_failed', { message: error.message });
    res.status(500).json({
      success: false,
      message: 'Error sending reset email'
    });
  }
});

// Reset password
router.post('/reset-password/:token', resetRateLimit, [body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')], validateRequest, async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || !isStrongPassword(password)) {
      return res.status(400).json({
        success: false,
        message: 'Password must include uppercase, lowercase, number, and symbol'
      });
    }

    // Bug C3: look up by hashed token so the DB never stores raw tokens.
    const user = await User.findOne({
      resetPasswordToken: hashToken(token),
      resetPasswordExpire: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }
    
    // Set new password
    user.password = password;
    user.resetPasswordToken = null;
    user.resetPasswordExpire = null;
    await user.save();
    
    res.json({
      success: true,
      message: 'Password reset successful! You can now login with your new password.'
    });
    
  } catch (error) {
    logger.error('reset_password_failed', { message: error.message });
    res.status(500).json({
      success: false,
      message: 'Error resetting password'
    });
  }
});

// Verify reset token
router.get('/verify-token/:token', resetRateLimit, async (req, res) => {
  try {
    const { token } = req.params;

    const user = await User.findOne({
      resetPasswordToken: hashToken(token),
      resetPasswordExpire: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }
    
    res.json({
      success: true,
      message: 'Token is valid',
      email: user.email
    });
    
  } catch (error) {
    logger.error('verify_reset_token_failed', { message: error.message });
    res.status(500).json({
      success: false,
      message: 'Error verifying token'
    });
  }
});

module.exports = router;
