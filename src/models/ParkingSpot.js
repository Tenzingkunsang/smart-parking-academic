const mongoose = require('mongoose');

const parkingSpotSchema = new mongoose.Schema({
  spotNumber: { type: Number, required: true, unique: true },
  isOccupied: { type: Boolean, default: false },
  isReserved: { type: Boolean, default: false },
  vehicleType: { 
    type: String, 
    enum: ['car', 'motorcycle', 'disabled', 'electric'], 
    default: 'car' 
  },
  occupiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reservedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reservationExpiry: { type: Date },
  occupiedAt: { type: Date },
  releasedAt: { type: Date },
  qrCode: { type: String, unique: true }
});

module.exports = mongoose.model('ParkingSpot', parkingSpotSchema);
