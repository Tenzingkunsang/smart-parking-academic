const { signQrPayload, verifyQrPayload } = require('../src/utils/qrSecurity');

describe('qrSecurity', () => {
  const RESERVATION_ID = '507f191e810c19729de860ea';

  beforeAll(() => {
    process.env.QR_SIGNING_SECRET = 'unit-test-secret-do-not-use-in-prod';
  });

  test('signs and verifies a payload round-trip', () => {
    const token = signQrPayload({ reservationId: RESERVATION_ID, spotNumber: 7, location: 'Demo' });
    const decoded = verifyQrPayload(token);
    expect(decoded.reservationId).toBe(RESERVATION_ID);
    expect(decoded.spotNumber).toBe(7);
    expect(decoded.legacy).toBe(false);
    expect(decoded.nonce).toMatch(/^[a-f0-9]{16}$/);
  });

  test('rejects a payload with a tampered body', () => {
    const token = signQrPayload({ reservationId: RESERVATION_ID });
    const [, sig] = token.split('.');
    const tampered = `${Buffer.from(JSON.stringify({ reservationId: 'evil', exp: Date.now() + 60000 })).toString('base64').replace(/=+$/, '')}.${sig}`;
    expect(() => verifyQrPayload(tampered)).toThrow(/signature/i);
  });

  test('rejects a payload past its expiry', () => {
    const token = signQrPayload({ reservationId: RESERVATION_ID, ttlMs: -1 });
    expect(() => verifyQrPayload(token)).toThrow(/expired/i);
  });

  test('rejects legacy JSON unless explicitly allowed', () => {
    const legacy = JSON.stringify({ reservationId: RESERVATION_ID });
    expect(() => verifyQrPayload(legacy)).toThrow(/not signed/i);
    const decoded = verifyQrPayload(legacy, { allowLegacy: true });
    expect(decoded.reservationId).toBe(RESERVATION_ID);
    expect(decoded.legacy).toBe(true);
  });

  test('rejects empty / non-string input', () => {
    expect(() => verifyQrPayload('')).toThrow(/invalid/i);
    expect(() => verifyQrPayload(null)).toThrow(/invalid/i);
  });

  test('Task-1: rejects a signed QR older than maxAgeMs (5-min freshness)', () => {
    // sign now, then verify with a 1ms freshness window — must fail.
    const token = signQrPayload({ reservationId: RESERVATION_ID });
    // Wait long enough for iat to be in the past
    return new Promise((resolve) => {
      setTimeout(() => {
        expect(() => verifyQrPayload(token, { maxAgeMs: 1 })).toThrow(/stale/i);
        // But the same token is still acceptable when no freshness limit is set.
        expect(() => verifyQrPayload(token)).not.toThrow();
        resolve();
      }, 5);
    });
  });
});
