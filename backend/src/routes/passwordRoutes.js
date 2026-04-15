const express = require('express');
const router = express.Router();
const User = require('../models/User');
const crypto = require('crypto');

// For testing - console log reset links instead of sending emails
// In production, you would use nodemailer

// Request password reset
router.post('/forgot-password', async (req, res) => {
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
      return res.status(404).json({
        success: false,
        message: 'No account found with that email'
      });
    }
    
    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpire = Date.now() + 3600000; // 1 hour
    
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpire = resetExpire;
    await user.save();
    
    // For testing: log the reset link to console
    const resetUrl = `http://localhost:3000/reset-password/${resetToken}`;
    
    console.log('\n========================================');
    console.log('🔐 PASSWORD RESET LINK (TESTING):');
    console.log(`Reset URL: ${resetUrl}`);
    console.log('========================================\n');
    
    res.json({
      success: true,
      message: 'Password reset link has been sent. Check console for the link (testing mode).',
      resetLink: resetUrl // Only for testing - remove in production
    });
    
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending reset email'
    });
  }
});

// Reset password
router.post('/reset-password/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    
    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }
    
    const user = await User.findOne({
      resetPasswordToken: token,
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
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error resetting password'
    });
  }
});

// Verify reset token
router.get('/verify-token/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    const user = await User.findOne({
      resetPasswordToken: token,
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
    console.error('Verify token error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying token'
    });
  }
});

module.exports = router;
