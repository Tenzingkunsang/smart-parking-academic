const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true
  },
  parkingSpot: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'ParkingSpot', 
    required: true 
  },
  
  // STAGE 1: BOOKING & PAYMENT VERIFICATION
  reservationTime: { 
    type: Date, 
    default: Date.now 
  },
  scheduledArrival: {
    type: Date,
    required: true,
    index: true
  },
  duration: { 
    type: Number, 
    default: 60
  },
  quantity: {
    type: Number,
    default: 1
  },
  
  paymentInfo: {
    method: {
      type: String,
      enum: ['khalti', 'wallet', 'cash'],
      default: 'khalti'
    },
    khaltiIdx: { type: String, sparse: true, index: true },
    khaltiToken: { type: String, sparse: true },
    khaltiVerified: { type: Boolean, default: false },
    khaltiVerifyAttempts: { type: Number, default: 0 },
    khaltiVerifyLastAttempt: { type: Date },
    walletUsed: { type: Number, default: 0 }
  },
  
  // FIXED: Added defaults to prevent validation errors during background saves
  amountInfo: {
    baseAmount: {
      type: Number,
      required: true,
      default: 0
    },
    totalAmount: {
      type: Number,
      required: true,
      default: 0
    },
    finalAmount: {
      type: Number,
      default: 0
    }
  },
  
  // STAGE TRACKING STATE MACHINE
  lifecycleStage: {
    type: String,
    enum: ['booking', 'arrival_window', 'active', 'overstay', 'no_show', 'completed', 'cancelled'],
    default: 'booking',
    index: true
  },
  
  status: { 
    type: String, 
    enum: ['pending', 'reserved', 'checked-in', 'overstay', 'completed', 'cancelled', 'expired', 'no-show'], 
    default: 'pending'
  },
  
  // STAGE 2: ARRIVAL WINDOW
  arrivalWindow: {
    startTime: Date,
    endTime: Date,
    confirmedAt: Date,
    confirmedUntil: { type: Date, sparse: true },
    reminderSent: { type: Boolean, default: false }
  },
  
  // STAGE 3: ACTIVE SESSION (After QR Scan)
  activeSession: {
    qrScannedAt: Date,
    adminScannedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      sparse: true
    },
    billingStartTime: Date,
    estimatedCheckOut: Date
  },
  
  checkInTime: { type: Date },
  checkOutTime: { type: Date },
  
  overstayInfo: {
    overstayMinutes: { type: Number, default: 0 },
    overstayCharge: { type: Number, default: 0 },
    overstayDebt: { type: Number, default: 0 },
    overstayPaid: { type: Boolean, default: false },
    // Bug NEW-2: schema was silently dropping the paid timestamp.
    overstayPaidAt: { type: Date, default: null }
  },

  // Bug NEW-4: vehicle plate now flows end-to-end. Stored per-reservation so
  // historical receipts and admin scanning UIs know which vehicle was billed.
  vehiclePlate: {
    type: String,
    trim: true,
    uppercase: true,
    default: ''
  },
  
  noShowInfo: {
    markedAt: Date,
    reason: {
      type: String,
      enum: ['grace_period_expired', 'user_cancelled', 'admin_cancelled'],
      sparse: true
    }
  },
  
  refundInfo: {
    penaltyPercent: { type: Number, default: 30 },
    penaltyAmount: { type: Number, default: 0 },
    refundAmount: { type: Number, default: 0 },
    refundMethod: { type: String, enum: ['khalti', 'wallet', 'none'], default: 'wallet' },
    walletCreditedAt: Date,
    khaltiRefundId: { type: String, sparse: true },
    refundStatus: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' },
    refundAttempts: { type: Number, default: 0 }
  },
  
  qrCodeData: { type: String, sparse: true, index: true },
  // Bug MED-3: HMAC-signed reservation token embedded in the QR. Persisted so
  // admins can re-issue the same image without losing the signature.
  qrToken: { type: String, default: null },
  
  scheduledJobs: {
    reminderJobId: { type: mongoose.Schema.Types.ObjectId, ref: 'ScheduledJob', sparse: true },
    expiryJobId: { type: mongoose.Schema.Types.ObjectId, ref: 'ScheduledJob', sparse: true },
    noShowJobCancelledAt: Date
  },
  
  actualDuration: { type: Number, default: 0 },
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
  paymentReference: { type: String },
  arrivalConfirmedUntil: { type: Date, default: null },
  confirmedByUser: { type: Boolean, default: false },
  lastNotifiedAt: { type: Date, default: null },
  // BUG-L3: separate field definitions onto individual lines for readability.
  overtimeApplied: { type: Boolean, default: false },
  penaltyApplied:  { type: Boolean, default: false },
  // Admin note — persisted so it survives saves. Bug: was previously stored on
  // a virtual field (_adminNote) and silently dropped on every save.
  adminNote: { type: String, default: '' }
}, {
  timestamps: true,
  toJSON: { virtuals: true }
});

// Virtual check for expiration
reservationSchema.virtual('isExpired').get(function() {
  // Only check expiry if reservation is BOTH in 'reserved' status AND 'arrival_window' stage
  if (this.status !== 'reserved' || this.lifecycleStage !== 'arrival_window') return false;
  const graceMs = 15 * 60 * 1000;
  const anchor = this.scheduledArrival || this.reservationTime;
  const baseUntil = this.arrivalConfirmedUntil || new Date(anchor.getTime() + graceMs);
  const expirationTime = baseUntil instanceof Date ? baseUntil : new Date(baseUntil);
  return new Date() > expirationTime;
});

module.exports = mongoose.model('Reservation', reservationSchema);