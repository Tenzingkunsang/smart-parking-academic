/**
 * services/socketService.js
 *
 * Production-grade Socket.IO service.
 * - JWT authentication on every connection
 * - Per-user rooms (users only receive their own events)
 * - Admin room for admin-panel events
 * - Safe getIo() — never throws, logs warning instead
 * - Redis adapter ready (uncomment 3 lines when scaling)
 * - Full event helper methods so the rest of your app
 *   never calls io.emit() directly
 */

const jwt = require('jsonwebtoken');

let io = null;

/**
 * Allowed frontend origins. Add your production domain here.
 * Falls back to localhost origins for development.
 */
const getAllowedOrigins = () => {
  const prod = process.env.FRONTEND_URL;
  const devOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
  ];
  return prod ? [prod, ...devOrigins] : devOrigins;
};

/**
 * Authenticate a socket connection using the JWT token
 * passed in socket.handshake.auth.token (or as query param).
 *
 * This runs BEFORE the connection event fires.
 */
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
      console.error('[Socket] JWT_SECRET is not set.');
      return next(new Error('SERVER_ERROR: Auth not configured.'));
    }

    const decoded = jwt.verify(token, secret);

    // Attach user info to socket for use in handlers
    socket.userId = decoded._id || decoded.id || decoded.userId;
    socket.userRole = decoded.role || 'user';

    next();
  } catch (err) {
    // Expired or invalid token
    return next(new Error(`AUTH_INVALID: ${err.message}`));
  }
};

/**
 * Initialize Socket.IO on the HTTP server.
 * Call this once in your server entry point (server.js / app.js).
 *
 * @param {import('http').Server} server
 * @returns {import('socket.io').Server}
 */
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

  // ─── Optional: Redis adapter for multi-instance / clustering ────────────────
  // Uncomment these 3 lines and install: npm install @socket.io/redis-adapter ioredis
  // const { createClient } = require('ioredis');
  // const { createAdapter } = require('@socket.io/redis-adapter');
  // io.adapter(createAdapter(createClient({ host: process.env.REDIS_HOST })));
  // ────────────────────────────────────────────────────────────────────────────

  // Apply auth middleware to ALL incoming connections
  io.use(authMiddleware);

  io.on('connection', (socket) => {
    const { userId, userRole } = socket;

    // ── Join personal room so we can send targeted events ──
    socket.join(`user:${userId}`);
    console.log(`[Socket] Connected | user: ${userId} | role: ${userRole} | id: ${socket.id}`);

    // ── Admins join a shared admin room ──
    if (userRole === 'admin') {
      socket.join('room:admin');
    }

    // ── Clean disconnect log ──
    socket.on('disconnect', (reason) => {
      console.log(`[Socket] Disconnected | user: ${userId} | reason: ${reason}`);
    });

    // ── Error handler — prevents uncaught exception crashes ──
    socket.on('error', (err) => {
      console.error(`[Socket] Error on socket ${socket.id}:`, err.message);
    });
  });

  console.log(`[Socket] Initialized | allowed origins: ${getAllowedOrigins().join(', ')}`);
  return io;
};

/**
 * Get the initialized io instance.
 * Returns null (with a warning) if init() hasn't been called yet.
 * Never throws — callers can safely do: getIo()?.to(...)?.emit(...)
 *
 * @returns {import('socket.io').Server | null}
 */
const getIo = () => {
  if (!io) {
    console.warn('[Socket] getIo() called before init(). Is Socket.IO initialized?');
    return null;
  }
  return io;
};

// ─── Targeted event emitters ────────────────────────────────────────────────
// Use these throughout your app instead of calling io.emit() directly.
// They are null-safe — if socket isn't initialized they log and return false.

/**
 * Emit an event to a specific user only.
 * @param {string} userId
 * @param {string} event
 * @param {object} payload
 * @returns {boolean} whether the event was emitted
 */
const emitToUser = (userId, event, payload) => {
  const socket = getIo();
  if (!socket) return false;
  socket.to(`user:${userId}`).emit(event, payload);
  return true;
};

/**
 * Emit an event to all connected admins.
 * @param {string} event
 * @param {object} payload
 * @returns {boolean}
 */
const emitToAdmins = (event, payload) => {
  const socket = getIo();
  if (!socket) return false;
  socket.to('room:admin').emit(event, payload);
  return true;
};

/**
 * Broadcast an event to every connected client.
 * Use sparingly — prefer emitToUser for privacy.
 * @param {string} event
 * @param {object} payload
 * @returns {boolean}
 */
const broadcast = (event, payload) => {
  const socket = getIo();
  if (!socket) return false;
  socket.emit(event, payload);
  return true;
};

// ─── Domain-specific event helpers ──────────────────────────────────────────
// Named wrappers so event names are defined in one place, never hardcoded
// across the codebase.

/**
 * Notify a user that their payment was confirmed.
 * @param {string} userId
 * @param {{ bookingId: string, spotNumber: string, amount: number }} data
 */
const notifyPaymentConfirmed = (userId, data) =>
  emitToUser(userId, 'payment:confirmed', { ...data, timestamp: new Date().toISOString() });

/**
 * Notify a user that their reservation was cancelled + refund info.
 * @param {string} userId
 * @param {{ bookingId: string, refundAmount: number, refundPercent: number }} data
 */
const notifyReservationCancelled = (userId, data) =>
  emitToUser(userId, 'reservation:cancelled', { ...data, timestamp: new Date().toISOString() });

/**
 * Notify a user that their booking is expiring soon.
 * @param {string} userId
 * @param {{ bookingId: string, spotNumber: string, minutesLeft: number }} data
 */
const notifyExpiryWarning = (userId, data) =>
  emitToUser(userId, 'reservation:expiring', { ...data, timestamp: new Date().toISOString() });

/**
 * Emit a parking spot status change to all connected clients.
 * Used when admin marks a spot available/occupied.
 * @param {{ spotId: string, spotNumber: string, status: string, locationId: string }} data
 */
const notifySpotStatusChanged = (data) =>
  broadcast('spot:statusChanged', { ...data, timestamp: new Date().toISOString() });

/**
 * Emit a new booking event to the admin room.
 * @param {{ bookingId: string, spotNumber: string, userId: string, amount: number }} data
 */
const notifyAdminNewBooking = (data) =>
  emitToAdmins('admin:newBooking', { ...data, timestamp: new Date().toISOString() });

module.exports = {
  init,
  getIo,
  emitToUser,
  emitToAdmins,
  broadcast,
  // Domain events
  notifyPaymentConfirmed,
  notifyReservationCancelled,
  notifyExpiryWarning,
  notifySpotStatusChanged,
  notifyAdminNewBooking,
};