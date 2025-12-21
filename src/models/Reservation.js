const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  parkingSpot: { type: mongoose.Schema.Types.ObjectId, ref: 'ParkingSpot', required: true },
  reservationTime: { type: Date, default: Date.now },
  checkInTime: { type: Date },
  checkOutTime: { type: Date },
  status: { 
    type: String, 
    enum: ['reserved', 'checked-in', 'completed', 'cancelled', 'expired'], 
    default: 'reserved' 
  },
  duration: { type: Number, default: 60 },
  qrCodeData: { type: String }
});

module.exports = mongoose.model('Reservation', reservationSchema);
