const Reservation = require('../models/Reservation');
const ParkingSpot = require('../models/ParkingSpot');
const notificationService = require('./notificationService');
const Notification = require('../models/Notification');
const socketService = require('./socketService');

class ReallocationService {
  
  static async checkAndReallocate() {
    console.log('🔄 Running Dynamic Reallocation Check at:', new Date().toLocaleTimeString());
    
    try {
      const graceMs = 15 * 60 * 1000;
      const warningMs = 10 * 60 * 1000;    
      const now = new Date();

      // Find reservations that haven't checked in and are approaching the 15-minute limit
      const pendingExpirations = await Reservation.find({
        status: 'reserved',
        checkInTime: null,
        warningSent: { $ne: true }, 
        $or: [
          { arrivalConfirmedUntil: { $lt: new Date(now.getTime() + 5 * 60 * 1000), $gt: now } },
          { $and: [
            { arrivalConfirmedUntil: null }, 
            { reservationTime: { $lt: new Date(now.getTime() - warningMs), $gt: new Date(now.getTime() - graceMs) } }
          ]}
        ]
      });

      for (const res of pendingExpirations) {
        await notificationService.sendNotification(
          res.user,
          'Reservation Expiring Soon',
          'You have 5 minutes left to confirm your arrival or your spot will be reallocated.',
          'arrival_warning',
          { reservationId: res._id }
        );
        res.warningSent = true; 
        await res.save();
      }

      const expiredReservations = await Reservation.find({
        status: 'reserved',
        checkInTime: null,
        $or: [
          { arrivalConfirmedUntil: { $ne: null, $lt: now } },
          { $and: [{ arrivalConfirmedUntil: null }, { reservationTime: { $lt: new Date(now.getTime() - graceMs) } }] }
        ]
      }).populate('parkingSpot');
      
      if (expiredReservations.length === 0) {
        console.log(' No expired reservations found');
        return { success: true, reallocated: 0 };
      }
      
      let reallocatedCount = 0;
      for (const reservation of expiredReservations) {
        reservation.status = 'no-show';
        await reservation.save();
        
        const spot = await ParkingSpot.findById(reservation.parkingSpot._id);
        if (spot) {
          const quantity = reservation.quantity || 1;
          await spot.releaseSpace(quantity);
          await spot.updateStatus(spot.reservedSpaces <= 0 ? 'available' : 'reserved');

          const io = socketService.getIo();
          if (io) {
            io.emit('parkingSpotStatusChanged', {
              spotId: spot._id,
              status: spot.status,
            });
          }
        }

        await Notification.updateMany(
          { user: reservation.user, type: 'arrival_confirmation', 'meta.reservationId': reservation._id, read: false },
          { $set: { read: true, readAt: new Date() } }
        );

        await notificationService.sendNotification(
          reservation.user,
          'Arrival confirmation missed',
          'We could not confirm your arrival in time, so your parking spot was reallocated.',
          'arrival_timeout',
          { reservationId: reservation._id }
        );
        
        reallocatedCount++;
      }
      
      return { success: true, reallocated: reallocatedCount };
    } catch (error) {
      console.error('❌ Reallocation Service Error:', error);
      return { success: false, error: error.message };
    }
  }
  
  static startScheduler() {
    setTimeout(() => this.checkAndReallocate(), 5000);
    setInterval(async () => await this.checkAndReallocate(), 60 * 1000); 
    console.log('Dynamic Reallocation Scheduler Started (1-minute precision)');
  }
}

module.exports = ReallocationService;