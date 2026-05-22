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
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

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