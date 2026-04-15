const User = require('../models/User');
const jwt = require('jsonwebtoken');

const generateToken = (id, userType) => {
  return jwt.sign(
    { id, userType }, 
    process.env.JWT_SECRET || 'smartpark_academic_2025', 
    { expiresIn: '30d' }
  );
};

exports.register = async (req, res) => {
  try {
    const { name, email, password, phone, vehicleNumber, vehicleType } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User already exists'
      });
    }

    const user = await User.create({
      name,
      email,
      password,
      phone,
      vehicleNumber,
      vehicleType: vehicleType || 'car',
      userType: email === 'admin@smartpark.com' ? 'admin' : 'user'
    });

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
        userType: user.userType
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
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
        totalBookings: user.totalBookings
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, phone, vehicleNumber, vehicleType } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { name, phone, vehicleNumber, vehicleType },
      { new: true, runValidators: true }
    ).select('-password');
    
    res.json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};