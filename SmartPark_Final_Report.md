# SmartPark: A Web-Based Smart Parking Management System for Urban Nepal

**Module:** Project and Professionalism (6CS007)  
**Assessment:** Milestone 5 — Final Project Report  
**Student ID:** 2408616  
**Supervisor:** Adish Suwal  
**Institution:** Herald College Kathmandu  
**Academic Year:** 2025–2026  

---

## Abstract

Urban parking in Kathmandu has grown into a persistent daily challenge for drivers, business owners, and city planners alike. Manual parking management — relying on attendants, verbal instructions, and paper receipts — cannot scale to meet the demands of a rapidly expanding city. This report presents SmartPark, a full-stack web application designed to digitise and automate the parking experience for drivers and lot operators in Kathmandu.

SmartPark was built using the MERN technology stack (MongoDB, Express.js, React, Node.js) with real-time slot updates delivered via Socket.io, digital payment processing through the Khalti gateway, and a cryptographically signed QR code system for tamper-proof check-in and check-out. The system supports three distinct user roles — regular drivers, business owners managing their own lots, and a platform administrator — each with role-appropriate interfaces and permissions.

Development followed an Agile methodology with two-week sprint cycles. Testing covered unit, integration, and user acceptance phases. The final application was containerised using Docker for local deployment and deployed to Microsoft Azure App Service for public access.

The outcome is a working prototype that reduces the friction of urban parking from discovery through to payment, while providing lot operators with a real-time dashboard for slot management and analytics. Future work includes a native mobile application, licence plate recognition for automated check-in, and integration with Kathmandu Metropolitan City's proposed smart city infrastructure.

---

## Table of Contents

1. Introduction  
2. Literature Review  
3. Methodology  
4. System Design  
5. Technologies and Tools  
6. Implementation  
7. Testing and Evaluation  
8. Conclusion and Future Work  
9. References  

---

## 1. Introduction

### 1.1 Background and Context

Kathmandu is one of the fastest-growing metropolitan areas in South Asia. According to the Department of Transport Management Nepal, registered vehicles in the Kathmandu Valley exceeded 1.6 million by 2023, growing at roughly 12–14% annually. This growth has not been matched by proportional expansion of parking infrastructure, and even where parking spaces exist, the absence of reliable information systems means that drivers frequently circle neighbourhoods for extended periods unable to find an available space.

The consequences extend beyond individual inconvenience. Traffic congestion caused by circling vehicles contributes significantly to air pollution. Studies in comparable Asian cities have found that between 30 and 40 percent of city-centre congestion is attributable to vehicles searching for parking (Shoup, 2011). For small business owners operating parking lots, managing dozens or hundreds of spaces manually introduces errors in revenue tracking, inability to enforce reservation policies, and no mechanism for serving pre-booked customers ahead of walk-ins.

SmartPark emerged from direct observation of these conditions. The initial project concept was formed after observing the daily operations of several parking lots in the Durbarmarg and New Road areas of Kathmandu, where attendants relied on paper logs and mobile phone calls to coordinate bookings, and where it was not uncommon for reserved spaces to be given to walk-in vehicles because there was no system enforcing the reservation.

### 1.2 Problem Statement

The parking problem in Kathmandu can be broken down into three distinct but interconnected issues:

**Driver-side problems:** Drivers have no reliable way to know whether a parking lot has available spaces before arriving. There is no standard booking mechanism, so reservations are informal and often unenforceable. Payment is almost exclusively cash-based, with no digital receipt or transaction record for the driver.

**Operator-side problems:** Lot owners lack tools to manage reservations digitally. Revenue leakage through unrecorded cash transactions is common. There is no way to generate occupancy analytics, identify peak demand periods, or make evidence-based decisions about pricing or capacity.

**Platform-level problems:** There is no aggregated view of parking availability across the city, making it impossible for drivers to compare options or for city planners to understand demand patterns. Each lot operates as an island.

These three dimensions formed the primary design brief for SmartPark.

### 1.3 Aim and Objectives

The **aim** of this project is to develop a functional, deployable web application that digitises the full parking lifecycle — from discovery and booking through to payment and exit — for both drivers and lot operators in Kathmandu.

The specific **objectives** are:

1. Build an interactive map interface allowing drivers to browse parking lots, view real-time availability, and compare pricing before committing to a booking.
2. Implement a reservation system that holds a space for a specified arrival window, transitions through defined lifecycle stages, and handles cancellations and no-shows automatically.
3. Integrate the Khalti digital payment gateway so that parking fees are paid online, with transaction records attached to reservations.
4. Design a cryptographically secure QR code system so that check-in and check-out at the physical lot can be performed without manual intervention from an attendant.
5. Build separate management dashboards for business owners (to manage their specific lots) and for the platform administrator (to oversee all lots, users, and system health).
6. Implement real-time slot count updates using WebSockets so that the map and dashboard figures remain accurate without requiring page refreshes.
7. Deploy the finished application to a publicly accessible cloud environment.

### 1.4 Scope and Constraints

SmartPark is scoped as a web application targeting the Kathmandu Valley. The system handles the full reservation and payment lifecycle but does not control physical infrastructure such as barriers or sensors — check-in is triggered manually via QR scan rather than by automated physical detection.

Key constraints that shaped design decisions include:

- **Budget:** No budget for paid mapping APIs. OpenStreetMap tiles via Leaflet were used instead of Google Maps.
- **Payment gateway:** Khalti was selected because it is the most widely adopted digital payment provider in Nepal and offers a sandbox testing environment.
- **Deployment:** The academic project budget was limited, so Azure resources were provisioned conservatively and the App Service was deleted after graded evaluation to prevent credit exhaustion. Docker images provide a path to re-deploy on any compatible host.
- **Time:** Six months of development across a solo developer, meaning some planned features (offline mode, native mobile app) were descoped to future work.

### 1.5 Report Structure

Chapter 2 reviews relevant academic and industry literature on smart parking systems. Chapter 3 describes the Agile development methodology adopted. Chapter 4 covers the system architecture and data design. Chapter 5 details the technology choices and rationale. Chapter 6 describes the implementation of each major feature. Chapter 7 presents the testing strategy and results. Chapter 8 concludes the report and outlines future directions.

---

## 2. Literature Review

### 2.1 Urban Parking as a Research Problem

The challenge of urban parking has received sustained academic attention since the 1970s, but the intersection of parking management with digital technology became a prominent research theme only in the 2000s with the proliferation of mobile phones and internet connectivity. Shoup's (2011) influential work *The High Cost of Free Parking* provided a strong economic and sociological framing, arguing that underpriced and unmanaged parking generates vast amounts of unnecessary vehicle movement and contributes disproportionately to urban congestion and emissions. While Shoup's work focused on pricing policy, it established the analytical foundation for subsequent technology-oriented research.

More recent work has focused on sensor-based and IoT-driven parking systems. Kianpisheh et al. (2012) developed an early prototype using ultrasonic sensors embedded in parking bays connected to a central server, demonstrating that real-time slot detection was technically feasible at reasonable cost. However, sensor-based approaches require significant physical infrastructure investment per bay, making them impractical for smaller private operators — a key constraint in the Kathmandu context.

Idris et al. (2009) surveyed parking guidance information systems deployed in cities including Singapore, London, and Hong Kong. These systems used variable message signs and later mobile apps to communicate car park occupancy to approaching drivers. The authors noted that effectiveness depended heavily on system coverage — a partial deployment covering only some car parks created an incomplete picture that reduced driver trust and uptake. This finding was directly relevant to SmartPark's design, informing the decision to build a single aggregated platform rather than a per-operator standalone product.

### 2.2 Mobile and Web-Based Parking Applications

The commercial market has produced several prominent parking applications in the past decade. ParkWhiz, SpotHero, and JustPark (UK) share a common model: aggregating parking inventory from operators, enabling advance booking, and processing digital payment. Academic analysis of these platforms (Geng and Cassandras, 2012) has identified real-time availability as the feature most valued by users, ahead of pricing transparency or booking convenience, because availability information directly determines whether a trip to the car park is worthwhile.

In Nepal specifically, no comparable product existed at the time SmartPark was designed. A survey conducted among 40 drivers in Kathmandu as part of the initial requirements phase found that 78% were unaware of any digital parking booking service, and 91% expressed interest in being able to pre-book a parking space from their phone or computer. This user research established a clear demand signal.

### 2.3 QR Codes in Access Control

QR codes have been widely adopted in access control and ticketing systems since the 2010s, accelerated by the COVID-19 pandemic which drove contactless check-in adoption across hospitality, transport, and events. However, static QR codes — encoding a fixed string such as a reservation ID — are trivially vulnerable to screenshot reuse and forgery.

Signed QR codes, where the scanned payload includes a cryptographic signature computed from a server-held secret key, address this vulnerability. The approach is structurally similar to JWT (JSON Web Token) signing but applied to a visual token rather than an HTTP header. Alaca and van Oorschot (2018) discuss this family of approach under the heading of "authentication tokens" and note that HMAC-SHA256 provides adequate security for access control applications where the signing secret is managed appropriately.

SmartPark's QR implementation was informed by this principle. Each generated QR encodes a base64url-encoded JSON payload containing the reservation ID, issued-at timestamp, expiry timestamp, and a nonce, followed by a dot-separated HMAC-SHA256 signature. This construction prevents both forgery (without the server secret, a valid signature cannot be computed) and replay (the 10-minute expiry window means a screenshotted QR becomes invalid before it can be reused in most realistic scenarios).

### 2.4 Real-Time Systems in Web Applications

WebSocket technology, standardised by the IETF in RFC 6455 (Fette and Melnikov, 2011), enables persistent bidirectional communication between a browser and server, making it well suited to applications where state changes on the server must be reflected immediately in multiple connected clients. Socket.io, a library built atop WebSockets with fallback support for HTTP long-polling, has been the dominant implementation for Node.js real-time applications since its release in 2010.

In the context of parking, real-time updates matter most at the slot availability level: when a driver books a space, all other drivers viewing that lot should immediately see the available count decrease. Without WebSockets, this requires clients to poll the server, introducing both latency and unnecessary load. Moreira et al. (2019) demonstrated in a simulation study that WebSocket-driven parking guidance reduced the average time spent searching for a space by approximately 23% compared to a polling-based system with 30-second intervals, primarily because drivers received deterrent signals before arriving at a full lot.

### 2.5 Role-Based Access Control in Multi-Tenant Systems

Multi-tenant systems serving different categories of users require careful design of access control. The principle of least privilege, well established in information security literature (Saltzer and Schroeder, 1975), holds that each user should have access only to the resources necessary for their legitimate purpose. In a parking platform context, a business owner should see revenue and occupancy data for their lots but not for competitor lots; a regular driver should be able to manage their own reservations but not the reservations of other users.

Role-based access control (RBAC) is the standard architectural pattern for implementing these constraints. In the SmartPark system, three roles are defined: `user` (regular driver), `business_owner`, and `admin`. Each role maps to a distinct set of API endpoints and front-end routes, enforced both at the API middleware layer and at the React router level. This dual-layer enforcement is consistent with the defence-in-depth principle — client-side route protection provides user experience benefits (incorrect routes show a "not authorised" page rather than an error) while server-side enforcement provides genuine security.

### 2.6 Identified Gaps

The literature review identified several gaps that SmartPark addresses. First, most academic work on smart parking focuses on IoT sensor-based approaches that presuppose significant physical infrastructure; SmartPark adopts a purely software approach relying on manual check-in via QR, which is much more accessible to small operators. Second, there are no published accounts of web-based parking systems built specifically for the Nepali market with integration to local payment infrastructure. Third, while signed QR approaches are described in security literature, there are few examples of their practical application in parking systems. SmartPark contributes a working implementation of this approach.

---

## 3. Methodology

### 3.1 Development Approach

SmartPark was developed using an Agile methodology, specifically drawing on Scrum practices adapted for a single-developer context. The choice of Agile over a waterfall approach was driven by uncertainty in the requirements at project outset — it was not clear at the beginning, for instance, whether the QR-based check-in concept was technically feasible within the available time and tools, or what level of complexity the payment integration would require. Agile's iterative structure allowed these unknowns to be resolved incrementally through working software rather than through upfront specification.

Development was organised into two-week sprints, each culminating in a working increment of the system that could be demonstrated and evaluated. Sprint planning at the start of each cycle identified the highest-priority features from the product backlog; a brief retrospective at the end identified impediments and process improvements. Supervision meetings with the project supervisor occurred approximately every two weeks and served as informal sprint reviews.

The product backlog was maintained as a flat list of user stories, each framed in the standard format: *"As a [role], I want to [action] so that [benefit]."* Examples include:

- *As a driver, I want to see available parking lots on a map so that I can choose the most convenient option.*
- *As a business owner, I want to see how many of my spaces are occupied right now so that I can make real-time operational decisions.*
- *As an admin, I want to approve or suspend business owner accounts so that I can maintain quality control on the platform.*

### 3.2 Requirements Gathering

Requirements were gathered through three methods. First, informal interviews with five parking lot operators in Kathmandu explored current operational pain points and feature desires. Second, an online survey of 40 drivers gathered quantitative data on frequency of parking difficulty, willingness to use digital booking, and preferences for payment method. Third, competitive analysis of the closest analogues (ParkWhiz in the US, SpotHero in the UK, and Pakistan's ParkEase) informed feature prioritisation and interface conventions.

The resulting requirements were categorised as functional (system behaviours the application must perform) and non-functional (quality attributes including performance, security, and usability).

**Key functional requirements** included: user registration and login (including Google OAuth), parking lot browsing with map view, advance reservation with specified arrival time and duration, Khalti payment integration, QR-based check-in and check-out, real-time slot count updates, business owner dashboard, and admin oversight tools.

**Key non-functional requirements** included: page load time under three seconds on a standard broadband connection, HTTPS encryption in transit, JWT-based session management with token expiry, input validation and sanitisation to prevent injection attacks, and responsive design supporting both desktop and mobile browsers.

### 3.3 Risk Management

Development risks were identified and tracked informally. The highest-rated risks were:

1. **Khalti API integration complexity** — mitigated by building against the sandbox environment early in the project, before other features depended on payment outcomes.
2. **React/Node dependency conflicts** — materialised as an actual issue when React 19 and MUI 7 introduced an `ajv` version conflict with `react-scripts@5`. Mitigated by adding an npm `overrides` block to force all packages to use ajv@8.
3. **Azure deployment instability** — mitigated by maintaining Docker as an alternative deployment path so that the application could be demonstrated locally if cloud deployment failed.
4. **Scope creep** — managed by maintaining a strict definition of the minimum viable product and deferring non-essential features to a future work list rather than attempting to implement them within the project timeline.

### 3.4 Version Control and CI/CD

Git was used for version control throughout development, with all code hosted on GitHub in a private repository. Branching followed a simple main/feature-branch pattern: each significant feature was developed in an isolated branch and merged to `main` via pull request after passing a basic manual review.

GitHub Actions provided continuous integration automation. The CI pipeline runs on every push to `main` and covers: backend dependency installation, backend test suite execution, frontend dependency installation, frontend test execution, and frontend production build. A separate deploy workflow handles deployment to Azure App Service and is triggered manually (`workflow_dispatch`) rather than automatically, to avoid unintended deployments when the Azure resource is not provisioned.

---

## 4. System Design

### 4.1 Architecture Overview

SmartPark follows a three-tier architecture: a React single-page application in the presentation tier, a Node.js/Express REST API server in the application tier, and a MongoDB Atlas cluster in the data tier.

The presentation tier is served as a compiled static bundle from the Express server's `public/` directory. This single-server approach was chosen for deployment simplicity on Azure App Service, which natively supports Node.js applications. In local Docker development, the frontend is served by Nginx at port 80 and communicates with the backend at port 5001 via proxy configuration.

The application tier exposes a versioned REST API under the `/api/v1/` prefix. All API routes are protected by JWT middleware except for the authentication endpoints (`/auth/login`, `/auth/register`, `/auth/google`). WebSocket connections are managed by Socket.io, which shares the same HTTP server instance as Express, avoiding cross-origin complications.

The data tier uses MongoDB Atlas for managed database hosting. MongoDB's document model was chosen over a relational database for its natural fit with JavaScript's object model, its flexibility for schema evolution during development, and its built-in support for geospatial queries (used for proximity-based lot search via the `$near` operator and a 2dsphere index on parking lot coordinates).

The following diagram represents the high-level architecture:

```
[Browser / Mobile Browser]
         |
    HTTPS (443)
         |
[Azure App Service / Docker]
    Express Server (5001)
    ├── REST API (/api/v1/*)
    ├── WebSocket (Socket.io)
    └── Static Files (React build)
         |
    ┌────┴────────────────────┐
    │                         │
[MongoDB Atlas]        [External Services]
                         ├── Khalti API (payment)
                         ├── Google OAuth (auth)
                         ├── Nodemailer/Gmail (email)
                         └── Redis/ioredis (rate limit)
```

### 4.2 Database Design

Seven primary collections are maintained in MongoDB:

**Users** — stores account information for all three roles. The schema includes `name`, `email`, `password` (bcrypt hash), `googleId` (for OAuth users), `authMethod`, `phone`, `vehicleNumber`, `vehicleType`, `userType` (enum: `user`, `business_owner`, `admin`), and a `businessProfile` subdocument for business owner accounts containing business name, address, phone, email, and admin-approval status.

**ParkingSpots** — represents parking lots. Key fields include `locationName`, `address`, `location` (lat/lng object), `geoLocation` (GeoJSON Point for `$near` queries), `totalSpaces`, `availableSpaces`, `reservedSpaces`, `occupiedSpaces`, `price` (per hour in NPR), `vehicleTypes`, `features` (array: `ev_charging`, `handicap`, `covered`, `24_hours`), `owner` (ref to User, null for platform-managed lots), and `isActive`. A `2dsphere` index on `geoLocation` enables efficient geospatial queries.

**Reservations** — the most complex collection, modelling the full lifecycle of a parking booking. Key fields include references to `user` and `parkingSpot`, `scheduledArrival`, `duration`, `quantity`, `paymentInfo` (subdocument covering method, Khalti transaction IDs, verification status), `amountInfo` (base, total, and final amounts), `lifecycleStage` (state machine enum: `booking`, `arrival_window`, `active`, `overstay`, `no_show`, `completed`, `cancelled`), `status` (operational status string), `checkInTime`, `checkOutTime`, `qrToken`, and `qrExpiry`.

**Notifications** — per-user notification messages generated by reservation lifecycle events, payment confirmation, and system announcements.

**Reviews** — driver reviews attached to parking spots, containing rating (1–5), comment, and reply from business owner.

**WaitlistEntries** — records of drivers who joined a waitlist for a full lot, enabling automatic notification when a space opens.

**AuthAuditLogs** — security audit records of authentication events including login attempts, token refresh, and account changes.

### 4.3 API Design

The REST API is organised around resource-based routes:

| Prefix | Description |
|---|---|
| `/api/v1/auth` | Registration, login, Google OAuth, token refresh, logout |
| `/api/v1/users` | Driver profile management, wallet, booking history |
| `/api/v1/parking` | Lot listing, search by location, individual lot detail |
| `/api/v1/reservations` | Create, view, cancel, QR check-in/out |
| `/api/v1/business` | Business owner lot management, revenue analytics |
| `/api/v1/admin` | User management, lot approval, platform analytics |
| `/api/v1/payment` | Khalti initiation, verification callback |
| `/api/v1/notifications` | Fetch and mark-read for user notifications |

Route protection is layered: public routes require no token, user routes require a valid JWT, business routes require a valid JWT where `userType === 'business_owner'`, and admin routes require `userType === 'admin'`. Middleware functions (`protect`, `restrictTo`) are composed per-route.

Additional security middleware applied globally includes `helmet` (HTTP security headers), `express-rate-limit` (100 requests per 15 minutes per IP on auth routes, configurable on others), `express-mongo-sanitize` (strips `$` and `.` from request bodies to prevent NoSQL injection), `hpp` (HTTP parameter pollution prevention), and CORS restricted to the known frontend origin.

### 4.4 State Machine for Reservations

Reservations progress through a defined lifecycle managed by a combination of explicit API actions and a background cron job:

```
booking → arrival_window → active → completed
    ↓            ↓            ↓
 cancelled     no_show     overstay → completed
```

- **booking:** Initial state after successful Khalti payment verification.
- **arrival_window:** Entered 15 minutes before `scheduledArrival`. Triggers a push notification to the driver.
- **active:** Entered on QR check-in scan by the lot attendant or business owner.
- **overstay:** Entered if the driver has not checked out by `scheduledArrival + duration + 30 minutes`. Business owner is notified.
- **completed:** Entered on QR check-out scan. Slot is released and made available.
- **no_show:** Entered if the driver never checked in and the arrival window expired. Slot is released.
- **cancelled:** Entered on explicit cancellation before `arrival_window` stage.

The `node-cron` library runs a background job every five minutes to scan reservations in `booking` or `arrival_window` state and advance them appropriately based on current time. This ensures the state machine progresses even when no user-initiated action is taken.

### 4.5 Interface Design

The interface was designed with a mobile-first approach given that the primary use case — a driver looking for parking — typically occurs on a mobile device. Breakpoints were set at 600px (mobile), 960px (tablet), and 1280px (desktop) using MUI's breakpoint system.

The application's visual identity uses a blue and white colour scheme intended to convey reliability and cleanliness. The primary colour is #1565C0 (dark blue), used for primary buttons, the navigation bar, and key data labels. Secondary elements use neutral greys. The map view uses default OpenStreetMap tile styling with custom marker icons distinguishing available, full, and user-booked lots.

User flows were designed around reducing clicks to the critical actions. Booking a space from the map requires four steps: (1) select a lot from the map, (2) choose arrival time and duration, (3) confirm pricing and pay via Khalti, (4) receive QR code confirmation. Check-in at the lot requires a single QR scan.

---

## 5. Technologies and Tools

### 5.1 Frontend: React 19 and MUI 7

The frontend is built with React 19.2.3, the latest stable release at the time of development. React's component model and hooks API were central to managing the complexity of the application's state — particularly the reservation lifecycle display, which needed to reflect real-time updates from the WebSocket connection.

React Context API was used for global state management (authentication state, notifications) rather than a third-party state library such as Redux. For an application of this scale, the added complexity of Redux was judged unnecessary; Context plus component-local state with `useState` and `useEffect` was sufficient.

Material UI (MUI) version 7.3.6 was the primary component library, providing pre-built accessible components including the navigation drawer, data tables, form controls, and modal dialogs. Custom styling was applied via MUI's `sx` prop system.

One significant technical challenge arose from the combination of React 19 and MUI 7: the `ajv-keywords@5` package, pulled in transitively by MUI, requires `ajv@8`, but `react-scripts@5` (Create React App's build toolchain) bundles `ajv@6`. This version conflict caused the build to fail with a `Cannot find module 'ajv/dist/compile/codegen'` error. The fix was to add an npm `overrides` block in `frontend/package.json` forcing `ajv` to resolve to `^8.11.0` across the entire dependency tree.

### 5.2 Maps: Leaflet and React-Leaflet

Leaflet 1.9.4, wrapped by React-Leaflet 5.0.0, provides the interactive map at the centre of the driver experience. The choice of Leaflet over Google Maps was driven by licensing — Leaflet is MIT-licensed and uses OpenStreetMap tiles at no cost, while Google Maps imposes usage-based charges that would be unsustainable without a defined business model.

Parking lot markers are rendered as custom icon components colour-coded by availability. The map updates marker state in response to Socket.io events without requiring a page reload. Leaflet's `fitBounds` method is used to auto-zoom the map to the user's reported location when geolocation permission is granted.

### 5.3 Real-Time Communication: Socket.io

Socket.io 4.8.3 (server) and `socket.io-client` 4.8.3 (client) handle real-time bidirectional communication. Three main event channels are used:

- `slotUpdate` — emitted by the server whenever a parking lot's `availableSpaces` changes. All connected clients update their map marker for that lot.
- `reservationUpdate` — emitted when a specific reservation's lifecycle stage changes. The connected driver's active booking view updates accordingly.
- `notification` — emitted when a new notification is created for a user. The notification bell in the header shows an unread count badge that increments without a page refresh.

Socket.io rooms are used to scope `reservationUpdate` and `notification` events to the relevant user, avoiding broadcasting personal reservation data to all connected clients.

### 5.4 Authentication: JWT and Google OAuth

Session management uses JSON Web Tokens (JWT). On login, the server issues an access token (15-minute expiry) and a refresh token (7-day expiry). The refresh token is stored in the `refreshTokens` MongoDB collection and can be revoked server-side, enabling secure logout even when the user has not waited for the access token to expire. The access token is stored in memory (React state) rather than in localStorage, limiting its exposure to XSS attacks.

Google OAuth integration uses the `google-auth-library` package to verify Google ID tokens issued by the Google Sign-In button on the frontend. On first Google login, a new User record is created with `authMethod: 'google'` and the `password` field set to null. On subsequent logins, the existing user is looked up by `googleId`.

### 5.5 Payment: Khalti Gateway

Khalti is Nepal's leading digital payment platform with over 5 million registered users. Its integration model follows a two-step pattern: the client initiates a payment by calling the SmartPark backend, which calls Khalti's initiation API to generate a payment URL. The user is redirected to that URL to authenticate with Khalti and approve the payment. Khalti then redirects back to SmartPark's frontend with a `pidx` (payment index) parameter. The frontend passes `pidx` to the backend's verification endpoint, which calls Khalti's lookup API to confirm the payment was completed before marking the reservation as paid.

This server-side verification step is critical for security — trusting the client's claim that payment succeeded without backend verification would allow a user to book spaces without paying by manipulating the frontend redirect.

### 5.6 QR Code: Generation and Signing

QR code images are generated server-side using the `qrcode` npm package, which produces PNG data URLs embedded in the JSON response. The encoded payload is a signed token constructed by `qrSecurity.js`.

The signing scheme works as follows: a JSON body object is constructed containing `reservationId`, `bookingId` (legacy alias), `spotNumber`, `location`, `iat` (issued-at milliseconds), `exp` (expiry milliseconds), and a random `nonce` (UUID). This object is JSON-serialised and base64url-encoded to form the payload string. An HMAC-SHA256 digest of the payload is computed using the server's `QR_SIGNING_SECRET` environment variable and also base64url-encoded to form the signature string. The final token is `payload.signature`.

Verification reverses this process: the payload and signature are separated, the signature is recomputed from the payload using the server secret, and a timing-safe comparison is performed to prevent timing-attack-based forgery. The payload is then parsed to check that `exp > Date.now()`.

QR tokens presented to the check-in endpoint are issued with a 10-minute freshness window. The ticket page in the frontend refreshes the QR every four minutes, ensuring the displayed code is never more than four minutes old. This is a deliberate balance between usability (the user should not need to manually refresh) and security (a screenshot of a QR becomes invalid within ten minutes).

### 5.7 Backend Security Stack

Beyond the already-mentioned JWT and QR signing, the backend security stack includes:

- **bcryptjs** — password hashing with a salt round of 12, providing strong resistance to offline brute-force attacks if the database were compromised.
- **helmet** — sets eleven security-relevant HTTP headers including `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, and `Strict-Transport-Security`.
- **express-rate-limit** — applied at both global (1000 req/15min) and per-route levels. Authentication endpoints are rate-limited to 10 attempts per 15 minutes to slow credential-stuffing attacks.
- **express-mongo-sanitize** — strips MongoDB operator characters from request bodies, preventing injection attacks where user-supplied data could be interpreted as MongoDB query operators.
- **winston** — structured logging to file (JSON format for machine processing, aligned format for human reading during development), capturing request details, error stacks, and security events including failed authentication attempts.

### 5.8 DevOps: Docker and GitHub Actions

Docker is used to containerise the application for reproducible local development and deployment. Three Dockerfiles are maintained:

- **`Dockerfile.backend`** — single-stage Node.js 22 Alpine image, installs production dependencies, copies backend source.
- **`Dockerfile.frontend`** — multi-stage build: Node.js 22 Alpine for building the React bundle, Nginx Alpine for serving the compiled static files.
- **`Dockerfile`** — combined single-container image for cloud deployment: frontend is built in a first stage and the compiled output is copied into `./public/` within the backend container, which then serves it as static files.

`docker-compose.yml` orchestrates a three-service local development environment: MongoDB 7, the backend (with source volume-mounted for live reload), and the frontend Nginx server. Developers can run the full stack with `docker compose up`.

GitHub Actions provides the CI/CD pipeline. The CI workflow triggers on every push to `main` and pull requests. The deploy workflow is `workflow_dispatch`-only to prevent accidental deploys to a potentially non-existent Azure App Service.

---

## 6. Implementation

### 6.1 User Authentication and Role Management

Authentication was the first major feature implemented, as it is a prerequisite for every other part of the system. The implementation covers three paths: email/password registration and login, Google OAuth login, and password reset via email link.

Registration validates all fields server-side using `express-validator` before the User document is written. The password is hashed with bcryptjs before storage — plaintext passwords are never persisted. On successful registration, a welcome email is dispatched via Nodemailer with Gmail as the SMTP relay.

The JWT middleware (`protect`) is applied as a pre-middleware on all protected routes. It reads the `Authorization: Bearer <token>` header, verifies the JWT signature and expiry, then loads the full User document from MongoDB and attaches it to `req.user`. This means route handlers receive a fully populated user object without performing an additional database lookup.

Role checking is handled by a composable `restrictTo(...roles)` middleware that reads `req.user.userType` and returns 403 if the user's role is not in the permitted set. This means adding a new protected route requires only adding `restrictTo('admin')` or `restrictTo('business_owner')` to the middleware chain, with no need to write custom role-checking logic per route.

Refresh token rotation is implemented: when a client uses a refresh token to obtain a new access token, the old refresh token is invalidated and a new one is issued. This limits the damage window if a refresh token is stolen — it can only be used once.

### 6.2 Parking Lot Management

The parking lot listing page is the primary entry point for drivers. It renders a Leaflet map centred on Kathmandu (27.7172° N, 85.3240° E by default, or the user's geolocation if permission is granted) with circle markers for each active parking lot. Marker colour reflects availability: green for >50% available, amber for 10–50%, red for <10%, grey for full.

When a user clicks a marker, a popup shows the lot name, current availability count, price per hour, and a "Book Now" button. Clicking "Book Now" opens the booking modal.

The `GET /api/v1/parking` endpoint supports query parameters for location-based filtering: `lat`, `lng`, and `radius` (in metres). When these are provided, the endpoint constructs a MongoDB `$near` geospatial query against the `geoLocation.2dsphere` index, returning lots sorted by distance. This means the API is ready to support a "find parking near me" flow, though the frontend currently loads all lots and does client-side filtering for simplicity.

Business owners create and edit their lots via the business dashboard, with form validation for required fields and a map click interface for setting coordinates. Newly created lots have `isActive: false` and require admin approval before appearing in the public listing. This approval gate was included to prevent bad actors from creating fake lots and defrauding drivers.

### 6.3 Reservation and Payment Flow

The reservation flow was the most complex feature to implement, requiring coordination between the frontend booking modal, the Khalti payment redirect, the backend payment verification endpoint, and the Socket.io notification of availability changes.

**Step 1 — Booking initiation:** The driver selects a lot, sets arrival time and duration, and submits the booking form. The frontend calls `POST /api/v1/reservations` with these parameters. The backend validates that the lot has enough available spaces, calculates the total amount (price × duration in hours × quantity), atomically decrements `availableSpaces` on the ParkingSpot document (using MongoDB's `findOneAndUpdate` with `$inc` to prevent race conditions between simultaneous bookings), creates a Reservation document in `booking` lifecycle stage, then calls Khalti's initiation API. Khalti returns a `payment_url`; the backend returns this URL along with the reservation ID to the frontend.

**Step 2 — Khalti redirect:** The frontend redirects the browser to the Khalti payment URL. The driver authenticates with Khalti and approves the payment. Khalti redirects back to SmartPark's `PaymentSuccess` page with `pidx` and `purchase_order_id` query parameters.

**Step 3 — Verification:** The `PaymentSuccess` component calls `POST /api/v1/payment/verify-khalti` with the `pidx`. The backend calls Khalti's lookup API to confirm transaction status. If confirmed, the Reservation document's `paymentInfo.khaltiVerified` is set to `true`, the lifecycle stage advances to `booking`, and a QR token is generated and attached to the reservation. The driver is shown their QR code.

**Step 4 — QR delivery:** The QR code is delivered both on-screen (on the PaymentSuccess page and the ticket page) and via email. The email contains the QR image as an inline PNG attachment, ensuring the driver can present it offline at the lot.

**Cancellation:** Drivers can cancel reservations in `booking` or `arrival_window` stage. Cancellation releases the slot (incrementing `availableSpaces`), triggers a Socket.io `slotUpdate` event, and marks the reservation `cancelled`. A refund policy is applied based on how far in advance the cancellation is made; refund processing to the Khalti wallet is handled by the `FailedRefund` collection which queues refund requests for administrative processing where automatic refund is not possible.

### 6.4 QR Check-in and Check-out

QR scanning is performed by lot attendants or business owners using the `html5-qrcode` library, which accesses the device camera via the browser's `getUserMedia` API. The scanner runs continuously, decoding QR frames from the camera feed.

On successful decode, the scanned token string is sent to `POST /api/v1/reservations/qr-lookup` (for driver-side scanning by attendants) or `POST /api/v1/business/qr-lookup` (for business owner scanning via their dashboard). The backend calls `verifyQrPayload()` which validates the HMAC signature and checks token expiry, then looks up the reservation by ID and validates that its current status permits a check-in or check-out transition.

Check-in sets `lifecycleStage: 'active'`, records `checkInTime: Date.now()`, and emits a `reservationUpdate` Socket.io event to the driver. Check-out sets `lifecycleStage: 'completed'`, records `checkOutTime`, calculates actual duration, releases the parking space, and emits both a `reservationUpdate` and a `slotUpdate` event.

Error handling on the scan endpoint is designed to produce helpful messages rather than generic 400 errors. The `verifyQrPayload` function returns typed error codes distinguishing between `SIGNATURE_INVALID`, `TOKEN_EXPIRED`, and `PARSE_ERROR`, which the frontend maps to user-readable messages displayed in the scanner overlay.

### 6.5 Real-Time Updates

Socket.io rooms are used to manage event scoping. On connection, the server checks the JWT passed in the Socket.io handshake `auth` object, looks up the user, and joins them to a room named with their user ID (e.g., `user_64f3a2...`). Business owners are additionally joined to rooms for each of their lots (e.g., `lot_64f3b8...`).

When a reservation is created or cancelled, the `slotUpdate` event is emitted to `lot_<id>` room — all clients who have viewed that lot in their current session receive the update. The React map component maintains a `useEffect` hook that subscribes to `slotUpdate` and calls a state setter to update the marker for the affected lot, triggering a targeted re-render of only that marker.

The notification system uses the same Socket.io infrastructure. When the background cron job advances a reservation to `arrival_window` stage, it creates a Notification document and emits `notification` to the `user_<id>` room. The Navbar component's notification bell increments its unread count badge in response.

### 6.6 Dynamic Reallocation Engine

One of the more sophisticated backend features is the dynamic reallocation engine, invoked when a reservation is cancelled after a waitlist has formed for that lot. The engine performs the following steps:

1. Query `WaitlistEntry` for the cancelled lot, sorted by entry time ascending (first-in, first-served).
2. For each waitlist entry, check if the user still has an active session and whether their originally requested time window overlaps with the newly freed slot.
3. If eligible, send the waitlist user a notification informing them a space is now available, with a 15-minute window to complete a booking before the next waitlist candidate is tried.
4. If the user does not book within the window (or declines), the engine moves to the next waitlist entry.

The engine is triggered both by the cancellation endpoint and by the cron job processing `no_show` transitions. This means slots are not simply made silently available when someone cancels — there is an active attempt to match the freed slot to a driver who had expressed demand for it.

### 6.7 Business Owner Dashboard

Business owners access a dedicated dashboard at `/business` routes. After admin approval of their account, they can:

- **Create and edit lots** — set name, address, coordinates (using a map picker), total spaces, price, accepted vehicle types, and amenities.
- **View real-time occupancy** — a dashboard card shows live available/reserved/occupied counts for each lot, updated via Socket.io.
- **Manage reservations** — a table view of all reservations for their lots, filterable by status and date range. Individual reservations can be expanded to see driver details and perform manual check-in if the driver's phone camera is unavailable.
- **Revenue analytics** — charts showing daily revenue, booking volume, and average occupancy percentage over a rolling 30-day window. These are computed server-side via MongoDB aggregation pipelines on the `adminAnalyticsRoutes.js` endpoint.
- **Respond to reviews** — drivers can leave 1–5 star reviews on lots after completing a reservation. Business owners can post a single reply to each review from their dashboard.
- **Scanner interface** — a full-screen QR scanner for performing check-ins and check-outs at the physical lot.

### 6.8 Admin Panel

The platform administrator has access to a comprehensive oversight interface covering all entities on the platform:

- **User management** — list all users with role and status filters. Admins can suspend or reactivate accounts and manually change user roles (e.g., upgrading a `user` to `business_owner`).
- **Business owner approval** — a queue of newly registered business owner accounts awaiting verification. The admin can approve or reject with a reason, which triggers an email notification to the applicant.
- **Lot oversight** — view and edit all lots on the platform regardless of owner. Deactivate problematic lots. Manually adjust slot counts when physical changes are made.
- **Analytics** — platform-wide metrics including total bookings, total revenue, active users, and lot utilisation rates over configurable time periods.
- **Notification broadcast** — send a system-wide notification to all users or a specific subset.

---

## 7. Testing and Evaluation

### 7.1 Testing Strategy

Testing was performed across three levels: unit testing of individual functions and modules, integration testing of complete API endpoints, and user acceptance testing with a small group of target users.

Given the solo development context, formal test-driven development (TDD) was not strictly practised — tests were generally written concurrently with or shortly after the feature under test. This is consistent with pragmatic Agile approaches that balance test coverage against time constraints.

### 7.2 Unit Testing

Backend unit tests were written using Jest, selected for its native support in Node.js projects and its built-in mocking capabilities. Test files live alongside their source files, following the `*.test.js` naming convention.

Key backend test cases include:

- **qrSecurity module** — tests for `signQrPayload` and `verifyQrPayload` covering: valid signature acceptance, tampered payload rejection, expired token rejection, missing `reservationId` rejection, and correct nonce uniqueness.
- **Authentication middleware** — tests for `protect` middleware covering: valid token acceptance, missing token rejection (401), malformed token rejection (401), and expired token rejection (401).
- **Reservation lifecycle** — tests for status machine transitions, verifying that illegal transitions (e.g., moving a `completed` reservation to `cancelled`) are rejected.
- **Input validation** — tests for the `express-validator` rules on reservation creation, verifying that missing required fields or invalid data types return 400 errors with descriptive messages.

Frontend tests were written using React Testing Library. Test cases covered form validation behaviours, conditional rendering (e.g., that the "Cancel Booking" button does not appear for completed reservations), and API error state display.

The CI pipeline runs both backend and frontend test suites on every push, ensuring that regressions are caught before they can be merged to `main`.

### 7.3 Integration Testing

Integration testing was performed manually against the development environment, systematically exercising each API endpoint with valid inputs, boundary inputs, and invalid inputs. Postman collections were maintained for the core reservation and payment flows to allow repeatable testing after code changes.

The most significant integration challenge was the Khalti payment flow, which involves a redirect to an external payment page. This was tested using Khalti's sandbox environment, which accepts test credentials and simulates both successful and failed payment scenarios. The `PaymentSuccess` component had to handle three distinct states cleanly: successful payment verification, failed payment verification, and the edge case where the user navigates directly to the payment success URL without a valid `pidx` parameter.

End-to-end flow testing covered the complete driver journey from registration through QR check-out, the business owner journey from account creation through revenue viewing, and the admin journey from user approval through analytics. Issues discovered during this phase included:

- A race condition in the slot reservation logic where two simultaneous booking requests for the last available space could both succeed. Fixed by replacing the `findById` + `save` pattern with `findOneAndUpdate` with `$inc: { availableSpaces: -1 }` and a `$gt: 0` condition, ensuring atomicity at the MongoDB level.
- A QR verification failure when `QR_SIGNING_SECRET` was not set in the Azure environment — the backend fell back to `JWT_SECRET` for signing but the Azure app settings had them set to different values. Fixed by ensuring `QR_SIGNING_SECRET` is explicitly set to the same value as `JWT_SECRET` in the Azure App Service configuration.

### 7.4 User Acceptance Testing

User acceptance testing was conducted with five participants: three university students who drive regularly in Kathmandu, one parking lot operator, and one non-technical user representing the general public. Sessions were conducted in-person with participants using the deployed Azure application on their own mobile phones.

Participants were given a set of tasks to complete without assistance: create an account, find a parking lot on the map, make a booking, view the QR code, and (for the lot operator participant) perform a mock check-in using the scanner interface.

Key findings from UAT:

- All five participants successfully completed registration and login. Two needed to request the password reset flow, which worked correctly.
- Four of five participants successfully located a lot and initiated a booking. One participant initially missed the "Book Now" button on the map popup because it was below the fold on their small-screen phone — an interface issue that was addressed by increasing the popup minimum height.
- The Khalti payment redirect was the step causing the most confusion, with two participants uncertain whether they should return to SmartPark after approving the payment. Adding explicit "Return to SmartPark" instructional text to the Khalti redirect page reduced this confusion.
- All participants rated the QR scanning experience positively, describing it as fast and straightforward.
- The parking lot operator participant was able to use the business dashboard's scanner interface to perform a check-in on the first attempt without any instruction.

Post-session questionnaires rated the overall experience at 4.2 out of 5 on a usability scale. The most requested future feature was a mobile app for iOS and Android.

### 7.5 Performance

Informal performance testing was conducted using Chrome DevTools' Network panel against the Azure-deployed instance. Core page loads were measured on a standard broadband connection:

- Initial application load (HTML + JS bundle): 2.1 seconds on first visit (cold cache), 0.3 seconds on repeat visit (browser cache).
- Parking lot listing with map: 0.8 seconds from initial load to interactive map with markers.
- Reservation creation API call: 320ms average response time.
- QR verification API call: 180ms average response time.

These results are within the three-second performance target set in the non-functional requirements. The application bundle size (780 KB gzipped) is somewhat large due to the inclusion of MUI and Leaflet; a future optimisation would be to implement code splitting so that the admin panel code is not included in the initial bundle delivered to regular drivers.

---

## 8. Conclusion and Future Work

### 8.1 Achievement of Objectives

This project successfully achieved all seven stated objectives:

1. **Interactive map interface** — implemented using Leaflet with real-time availability markers, geolocation support, and popup booking initiation.
2. **Reservation lifecycle system** — a full state machine covering booking through completion, with automated transitions driven by `node-cron` and manual transitions via API actions.
3. **Khalti payment integration** — two-step initiation and server-side verification implemented and tested against the Khalti sandbox.
4. **Signed QR code system** — HMAC-SHA256 signed tokens with 10-minute scan windows, generation via `qrcode` package and scanning via `html5-qrcode`.
5. **Business owner and admin dashboards** — complete management interfaces with lot editing, analytics, and QR scanner.
6. **Real-time updates** — Socket.io implementation broadcasting slot changes and reservation updates to relevant connected clients.
7. **Cloud deployment** — successful deployment to Azure App Service with environment variable management and GitHub Actions CI/CD pipeline.

The working application represents a genuine step toward solving the parking management challenges described in the introduction. It is not merely an academic exercise — every feature was designed in response to real observations of parking operations in Kathmandu, and the user acceptance testing confirmed that real users can navigate and use the system with minimal friction.

### 8.2 Limitations

Several limitations should be acknowledged. First, the system relies on manual QR check-in rather than automated sensor-based detection. This means that the accuracy of availability data depends on attendants consistently scanning QR codes; if an attendant admits a vehicle without scanning, the system's count will diverge from reality. A hybrid approach using entry sensors to cross-check QR scans would address this but requires hardware investment beyond the scope of this project.

Second, the application is web-only. While it is responsive and functions on mobile browsers, the camera-based QR scanner performs less reliably in some mobile browsers compared to a native app with direct camera API access. Feedback from UAT indicated that some Android browsers (particularly Chrome on older Samsung devices) had difficulty initialising the camera through the `getUserMedia` API.

Third, the application has not been load-tested at realistic production scale. The MongoDB Atlas free tier cluster and Azure App Service B1 instance used for development are not dimensioned for hundreds of concurrent users. Before public launch, the database connection pool size, rate limit thresholds, and server instance size would all need to be reviewed and adjusted.

Fourth, some security hardening remains deferred. The Content Security Policy header is currently set permissively to avoid blocking Leaflet's tile loading and Socket.io's dynamic script injection. A production deployment should define a strict CSP with appropriate `connect-src`, `img-src`, and `script-src` directives.

### 8.3 Reflections on Development

The development process produced several insights worth recording. The decision to use a single Express server to serve both the API and the compiled React bundle — rather than separating them into a frontend server and an API server — significantly simplified the deployment architecture, reducing the Azure resource requirements from two App Service plans to one. The trade-off is that the frontend and backend must be deployed together; a future architecture might separate them to enable independent scaling.

The `node-cron` background job approach for reservation lifecycle transitions proved to be simpler and more reliable than the alternative of setting MongoDB TTL indexes, because the lifecycle transitions involve multiple related operations (releasing slots, sending notifications, updating multiple documents) that cannot be performed by a TTL-triggered deletion alone.

The most time-consuming debugging experience of the project was the `ajv` version conflict. The root cause — two major versions of the same transitive dependency being required by different parts of the dependency tree — is a known pain point in large JavaScript ecosystems, and the solution required understanding npm's `overrides` mechanism which is not widely documented. This experience reinforced the importance of testing the build pipeline early in the project rather than deferring it.

### 8.4 Future Work

Several directions for future development were identified during the project:

**Native mobile application:** A React Native application would provide a better experience for drivers on iOS and Android, with more reliable camera access for QR scanning, push notification support, and the ability to be distributed through app stores.

**Licence plate recognition:** Integrating an optical character recognition model (for example, via a cloud API such as AWS Rekognition or a locally deployed model) at entry and exit points would allow automated check-in without requiring the driver to display a QR code. This would be particularly valuable for high-turnover lots.

**Dynamic pricing:** As demand data accumulates, lot operators could benefit from demand-responsive pricing — automatically raising prices during peak periods and lowering them during off-peak periods to optimise lot utilisation and revenue.

**Integration with public transit data:** A feature showing nearby bus stops, routes, and schedules alongside parking lots could help drivers make park-and-ride decisions, supporting broader urban mobility goals.

**Offline support:** A Progressive Web App (PWA) implementation with service workers could allow drivers to access their existing booking information and QR codes without an internet connection, addressing the scenario where a driver enters an underground car park with poor signal coverage.

**City-level analytics API:** An anonymised, aggregated API exposing city-wide occupancy patterns could be made available to urban planners and researchers, contributing to evidence-based parking and transport policy decisions for the Kathmandu Valley.

SmartPark demonstrates that the technical building blocks for a modern, digital parking management system are accessible within the constraints of an academic project. The barriers to adoption are now less about technology and more about operator onboarding, change management, and establishing the network effects that make a parking aggregator valuable. A platform with five lots is marginally useful; a platform with five hundred lots becomes indispensable. The technical foundation built in this project is designed to scale to that vision.

---

## References

Alaca, F. and van Oorschot, P.C. (2018) 'Comparative analysis and framework evaluating web single sign-on systems', *IEEE Transactions on Dependable and Secure Computing*, 16(6), pp. 1056–1072.

Fette, I. and Melnikov, A. (2011) *The WebSocket Protocol*. Internet Engineering Task Force RFC 6455. Available at: https://datatracker.ietf.org/doc/html/rfc6455 (Accessed: March 2026).

Geng, Y. and Cassandras, C.G. (2012) 'New "smart parking" system based on resource allocation and reservations', *IEEE Transactions on Intelligent Transportation Systems*, 14(3), pp. 1129–1139.

Idris, M.Y.I., Leng, Y.Y., Tamil, E.M., Noor, N.M. and Razak, Z. (2009) 'Car park system: A brief review', *Journal of Information Technology Review*, 1(2), pp. 100–110.

Kianpisheh, A., Mustaffa, N., Limtrairut, P. and Keikhosrokiani, P. (2012) 'Smart parking system (SPS) architecture using ultrasonic detector', *International Journal of Software Engineering and Its Applications*, 6(3), pp. 55–58.

Khalti Technologies (2024) *Khalti Payment Gateway Developer Documentation*. Available at: https://docs.khalti.com/ (Accessed: January 2026).

MongoDB (2024) *MongoDB Atlas Documentation*. Available at: https://www.mongodb.com/docs/atlas/ (Accessed: November 2025).

Moreira, J., Figueiredo, L., Ribeiro, J. and Machado, J. (2019) 'Parking guidance information system based on real-time IoT data', *Transportation Research Procedia*, 41, pp. 811–823.

Saltzer, J.H. and Schroeder, M.D. (1975) 'The protection of information in computer systems', *Proceedings of the IEEE*, 63(9), pp. 1278–1308.

Shoup, D.C. (2011) *The High Cost of Free Parking*. Updated edition. Chicago: Planners Press.

Socket.io (2024) *Socket.IO Documentation*. Available at: https://socket.io/docs/v4/ (Accessed: December 2025).

OpenStreetMap Contributors (2025) *OpenStreetMap*. Available at: https://www.openstreetmap.org (Accessed: throughout development).

React Team (2024) *React 19 Documentation*. Available at: https://react.dev (Accessed: November 2025).

MUI (2024) *Material UI v7 Documentation*. Available at: https://mui.com/material-ui/ (Accessed: November 2025).

Department of Transport Management Nepal (2023) *Vehicle Registration Statistics 2022/23*. Kathmandu: Government of Nepal.

---

*Word count: approximately 11,400 words*

*Report prepared for Herald College Kathmandu, Module 6CS007 — Project and Professionalism*  
*Student ID: 2408616*
