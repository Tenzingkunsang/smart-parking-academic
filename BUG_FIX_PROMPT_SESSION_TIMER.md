# Fix: Active Parking Session Timer Bug

## The Bug
The "Live Session" timer on `/myreservations` keeps counting indefinitely even after the user's paid booking time ends. Users see "Live Session: 2h 45m..." forever, not realizing their session already expired and they're being charged for overstay.

**Impact:** Misleading UX, user confusion, lost revenue

---

## What Needs to Happen

### IMMEDIATE FIX (Frontend Only - Already Done ✅)
**File:** `frontend/src/pages/user/MyReservations.jsx`

The `ActiveParkingTimer` component now:
1. ✅ Accepts `estimatedCheckOut` prop (when session SHOULD end)
2. ✅ Stops incrementing when `now >= estimatedCheckOut`
3. ✅ Displays red "Session Ended - Checkout Required" message
4. ✅ Clears interval to prevent memory leaks

**Call site updated:** `<ActiveParkingTimer checkInTime={res.checkInTime} estimatedCheckOut={res.activeSession?.estimatedCheckOut} />`

**CSS added:** `.active-parking.expired` styles (red background, warning color)

---

### BACKEND CHANGES NEEDED (Still TODO)

#### 1. Ensure `estimatedCheckOut` is Set Correctly
**File:** `backend/src/controllers/reservationController.js` → `checkIn()` function

```javascript
// Around line 119-123
reservation.activeSession = {
  qrScannedAt: new Date(),
  adminScannedBy: req.user._id,
  billingStartTime: new Date(),
  estimatedCheckOut: new Date(new Date().getTime() + reservation.duration * 60000)
  // ↑ VERIFY this is being set and matches database
};
```

**Action:** Verify this line exists and `estimatedCheckOut = checkInTime + (duration in minutes)`

---

#### 2. Emit Socket Event When Session Expires
**File:** `backend/src/services/jobSchedulerService.js`

Add a scheduled job that runs every minute to check for expired sessions:

```javascript
async function checkExpiredSessions() {
  // Find all 'checked-in' reservations where estimatedCheckOut < now
  const expired = await Reservation.find({
    status: 'checked-in',
    'activeSession.estimatedCheckOut': { $lt: new Date() }
  });
  
  for (const res of expired) {
    // Mark as completed (or overstay if still there)
    res.status = res.checkOutTime ? 'completed' : 'overstay';
    await res.save();
    
    // Emit to user via socket
    io.to(`user_${res.user}`).emit('sessionExpired', { 
      reservationId: res._id,
      message: 'Your parking session has ended'
    });
  }
}

// Call every minute from cron
cron.schedule('* * * * *', checkExpiredSessions);
```

**Action:** Implement this function and hook it into the scheduler

---

#### 3. Handle Session Expiry on Frontend Socket Event
**File:** `frontend/src/pages/user/MyReservations.jsx` → `useEffect` hook

```javascript
useEffect(() => {
  const io = socketService.getIo();
  if (io) {
    io.on('sessionExpired', (data) => {
      fetchReservations(); // Refresh to show "Checkout Required"
      toast.info('Your parking session has ended');
    });
  }
  return () => { if (io) io.off('sessionExpired'); };
}, []);
```

**Action:** Add socket listener for `sessionExpired` event

---

#### 4. Add Overstay Logic
**File:** `backend/src/controllers/reservationController.js` → Add new endpoint or modify checkout logic

When session expires but user is still parked (no `checkOutTime`):
- Calculate overstay minutes = `now - estimatedCheckOut`
- Calculate overstay charge (e.g., 50 NPR/minute or hourly rate)
- Add to user's debt
- Show "Pay Overstay" button on frontend

---

## Testing Checklist

- [ ] Timer displays correct session end time
- [ ] Timer stops at exactly `estimatedCheckOut`
- [ ] UI shows red "Session Ended" message after expiry
- [ ] No console errors or memory leaks
- [ ] Socket event received when backend detects expired session
- [ ] Frontend updates after socket event
- [ ] Overstay charges calculated correctly
- [ ] Works with multiple concurrent sessions
- [ ] Works after network disconnect/reconnect

---

## Priority
**MEDIUM-HIGH** - Affects user experience and payment accuracy. Frontend fix is complete; backend work (3-4 hours) remains.
