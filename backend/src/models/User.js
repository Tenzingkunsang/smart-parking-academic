const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters']
  },
  email: { 
    type: String, 
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: { 
    type: String, 
    minlength: [6, 'Password must be at least 6 characters'],
    default: null
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true,
    default: undefined
  },
  authMethod: {
    type: String,
    enum: ['email', 'google'],
    default: 'email'
  },
  phone: { 
    type: String,
    default: '',
    validate: {
      validator: function(value) {
        return value === '' || /^[0-9]{10}$/.test(value);
      },
      message: 'Please enter a valid 10-digit phone number'
    }
  },
  vehicleNumber: { 
    type: String,
    uppercase: true,
    trim: true,
    default: ''
  },
  vehicleType: {
    type: String,
    enum: ['car', 'motorcycle'],
    default: 'car'
  },
  userType: { 
    type: String, 
    enum: ['user', 'admin'], 
    default: 'user' 
  },
  isActive: {
    type: Boolean,
    default: true
  },
  totalBookings: {
    type: Number,
    default: 0
  },
  failedCheckins: {
    type: Number,
    default: 0
  },
  resetPasswordToken: {
    type: String,
    default: null
  },
  resetPasswordExpire: {
    type: Date,
    default: null
  },
  lastLogin: {
    type: Date,
    default: null
  },

  // Used for "Google sign-up verification code" flow
  googleEmailVerified: {
    type: Boolean,
    default: true
  },
  googleEmailVerificationCode: {
    type: String,
    default: null
  },
  googleEmailVerificationExpiresAt: {
    type: Date,
    default: null
  },
  behaviorProfile: {
    punctualityScore: { type: Number, default: 0.7 },
    noShowRate: { type: Number, default: 0 },
    completedRate: { type: Number, default: 0 },
    totalSessions: { type: Number, default: 0 },
    score: { type: Number, default: 0.7 },
    lastCalculatedAt: { type: Date, default: null }
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', function(next) {
  const user = this;
  
  // Skip password hashing for OAuth users
  if (user.authMethod === 'google' || !user.isModified('password')) {
    return next();
  }
  
  // Only hash if password is modified and exists
  if (!user.password) {
    return next();
  }
  
  // Generate salt and hash
  bcrypt.genSalt(10, function(err, salt) {
    if (err) {
      return next(err);
    }
    
    bcrypt.hash(user.password, salt, function(err, hash) {
      if (err) {
        return next(err);
      }
      user.password = hash;
      next();
    });
  });
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    // If user registered with Google, they don't have a password
    if (!this.password) {
      return false;
    }
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    console.error('Password comparison error:', error);
    return false;
  }
};

// Update last login
userSchema.methods.updateLastLogin = async function() {
  this.lastLogin = new Date();
  await this.save();
};

// Increment booking count
userSchema.methods.incrementBookings = async function() {
  this.totalBookings += 1;
  await this.save();
};

// Add failed checkin
userSchema.methods.addFailedCheckin = async function() {
  this.failedCheckins += 1;
  await this.save();
};

// Keep Google ID uniqueness only for real (non-null) values.
userSchema.index(
  { googleId: 1 },
  { unique: true, partialFilterExpression: { googleId: { $type: 'string' } } }
);

module.exports = mongoose.model('User', userSchema);