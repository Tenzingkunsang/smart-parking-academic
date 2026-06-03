// QR code security — signs and verifies QR tokens using HMAC-SHA256
// Format: base64url(payload) + '.' + base64url(signature)

const crypto = require('crypto');

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours — ticket stays valid all day
const SCAN_TTL_MS = 10 * 60 * 1000;         // 10 minutes — scanner freshness window
const MAX_SCAN_AGE_MS = 10 * 60 * 1000;     // reject QRs older than 10 minutes

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

// Creates a signed QR token for a reservation
function signQrPayload({ reservationId, spotNumber, location, ttlMs = DEFAULT_TTL_MS }) {
  if (!reservationId) throw new Error('reservationId is required');
  const now = Date.now();
  const body = {
    v: 1,
    reservationId: String(reservationId),
    ...(spotNumber !== undefined && { spotNumber }),
    ...(location !== undefined && { location }),
    iat: now,
    exp: now + ttlMs,
    nonce: crypto.randomBytes(8).toString('hex'),
  };
  const bodyEncoded = b64url(JSON.stringify(body));
  const sig = crypto.createHmac('sha256', getSecret()).update(bodyEncoded).digest();
  return `${bodyEncoded}.${b64url(sig)}`;
}

// Verifies a scanned QR token — checks signature, expiry, and format
function verifyQrPayload(raw, { allowLegacy = false, maxAgeMs = null } = {}) {
  if (!raw || typeof raw !== 'string') {
    const err = new Error('Invalid QR payload');
    err.statusCode = 400;
    throw err;
  }

  // Handle signed token (format: body.signature)
  if (raw.includes('.') && !raw.trim().startsWith('{')) {
    // Must have exactly 2 parts — reject anything with extra segments
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
    // Reject QR if it's older than the allowed scan window (prevents screenshot reuse)
    if (maxAgeMs && body.iat && Date.now() - body.iat > maxAgeMs) {
      const err = new Error(`QR code is stale (older than ${Math.round(maxAgeMs / 60000)} min). Please refresh your ticket and rescan.`);
      err.statusCode = 400;
      throw err;
    }
    return { ...body, legacy: false };
  }

  // Handle old-style QR (plain JSON or bare ID) — only if allowed
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
    // Try treating it as a bare MongoDB ID
    if (/^[a-f\d]{24}$/i.test(raw.trim())) {
      return { reservationId: raw.trim(), legacy: true };
    }
    const err = new Error('QR payload not recognized');
    err.statusCode = 400;
    throw err;
  }
}

module.exports = { signQrPayload, verifyQrPayload, SCAN_TTL_MS, MAX_SCAN_AGE_MS };
