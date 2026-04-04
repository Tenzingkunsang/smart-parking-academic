## Main Features Data Audit (Auth + Reservations + Notifications)

### What we fixed
1. **Reservation ↔ ParkingSpot counter synchronization**
   - File: `backend/src/controllers/reservationController.js`
   - Updated:
     - `checkIn` expired flow to release `reservedSpaces` back to `availableSpaces`
     - `checkIn` success flow to move capacity from `reservedSpaces` → `occupiedSpaces`
     - `checkOut` flow to move capacity from `occupiedSpaces` → `availableSpaces`
   - Also aligned the legacy flags (`isReserved`, `isOccupied`, `status`) and the socket event payload with the resulting state.

### Remaining inconsistencies / follow-ups (prioritized)
1. **Overflow + “Stay or Leave?” reallocation behavior**
   - Current implementation supports:
     - “I’m coming” extends the arrival timer
     - “Can’t make it” / timer expiry reallocates by marking the reservation as `no-show` and releasing the spot
   - Not implemented yet (if required later):
     - If “coming/extend” is selected but the reserved spot is expected to be taken soon, automatically move the user to an “overflow” spot.

2. **Admin QR check-in/out + overtime endpoints**
   - Frontend `frontend/src/pages/Admin/QRScannerPage.jsx` expects:
     - `POST /api/reservations/checkin` and `POST /api/reservations/checkout`
     - overtime fee calculation and additional payment prompt
   - Backend currently does not expose those routes in `backend/src/routes/reservationRoutes.js`.

3. **UX + status naming alignment**
   - Timer expiry currently produces a mix of reservation statuses (`expired` in the check-in path vs `no-show` in the scheduler path).
   - This is not breaking, but message wording and status naming could be unified later for clarity.

