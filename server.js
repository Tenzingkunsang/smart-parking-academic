const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./src/config/database');

// Load env vars
dotenv.config();

const app = express();

// Body parser
app.use(express.json());

// Connect to database
connectDB();

// Import routes
const authRoutes = require('./src/routes/authRoutes');
const parkingRoutes = require('./src/routes/parkingRoutes');

// Mount routers
app.use('/api/auth', authRoutes);
app.use('/api/parking', parkingRoutes);

// Basic route
app.get('/', (req, res) => {
  res.json({
    project: "Smart Parking System",
    student: "Tenzing Kunsang Sherpa",
    group: "L6CG4",
    supervisor: "Adhish Suwal",
    academicYear: "2025/2026",
    status: "API is running",
    features: ["Authentication", "Parking Management"]
  });
});

// Test DB route
app.get('/test-db', (req, res) => {
  const mongoose = require('mongoose');
  const dbStatus = mongoose.connection.readyState;
  const statusText = dbStatus === 1 ? 'connected' : 'disconnected';
  res.json({ success: true, database: statusText });
});

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 SMART PARKING SYSTEM BACKEND');
  console.log('='.repeat(60));
  console.log(`📡 Server: http://localhost:${PORT}`);
  console.log(`📊 MongoDB: Connected`);
  console.log('='.repeat(60));
  console.log('\n📋 AVAILABLE ENDPOINTS:');
  console.log(`GET  /                         - Welcome message`);
  console.log(`GET  /test-db                  - Test connection`);
  console.log(`POST /api/auth/register        - Register user`);
  console.log(`POST /api/auth/login           - Login user`);
  console.log(`GET  /api/auth/me              - Get profile (requires token)`);
  console.log(`GET  /api/parking/spots        - View parking spots`);
  console.log(`POST /api/parking/init         - Initialize spots (testing)`);
  console.log(`POST /api/parking/reserve      - Reserve spot (requires token)`);
  console.log(`GET  /api/parking/my-reservations - User reservations`);
  console.log('='.repeat(60));
});
