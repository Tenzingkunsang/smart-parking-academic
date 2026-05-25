const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const crypto = require('crypto');
const emailService = require('../services/emailService');
const { body } = require('express-validator');
const validateRequest = require('../middleware/validateRequest');
const logger = require('../config/logger');
const RefreshToken = require('../models/RefreshToken');
const { logAuthEvent } = require('../services/authAuditService');

const googleClient = new OAuth2Client();

const ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
const REFRESH_EXPIRES_DAYS = Number(process.env.JWT_REFRESH_EXPIRES_DAYS || 30);
const MAX_LOGIN_ATTEMPTS = Number(process.env.MAX_LOGIN_ATTEMPTS || 5);
const LOCK_TIME_MS = Number(process.env.ACCOUNT_LOCK_MS || 15 * 60 * 1000);

// ─── FIX #2: Throw if JWT_SECRET missing — no hardcoded fallback ─────────────
const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set.');
  }
  return secret;
};

const generateAccessToken = (id) =>
  jwt.sign({ id, type: 'access' }, getJwtSecret(), {
    expiresIn: ACCESS_EXPIRES_IN,
  });
// ────────────────────────────────────────────────────────────────────────────

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const generateRefreshToken = async (user, req) => {
  const token = crypto.randomBytes(48).toString('hex');
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + REFRESH_EXPIRES_DAYS * 24 * 60 * 60 * 1000);
  user.refreshTokens = (user.refreshTokens || []).filter((t) => new Date(t.expiresAt) > new Date());
  user.refreshTokens.push({
    tokenHash,
    expiresAt,
    userAgent: req.headers['user-agent'] || '',
    ipAddress: req.ip || '',
  });
  await user.save();
  const tokenDoc = await RefreshToken.create({
    user: user._id,
    tokenHash,
    expiresAt,
    status: 'active',
    userAgent: req.headers['user-agent'] || '',
    ipAddress: req.ip || '',
  });
  return { token, tokenDoc };
};

const hasStrongPassword = (password = '') =>
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(password);

const generateVerificationCode = () => {
  const code = crypto.randomInt(100000, 999999);
  return String(code);
};

// @route   POST /api/auth/register
router.post(
  '/register',
  [
    body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { name, email, password, phone, vehicleNumber, userType: requestedType } = req.body;
      const normalizedEmail = (email || '').trim().toLowerCase();
      const normalizedPhone = (phone || '').trim();
      const normalizedVehicle = (vehicleNumber || '').trim();

      // Only 'user' and 'business_owner' are self-registrable.
      // 'admin' must be seeded — never assignable via API.
      const ALLOWED_SELF_REGISTER_TYPES = ['user', 'business_owner'];
      const resolvedType = ALLOWED_SELF_REGISTER_TYPES.includes(requestedType) ? requestedType : 'user';

      if (!password) {
        return res.status(400).json({ success: false, message: 'Password is required for email registration' });
      }
      if (!hasStrongPassword(password)) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 8 characters and include uppercase, lowercase, number, and symbol',
        });
      }
      if (!normalizedEmail) {
        return res.status(400).json({ success: false, message: 'Email is required' });
      }

      const userExists = await User.findOne({ email: normalizedEmail });
      if (userExists) {
        return res.status(400).json({ success: false, message: 'User already exists' });
      }

      const user = await User.create({
        name,
        email: normalizedEmail,
        password,
        phone: normalizedPhone,
        vehicleNumber: resolvedType === 'user' ? normalizedVehicle : '',
        userType: resolvedType,
        authMethod: 'email',
      });

      const refreshPayload = await generateRefreshToken(user, req);
      await logAuthEvent({ userId: user._id, event: 'register_success', req });

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        token: generateAccessToken(user._id),
        refreshToken: refreshPayload.token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          vehicleNumber: user.vehicleNumber,
          userType: user.userType,
          authMethod: user.authMethod,
        },
      });
    } catch (error) {
      logger.error('auth_register_failed', { message: error.message });
      if (error.name === 'ValidationError') {
        const firstError = Object.values(error.errors)[0];
        return res.status(400).json({ success: false, message: firstError?.message || 'Invalid input data' });
      }
      if (error.code === 11000) {
        const dupField = Object.keys(error.keyPattern || {})[0];
        const messageByField = {
          email: 'An account with this email already exists',
          googleId: 'This Google account is already linked to another user',
        };
        return res.status(409).json({ success: false, message: messageByField[dupField] || 'Duplicate value detected' });
      }
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

// @route   POST /api/auth/login
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 1 }).withMessage('Password is required'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { email, password } = req.body;
      const normalizedEmail = (email || '').trim().toLowerCase();

      const user = await User.findOne({ email: normalizedEmail });
      if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      if (user.authMethod === 'google') {
        return res.status(401).json({
          success: false,
          message: 'This account uses Google sign-in. Please login with Google.',
        });
      }

      if (user.lockUntil && new Date(user.lockUntil) > new Date()) {
        return res.status(423).json({
          success: false,
          message: 'Account temporarily locked due to repeated failed logins',
        });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        user.loginAttempts = (user.loginAttempts || 0) + 1;
        if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
          user.lockUntil = new Date(Date.now() + LOCK_TIME_MS);
          user.loginAttempts = 0;
          await logAuthEvent({ userId: user._id, event: 'account_locked', req });
        }
        await user.save();
        await logAuthEvent({ userId: user._id, event: 'login_failed', req });
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      user.loginAttempts = 0;
      user.lockUntil = null;
      const refreshPayload = await generateRefreshToken(user, req);
      await logAuthEvent({ userId: user._id, event: 'login_success', req });

      res.json({
        success: true,
        message: 'Login successful',
        token: generateAccessToken(user._id),
        refreshToken: refreshPayload.token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          vehicleNumber: user.vehicleNumber,
          userType: user.userType,
        },
      });
    } catch (error) {
      logger.error('auth_login_failed', { message: error.message });
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

// @route   POST /api/auth/refresh
// ─── FIX #7: Refresh token rotation is already implemented correctly ─────────
// The existing logic: validates hash, detects reuse (revokes all tokens on reuse),
// rotates the token on every use. This is the correct pattern. No changes needed.
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body || {};
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'refreshToken is required' });
    }
    const tokenHash = hashToken(refreshToken);
    const tokenDoc = await RefreshToken.findOne({ tokenHash });
    if (!tokenDoc) return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    const user = await User.findById(tokenDoc.user);
    if (!user) return res.status(401).json({ success: false, message: 'Invalid refresh token' });

    if (tokenDoc.status !== 'active') {
      tokenDoc.status = 'reused';
      await tokenDoc.save();
      user.refreshTokens = [];
      await user.save();
      await RefreshToken.updateMany(
        { user: user._id, status: 'active' },
        { $set: { status: 'revoked', revokedAt: new Date() } }
      );
      await logAuthEvent({ userId: user._id, event: 'refresh_reuse_detected', req });
      return res.status(401).json({ success: false, message: 'Refresh token reuse detected. Please sign in again.' });
    }

    if (new Date(tokenDoc.expiresAt) <= new Date()) {
      tokenDoc.status = 'revoked';
      tokenDoc.revokedAt = new Date();
      await tokenDoc.save();
      return res.status(401).json({ success: false, message: 'Refresh token expired' });
    }

    user.refreshTokens = (user.refreshTokens || []).filter((t) => t.tokenHash !== tokenHash);
    const nextRefreshPayload = await generateRefreshToken(user, req);
    tokenDoc.status = 'rotated';
    tokenDoc.rotatedAt = new Date();
    tokenDoc.replacedByTokenId = nextRefreshPayload.tokenDoc._id;
    await tokenDoc.save();
    await logAuthEvent({ userId: user._id, event: 'refresh_success', req });

    return res.json({
      success: true,
      token: generateAccessToken(user._id),
      refreshToken: nextRefreshPayload.token,
    });
  } catch (error) {
    logger.error('refresh_token_failed', { message: error.message });
    return res.status(500).json({ success: false, message: 'Unable to refresh token' });
  }
});

// @route   POST /api/auth/logout
router.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body || {};
    if (!refreshToken) return res.json({ success: true });
    const tokenHash = hashToken(refreshToken);
    const tokenDoc = await RefreshToken.findOne({ tokenHash });
    await User.updateOne(
      { 'refreshTokens.tokenHash': tokenHash },
      { $pull: { refreshTokens: { tokenHash } } }
    );
    if (tokenDoc) {
      tokenDoc.status = 'revoked';
      tokenDoc.revokedAt = new Date();
      await tokenDoc.save();
      await logAuthEvent({ userId: tokenDoc.user, event: 'logout', req });
    }
    return res.json({ success: true });
  } catch (error) {
    logger.error('logout_failed', { message: error.message });
    return res.status(500).json({ success: false, message: 'Unable to logout' });
  }
});

// Google auth routes — kept intact, secret fix applied via getJwtSecret() above
router.post('/google', async (req, res) => {
  try {
    const { credential, clientId } = req.body;
    if (!credential) {
      return res.status(400).json({ success: false, message: 'Google credential is required' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: clientId || process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Could not retrieve email from Google account' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    let user = await User.findOne({ $or: [{ googleId }, { email: normalizedEmail }] });

    if (!user) {
      // New Google user — request role selection before creating account.
      // Issue a short-lived pending token (10 min) containing the Google payload.
      const pendingToken = jwt.sign(
        { type: 'google_pending', googleId, email: normalizedEmail, name, picture },
        getJwtSecret(),
        { expiresIn: '10m' }
      );
      return res.json({
        success: true,
        roleSelectionRequired: true,
        pendingToken,
        email: normalizedEmail,
      });
    } else {
      if (!user.googleId) {
        user.googleId = googleId;
        user.authMethod = 'google';
      }
      if (picture) user.picture = picture;

      // ─── Google email verification flow (unchanged) ──────────────────────
      if (!user.googleEmailVerified) {
        const verificationCode = generateVerificationCode();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
        user.googleEmailVerified = false;
        user.googleEmailVerificationCode = verificationCode;
        user.googleEmailVerificationExpiresAt = expiresAt;
        await user.save();

        const shouldReturnCode = process.env.NODE_ENV === 'development' || !process.env.EMAIL_USER;
        const sent = await emailService.sendEmail(
          user.email,
          'SmartPark verification code',
          `Your SmartPark Google verification code is: ${verificationCode}\n\nThis code expires at: ${expiresAt.toLocaleString()}\n\n- SmartPark Team`
        );

        if (!sent && !shouldReturnCode) {
          return res.status(500).json({ success: false, message: 'Could not send verification email. Please try again later.' });
        }

        return res.json({
          success: true,
          message: sent ? 'Google verification required. Code sent to email.' : 'Google verification required. Email unavailable, use the code shown below.',
          verificationRequired: true,
          email: user.email,
          userType: user.userType,
          ...(shouldReturnCode ? { code: verificationCode } : {}),
        });
      }
    }

    const refreshPayload = await generateRefreshToken(user, req);
    return res.json({
      success: true,
      message: 'Google authentication successful',
      token: generateAccessToken(user._id),
      refreshToken: refreshPayload.token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        vehicleNumber: user.vehicleNumber,
        userType: user.userType,
        authMethod: user.authMethod,
        picture,
      },
    });
  } catch (error) {
    logger.error('google_auth_error', { message: error.message });
    res.status(400).json({ success: false, message: 'Google authentication failed: ' + error.message });
  }
});

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
    const shouldReturnCode = process.env.NODE_ENV === 'development' || !process.env.EMAIL_USER;
    const sent = await emailService.sendEmail(
      user.email,
      'SmartPark verification code',
      `Your SmartPark Google verification code is: ${verificationCode}\n\nThis code expires at: ${expiresAt.toLocaleString()}\n\n- SmartPark Team`
    );
    if (!sent && !shouldReturnCode) {
      return res.status(500).json({ success: false, message: 'Could not send verification email. Please try again later' });
    }
    return res.json({
      success: true,
      message: sent ? 'Verification code sent' : 'Email unavailable, using on-screen development code',
      ...(shouldReturnCode ? { code: verificationCode } : {}),
    });
  } catch (error) {
    logger.error('send_google_verification_code_failed', { message: error.message });
    return res.status(500).json({ success: false, message: 'Failed to send verification code' });
  }
});

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
      googleEmailVerificationExpiresAt: { $gt: new Date() },
    });
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification code' });
    }
    user.googleEmailVerified = true;
    user.googleEmailVerificationCode = null;
    user.googleEmailVerificationExpiresAt = null;
    await user.save();
    const refreshPayload = await generateRefreshToken(user, req);
    return res.json({
      success: true,
      message: 'Verification successful',
      token: generateAccessToken(user._id),
      refreshToken: refreshPayload.token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        vehicleNumber: user.vehicleNumber,
        userType: user.userType,
        authMethod: user.authMethod,
      },
    });
  } catch (error) {
    logger.error('verify_google_code_failed', { message: error.message });
    return res.status(500).json({ success: false, message: 'Failed to verify code' });
  }
});

// @route   POST /api/auth/google/complete-registration
// Called after role-selection screen for new Google users.
// Verifies the 10-min pending token, then creates the account with the chosen role.
router.post('/google/complete-registration', async (req, res) => {
  try {
    const { pendingToken, userType: requestedType } = req.body;
    if (!pendingToken) {
      return res.status(400).json({ success: false, message: 'pendingToken is required' });
    }

    let payload;
    try {
      payload = jwt.verify(pendingToken, getJwtSecret());
    } catch {
      return res.status(401).json({
        success: false,
        message: 'Google session expired. Please sign in with Google again.',
      });
    }

    if (payload.type !== 'google_pending') {
      return res.status(401).json({ success: false, message: 'Invalid token type' });
    }

    const ALLOWED = ['user', 'business_owner'];
    const resolvedType = ALLOWED.includes(requestedType) ? requestedType : 'user';
    const { googleId, email, name, picture } = payload;

    // Guard: user may have been created by a concurrent request
    let user = await User.findOne({ $or: [{ googleId }, { email }] });
    if (user) {
      // Already exists (race) — just attach googleId if missing and log in
      if (!user.googleId) { user.googleId = googleId; user.authMethod = 'google'; }
      if (picture) user.picture = picture;
      await user.save();
    } else {
      user = await User.create({
        name: name || email,
        email,
        googleId,
        picture,
        authMethod: 'google',
        userType: resolvedType,
        googleEmailVerified: true,
        isActive: true,
      });
    }

    const refreshPayload = await generateRefreshToken(user, req);
    await logAuthEvent({ userId: user._id, event: 'register_success', req });

    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token: generateAccessToken(user._id),
      refreshToken: refreshPayload.token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        vehicleNumber: user.vehicleNumber,
        userType: user.userType,
        authMethod: user.authMethod,
        picture,
      },
    });
  } catch (error) {
    logger.error('google_complete_registration_failed', { message: error.message });
    res.status(500).json({ success: false, message: 'Registration failed. Please try again.' });
  }
});

module.exports = router;