const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  parkingSpot: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ParkingSpot',
    required: true,
    index: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userName: { type: String, trim: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, trim: true, maxlength: 500 }
}, { timestamps: true, collection: 'reviews' });

reviewSchema.index({ parkingSpot: 1, createdAt: -1 });

module.exports = mongoose.model('Review', reviewSchema);
