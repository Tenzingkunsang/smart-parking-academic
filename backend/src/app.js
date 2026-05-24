const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const requestContext = require('./middleware/requestContext');
const requestLogger = require('./middleware/requestLogger');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const parkingRoutes = require('./routes/ParkingRoutes');
const reservationRoutes = require('./routes/reservationRoutes');
const adminRoutes = require('./routes/adminRoutes');
const passwordRoutes = require('./routes/passwordRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const userRoutes = require('./routes/userRoutes');
const smartParkingRoutes = require('./routes/smartParkingRoutes');
const adminAnalyticsRoutes = require('./routes/adminAnalyticsRoutes');

// Bug LOW-2: production must explicitly set CORS_ORIGIN. We only allow the
// dev fallback when NODE_ENV !== 'production'. This prevents a typo or missing
// env var from accidentally opening the API to arbitrary localhost ports.
function resolveCorsOrigins() {
  if (process.env.CORS_ORIGIN) {
    return process.env.CORS_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean);
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('CORS_ORIGIN must be set in production (comma-separated list of allowed origins).');
  }
  return ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'];
}

function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(cors({
    origin: resolveCorsOrigins(),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));
  app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
  app.use(compression());
  app.use(mongoSanitize());
  app.use(hpp());
  app.use(requestContext);
  app.use(requestLogger);
  app.use('/api', rateLimit({
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
    max: Number(process.env.RATE_LIMIT_MAX || 300),
    standardHeaders: true,
    legacyHeaders: false,
  }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Bug LOW-1: single canonical route prefix. The legacy /api/* aliases were
  // dropped so logs, rate-limit keys, and access logs all reference one path.
  // The frontend already targets /api/v1/* via REACT_APP_API_URL.
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/parking', parkingRoutes);
  app.use('/api/v1/parking/smart', smartParkingRoutes);
  app.use('/api/v1/reservations', reservationRoutes);
  app.use('/api/v1/admin', adminRoutes);
  app.use('/api/v1/admin/analytics', adminAnalyticsRoutes);
  app.use('/api/v1/password', passwordRoutes);
  app.use('/api/v1/payments', paymentRoutes);
  app.use('/api/v1/notifications', notificationRoutes);
  app.use('/api/v1/user', userRoutes);

  app.get('/health', (req, res) => {
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: 'v1',
    });
  });

  app.get('/', (req, res) => {
    res.json({ message: 'SmartPark API is running' });
  });

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = createApp;
