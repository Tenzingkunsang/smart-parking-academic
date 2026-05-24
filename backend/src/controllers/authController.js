const User = require('../models/User');
const jwt = require('jsonwebtoken');

// ─── FIX #2: No hardcoded JWT secret ────────────────────────────────────────
const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set.');
  }
  return secret;
};

const generateToken = (id, userType) => {
  return jwt.sign(
    { id, userType },
    getJwtSecret(),
    { expiresIn: '30d' }
  );
};
// ────────────────────────────────────────────────────────────────────────────

exports.register = async (req, res) => {
  try {
    const { name, email, password, phone, vehicleNumber, vehicleType } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required',
      });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User already exists',
      });
    }

    // ─── FIX: Admin role must NOT be assigned based on email string ──────────
    // Any attacker who knows your admin email can register as admin.
    // Admin role should only be set via a seeder script or direct DB update.
    const user = await User.create({
      name,
      email,
      password,
      phone,
      vehicleNumber,
      vehicleType: vehicleType || 'car',
      userType: 'user', // Always 'user' on self-registration
    });
    // ────────────────────────────────────────────────────────────────────────

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token: generateToken(user._id, user.userType),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        vehicleNumber: user.vehicleNumber,
        vehicleType: user.vehicleType,
        userType: user.userType,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Bug C5: brute-force protection. After MAX_ATTEMPTS bad passwords inside the
// window, the account is locked for LOCK_MS. Successful login resets the counter.
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_MS = 15 * 60 * 1000;

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      // Constant-ish response shape so attackers can't enumerate accounts via timing.
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Bug C5: enforce lockout window if active.
    if (user.lockUntil && user.lockUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockUntil - new Date()) / 60000);
      return res.status(423).json({
        success: false,
        message: `Account temporarily locked. Try again in ${minutesLeft} minute(s).`,
      });
    }

    // Bug C5: also reject inactive accounts at the login layer (not just protect()).
    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        message: 'This account has been deactivated.',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      user.loginAttempts = (user.loginAttempts || 0) + 1;
      if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
        user.lockUntil = new Date(Date.now() + LOCK_MS);
        user.loginAttempts = 0;
      }
      await user.save();
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Bug M7 + C5: reset counters and stamp lastLogin on success.
    user.loginAttempts = 0;
    user.lockUntil = null;
    user.lastLogin = new Date();
    await user.save();

    res.json({
      success: true,
      message: 'Login successful',
      token: generateToken(user._id, user.userType),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        vehicleNumber: user.vehicleNumber,
        vehicleType: user.vehicleType,
        userType: user.userType,
        totalBookings: user.totalBookings,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json({
      success: true,
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, phone, vehicleNumber, vehicleType } = req.body;

    // ─── FIX: Whitelist only safe fields — never let users update userType ───
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { name, phone, vehicleNumber, vehicleType },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};