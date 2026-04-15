const mongoose = require('mongoose');

const parkingSpotSchema = new mongoose.Schema({
  locationName: { type: String, required: true },
  address: { type: String, required: true },
  location: { lat: { type: Number, required: true }, lng: { type: Number, required: true } },
  totalSpaces: { type: Number, required: true, default: 10 },
  availableSpaces: { type: Number, required: true, default: 10 },
  reservedSpaces: { type: Number, default: 0 },
  occupiedSpaces: { type: Number, default: 0 },
  price: { type: Number, default: 50 },
  vehicleTypes: [{ type: String, enum: ['car', 'motorcycle', 'ev', 'all'], default: 'all' }],
  features: [{ type: String, enum: ['ev_charging', 'handicap', 'covered', '24_hours'] }],
  isActive: { type: Boolean, default: true },
  // Legacy fields for compatibility
  spotNumber: { type: Number, default: null },
  isOccupied: { type: Boolean, default: false },
  isReserved: { type: Boolean, default: false },
  status: { type: String, default: 'available' },
  vehicleType: { type: String, default: 'car' }
}, { timestamps: true, collection: 'parkingspots' });

parkingSpotSchema.methods.bookSpace = async function(quantity = 1) {
  if (this.availableSpaces < quantity) throw new Error(`Only ${this.availableSpaces} spaces available`);
  this.availableSpaces -= quantity;
  this.reservedSpaces += quantity;
  await this.save();
  return this;
};

parkingSpotSchema.methods.releaseSpace = async function(quantity = 1) {
  this.reservedSpaces -= quantity;
  this.availableSpaces += quantity;
  await this.save();
  return this;
};

// Used by reservation flows to keep legacy status fields consistent.
// It updates `status`, `isReserved`, and `isOccupied`.
parkingSpotSchema.methods.updateStatus = async function(newStatus) {
  this.status = newStatus;

  if (newStatus === 'occupied') {
    this.isOccupied = true;
    this.isReserved = false;
  } else if (newStatus === 'reserved') {
    this.isReserved = true;
    this.isOccupied = false;
  } else if (newStatus === 'available') {
    this.isReserved = false;
    this.isOccupied = false;
  }

  await this.save();
  return this;
};

module.exports = mongoose.model('ParkingSpot', parkingSpotSchema);
