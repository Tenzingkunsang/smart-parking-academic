# SmartPark - Smart Parking Reservation System

This is a full-stack smart parking reservation web application. It lets users find nearby parking spots, book them in advance, pay securely via Khalti, and check in by scanning a QR code. It also has a complete admin dashboard to manage spots, view reservations, check live statistics, and track system status in real-time.

## Tech Stack
- **Backend:** Node.js, Express, MongoDB (Mongoose), Socket.IO (for real-time spot updates), Khalti Payment Gateway, JWT (for authentication).
- **Frontend:** React, Tailwind CSS, html5-qrcode (for scanning), Lucide React (icons).
- **Security & Utilities:** Helmet, express-rate-limit, Winston Logger, Jest (testing).

---

## Features
- **Find Parking Spots:** View nearby parking spots on a map or grid. Spots are sorted by distance, price, and ratings (using MongoDB geospatial queries).
- **Easy Booking & Payments:** Book a spot and pay instantly using Khalti.
- **Secure QR Check-in:** Check in at the parking lot by scanning a secure QR code. The QR codes are signed using an HMAC secret, have expiration times, and are single-use to prevent fraud or screenshot re-sharing.
- **Real-Time Spot Status:** Spot availability updates instantly across the app using Socket.IO without needing to refresh the page.
- **Smart Billing & Wallet:** Standardized billing logic that automatically calculates overstay charges (with a 15-minute grace period) and applies active penalties if a user has multiple violations. Users also have a built-in wallet.
- **Admin Dashboard:** Real-time analytics, spot management, peak-hour demand heatmap, system status tracking, and the ability to retry failed refunds or reset user violations.
- **Security Features:** Gatekeeper admin routes, brute-force protection (locks accounts for 15 minutes after 5 failed login attempts), and transaction-safe operations to prevent double-booking.

---

## Getting Started

### Prerequisites
- Node.js installed
- MongoDB running (supports replica sets for transaction support, but automatically falls back to standard queries if using a standalone database)

### How to Run Locally

1. **Set up the Backend:**
   ```bash
   cd backend
   cp .env.example .env
   # Open .env and add your MONGODB_URI, JWT_SECRET, and QR_SIGNING_SECRET
   npm install
   
   # Seed database with initial parking spots and an admin account
   node src/utils/seed.js
   
   # Start backend
   npm run dev
   ```

2. **Set up the Frontend:**
   ```bash
   # In a new terminal tab/window
   cd frontend
   npm install
   npm start
   ```

Now, open your browser and go to `http://localhost:3000`. The API will run on `http://localhost:5001/api/v1`.

---

## Environment Variables (.env)
Make sure to configure these in `backend/.env`:
- `MONGODB_URI`: MongoDB connection string.
- `JWT_SECRET`: For signing user authentication tokens.
- `QR_SIGNING_SECRET`: For signing the check-in QR codes.
- `CORS_ORIGIN`: Allowed origins (e.g., `http://localhost:3000`).
- `FRONTEND_URL`: Used for password reset emails and Khalti redirects.

---

## Running Tests
I've written unit and integration tests to make sure everything works perfectly:
```bash
cd backend
npm test                # Run all test suites
npm run test:coverage   # Run tests with coverage report
```

### Test Suites Included:
- `billing.test.js`: Checks overstay calculations, grace periods, and user penalties.
- `qrSecurity.test.js`: Tests QR token creation, verification, expiry, and signature validation.
- `withTransaction.test.js`: Verifies the database transaction wrapper and fallback logic.
- `health.test.js`: General API health check and protected route security checks.

---

## Project Structure
Here's how the codebase is organized:
```text
backend/
  src/
    controllers/   # Express route handlers
    routes/        # Express routers (mounted at /api/v1)
    models/        # Mongoose database models
    services/      # Core business and lifecycle logic
    middleware/    # Authentication, rate limiting, and errors
    utils/         # Billing calculations, transactions, and QR security
  tests/           # Jest test suites
frontend/
  src/
    components/    # React components (Parking, Admin UI, widgets)
    pages/         # Full pages (Login, User & Admin Dashboards, Scanner)
    services/      # Axios API clients
    utils/         # Platform map navigation deep links (iOS, Android, Web)
```
