# Smart Parking Academic (Commercialization Baseline)

Production-focused smart parking platform with:
- React frontend
- Node.js/Express backend
- MongoDB persistence
- Khalti payments
- Real-time parking updates via Socket.io

## Highlights

- API versioning (`/api/v1/*`) with backward-compatible aliases
- Security middleware stack (`helmet`, rate limiting, sanitization, compression)
- Centralized error handling and structured logging (`winston`)
- Refresh token rotation + revocation endpoints (`/auth/refresh`, `/auth/logout`)
- Account lockout guard for repeated failed sign-ins
- Persistent scheduler jobs for reminders/expiry checks
- Waitlist management with auto-promotion
- Personalized recommendations using user behavior profile
- Admin job monitoring endpoints (metrics, failed jobs, retry)
- Theme-aware UI (light/dark), onboarding helper, and PWA manifest baseline
- Reusable UI primitives (`Button`, `Card`, `Skeleton`) for consistent UX

## Quick Start

### 1) Local development

Backend:
```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

Frontend:
```bash
cd frontend
npm install
npm start
```

### 2) Docker

```bash
docker compose up --build
```

Services:
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5001`
- MongoDB: `mongodb://localhost:27017`

## API

- Versioned base: `/api/v1`
- Health: `GET /health`

Core groups:
- Auth: `/api/v1/auth`
- Parking: `/api/v1/parking`
- Reservations: `/api/v1/reservations`
- Payments: `/api/v1/payments`
- Admin: `/api/v1/admin`

## Security Baseline

- HTTP headers hardening with `helmet`
- Request rate limiting
- Mongo query sanitization
- HTTP parameter pollution protection
- Request-scoped IDs for traceability

## CI

GitHub Actions workflow:
- backend install + test
- frontend install + test + build

## Auth Lifecycle

- Access token: short-lived JWT (`type=access`)
- Refresh token: rotated per refresh request and revocable at logout
- Login lockout: temporary account lock after repeated failed attempts
- Refresh token reuse detection: suspicious token reuse revokes active sessions
- Auth security audit logs available via admin endpoint (`/api/v1/admin/security/auth-logs`)

## Next Milestones

- Full refresh-token rotation and token revocation store
- Expanded endpoint-level validation across all routes
- Jest + Supertest backend coverage >70%
- Cypress E2E suite for critical journeys
- Swagger/OpenAPI specs for all endpoints
- Full design system + accessibility pass (WCAG 2.1 AA)
