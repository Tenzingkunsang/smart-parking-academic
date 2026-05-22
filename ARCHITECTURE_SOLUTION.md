# Smart Parking Three-Stage Lifecycle Architecture
## Senior Full-Stack Developer Solution

---

## 1. DATABASE SCHEMA MODIFICATIONS

### Enhanced Reservation Model
```javascript
// Add these fields to Reservation schema:

parkingState: {
  type: String,
  enum: ['reservation', 'active', 'no-show', 'completed', 'cancelled'],
  default: 'reservation',
  description: 'Tracks the three-stage lifecycle'
},

// Stage 1: Reservation State
arrivalWindow: {
  startTime: Date,      // scheduledArrival
  endTime: Date,        // scheduledArrival + 15 minutes (grace period)
  confirmedAt: Date,    // When user confirmed arrival
},

// Stage 2: Active State (billing starts)
activeSession: {
  qrScannedAt: Date,    // Admin scanned QR code - STAGE TRIGGER
  adminScannedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  estimatedCheckOut: Date,
  billingStartTime: Date,
},

// Refund/Penalty tracking
refundInfo: {
  reason: String,       // 'user_cancelled', 'no_show', 'admin_released'
  originalAmount: Number,
  refundPercent: Number,
  refundAmount: Number,
  convenienceFee: Number,
  refundStatus: {
    type: String,
    enum: ['pending', 'processed', 'failed'],
    default: 'pending'
  },
  refundInitiatedAt: Date,
  khaltiRefundId: String,
},

// Waitlist handling
waitlistNotified: {
  type: Boolean,
  default: false,
  description: 'Flag to track if waitlist was notified on release'
}
```

---

## 2. FRONTEND RESPONSE STRUCTURE

### API Response for Reservation Details
```javascript
// GET /api/v1/reservations/:id
{
  success: true,
  data: {
    _id: "...",
    
    // STAGE IDENTIFIER (use this to decide which timer to show)
    parkingState: "reservation|active|no-show|completed",
    
    // For RESERVATION stage - show ARRIVAL TIMER
    reservationStage: {
      isActive: parkingState === "reservation",
      scheduledArrival: "2026-04-29T14:15:00Z",
      arrivalWindowEnd: "2026-04-29T14:30:00Z",  // 15 min grace
      timeRemaining: 900,  // seconds
      displayText: "Arrive by 2:30 PM (15 min from now)",
      actions: [
        { type: "confirm_arrival", label: "I'm On My Way" },
        { type: "cancel_reservation", label: "Cancel" }
      ]
    },
    
    // For ACTIVE stage - show BILLING TIMER
    activeStagebilling: {
      isActive: parkingState === "active",
      billingStartTime: "2026-04-29T14:22:00Z",
      estimatedCheckOut: "2026-04-29T15:22:00Z",
      hourlyRate: 60,  // NPR/hour
      estimatedCharge: 60,
      currentCharge: 0,
      displayText: "Active parking session started",
      actions: [
        { type: "check_out", label: "Check Out" }
      ]
    },
    
    // For NO-SHOW stage
    noShowInfo: {
      status: "no-show",
      markedAt: "2026-04-29T14:30:15Z",
      penalty: {
        originalCharge: 60,
        penaltyPercent: 30,
        penaltyAmount: 18,
        refundedAmount: 42,
        message: "You were marked as no-show. 30% convenience fee (NPR 18) deducted."
      }
    },
    
    // For COMPLETED stage
    completionInfo: {
      status: "completed",
      checkInTime: "2026-04-29T14:22:00Z",
      checkOutTime: "2026-04-29T15:10:00Z",
      actualDuration: 48,  // minutes
      totalCharge: 48,  // prorated
      paymentStatus: "completed"
    },
    
    parkingSpot: { _id, spotNumber, locationName },
    user: { _id, name, email }
  }
}
```

---

## 3. NO-SHOW REFUND/PENALTY LOGIC

### Refund Service
```javascript
// src/services/refundService.js

class RefundService {
  /**
   * Calculate refund for different scenarios
   * @param {number} totalAmount - Original amount paid
   * @param {string} reason - 'user_cancelled', 'no_show', 'admin_released'
   * @param {Date} paymentTime - When payment was made
   * @param {Date} triggerTime - When refund is triggered
   * @returns {object} Refund calculation
   */
  static calculateRefund(totalAmount, reason, paymentTime, triggerTime) {
    const hoursBeforeReservation = 
      (new Date(triggerTime) - paymentTime) / (1000 * 60 * 60);
    
    // NO-SHOW: Keep 30% convenience fee
    if (reason === 'no_show') {
      return {
        convenienceFeePercent: 30,
        convenienceFee: Math.ceil(totalAmount * 0.30),
        refundAmount: totalAmount - Math.ceil(totalAmount * 0.30),
        message: '30% convenience fee deducted for no-show',
        policyNote: 'You can dispute this within 7 days'
      };
    }
    
    // USER CANCEL: Refund based on cancellation time
    if (reason === 'user_cancelled') {
      if (hoursBeforeReservation >= 2) {
        // Cancelled 2+ hours before: Full refund
        return {
          convenienceFeePercent: 0,
          convenienceFee: 0,
          refundAmount: totalAmount,
          message: 'Full refund processed'
        };
      } else if (hoursBeforeReservation >= 0.5) {
        // Cancelled 30min-2hours before: 20% fee
        const fee = Math.ceil(totalAmount * 0.20);
        return {
          convenienceFeePercent: 20,
          convenienceFee: fee,
          refundAmount: totalAmount - fee,
          message: '20% cancellation fee deducted'
        };
      } else {
        // Cancelled <30min before: 50% fee
        const fee = Math.ceil(totalAmount * 0.50);
        return {
          convenienceFeePercent: 50,
          convenienceFee: fee,
          refundAmount: totalAmount - fee,
          message: '50% late cancellation fee deducted'
        };
      }
    }
    
    // ADMIN RELEASED (rare): Full refund
    if (reason === 'admin_released') {
      return {
        convenienceFeePercent: 0,
        convenienceFee: 0,
        refundAmount: totalAmount,
        message: 'Full refund - Admin released spot'
      };
    }
  }

  /**
   * Process actual refund to Khalti
   */
  static async processRefundToKhalti(reservation, refundCalculation) {
    const khaltiService = require('./khaltiService');
    
    if (refundCalculation.refundAmount <= 0) {
      return {
        success: true,
        message: 'No refund amount to process',
        refundId: null
      };
    }

    const result = await khaltiService.refundPayment(
      reservation.paymentReference,
      refundCalculation.refundAmount
    );

    if (result.success) {
      reservation.refundInfo = {
        reason: refundCalculation.reason,
        originalAmount: reservation.totalAmount,
        refundPercent: 100 - refundCalculation.convenienceFeePercent,
        refundAmount: refundCalculation.refundAmount,
        convenienceFee: refundCalculation.convenienceFee,
        refundStatus: 'processed',
        refundInitiatedAt: new Date(),
        khaltiRefundId: result.data.refundId
      };
      
      await reservation.save();
      
      // Notify user
      await notificationService.sendNotification(
        reservation.user,
        'Refund Processed',
        `NPR ${refundCalculation.refundAmount} refund initiated. ${refundCalculation.message}`,
        'refund_processed',
        { 
          reservationId: reservation._id,
          refundAmount: refundCalculation.refundAmount,
          convenienceFee: refundCalculation.convenienceFee
        }
      );
    }
    
    return result;
  }
}

module.exports = RefundService;
```

---

## 4. QR CODE SCANNING & STAGE TRANSITION

### Admin QR Scanner Logic
```javascript
// src/routes/adminRoutes.js

router.post('/scan-qr', protect, adminAuth, async (req, res) => {
  try {
    const { qrCode } = req.body;
    
    const reservation = await Reservation
      .findOne({ qrCodeData: qrCode })
      .populate('parkingSpot user');
    
    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found'
      });
    }

    // ─────────────────────────────────────────────────────
    // EDGE CASE 1: Early Check-In (5+ min early)
    // ─────────────────────────────────────────────────────
    const now = new Date();
    const minsBefore = (reservation.scheduledArrival - now) / 60000;
    
    if (minsBefore > 5) {
      return res.status(400).json({
        success: false,
        message: `Too early! Check in ${Math.ceil(minsBefore)} minutes before scheduled time`,
        scheduledArrival: reservation.scheduledArrival,
        canCheckInAt: new Date(reservation.scheduledArrival.getTime() - 5*60000)
      });
    }

    // ─────────────────────────────────────────────────────
    // EDGE CASE 2: Late Check-In (after grace period)
    // ─────────────────────────────────────────────────────
    const graceEnd = new Date(reservation.arrivalConfirmedUntil || 
      reservation.scheduledArrival.getTime() + 15*60000);
    
    if (now > graceEnd) {
      // Mark as no-show if not already
      if (reservation.parkingState !== 'no-show') {
        reservation.parkingState = 'no-show';
        await reservation.save();
        
        // Release spot
        await reservation.parkingSpot.releaseSpace(1);
        
        return res.status(410).json({
          success: false,
          message: 'Reservation expired and marked as no-show',
          status: 'no-show'
        });
      }
    }

    // ─────────────────────────────────────────────────────
    // NORMAL FLOW: Transition to ACTIVE state
    // ─────────────────────────────────────────────────────
    if (reservation.parkingState !== 'reservation') {
      return res.status(400).json({
        success: false,
        message: `Cannot scan: reservation is already in '${reservation.parkingState}' state`
      });
    }

    // UPDATE: Stage 1 (Reservation) → Stage 2 (Active)
    reservation.parkingState = 'active';
    reservation.activeSession = {
      qrScannedAt: now,
      adminScannedBy: req.user._id,
      billingStartTime: now,
      estimatedCheckOut: new Date(now.getTime() + reservation.duration * 60000)
    };
    reservation.checkInTime = now;
    
    await reservation.save();

    // Update spot to occupied
    await reservation.parkingSpot.updateStatus('occupied');

    // Send real-time notification to user via Socket.io
    socketService.emitToUser(reservation.user._id, 'reservation:activated', {
      reservationId: reservation._id,
      checkedInAt: now,
      estimatedCheckOut: reservation.activeSession.estimatedCheckOut,
      billingStarted: true
    });

    res.json({
      success: true,
      message: 'Check-in successful. Billing started.',
      reservation: {
        _id: reservation._id,
        parkingState: 'active',
        billingStartTime: reservation.activeSession.billingStartTime,
        estimatedCheckOut: reservation.activeSession.estimatedCheckOut,
        spotNumber: reservation.parkingSpot.spotNumber
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
```

---

## 5. UPDATED JOB SCHEDULER FOR THREE STAGES

### Enhanced Job Scheduler
```javascript
// src/services/jobSchedulerService.js (UPDATED)

async function scheduleReservationJobs(reservation) {
  const reminderAt = new Date(
    reservation.scheduledArrival.getTime() - 30 * 60 * 1000
  );
  
  const graceEnd = new Date(
    reservation.scheduledArrival.getTime() + 15 * 60 * 1000
  );

  // Job 1: Arrival reminder (30 min before)
  if (reminderAt > new Date()) {
    await ScheduledJob.create({
      type: 'arrival_confirmation_reminder',
      reservationId: reservation._id,
      runAt: reminderAt,
      description: 'Stage 1 → Remind user to confirm arrival'
    });
  }

  // Job 2: No-show check (15 min after scheduled arrival)
  await ScheduledJob.create({
    type: 'reservation_expiry_check',
    reservationId: reservation._id,
    runAt: graceEnd,
    description: 'Stage 1 → Check 2: Mark as no-show if not activated'
  });
}

async function runPendingJobs() {
  const jobs = await ScheduledJob.find({
    status: 'pending',
    runAt: { $lte: new Date() }
  }).sort({ runAt: 1 }).limit(100);

  for (const job of jobs) {
    try {
      const reservation = await Reservation
        .findById(job.reservationId)
        .populate('parkingSpot user');
      
      if (!reservation) {
        job.status = 'cancelled';
        await job.save();
        continue;
      }

      if (job.type === 'reservation_expiry_check') {
        // ─────────────────────────────────────────────────────
        // CRITICAL: Only process if STILL IN RESERVATION STATE
        // ─────────────────────────────────────────────────────
        if (reservation.parkingState === 'active' || 
            reservation.parkingState === 'completed') {
          // Already checked in, skip
          job.status = 'completed';
          await job.save();
          continue;
        }

        if (reservation.parkingState === 'reservation') {
          // TRANSITION: Stage 1 (Reservation) → Stage 3 (No-Show)
          console.log(`⚠️  No-show: ${reservation._id}`);
          
          reservation.parkingState = 'no-show';
          reservation.status = 'no-show';
          await reservation.save();

          // Release the spot
          await reservation.parkingSpot.releaseSpace(1);

          // Calculate and process refund
          const RefundService = require('./refundService');
          const refundCalc = RefundService.calculateRefund(
            reservation.totalAmount,
            'no_show',
            reservation.createdAt,
            new Date()
          );

          await RefundService.processRefundToKhalti(reservation, {
            ...refundCalc,
            reason: 'no_show'
          });

          // Notify user
          await notificationService.sendNotification(
            reservation.user._id,
            'No-Show: Reservation Expired',
            `Your reservation for Spot #${reservation.parkingSpot.spotNumber} expired. ${refundCalc.message}`,
            'no_show',
            { reservationId: reservation._id }
          );

          // TRIGGER WAITLIST NOTIFICATION
          await handleWaitlist(reservation.parkingSpot._id);
        }
      }

      job.status = 'completed';
      await job.save();

    } catch (error) {
      job.status = 'failed';
      job.attempts += 1;
      job.lastError = error.message;
      await job.save();
      console.error('Job failed:', error);
    }
  }
}
```

---

## 6. WAITLIST NOTIFICATION SYSTEM

### Waitlist Model & Service
```javascript
// src/models/Waitlist.js
const waitlistSchema = new mongoose.Schema({
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
  requestedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['waiting', 'notified', 'booked', 'expired'],
    default: 'waiting'
  },
  notifiedAt: Date,
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 60 * 1000)  // 30 min window
  },
  originalRequest: {
    scheduledArrival: Date,
    duration: Number
  }
}, { timestamps: true });

module.exports = mongoose.model('Waitlist', waitlistSchema);

// ─────────────────────────────────────────────────────
// src/services/waitlistService.js
// ─────────────────────────────────────────────────────

class WaitlistService {
  /**
   * Add user to waitlist when spot is full
   */
  static async addToWaitlist(userId, spotId, scheduledArrival, duration) {
    try {
      const existing = await Waitlist.findOne({
        user: userId,
        parkingSpot: spotId,
        status: 'waiting'
      });

      if (existing) {
        return { success: false, message: 'Already on waitlist' };
      }

      const waitlistEntry = await Waitlist.create({
        user: userId,
        parkingSpot: spotId,
        originalRequest: { scheduledArrival, duration }
      });

      await notificationService.sendNotification(
        userId,
        'Added to Waitlist',
        'You\'ve been added to the waitlist. You\'ll be notified when a spot becomes available.',
        'waitlist_added',
        { spotId }
      );

      return { success: true, waitlistEntry };
    } catch (error) {
      console.error('Waitlist add failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle waitlist when spot is released
   * CALLED FROM: jobSchedulerService when no-show occurs
   */
  static async notifyNextInLine(spotId) {
    try {
      // Get oldest waiting entry
      const nextUser = await Waitlist.findOne({
        parkingSpot: spotId,
        status: 'waiting',
        expiresAt: { $gt: new Date() }
      }).sort({ requestedAt: 1 });

      if (!nextUser) {
        console.log(`✓ No waitlist entries for spot ${spotId}`);
        return null;
      }

      // Mark as notified
      nextUser.status = 'notified';
      nextUser.notifiedAt = new Date();
      await nextUser.save();

      // Send push notification + email
      const spot = await ParkingSpot.findById(spotId);
      
      await notificationService.sendNotification(
        nextUser.user,
        '🎉 Spot Available!',
        `Great news! A spot at ${spot.locationName} is now available. You have 30 minutes to book it.`,
        'waitlist_spot_available',
        { spotId, waitlistId: nextUser._id },
        { sendEmail: true, priority: 'high' }
      );

      // Create a scheduled job to expire this notification after 30 min
      await ScheduledJob.create({
        type: 'waitlist_offer_expiry',
        reservationId: null,  // No reservation yet
        runAt: new Date(Date.now() + 30 * 60 * 1000),
        metadata: { waitlistId: nextUser._id }
      });

      console.log(`📬 Waitlist notification sent to ${nextUser.user}`);
      return nextUser;

    } catch (error) {
      console.error('Waitlist notification failed:', error);
      return null;
    }
  }

  /**
   * When user books from waitlist
   */
  static async markAsBooked(waitlistId, reservationId) {
    try {
      await Waitlist.findByIdAndUpdate(waitlistId, {
        status: 'booked',
        metadata: { bookedReservationId: reservationId }
      });
    } catch (error) {
      console.error('Waitlist mark booked failed:', error);
    }
  }

  /**
   * Cleanup: Expire old waitlist entries
   */
  static async cleanupExpired() {
    const result = await Waitlist.updateMany(
      {
        status: 'waiting',
        expiresAt: { $lt: new Date() }
      },
      { status: 'expired' }
    );
    console.log(`🗑️  Cleaned up ${result.modifiedCount} expired waitlist entries`);
  }
}

module.exports = WaitlistService;
```

---

## 7. COMPLETE FLOW DIAGRAM

```
┌─────────────────────────────────────────────────────────────────────┐
│                     THREE-STAGE PARKING LIFECYCLE                   │
└─────────────────────────────────────────────────────────────────────┘

STAGE 1: RESERVATION
═════════════════════════════════════════════════════════════════════
  User books spot
       ↓
  parkingState = 'reservation'
  arrivalWindow = [scheduledArrival, scheduledArrival + 15min]
       ↓
  Frontend shows: "Arrive by 2:30 PM" (countdown timer)
       ↓
  ┌─ Job 1: Reminder at (scheduledArrival - 30min)
  │        Send: "30 minutes until your parking window"
  │
  └─ Job 2: Expiry check at (scheduledArrival + 15min)
           Decision point:
           ├─ If parkingState == 'active' → Continue to Stage 2 ✓
           └─ If parkingState == 'reservation' → Mark NO-SHOW ✗


STAGE 2: ACTIVE (Triggered by Admin QR Scan)
═════════════════════════════════════════════════════════════════════
  Admin scans QR code
       ↓
  Frontend shows: "Active Session Started"
  Billing begins
  activeSession.billingStartTime = now
       ↓
  Frontend shows: "Parking active: NPR 60/hour"
       ↓
  User checks out manually
       ↓
  parkingState = 'completed'
  Calculate final amount (prorated by actual duration)


STAGE 3: NO-SHOW (Auto-triggered by backend worker)
═════════════════════════════════════════════════════════════════════
  If no check-in after grace period:
       ↓
  parkingState = 'no-show'
  
  Refund Calculation:
  ├─ Original charge: NPR 60
  ├─ Convenience fee: 30% = NPR 18
  └─ Refund: NPR 42
       ↓
  Call Khalti refund API
       ↓
  notifyNextInLine(spotId) 
       ↓
  Next user gets 30-minute offer notification


EDGE CASES HANDLED:
═════════════════════════════════════════════════════════════════════
  ✓ Early check-in: Blocked (must wait 5 min before scheduled time)
  ✓ Late check-in: Rejected as no-show (after grace period)
  ✓ Admin offline: Worker still marks no-show automatically
  ✓ Payment failed: Refund retry logic with exponential backoff
  ✓ Waitlist burst: Rate limiting on notification sends
```

---

## 8. API ENDPOINTS TO CREATE/MODIFY

### Create Endpoints:
```
1. POST /api/v1/waitlist/add
   - Add user to waitlist for a spot

2. POST /api/v1/reservations/confirm-arrival
   - User confirms they're on the way (extends grace period)

3. POST /api/admin/scan-qr
   - Admin scans QR → Transition to ACTIVE state

4. POST /api/admin/manual-release
   - Admin manually releases a reserved spot

5. GET /api/v1/reservations/:id/stage-info
   - Returns parkingState + stage-specific UI data

6. POST /api/v1/reservations/:id/dispute-refund
   - User disputes no-show refund (7-day window)
```

---

## 9. FRONTEND UI COMPONENTS

```jsx
// src/components/ReservationStage.jsx
import React, { useEffect, useState } from 'react';

const ReservationStage = ({ reservationId }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStageInfo();
  }, [reservationId]);

  const fetchStageInfo = async () => {
    const res = await fetch(
      `${API_BASE}/reservations/${reservationId}/stage-info`
    );
    const result = await res.json();
    setData(result.data);
    setLoading(false);
  };

  if (loading) return <div>Loading...</div>;

  switch (data.parkingState) {
    case 'reservation':
      return <ArrivalTimerUI data={data.reservationStage} />;
    
    case 'active':
      return <BillingTimerUI data={data.activeStagebilling} />;
    
    case 'no-show':
      return <NoShowPenaltyUI data={data.noShowInfo} />;
    
    case 'completed':
      return <CompletionUI data={data.completionInfo} />;
    
    default:
      return <div>Unknown state: {data.parkingState}</div>;
  }
};

const ArrivalTimerUI = ({ data }) => (
  <div className="stage-card reservation">
    <h2>🚗 {data.displayText}</h2>
    <CountdownTimer endTime={data.arrivalWindowEnd} />
    <div className="stage-actions">
      <button onClick={() => confirmArrival()}>I'm On My Way</button>
      <button onClick={() => cancelReservation()}>Cancel</button>
    </div>
  </div>
);

const BillingTimerUI = ({ data }) => (
  <div className="stage-card active">
    <h2>⏱️ {data.displayText}</h2>
    <div className="billing-info">
      <p>Current: NPR {data.currentCharge}</p>
      <p>Estimated: NPR {data.estimatedCharge}</p>
    </div>
    <CountdownTimer endTime={data.estimatedCheckOut} />
    <div className="stage-actions">
      <button onClick={() => checkOut()}>Check Out</button>
    </div>
  </div>
);

const NoShowPenaltyUI = ({ data }) => (
  <div className="stage-card no-show">
    <h2>⚠️ No-Show</h2>
    <div className="penalty-breakdown">
      <p>Original charge: NPR {data.penalty.originalCharge}</p>
      <p>Penalty (30%): NPR {data.penalty.penaltyAmount}</p>
      <p className="highlight">
        Refunded: NPR {data.penalty.refundedAmount}
      </p>
    </div>
    <p className="message">{data.penalty.message}</p>
    <button onClick={() => disputeRefund()}>Dispute Refund (7 days)</button>
  </div>
);

export default ReservationStage;
```

---

## 10. SUMMARY & IMPLEMENTATION CHECKLIST

- [ ] Update Reservation schema with `parkingState`, `activeSession`, `refundInfo`
- [ ] Create Waitlist model
- [ ] Implement RefundService with penalty calculations
- [ ] Update jobSchedulerService to handle all three stages
- [ ] Create WaitlistService with notification logic
- [ ] Modify QR scan endpoint to transition states + validate edge cases
- [ ] Add new API endpoints for waitlist & dispute
- [ ] Update frontend to display stage-appropriate UI
- [ ] Test all edge cases (early/late checkin, offline admin, refund failures)
- [ ] Implement Socket.io real-time updates when state changes
- [ ] Set up Khalti refund retry logic with exponential backoff
- [ ] Add analytics to track no-show rates per user/spot

---

## Performance Considerations

1. **Database Indices**:
   ```javascript
   // Essential for efficient lookups
   Reservation.collection.createIndex({ parkingState: 1, scheduledArrival: 1 });
   Waitlist.collection.createIndex({ parkingSpot: 1, status: 1, requestedAt: 1 });
   ScheduledJob.collection.createIndex({ type: 1, status: 1, runAt: 1 });
   ```

2. **Job Scheduler Load**: With high volume, consider batching jobs or moving to a dedicated worker process.

3. **Refund API Rate Limiting**: Implement exponential backoff for Khalti refund calls.

---

**This architecture ensures robust, user-friendly, and scalable parking management! 🎯**
