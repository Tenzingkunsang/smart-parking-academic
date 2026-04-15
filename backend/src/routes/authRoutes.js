const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const crypto = require('crypto');
const emailService = require('../services/emailService');

// Initialize OAuth2Client without specifying a single client ID
// This allows verification of tokens from any Google app
const googleClient = new OAuth2Client();

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'smartpark_academic_2025', {
    expiresIn: '30d',
  });
};

const generateVerificationCode = () => {
  // 6-digit numeric code
  const code = crypto.randomInt(100000, 999999);
  return String(code);
};

// @route   POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone, vehicleNumber } = req.body;
    const normalizedEmail = (email || '').trim().toLowerCase();
    const normalizedPhone = (phone || '').trim();
    const normalizedVehicle = (vehicleNumber || '').trim();

    // Validate password for email registration
    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required for email registration'
      });
    }
    if (!normalizedEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Check if user exists
    const userExists = await User.findOne({ email: normalizedEmail });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User already exists'
      });
    }

    // Create user
    const user = await User.create({
      name,
      email: normalizedEmail,
      password,
      phone: normalizedPhone,
      vehicleNumber: normalizedVehicle,
      userType: normalizedEmail === 'admin@smartpark.com' ? 'admin' : 'user',
      authMethod: 'email'
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token: generateToken(user._id),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        vehicleNumber: user.vehicleNumber,
        userType: user.userType,
        authMethod: user.authMethod
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    if (error.name === 'ValidationError') {
      const firstError = Object.values(error.errors)[0];
      return res.status(400).json({
        success: false,
        message: firstError?.message || 'Invalid input data'
      });
    }
    if (error.code === 11000) {
      const dupField = Object.keys(error.keyPattern || {})[0];
      const messageByField = {
        email: 'An account with this email already exists',
        googleId: 'This Google account is already linked to another user',
      };
      return res.status(409).json({
        success: false,
        message: messageByField[dupField] || 'Duplicate value detected',
      });
    }
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// @route   POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = (email || '').trim().toLowerCase();

    // Find user
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (user.authMethod === 'google') {
      return res.status(401).json({
        success: false,
        message: 'This account uses Google sign-in. Please login with Google.'
      });
    }

    // Check password
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
      token: generateToken(user._id),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        vehicleNumber: user.vehicleNumber,
        userType: user.userType
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/auth/me
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'smartpark_academic_2025');
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, user });
  } catch (error) {
    res.status(401).json({ success: false, message: 'Not authorized' });
  }
});

// @route   POST /api/auth/google
// @desc    Google OAuth login/signup endpoint (accepts tokens from ANY Google app)
router.post('/google', async (req, res) => {
  try {
    const { token, clientId } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Google token is required'
      });
    }

    // Verify Google token
    // If clientId provided, verify against it; otherwise skip audience verification
    // This allows tokens from any Google OAuth app to be verified
    let ticket;
    try {
      if (clientId) {
        // If specific client ID provided, verify against it
        ticket = await googleClient.verifyIdToken({
          idToken: token,
          audience: clientId
        });
      } else if (process.env.GOOGLE_CLIENT_ID) {
        // Try verifying with configured client ID first
        ticket = await googleClient.verifyIdToken({
          idToken: token,
          audience: process.env.GOOGLE_CLIENT_ID
        });
      } else {
        // If no specific audience, verify token format without audience check
        // This is more permissive but still verifies Google signature
        const parts = token.split('.');
        if (parts.length !== 3) {
          throw new Error('Invalid token format');
        }
        
        // Verify the token's signature by requesting from Google
        // without specifying an audience
        ticket = await googleClient.verifyIdToken({
          idToken: token
        });
      }
    } catch (err) {
      // If audience verification fails, try without specific audience
      if (err.message && err.message.includes('audience')) {
        try {
          ticket = await googleClient.verifyIdToken({
            idToken: token
          });
        } catch (innerErr) {
          throw new Error('Token verification failed: ' + innerErr.message);
        }
      } else {
        throw err;
      }
    }

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    // Validate email
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email not provided by Google account'
      });
    }

    // Check if user exists with this Google ID
    let user = await User.findOne({ googleId });
    let isNewUser = false;

    if (!user) {
      // Check if user exists with this email
      user = await User.findOne({ email });

      if (!user) {
        // Create new user
        isNewUser = true;
        user = await User.create({
          name,
          email,
          googleId,
          authMethod: 'google',
          userType: 'user',
          googleEmailVerified: false
        });
        console.log('✅ New Google user created:', user.email);
      } else {
        // Link Google ID to existing email user
        user.googleId = googleId;
        user.authMethod = 'google';
        await user.save();
        console.log('✅ Google ID linked to existing user:', user.email);
      }
    } else {
      console.log('✅ Google user login:', user.email);
    }

    // Update last login
    await user.updateLastLogin();

    const needsVerification = isNewUser || user.googleEmailVerified === false;

    if (needsVerification) {
      const verificationCode = generateVerificationCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      user.googleEmailVerified = false;
      user.googleEmailVerificationCode = verificationCode;
      user.googleEmailVerificationExpiresAt = expiresAt;
      await user.save();

      const shouldReturnCode =
        process.env.NODE_ENV === 'development' || !process.env.EMAIL_USER;

      // Send code to user's email
      const sent = await emailService.sendEmail(
        user.email,
        'SmartPark verification code',
        `Your SmartPark Google verification code is: ${verificationCode}\n\nThis code expires at: ${expiresAt.toLocaleString()}\n\n- SmartPark Team`
      );

      if (!sent && !shouldReturnCode) {
        return res.status(500).json({
          success: false,
          message: 'Could not send verification email. Please try again later.',
        });
      }

      return res.json({
        success: true,
        message: sent
          ? 'Google verification required. Code sent to email.'
          : 'Google verification required. Email unavailable, use the code shown below.',
        verificationRequired: true,
        email: user.email,
        userType: user.userType,
        ...(shouldReturnCode ? { code: verificationCode } : {})
      });
    }

    return res.json({
      success: true,
      message: 'Google authentication successful',
      token: generateToken(user._id),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        vehicleNumber: user.vehicleNumber,
        userType: user.userType,
        authMethod: user.authMethod,
        picture
      }
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(400).json({
      success: false,
      message: 'Google authentication failed: ' + error.message
    });
  }
});

// @route   POST /api/auth/google/send-verification-code
router.post('/google/send-verification-code', async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = (email || '').trim().toLowerCase();

    if (!normalizedEmail) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const user = await User.findOne({ email: normalizedEmail, authMethod: 'google' });
    if (!user) {
      return res.status(404).json({ success: false, message: 'No Google account found for this email' });
    }

    const verificationCode = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    user.googleEmailVerified = false;
    user.googleEmailVerificationCode = verificationCode;
    user.googleEmailVerificationExpiresAt = expiresAt;
    await user.save();

    const shouldReturnCode =
      process.env.NODE_ENV === 'development' || !process.env.EMAIL_USER;

    const sent = await emailService.sendEmail(
      user.email,
      'SmartPark verification code',
      `Your SmartPark Google verification code is: ${verificationCode}\n\nThis code expires at: ${expiresAt.toLocaleString()}\n\n- SmartPark Team`
    );

    if (!sent && !shouldReturnCode) {
      return res.status(500).json({
        success: false,
        message: 'Could not send verification email. Please try again later',
      });
    }

    return res.json({
      success: true,
      message: sent
        ? 'Verification code sent'
        : 'Email unavailable, using on-screen development code',
      ...(shouldReturnCode ? { code: verificationCode } : {})
    });
  } catch (error) {
    console.error('Send verification code error:', error);
    return res.status(500).json({ success: false, message: 'Failed to send verification code' });
  }
});

// @route   POST /api/auth/google/verify-code
router.post('/google/verify-code', async (req, res) => {
  try {
    const { email, code } = req.body;
    const normalizedEmail = (email || '').trim().toLowerCase();
    const normalizedCode = (code || '').trim();

    if (!normalizedEmail || !normalizedCode) {
      return res.status(400).json({ success: false, message: 'Email and code are required' });
    }

    const user = await User.findOne({
      email: normalizedEmail,
      authMethod: 'google',
      googleEmailVerificationCode: normalizedCode,
      googleEmailVerificationExpiresAt: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification code' });
    }

    user.googleEmailVerified = true;
    user.googleEmailVerificationCode = null;
    user.googleEmailVerificationExpiresAt = null;
    await user.save();

    return res.json({
      success: true,
      message: 'Verification successful',
      token: generateToken(user._id),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        vehicleNumber: user.vehicleNumber,
        userType: user.userType,
        authMethod: user.authMethod
      }
    });
  } catch (error) {
    console.error('Verify code error:', error);
    return res.status(500).json({ success: false, message: 'Failed to verify code' });
  }
});

module.exports = router;
