const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
const ParkingSpot = require('./src/models/ParkingSpot');

dotenv.config({ path: path.join(__dirname, '.env') });

const newParkingSpots = [
  // Additional 20 more parking spots
  { spotNumber: 21, locationName: "Gongabu Bridge", address: "Gongabu, Kathmandu", location: { lat: 27.7285, lng: 85.3055 }, totalSpaces: 15, availableSpaces: 15, price: 45, vehicleTypes: ['car'], features: ['24_hours'] },
  { spotNumber: 22, locationName: "Baneshwor Central", address: "Baneshwor, Kathmandu", location: { lat: 27.7005, lng: 85.3485 }, totalSpaces: 20, availableSpaces: 20, price: 50, vehicleTypes: ['car', 'motorcycle'], features: ['covered'] },
  { spotNumber: 23, locationName: "Kamaladi Plaza", address: "Kamaladi, Kathmandu", location: { lat: 27.6890, lng: 85.3140 }, totalSpaces: 12, availableSpaces: 12, price: 55, vehicleTypes: ['car'], features: ['handicap'] },
  { spotNumber: 24, locationName: "Sundhara Square", address: "Sundhara, Kathmandu", location: { lat: 27.7040, lng: 85.3095 }, totalSpaces: 10, availableSpaces: 10, price: 60, vehicleTypes: ['car'], features: [] },
  { spotNumber: 25, locationName: "Tangal Market", address: "Tangal, Kathmandu", location: { lat: 27.7185, lng: 85.3275 }, totalSpaces: 18, availableSpaces: 18, price: 35, vehicleTypes: ['motorcycle'], features: ['24_hours'] },
  { spotNumber: 26, locationName: "Dilli Bazaar Center", address: "Dilli Bazaar, Kathmandu", location: { lat: 27.7110, lng: 85.3205 }, totalSpaces: 14, availableSpaces: 14, price: 50, vehicleTypes: ['car'], features: ['covered', 'handicap'] },
  { spotNumber: 27, locationName: "Jhochhen Junction", address: "Jhochhen, Kathmandu", location: { lat: 27.7135, lng: 85.3240 }, totalSpaces: 16, availableSpaces: 16, price: 45, vehicleTypes: ['car', 'motorcycle'], features: [] },
  { spotNumber: 28, locationName: "Indra Chowk", address: "Indra Chowk, Kathmandu", location: { lat: 27.7090, lng: 85.3155 }, totalSpaces: 11, availableSpaces: 11, price: 70, vehicleTypes: ['car'], features: ['24_hours'] },
  { spotNumber: 29, locationName: "Ashok Rajpath", address: "Ashok Rajpath, Kathmandu", location: { lat: 27.7250, lng: 85.3350 }, totalSpaces: 25, availableSpaces: 25, price: 40, vehicleTypes: ['car', 'ev'], features: ['ev_charging'] },
  { spotNumber: 30, locationName: "Shantinagar West", address: "Shantinagar, Kathmandu", location: { lat: 27.7065, lng: 85.2965 }, totalSpaces: 13, availableSpaces: 13, price: 38, vehicleTypes: ['car', 'motorcycle'], features: ['covered'] },
  { spotNumber: 31, locationName: "Matumba Center", address: "Matumba, Kathmandu", location: { lat: 27.6850, lng: 85.3310 }, totalSpaces: 19, availableSpaces: 19, price: 42, vehicleTypes: ['car'], features: [] },
  { spotNumber: 32, locationName: "Birendra Marg", address: "Birendra Marg, Kathmandu", location: { lat: 27.7305, lng: 85.3200 }, totalSpaces: 17, availableSpaces: 17, price: 55, vehicleTypes: ['car', 'ev'], features: ['ev_charging', '24_hours'] },
  { spotNumber: 33, locationName: "Panipokhari Street", address: "Panipokhari, Kathmandu", location: { lat: 27.7220, lng: 85.3155 }, totalSpaces: 14, availableSpaces: 14, price: 48, vehicleTypes: ['car', 'motorcycle'], features: ['handicap'] },
  { spotNumber: 34, locationName: "Maharajgunj College", address: "Maharajgunj, Kathmandu", location: { lat: 27.7340, lng: 85.3105 }, totalSpaces: 22, availableSpaces: 22, price: 35, vehicleTypes: ['car'], features: ['24_hours'] },
  { spotNumber: 35, locationName: "Kuriyodal Area", address: "Kuriyodal, Kathmandu", location: { lat: 27.6925, lng: 85.2895 }, totalSpaces: 12, availableSpaces: 12, price: 40, vehicleTypes: ['motorcycle'], features: [] },
  { spotNumber: 36, locationName: "Bhagwati Shopping", address: "Bhagwati, Kathmandu", location: { lat: 27.6810, lng: 85.3245 }, totalSpaces: 20, availableSpaces: 20, price: 50, vehicleTypes: ['car', 'ev'], features: ['ev_charging', 'covered'] },
  { spotNumber: 37, locationName: "Dhulikhel Road", address: "Dhulikhel Marg, Kathmandu", location: { lat: 27.6900, lng: 85.3395 }, totalSpaces: 15, availableSpaces: 15, price: 45, vehicleTypes: ['car'], features: [] },
  { spotNumber: 38, locationName: "Babar Mahal", address: "Babar Mahal, Kathmandu", location: { lat: 27.7155, lng: 85.3365 }, totalSpaces: 18, availableSpaces: 18, price: 65, vehicleTypes: ['car', 'ev'], features: ['ev_charging', 'handicap', '24_hours'] },
  { spotNumber: 39, locationName: "Tripureshwar Temple", address: "Tripureshwar, Kathmandu", location: { lat: 27.6945, lng: 85.3145 }, totalSpaces: 10, availableSpaces: 10, price: 30, vehicleTypes: ['motorcycle'], features: ['24_hours'] },
  { spotNumber: 40, locationName: "Kathmandu Mall West", address: "Bagbazar, Kathmandu", location: { lat: 27.7075, lng: 85.3345 }, totalSpaces: 30, availableSpaces: 30, price: 60, vehicleTypes: ['car', 'ev'], features: ['ev_charging', 'covered', '24_hours'] }
];

async function addMoreSpots() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('📊 Connected to MongoDB');
    
    const result = await ParkingSpot.insertMany(newParkingSpots);
    console.log(`✅ Successfully added ${result.length} new parking spots!`);
    console.log(`📍 Total spots now: ${result.length} (spots 21-40)`);
    
    const totalSpots = await ParkingSpot.countDocuments();
    console.log(`📊 Total parking spots in database: ${totalSpots}`);
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error adding parking spots:', err.message);
    process.exit(1);
  }
}

addMoreSpots();
