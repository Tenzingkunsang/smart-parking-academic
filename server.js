const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
app.use(express.json());

// Connect to MongoDB
const connectDB = async () => {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Connected Successfully!');
    console.log(`📊 Database: ${mongoose.connection.name}`);
  } catch (error) {
    console.error('❌ MongoDB Connection Failed:', error.message);
    console.log('💡 Check your .env file and MongoDB Atlas settings');
    process.exit(1);
  }
};

// ======================
// 1. DEFINE DATA MODELS
// ======================

// Project Schema
const projectSchema = new mongoose.Schema({
  projectName: { type: String, required: true },
  student: { type: String, required: true },
  group: { type: String, required: true },
  supervisor: { type: String, required: true },
  academicYear: { type: String, required: true },
  status: { type: String, default: 'active' },
  createdAt: { type: Date, default: Date.now }
});

// Parking Spot Schema
const parkingSpotSchema = new mongoose.Schema({
  spotNumber: { type: Number, required: true, unique: true },
  isOccupied: { type: Boolean, default: false },
  vehicleType: { type: String, enum: ['car', 'motorcycle', 'disabled', 'electric'], default: 'car' },
  occupiedAt: { type: Date },
  releasedAt: { type: Date }
});

// Create models
const Project = mongoose.model('Project', projectSchema);
const ParkingSpot = mongoose.model('ParkingSpot', parkingSpotSchema);

// ======================
// 2. CREATE API ENDPOINTS
// ======================

// Root route (your existing)
app.get('/', (req, res) => {
  res.json({
    project: "Smart Parking System",
    student: "Tenzing Kunsang Sherpa",
    group: "L6CG4",
    supervisor: "Adhish Suwal",
    academicYear: "2025/2026",
    status: "API is running"
  });
});

// ======================
// NEW: DATABASE ENDPOINTS
// ======================

// 1. POST /api/projects - Save project to MongoDB
app.post('/api/projects', async (req, res) => {
  try {
    const projectData = {
      projectName: "Smart Parking System",
      student: "Tenzing Kunsang Sherpa",
      group: "L6CG4",
      supervisor: "Adhish Suwal",
      academicYear: "2025/2026",
      status: "active"
    };

    const project = new Project(projectData);
    await project.save();

    res.status(201).json({
      success: true,
      message: 'Project data saved to MongoDB Atlas!',
      data: project,
      mongodbId: project._id
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// 2. GET /api/projects - Get all projects
app.get('/api/projects', async (req, res) => {
  try {
    const projects = await Project.find();
    res.json({
      success: true,
      count: projects.length,
      data: projects
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// 3. POST /api/parking/spots/setup - Create sample parking spots
app.post('/api/parking/spots/setup', async (req, res) => {
  try {
    // Clear existing spots first
    await ParkingSpot.deleteMany({});
    
    const spots = [];
    for (let i = 1; i <= 10; i++) {
      const spot = new ParkingSpot({
        spotNumber: i,
        isOccupied: Math.random() > 0.5,
        vehicleType: i === 1 ? 'disabled' : (i === 2 ? 'electric' : 'car')
      });
      await spot.save();
      spots.push(spot);
    }
    
    res.json({
      success: true,
      message: 'Created 10 parking spots in MongoDB!',
      data: spots
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// 4. GET /api/parking/spots - Get all parking spots
app.get('/api/parking/spots', async (req, res) => {
  try {
    const spots = await ParkingSpot.find().sort({ spotNumber: 1 });
    
    const available = spots.filter(s => !s.isOccupied).length;
    const occupied = spots.filter(s => s.isOccupied).length;
    
    res.json({
      success: true,
      summary: {
        total: spots.length,
        available: available,
        occupied: occupied
      },
      data: spots
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// 5. Test database route (your existing)
app.get('/test-db', async (req, res) => {
  try {
    const dbStatus = mongoose.connection.readyState;
    const statusText = dbStatus === 1 ? 'connected' : 'disconnected';
    
    res.json({
      success: true,
      database: statusText,
      message: 'Database connection test'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ======================
// START SERVER
// ======================
const startServer = async () => {
  await connectDB();
  
  const PORT = process.env.PORT || 5001;
  app.listen(PORT, () => {
    console.log('\n' + '='.repeat(50));
    console.log('🚀 SMART PARKING SYSTEM BACKEND');
    console.log('='.repeat(50));
    console.log(`📡 Server: http://localhost:${PORT}`);
    console.log(`📊 MongoDB: Connected to ${mongoose.connection.name}`);
    console.log('='.repeat(50));
    console.log('\n📋 AVAILABLE ENDPOINTS:');
    console.log(`GET  /                         - Welcome message`);
    console.log(`GET  /test-db                  - Test connection`);
    console.log(`POST /api/projects             - Save project to MongoDB`);
    console.log(`GET  /api/projects             - View projects`);
    console.log(`POST /api/parking/spots/setup  - Create parking spots`);
    console.log(`GET  /api/parking/spots        - View parking spots`);
    console.log('='.repeat(50));
  });
};

startServer();