const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
require('dotenv').config();

const socketService = require('./src/services/socketService');
const ReallocationService = require('./src/services/reallocationService');
const jobSchedulerService = require('./src/services/jobSchedulerService');

const app = express();
const server = http.createServer(app);
socketService.init(server);

// CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003', 'http://localhost:3004'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Import Routes
const authRoutes = require('./src/routes/authRoutes');
const parkingRoutes = require('./src/routes/ParkingRoutes');
const reservationRoutes = require('./src/routes/reservationRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const passwordRoutes = require('./src/routes/passwordRoutes');
const paymentRoutes = require('./src/routes/paymentRoutes');
const notificationRoutes = require('./src/routes/notificationRoutes');

// Register Routes
app.use('/api/auth', authRoutes);
app.use('/api/parking', parkingRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/password', passwordRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'SmartPark API is running',
    endpoints: {
      auth: '/api/auth',
      parking: '/api/parking/spots',
      reservations: '/api/reservations/my',
      payments: '/api/payments',
      password: '/api/password/forgot-password',
      health: '/health'
    }
  });
});

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/smartpark';

mongoose.connect(MONGODB_URI)
    .then(() => {
      console.log('📊 MongoDB Connected Successfully');
      ReallocationService.startScheduler();
      jobSchedulerService.startScheduler();
    })
    .catch(err => console.log('❌ DB Connection Error:', err));

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
    console.log(`\n🚀 Server running on http://localhost:${PORT}`);
    console.log(`📍 Parking: http://localhost:${PORT}/api/parking/spots`);
    console.log(`🔐 Auth: http://localhost:${PORT}/api/auth/login`);
    console.log(`💳 Payments: http://localhost:${PORT}/api/payments`);
    console.log(`🔌 Socket.io enabled for live parking updates`);
    console.log(`🏥 Health: http://localhost:${PORT}/health\n`);
});
