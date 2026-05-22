const mongoose = require('mongoose');
const http = require('http');
require('dotenv').config();

const socketService = require('./src/services/socketService');
const ReallocationService = require('./src/services/reallocationService');
const jobSchedulerService = require('./src/services/jobSchedulerService');
const logger = require('./src/config/logger');
const createApp = require('./src/app');

// ─── FIX #1: Unhandled rejection / exception handlers ───────────────────────
// Without these, a single unhandled promise rejection silently kills the process.
process.on('unhandledRejection', (reason, promise) => {
  logger.error('unhandled_rejection', {
    reason: reason?.message || reason,
    stack: reason?.stack,
  });
  // Give the logger a moment to flush, then exit so the process manager restarts cleanly
  setTimeout(() => process.exit(1), 500);
});

process.on('uncaughtException', (err) => {
  logger.error('uncaught_exception', {
    message: err.message,
    stack: err.stack,
  });
  setTimeout(() => process.exit(1), 500);
});
// ────────────────────────────────────────────────────────────────────────────

const app = createApp();
const server = http.createServer(app);
socketService.init(server);

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/smartpark';

mongoose.connect(MONGODB_URI)
  .then(() => {
    logger.info('mongodb_connected');
    ReallocationService.startScheduler();
    jobSchedulerService.startScheduler();
  })
  .catch((err) => {
    logger.error('mongodb_connection_error', { message: err.message });
    process.exit(1); // Can't run without DB — exit so process manager restarts
  });

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  logger.info('server_started', {
    port: PORT,
    parking: `/api/v1/parking/spots`,
    auth: `/api/v1/auth/login`,
    payments: `/api/v1/payments`,
    health: '/health',
  });
});