const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
const ParkingSpot = require('../models/ParkingSpot');
const User = require('../models/User');

// .env is two levels up from backend/src/utils/
dotenv.config({ path: path.join(__dirname, '../../.env') });

const seedSpots = [
  { spotNumber: 1,  locationName: "Durbar Marg Main Gate",  address: "Durbar Marg, Kathmandu",    location: { lat: 27.7100, lng: 85.3160 }, totalSpaces: 15, availableSpaces: 15, vehicleTypes: ['car'],              price: 60,  features: ['24_hours'] },
  { spotNumber: 2,  locationName: "Thamel North Entrance",  address: "Thamel, Kathmandu",          location: { lat: 27.7149, lng: 85.3119 }, totalSpaces: 20, availableSpaces: 20, vehicleTypes: ['car','motorcycle'], price: 50,  features: ['covered'] },
  { spotNumber: 3,  locationName: "Civil Mall Parking",     address: "Civil Mall, Kathmandu",      location: { lat: 27.6990, lng: 85.3120 }, totalSpaces: 30, availableSpaces: 30, vehicleTypes: ['car'],              price: 40,  features: ['covered','handicap'] },
  { spotNumber: 4,  locationName: "New Road Pako",          address: "New Road, Kathmandu",        location: { lat: 27.7030, lng: 85.3110 }, totalSpaces: 10, availableSpaces: 10, vehicleTypes: ['motorcycle'],       price: 20,  features: [] },
  { spotNumber: 5,  locationName: "Basantapur Square",      address: "Basantapur, Kathmandu",      location: { lat: 27.7041, lng: 85.3065 }, totalSpaces: 12, availableSpaces: 12, vehicleTypes: ['car'],              price: 80,  features: ['24_hours'] },
  { spotNumber: 6,  locationName: "Patan Labim Mall",       address: "Lagankhel, Lalitpur",        location: { lat: 27.6775, lng: 85.3171 }, totalSpaces: 25, availableSpaces: 25, vehicleTypes: ['car','motorcycle'], price: 50,  features: ['covered','handicap'] },
  { spotNumber: 7,  locationName: "Boudha Stupa Gate",      address: "Boudhanath, Kathmandu",      location: { lat: 27.7215, lng: 85.3620 }, totalSpaces: 10, availableSpaces: 10, vehicleTypes: ['motorcycle'],       price: 15,  features: [] },
  { spotNumber: 8,  locationName: "Lazimpat Central",       address: "Lazimpat, Kathmandu",        location: { lat: 27.7210, lng: 85.3210 }, totalSpaces: 18, availableSpaces: 18, vehicleTypes: ['car'],              price: 50,  features: ['covered'] },
  { spotNumber: 9,  locationName: "Naxal Bhat-Bhateni",     address: "Naxal, Kathmandu",           location: { lat: 27.7125, lng: 85.3312 }, totalSpaces: 20, availableSpaces: 20, vehicleTypes: ['car'],              price: 40,  features: ['handicap'] },
  { spotNumber: 10, locationName: "Maitighar Mandala",      address: "Maitighar, Kathmandu",       location: { lat: 27.6935, lng: 85.3225 }, totalSpaces: 15, availableSpaces: 15, vehicleTypes: ['car'],              price: 30,  features: ['24_hours'] },
  { spotNumber: 11, locationName: "Jawalakhel Zoo",         address: "Jawalakhel, Lalitpur",       location: { lat: 27.6728, lng: 85.3120 }, totalSpaces: 12, availableSpaces: 12, vehicleTypes: ['car'],              price: 40,  features: [] },
  { spotNumber: 12, locationName: "Tripureshwar Center",    address: "Tripureshwar, Kathmandu",    location: { lat: 27.6930, lng: 85.3165 }, totalSpaces: 14, availableSpaces: 14, vehicleTypes: ['car'],              price: 50,  features: ['covered'] },
  { spotNumber: 13, locationName: "Putalisadak Hub",        address: "Putalisadak, Kathmandu",     location: { lat: 27.7048, lng: 85.3235 }, totalSpaces: 10, availableSpaces: 10, vehicleTypes: ['motorcycle'],       price: 20,  features: ['24_hours'] },
  { spotNumber: 14, locationName: "Koteshwor East",         address: "Koteshwor, Kathmandu",       location: { lat: 27.6765, lng: 85.3485 }, totalSpaces: 16, availableSpaces: 16, vehicleTypes: ['car'],              price: 40,  features: [] },
  { spotNumber: 15, locationName: "Chabahil KL Tower",      address: "Chabahil, Kathmandu",        location: { lat: 27.7170, lng: 85.3450 }, totalSpaces: 18, availableSpaces: 18, vehicleTypes: ['car'],              price: 50,  features: ['covered','24_hours'] },
  { spotNumber: 16, locationName: "Balaju Industrial",      address: "Balaju, Kathmandu",          location: { lat: 27.7340, lng: 85.3020 }, totalSpaces: 20, availableSpaces: 20, vehicleTypes: ['car'],              price: 30,  features: [] },
  { spotNumber: 17, locationName: "Kings Way Plaza",        address: "Durbar Marg, Kathmandu",     location: { lat: 27.7115, lng: 85.3175 }, totalSpaces: 10, availableSpaces: 10, vehicleTypes: ['car'],              price: 100, features: ['covered','handicap','24_hours'] },
  { spotNumber: 18, locationName: "Swayambhu Base",         address: "Swayambhu, Kathmandu",       location: { lat: 27.7165, lng: 85.2840 }, totalSpaces: 8,  availableSpaces: 8,  vehicleTypes: ['motorcycle'],       price: 15,  features: [] },
  { spotNumber: 19, locationName: "Baluwatar North",        address: "Baluwatar, Kathmandu",       location: { lat: 27.7230, lng: 85.3310 }, totalSpaces: 15, availableSpaces: 15, vehicleTypes: ['car'],              price: 60,  features: ['covered'] },
  { spotNumber: 20, locationName: "Kalanki Junction",       address: "Kalanki, Kathmandu",         location: { lat: 27.6938, lng: 85.2815 }, totalSpaces: 22, availableSpaces: 22, vehicleTypes: ['car','motorcycle'], price: 40,  features: ['24_hours'] },
];

async function runSeed() {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGODB_URI not set — check backend/.env');

    await mongoose.connect(uri);
    console.log('Connected to MongoDB:', uri.replace(/:([^@]+)@/, ':****@'));

    // Seed parking spots
    const existingSpots = await ParkingSpot.countDocuments();
    if (existingSpots > 0) {
      console.log(`⚠️  ${existingSpots} parking spots already exist — skipping spot seed.`);
      // Bug H5: backfill geoLocation for any pre-existing docs missing it.
      const toBackfill = await ParkingSpot.find({ geoLocation: { $exists: false } }).select('location');
      for (const doc of toBackfill) {
        if (doc.location?.lat != null && doc.location?.lng != null) {
          await ParkingSpot.updateOne(
            { _id: doc._id },
            { $set: { geoLocation: { type: 'Point', coordinates: [doc.location.lng, doc.location.lat] } } }
          );
        }
      }
      if (toBackfill.length) console.log(`🛠  Backfilled geoLocation on ${toBackfill.length} existing spots.`);
    } else {
      // Bug H5: insertMany bypasses pre('save') hooks, so the GeoJSON geoLocation
      // field was never populated → the 2dsphere index excluded these docs →
      // smart-nearby returned empty. Add it explicitly here.
      const withGeo = seedSpots.map((s) => ({
        ...s,
        geoLocation: { type: 'Point', coordinates: [s.location.lng, s.location.lat] },
      }));
      await ParkingSpot.insertMany(withGeo);
      console.log(`✅ ${withGeo.length} parking spots seeded (with GeoJSON).`);
    }

    // Bug L1: do not bake credentials into source. Read from env, fall back to a
    // dev default ONLY when explicitly running outside production.
    const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@smartpark.com';
    const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin@1234';
    if (process.env.NODE_ENV === 'production' && !process.env.SEED_ADMIN_PASSWORD) {
      throw new Error('SEED_ADMIN_PASSWORD must be set when seeding in production.');
    }
    await User.deleteOne({ email: adminEmail });
    await User.create({
      name: 'Admin',
      email: adminEmail,
      password: adminPassword,
      userType: 'admin',
      authMethod: 'email',
      isActive: true,
    });
    console.log('✅ Admin user created:');
    console.log(`   Email:    ${adminEmail}`);
    console.log(`   Password: ${process.env.SEED_ADMIN_PASSWORD ? '(from env)' : adminPassword}`);
    console.log('   Change this password after first login!');

    process.exit(0);
  } catch (err) {
    console.error('❌ Seed Error:', err.message);
    process.exit(1);
  }
}

runSeed();
