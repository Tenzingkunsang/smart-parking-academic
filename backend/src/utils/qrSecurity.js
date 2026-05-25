/**
 * qrSecurity.js — signed QR payloads for the reservation lifecycle.
 *
 * Defends against the replay/fraud scenarios:
 *   - A user crafts arbitrary JSON and tries to check in without a real booking.
 *     → Server-issued HMAC over the payload makes forgery infeasible without the
 *       QR_SIGNING_SECRET.
 *   - A QR is screenshotted at booking and reused months later.
 *     → Each payload carries an `iat` (issued-at) and `exp` (expiry). The verify
 *       step rejects expired signatures.
 *   - The same signed QR is scanned twice to check in twice.
 *     → The reservation status machine already enforces this (a reservation in
 *       'checked-in' or 'completed' state cannot be checked in again). We also
 *       carry a `nonce` so audit logs can detect duplicates.
 *
 * Layout: payload = base64url(json) + '.' + base64url(hmacSha256(payload, secret))
 */

const crypto = require('crypto');

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;   // 24h — the ticket the user keeps
// 10 min TTL: gives enough buffer for mobile background JS throttling (iOS throttles
// timers to ~15 min when backgrounded) while still defeating screenshot replay.
// TicketPage refreshes every 4 min, so tokens are never older than 4 min in practice.
const SCAN_TTL_MS = 10 * 60 * 1000;           // 10min — the freshness window for live scans
const MAX_SCAN_AGE_MS = 10 * 60 * 1000;       // reject signed QRs older than this at scan time

function getSecret() {
  const secret = process.env.QR_SIGNING_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('QR_SIGNING_SECRET (or JWT_SECRET) must be set to issue signed QR payloads.');
  }
  return secret;
}

const b64url = (buf) =>
  Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const b64urlDecode = (str) => {
  const pad = 4 - (str.length % 4 || 4);
  const base64 = (str.replace(/-/g, '+').replace(/_/g, '/')) + (pad < 4 ? '='.repeat(pad) : '');
  return Buffer.from(base64, 'base64');
};

/**
 * Build a signed QR payload for a reservation.
 *
 * @param {{ reservationId: string, spotNumber?: number|string, location?: string, ttlMs?: number }} args
 * @returns {string} signed token (`<body>.<sig>`)
 */
function signQrPayload({ reservationId, spotNumber, location, ttlMs = DEFAULT_TTL_MS }) {
  if (!reservationId) throw new Error('reservationId is required');
  const now = Date.now();
  const body = {
    v: 1,
    reservationId: String(reservationId),
    bookingId: String(reservationId), // legacy alias
    spotNumber: spotNumber ?? null,
    location: location ?? null,
    iat: now,
    exp: now + ttlMs,
    nonce: crypto.randomBytes(8).toString('hex'),
  };
  const bodyEncoded = b64url(JSON.stringify(body));
  const sig = crypto.createHmac('sha256', getSecret()).update(bodyEncoded).digest();
  return `${bodyEncoded}.${b64url(sig)}`;
}

/**
 * Verify a signed QR payload. Throws Error(statusCode, message) on failure.
 *
 * Accepts three input shapes for backward compatibility with QRs already in the wild:
 *   1. The new signed token: '<body>.<sig>'
 *   2. Legacy raw JSON: '{"reservationId":"..."}'  (caller decides whether to allow)
 *   3. Bare reservationId string
 *
 * @param {string} raw  the scanned text
 * @param {{ allowLegacy?: boolean, maxAgeMs?: number }} opts
 *        - maxAgeMs: if set, also rejects signed payloads whose iat is older than this
 *          window (defense against screenshot replay). Use SCAN_TTL_MS at the
 *          scanner endpoint.
 * @returns {{ reservationId: string, spotNumber: any, location: any, iat?: number, exp?: number, nonce?: string, legacy: boolean }}
 */
function verifyQrPayload(raw, { allowLegacy = false, maxAgeMs = null } = {}) {
  if (!raw || typeof raw !== 'string') {
    const err = new Error('Invalid QR payload');
    err.statusCode = 400;
    throw err;
  }

  // Signed token path.
  if (raw.includes('.') && !raw.trim().startsWith('{')) {
    // BUG-QR1: raw.split('.') returns all segments. A crafted payload like
    // '<validBody>.<validSig>.<junk>' would destructure correctly and pass sig
    // verification since sigEncoded still gets the real sig value. Enforce
    // exactly two segments so any trailing garbage is rejected immediately.
    const parts = raw.split('.');
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      const err = new Error('Malformed signed QR');
      err.statusCode = 400;
      throw err;
    }
    const [bodyEncoded, sigEncoded] = parts;
    const expectedSig = crypto.createHmac('sha256', getSecret()).update(bodyEncoded).digest();
    const providedSig = b64urlDecode(sigEncoded);
    if (
      providedSig.length !== expectedSig.length ||
      !crypto.timingSafeEqual(providedSig, expectedSig)
    ) {
      const err = new Error('QR signature mismatch');
      err.statusCode = 400;
      throw err;
    }
    let body;
    try {
      body = JSON.parse(b64urlDecode(bodyEncoded).toString('utf8'));
    } catch {
      const err = new Error('QR body could not be parsed');
      err.statusCode = 400;
      throw err;
    }
    if (!body.reservationId) {
      const err = new Error('QR is missing reservationId');
      err.statusCode = 400;
      throw err;
    }
    if (body.exp && Date.now() > body.exp) {
      const err = new Error('This QR code has expired. Ask the user to refresh their ticket.');
      err.statusCode = 400;
      throw err;
    }
    // Bug Task-1: scan-time freshness check. The 24h-lived "ticket" QR is fine
    // for the user's wallet, but the admin scanner should reject anything older
    // than maxAgeMs (typically 5 minutes) to defeat screenshot replay.
    if (maxAgeMs && body.iat && Date.now() - body.iat > maxAgeMs) {
      const err = new Error(`QR code is stale (older than ${Math.round(maxAgeMs / 60000)} min). Please refresh your ticket and rescan.`);
      err.statusCode = 400;
      throw err;
    }
    return { ...body, legacy: false };
  }

  // Legacy JSON / bare id path — only if the caller opts in.
  if (!allowLegacy) {
    const err = new Error('QR code is not signed. Please regenerate from your bookings.');
    err.statusCode = 400;
    throw err;
  }

  try {
    const parsed = JSON.parse(raw);
    const reservationId = parsed.reservationId || parsed.bookingId;
    if (!reservationId) throw new Error('No reservationId');
    return { reservationId: String(reservationId), legacy: true };
  } catch {
    // Bare id fallback
    if (/^[a-f\d]{24}$/i.test(raw.trim())) {
      return { reservationId: raw.trim(), legacy: true };
    }
    const err = new Error('QR payload not recognized');
    err.statusCode = 400;
    throw err;
  }
}

module.exports = { signQrPayload, verifyQrPayload, SCAN_TTL_MS, MAX_SCAN_AGE_MS };
