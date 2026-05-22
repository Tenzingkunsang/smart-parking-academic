const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ─── FIX #2: No hardcoded JWT secret fallback ────────────────────────────────
// The || 'hardcoded_secret' pattern means a missing .env silently uses a weak
// secret that anyone who reads your source code can forge tokens with.
// Now we THROW at startup if the secret is missing — fail loud, fail early.
const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set. Server cannot start securely.');
  }
  return secret;
};
// ────────────────────────────────────────────────────────────────────────────

exports.protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route',
    });
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret());

    if (decoded.type && decoded.type !== 'access') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token type',
      });
    }

    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user || !req.user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User not authorized',
      });
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route',
    });
  }
};

exports.adminAuth = (req, res, next) => {
  if (req.user && req.user.userType === 'admin') {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Admin access required',
    });
  }
};