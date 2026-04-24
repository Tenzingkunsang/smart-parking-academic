const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  parkingSpot: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'ParkingSpot', 
    required: true 
  },
  reservationTime: { 
    type: Date, 
    default: Date.now 
  },
  scheduledArrival: {
    type: Date,
    required: true
  },
  checkInTime: { 
    type: Date 
  },
  checkOutTime: { 
    type: Date 
  },
  status: { 
    type: String, 
    enum: ['pending', 'reserved', 'checked-in', 'completed', 'cancelled', 'expired', 'no-show'], 
    default: 'pending'  // Changed from 'reserved' to 'pending'
  },
  duration: { 
    type: Number, 
    default: 60 
  },
  quantity: {
    type: Number,
    default: 1
  },
  qrCodeData: { 
    type: String 
  },
  totalAmount: {
    type: Number,
    default: 0
  },
  finalAmount: {
    type: Number,
    default: 0
  },
  actualDuration: {
    type: Number,
    default: 0
  },
  overstayMinutes: {
    type: Number,
    default: 0
  },
  overstayCharge: {
    type: Number,
    default: 0
  },
  overstayDebt: {
    type: Number,
    default: 0
  },
  overstayPaid: {
    type: Boolean,
    default: false
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['khalti', 'esewa', 'cash'],
    default: 'cash'
  },
  paymentReference: {
    type: String
  }
  ,
  // Used for "dynamic reallocation" confirmation.
  // When the user confirms "I'm coming", this deadline is extended.
  arrivalConfirmedUntil: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Check if reservation is expired (15 minutes grace period)
reservationSchema.virtual('isExpired').get(function() {
  if (this.status !== 'reserved') return false;
  const graceMs = 15 * 60 * 1000;
  const anchor = this.scheduledArrival || this.reservationTime;
  const baseUntil = this.arrivalConfirmedUntil || new Date(anchor.getTime() + graceMs);
  const expirationTime = baseUntil instanceof Date ? baseUntil : new Date(baseUntil);
  return new Date() > expirationTime;
});

module.exports = mongoose.model('Reservation', reservationSchema);
