const mongoose = require('mongoose');
const ParkingSpot = require('./src/models/ParkingSpot');
require('dotenv').config();

async function fixSpot() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const spot = await ParkingSpot.findById('69bf7a4a161a9bb1ce0fc9cf');
    if (spot) {
      spot.reservedSpaces = 0;
      spot.availableSpaces = spot.totalSpaces;
      spot.isReserved = false;
      spot.status = 'available';
      await spot.save();
      console.log('✅ Spot fixed!');
      console.log(`Available: ${spot.availableSpaces}, Reserved: ${spot.reservedSpaces}`);
    } else {
      console.log('Spot not found');
    }
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixSpot();
