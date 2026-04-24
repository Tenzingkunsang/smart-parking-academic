/**
 * reallocationService.js  –  REWRITTEN
 *
 * Fixes applied:
 *  [7] All time comparisons now use scheduledArrival (not reservationTime),
 *      because users book in advance and pick a future arrival time.
 *
 * Flow:
 *  • Every 60s: scan "reserved" reservations that haven't checked in yet.
 *  • 5 min before arrivalConfirmedUntil (or 5 min before scheduledArrival + grace)
 *    → send a "5 min left to confirm" warning (once per reservation).
 *  • After arrivalConfirmedUntil passes (or scheduledArrival + grace with no confirmation)
 *    → mark no-show, release space, notify user.
 */

const Reservation        = require('../models/Reservation');
const ParkingSpot        = require('../models/ParkingSpot');
const notificationService = require('./notificationService');
const Notification       = require('../models/Notification');
const socketService      = require('./socketService');

class ReallocationService {

  static async checkAndReallocate() {
    console.log('🔄 Reallocation check at:', new Date().toLocaleTimeString());

    try {
      const GRACE_MS   = 15 * 60 * 1000;   // 15 min grace after scheduledArrival
      const WARNING_MS =  5 * 60 * 1000;   // warn 5 min before expiry
      const now        = new Date();

      // ── Step 1: Send "expiring soon" warnings ──────────────────────────────
      //
      // Target reservations whose expiry window closes within the next 5 min,
      // but hasn't closed yet, and no warning was sent yet.
      //
      // Expiry time = arrivalConfirmedUntil  OR  scheduledArrival + GRACE_MS
      // FIX [7]: use scheduledArrival as the baseline when arrivalConfirmedUntil is null

      const soonToExpire = await Reservation.find({
        status:      'reserved',
        checkInTime: null,
        warningSent: { $ne: true },
        $or: [
          // Has an explicit arrivalConfirmedUntil set (user already said "coming")
          {
            arrivalConfirmedUntil: {
              $lt: new Date(now.getTime() + WARNING_MS),
              $gt: now,
            },
          },
          // No explicit confirmation → use scheduledArrival + grace
          {
            arrivalConfirmedUntil: null,
            scheduledArrival: {
              $lt: new Date(now.getTime() - GRACE_MS + WARNING_MS),
              $gt: new Date(now.getTime() - GRACE_MS),
            },
          },
        ],
      });

      for (const res of soonToExpire) {
        await notificationService.sendNotification(
          res.user,
          'Reservation expiring soon',
          'You have 5 minutes to confirm your arrival or your spot will be released to another driver.',
          'arrival_warning',
          { reservationId: res._id }
        );
        res.warningSent = true;
        await res.save();
        console.log(`⚠️  Warning sent for reservation ${res._id}`);
      }

      // ── Step 2: Expire / reallocate ────────────────────────────────────────
      //
      // Reservations whose grace window has passed and no check-in yet.
      // FIX [7]: anchored to scheduledArrival, not reservationTime / createdAt

      const expired = await Reservation.find({
        status:      'reserved',
        checkInTime: null,
        $or: [
          // Had an explicit arrivalConfirmedUntil → it has now passed
          { arrivalConfirmedUntil: { $ne: null, $lt: now } },
          // No explicit confirmation → scheduledArrival + grace has passed
          {
            arrivalConfirmedUntil: null,
            scheduledArrival:      { $lt: new Date(now.getTime() - GRACE_MS) },
          },
        ],
      }).populate('parkingSpot');

      if (expired.length === 0) {
        console.log('✅ No expired reservations');
        return { success: true, reallocated: 0 };
      }

      let reallocatedCount = 0;

      for (const reservation of expired) {
        reservation.status = 'no-show';
        await reservation.save();

        // Release the held space(s)
        const spot     = await ParkingSpot.findById(reservation.parkingSpot._id);
        const quantity = reservation.quantity || 1;
        if (spot) {
          await spot.releaseSpace(quantity);
          await spot.updateStatus(spot.reservedSpaces <= 0 ? 'available' : 'reserved');

          const io = socketService.getIo();
          if (io) {
            io.emit('parkingSpotStatusChanged', {
              spotId:          spot._id,
              status:          spot.status,
              availableSpaces: spot.availableSpaces,
              reservedSpaces:  spot.reservedSpaces,
            });
          }
          console.log(`🔓 Spot #${spot.spotNumber} released (no-show: ${reservation._id})`);
        }

        // Mark old arrival-confirmation notifications as read
        await Notification.updateMany(
          {
            user:                         reservation.user,
            type:                         'arrival_confirmation',
            'meta.reservationId':         reservation._id,
            read:                         false,
          },
          { $set: { read: true, readAt: new Date() } }
        );

        // Notify user
        await notificationService.sendNotification(
          reservation.user,
          'Spot reallocated',
          'We could not confirm your arrival in time, so your parking spot was released to another driver.',
          'arrival_timeout',
          { reservationId: reservation._id }
        );

        reallocatedCount++;
      }

      console.log(`♻️  Reallocated ${reallocatedCount} reservation(s)`);
      return { success: true, reallocated: reallocatedCount };

    } catch (error) {
      console.error('❌ ReallocationService error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Start the background scheduler.
   * Runs immediately after 5s startup delay, then every 60s.
   */
  static startScheduler() {
    setTimeout(() => this.checkAndReallocate(), 5_000);
    setInterval(async () => {
      await this.checkAndReallocate();
    }, 60_000);
    console.log('🕐 ReallocationService scheduler started (1-min precision)');
  }
}

module.exports = ReallocationService;