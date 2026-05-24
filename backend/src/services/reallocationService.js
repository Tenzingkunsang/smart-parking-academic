/**
 * reallocationService.js  –  The "Heartbeat" Polish
 *
 * Implements the strict 3-tier notification & no-show lifecycle:
 *  1. T-minus 15m: Send "Confirm Arrival" (Email + App)
 *  2. T-plus 5m: Send "Grace Period Warning"
 *  3. T-plus 15m: Final "No-Show" update + Release capacity.
 */

const Reservation        = require('../models/Reservation');
const notificationService = require('./notificationService');
const { processNoShow }  = require('./reservationLifecycleService');
const logger             = require('../config/logger');

class ReallocationService {

  static async checkAndReallocate() {
    try {
      const now = new Date();
      
      // Window 1: T-minus 15m (15m before scheduled arrival)
      // Send "Confirm Arrival" if not already confirmed or notified
      const tMinus15 = new Date(now.getTime() + 15 * 60 * 1000);
      const toConfirm = await Reservation.find({
        status: 'reserved',
        confirmedByUser: false,
        lastNotifiedAt: { $eq: null },
        scheduledArrival: { $lte: tMinus15, $gt: now }
      }).populate('parkingSpot');

      for (const res of toConfirm) {
        try {
          await notificationService.sendNotification(
            res.user,
            'Confirm Your Arrival',
            `Your parking at Spot #${res.parkingSpot?.spotNumber || '?'} starts in 15 minutes. Please confirm you're on your way.`,
            'arrival_warning', // reusing template with CTA
            { reservationId: res._id, spotNumber: res.parkingSpot?.spotNumber }
          );
          res.lastNotifiedAt = now;
          await res.save();
        } catch (err) {
          logger.error('heartbeat_warning_error', { id: res._id, message: err.message });
        }
      }

      // Window 2: T-plus 5m (5m after scheduled arrival)
      // Send "Grace Period Warning" if not checked in
      const tPlus5 = new Date(now.getTime() - 5 * 60 * 1000);
      const inGrace = await Reservation.find({
        status: 'reserved',
        checkInTime: null,
        scheduledArrival: { $lte: tPlus5 },
        // Use lastNotifiedAt to ensure we only send this once (at/after T+5)
        lastNotifiedAt: { $lt: tPlus5 } 
      }).populate('parkingSpot');

      for (const res of inGrace) {
        try {
          await notificationService.sendNotification(
            res.user,
            'Grace Period Active',
            `You are 5 minutes late for Spot #${res.parkingSpot?.spotNumber || '?'}. You have 10 minutes left before your spot is released.`,
            'arrival_warning',
            { reservationId: res._id, spotNumber: res.parkingSpot?.spotNumber }
          );
          res.lastNotifiedAt = now;
          await res.save();
        } catch (err) {
          logger.error('heartbeat_grace_error', { id: res._id, message: err.message });
        }
      }

      // Window 3: T-plus 15m (Final No-Show)
      const tPlus15 = new Date(now.getTime() - 15 * 60 * 1000);
      const expired = await Reservation.find({
        status: { $in: ['reserved', 'pending'] },
        checkInTime: null,
        $or: [
          // Explicitly confirmed but still didn't show up after extended grace
          { arrivalConfirmedUntil: { $ne: null, $lt: now } },
          // Never confirmed and 15 mins have passed
          { 
            arrivalConfirmedUntil: null, 
            scheduledArrival: { $lt: tPlus15 } 
          }
        ]
      });

      for (const res of expired) {
        try {
          await processNoShow(res._id);
        } catch (err) {
          logger.error('heartbeat_no_show_error', { id: res._id, message: err.message });
        }
      }

    } catch (error) {
      console.error('❌ Heartbeat Error:', error);
    }
  }

  static startScheduler() {
    // Run every 60s
    setInterval(() => this.checkAndReallocate(), 60000);
    console.log('🕐 Heartbeat Service active (1-min precision)');
  }
}

module.exports = ReallocationService;
