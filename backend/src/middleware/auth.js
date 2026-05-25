const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ─── FIX #2: No hardcoded JWT secret fallback ────────────────────────────────
// BUG-AUTH1: getJwtSecret() called on every request re-reads process.env each
// time. Validate once at module load (fail-fast at startup) and cache the value.
// This also means a misconfigured server refuses to start rather than serving
// 401s on every request until someone notices the logs.
const _JWT_SECRET = (() => {
  const secret = process.env.JWT_SECRET || (process.env.NODE_ENV === 'test' ? 'test-secret' : null);
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set. Server cannot start securely.');
  }
  return secret;
})();
const getJwtSecret = () => _JWT_SECRET;
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

/**
 * businessOwnerAuth — allows business_owner OR admin.
 * Attach after `protect`.
 */
exports.businessOwnerAuth = (req, res, next) => {
  if (req.user && (req.user.userType === 'business_owner' || req.user.userType === 'admin')) {
    // Business owner must have verified account; admins always pass.
    if (req.user.userType === 'business_owner') {
      if (!req.user.businessProfile?.verified) {
        return res.status(403).json({
          success: false,
          message: 'Business account pending admin verification. Contact support.',
        });
      }
      if (req.user.businessProfile?.suspendedAt) {
        return res.status(403).json({
          success: false,
          message: 'Business account suspended. Contact support.',
        });
      }
    }
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Business owner access required',
    });
  }
};

/**
 * requireSpotOwner — verifies the parking spot belongs to the calling
 * business_owner. Admins bypass the check. Attach AFTER businessOwnerAuth.
 * Expects req.spot to be pre-loaded, or will load it from req.params.spotId.
 *
 * Usage:
 *   router.put('/spots/:spotId', protect, businessOwnerAuth, requireSpotOwner, handler)
 */
exports.requireSpotOwner = async (req, res, next) => {
  if (req.user.userType === 'admin') return next(); // admins can touch any spot
  try {
    const ParkingSpot = require('../models/ParkingSpot');
    const spotId = req.params.spotId || req.params.id;
    const spot = req.spot || await ParkingSpot.findById(spotId);
    if (!spot) return res.status(404).json({ success: false, message: 'Spot not found' });
    if (!spot.owner || spot.owner.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You do not own this parking spot' });
    }
    req.spot = spot; // cache for the handler
    next();
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};