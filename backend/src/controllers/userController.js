const User = require('../models/User');

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, phone, vehicleNumber, vehicleType } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (name != null && String(name).trim()) {
      user.name = String(name).trim();
    }
    if (phone != null) {
      user.phone = String(phone).replace(/\D/g, '').slice(0, 10);
    }
    if (vehicleNumber != null) {
      user.vehicleNumber = String(vehicleNumber).toUpperCase().trim();
    }
    if (vehicleType != null && ['car', 'motorcycle'].includes(vehicleType)) {
      user.vehicleType = vehicleType;
    }

    await user.save();

    const safe = await User.findById(user._id).select('-password');
    res.json({
      success: true,
      message: 'Profile updated',
      data: safe,
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const first = Object.values(error.errors || {})[0];
      return res.status(400).json({
        success: false,
        message: first?.message || 'Validation failed',
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || String(newPassword).length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters',
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (user.authMethod === 'google' && !user.password) {
      return res.status(400).json({
        success: false,
        message: 'Google accounts cannot change password here',
      });
    }

    const ok = await user.comparePassword(currentPassword || '');
    if (!ok) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
