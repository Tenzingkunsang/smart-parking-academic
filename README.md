# SmartPark

Full-stack smart parking reservation platform: live geospatial discovery, Khalti payments, signed-QR check-in, waitlist promotion, and a real-time admin console.

## Stack

- **Backend** — Node.js + Express + Mongoose (MongoDB), Socket.IO, Khalti, JWT
- **Frontend** — React (CRA), Tailwind CSS, html5-qrcode, Lucide icons
- **Infra** — Helmet, HPP, mongo-sanitize, express-rate-limit, Winston

## Quick start

```bash
# Backend
cd backend
cp .env.example .env       # fill in MONGODB_URI, JWT_SECRET, QR_SIGNING_SECRET
npm install
node src/utils/seed.js     # one-time: parking lots + admin user
npm run dev

# Frontend (new terminal)
cd frontend
npm install
npm start
```

App: http://localhost:3000  API: http://localhost:5001/api/v1

## Required environment variables

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | Mongo connection string. Use a **replica set** for full transaction support — standalone instances also work with automatic fallback. |
| `JWT_SECRET` | Signs access tokens. Server refuses to start without it. |
| `QR_SIGNING_SECRET` | HMAC secret for signed QR tokens. Falls back to `JWT_SECRET` if absent. |
| `CORS_ORIGIN` | Comma-separated allowed origins. **Required in production.** |
| `FRONTEND_URL` | Used for password-reset emails and Khalti redirects. |

See `backend/.env.example` for the full set.

## Notable features

- **Geospatial smart picks** — `$geoNear` aggregation ranks spots by a weighted
  Smart Score (distance / price / rating) and renders a Tailwind grid with a
  platform-aware Maps deep link.
- **Three-stage reservation lifecycle** — `booking → arrival_window → active`
  with auto-expiry via scheduled jobs and waitlist promotion on release.
- **Atomic operations** — `holdSpotAtomically` and `/create` both use
  Mongo transactions when available (replica set) and fall back to
  document-level `$inc` guards on standalone instances.
- **Signed QR codes** — HMAC-SHA256 + expiry + nonce. Forged or stale QRs are
  rejected before any DB write. Legacy unsigned QRs are accepted under
  `QR_ALLOW_LEGACY=true` for a migration window.
- **Real-time updates** — Socket.IO broadcasts spot status to all clients;
  admin dashboard refreshes without polling.
- **Admin console** — Peak-demand heatmap, smart insights KPIs, and live system
  status (2dsphere index, navigation API, Smart Score engine).

## Testing

```bash
cd backend
npm test                # all suites
npm run test:coverage   # with coverage report
```

Current suites:
- `billing.test.js` — checkout charge calculation (grace, overtime, penalty)
- `qrSecurity.test.js` — signing, verification, expiry, tamper detection
- `withTransaction.test.js` — replica-set / standalone fallback detection
- `health.test.js` — health route, 401 on protected routes, 404 routing

## Security hardening already applied

- All admin routes gated by `protect` + `adminAuth`
- Login uses lockout after 5 failed attempts (15-min window)
- Password reset tokens are stored as SHA-256 hashes
- Khalti webhook + verify endpoints are rate-limited and idempotent
- CORS rejects production startup if `CORS_ORIGIN` is missing
- QR codes are HMAC-signed and time-bounded
- Wallet mutations use a single atomic `$inc` + `$push`

## Layout

```
backend/
  src/
    controllers/   # request handlers
    routes/        # express routers (mounted at /api/v1)
    models/        # Mongoose schemas
    services/      # cross-cutting business logic
    middleware/    # auth, logging, error handlers
    utils/         # billing, withTransaction, qrSecurity
  tests/           # Jest + supertest
frontend/
  src/
    components/    # reusable React components (Parking, Admin, common)
    pages/         # route-level pages
    services/      # axios client with single-flight refresh
    utils/         # platformNavigation (iOS/Android/Web map deep links)
```

## License

Academic / non-commercial.
