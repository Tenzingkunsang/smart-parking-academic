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
const cancelReservationRoutes = require('./routes/cancelReservation.route');
const adminRoutes = require('./routes/adminRoutes');
const passwordRoutes = require('./routes/passwordRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(cors({
    origin: (process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3003,http://localhost:3004').split(','),
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

  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/parking', parkingRoutes);
  app.use('/api/v1/reservations', reservationRoutes);
  app.use('/api/v1/reservations', cancelReservationRoutes);
  app.use('/api/v1/admin', adminRoutes);
  app.use('/api/v1/password', passwordRoutes);
  app.use('/api/v1/payments', paymentRoutes);
  app.use('/api/v1/notifications', notificationRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/parking', parkingRoutes);
  app.use('/api/reservations', reservationRoutes);
  app.use('/api/reservations', cancelReservationRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/password', passwordRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/notifications', notificationRoutes);

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
