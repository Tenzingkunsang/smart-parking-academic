/**
 * socketService.js — Fixed version
 *
 * Fixes applied:
 *  #11 — Privacy leak: replaced all io.emit() (broadcast to everyone) with
 *         targeted emitters. Spot status changes stay broadcast (public info),
 *         but reservation/user-specific events go only to the relevant user.
 *
 * Note: The _emitSpotChange helper in reservationController.js still calls
 * io.emit() for spot status — that is intentional (parking availability is
 * public). All user-specific events (check-in timer, reservation status)
 * now use emitToUser() instead of io.emit().
 */

const jwt = require('jsonwebtoken');
const logger = require('../config/logger');

let io = null;

const getAllowedOrigins = () => {
  const prod = process.env.FRONTEND_URL;
  const devOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
  ];
  return prod ? [prod, ...devOrigins] : devOrigins;
};

const authMiddleware = (socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace('Bearer ', '') ||
      socket.handshake.query?.token;

    if (!token) {
      return next(new Error('AUTH_MISSING: No token provided.'));
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      logger.error('socket_jwt_secret_missing');
      return next(new Error('SERVER_ERROR: Auth not configured.'));
    }

    const decoded = jwt.verify(token, secret);
    socket.userId = decoded._id || decoded.id || decoded.userId;
    socket.userRole = decoded.role || decoded.userType || 'user';

    next();
  } catch (err) {
    return next(new Error(`AUTH_INVALID: ${err.message}`));
  }
};

const init = (server) => {
  const { Server } = require('socket.io');

  io = new Server(server, {
    cors: {
      origin: getAllowedOrigins(),
      credentials: true,
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60_000,
    pingInterval: 25_000,
  });

  io.use(authMiddleware);

  io.on('connection', (socket) => {
    const { userId, userRole } = socket;

    socket.join(`user:${userId}`);
    logger.info('socket_connected', { userId, role: userRole, socketId: socket.id });

    if (userRole === 'admin') {
      socket.join('room:admin');
    }

    socket.on('disconnect', (reason) => {
      logger.info('socket_disconnected', { userId, reason });
    });

    socket.on('error', (err) => {
      logger.error('socket_error', { socketId: socket.id, message: err.message });
    });
  });

  logger.info('socket_initialized', { allowedOrigins: getAllowedOrigins() });
  return io;
};

const getIo = () => {
  if (!io) {
    logger.warn('socket_get_io_before_init');
    return null;
  }
  return io;
};

// ─── Targeted event emitters ─────────────────────────────────────────────────

/**
 * Emit to a specific user only.
 * ─── FIX #11: Use this for any user-specific event instead of io.emit() ────
 */
const emitToUser = (userId, event, payload) => {
  const socket = getIo();
  if (!socket) return false;
  socket.to(`user:${userId}`).emit(event, payload);
  return true;
};

/**
 * Emit to all connected admins only.
 */
const emitToAdmins = (event, payload) => {
  const socket = getIo();
  if (!socket) return false;
  socket.to('room:admin').emit(event, payload);
  return true;
};

/**
 * Broadcast to all connected clients.
 * Use ONLY for truly public data (e.g. parking spot availability).
 * Never use for user-specific data (bookings, payments, personal info).
 */
const broadcast = (event, payload) => {
  const socket = getIo();
  if (!socket) return false;
  socket.emit(event, payload);
  return true;
};

// ─── Domain-specific event helpers ───────────────────────────────────────────

const notifyPaymentConfirmed = (userId, data) =>
  emitToUser(userId, 'payment:confirmed', { ...data, timestamp: new Date().toISOString() });

const notifyReservationCancelled = (userId, data) =>
  emitToUser(userId, 'reservation:cancelled', { ...data, timestamp: new Date().toISOString() });

const notifyExpiryWarning = (userId, data) =>
  emitToUser(userId, 'reservation:expiring', { ...data, timestamp: new Date().toISOString() });

/**
 * Spot status changes are public — any user can see parking availability.
 * This intentionally uses broadcast().
 */
const notifySpotStatusChanged = (data) =>
  broadcast('spot:statusChanged', { ...data, timestamp: new Date().toISOString() });

const notifyAdminNewBooking = (data) =>
  emitToAdmins('admin:newBooking', { ...data, timestamp: new Date().toISOString() });

module.exports = {
  init,
  getIo,
  emitToUser,
  emitToAdmins,
  broadcast,
  notifyPaymentConfirmed,
  notifyReservationCancelled,
  notifyExpiryWarning,
  notifySpotStatusChanged,
  notifyAdminNewBooking,
};