const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
const ParkingSpot = require('../models/ParkingSpot');

dotenv.config({ path: path.join(__dirname, '../.env') });

const seedData = [
  { spotNumber: 1, locationName: "Durbar Marg Main Gate", location: { lat: 27.7100, lng: 85.3160 }, vehicleType: 'car', price: 60, qrCode: "KTM-001" },
  { spotNumber: 2, locationName: "Thamel North Entrance", location: { lat: 27.7149, lng: 85.3119 }, vehicleType: 'car', price: 50, qrCode: "KTM-002" },
  { spotNumber: 3, locationName: "Civil Mall Parking", location: { lat: 27.6990, lng: 85.3120 }, vehicleType: 'car', price: 40, qrCode: "KTM-003" },
  { spotNumber: 4, locationName: "New Road Pako", location: { lat: 27.7030, lng: 85.3110 }, vehicleType: 'motorcycle', price: 20, qrCode: "KTM-004" },
  { spotNumber: 5, locationName: "Basantapur Square", location: { lat: 27.7041, lng: 85.3065 }, vehicleType: 'car', price: 80, qrCode: "KTM-005" },
  { spotNumber: 6, locationName: "Patan Labim Mall", location: { lat: 27.6775, lng: 85.3171 }, vehicleType: 'car', price: 50, qrCode: "KTM-006" },
  { spotNumber: 7, locationName: "Boudha Stupa Gate", location: { lat: 27.7215, lng: 85.3620 }, vehicleType: 'motorcycle', price: 15, qrCode: "KTM-007" },
  { spotNumber: 8, locationName: "Lazimpat Central", location: { lat: 27.7210, lng: 85.3210 }, vehicleType: 'car', price: 50, qrCode: "KTM-008" },
  { spotNumber: 9, locationName: "Naxal Bhat-Bhateni", location: { lat: 27.7125, lng: 85.3312 }, vehicleType: 'car', price: 40, qrCode: "KTM-009" },
  { spotNumber: 10, locationName: "Maitighar Mandala", location: { lat: 27.6935, lng: 85.3225 }, vehicleType: 'car', price: 30, qrCode: "KTM-010" },
  { spotNumber: 11, locationName: "Jawalakhel Zoo", location: { lat: 27.6728, lng: 85.3120 }, vehicleType: 'car', price: 40, qrCode: "KTM-011" },
  { spotNumber: 12, locationName: "Tripureshwar Center", location: { lat: 27.6930, lng: 85.3165 }, vehicleType: 'car', price: 50, qrCode: "KTM-012" },
  { spotNumber: 13, locationName: "Putalisadak Hub", location: { lat: 27.7048, lng: 85.3235 }, vehicleType: 'motorcycle', price: 20, qrCode: "KTM-013" },
  { spotNumber: 14, locationName: "Koteshwor East", location: { lat: 27.6765, lng: 85.3485 }, vehicleType: 'car', price: 40, qrCode: "KTM-014" },
  { spotNumber: 15, locationName: "Chabahil KL Tower", location: { lat: 27.7170, lng: 85.3450 }, vehicleType: 'car', price: 50, qrCode: "KTM-015" },
  { spotNumber: 16, locationName: "Balaju Industrial", location: { lat: 27.7340, lng: 85.3020 }, vehicleType: 'car', price: 30, qrCode: "KTM-016" },
  { spotNumber: 17, locationName: "Kings Way Plaza", location: { lat: 27.7115, lng: 85.3175 }, vehicleType: 'car', price: 100, qrCode: "KTM-017" },
  { spotNumber: 18, locationName: "Swayambhu Base", location: { lat: 27.7165, lng: 85.2840 }, vehicleType: 'motorcycle', price: 15, qrCode: "KTM-018" },
  { spotNumber: 19, locationName: "Baluwatar North", location: { lat: 27.7230, lng: 85.3310 }, vehicleType: 'car', price: 60, qrCode: "KTM-019" },
  { spotNumber: 20, locationName: "Kalanki Junction", location: { lat: 27.6938, lng: 85.2815 }, vehicleType: 'car', price: 40, qrCode: "KTM-020" }
];

async function runSeed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    await ParkingSpot.deleteMany({});
    await ParkingSpot.insertMany(seedData);
    console.log("✅ 20 Kathmandu spots successfully seeded!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seed Error:", err.message);
    process.exit(1);
  }
}
runSeed();