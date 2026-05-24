const { calculateCheckoutBilling } = require('../src/utils/billing');

describe('calculateCheckoutBilling', () => {
  const baseReservation = (overrides = {}) => ({
    duration: 60,
    amountInfo: { totalAmount: 100 },
    checkInTime: new Date('2026-05-24T10:00:00Z'),
    ...overrides,
  });
  const spot = { price: 50 };

  test('charges only the base amount when user leaves within the grace period', () => {
    // 75 minutes total = booked 60 + 15 grace, no overstay
    const out = new Date('2026-05-24T11:14:59Z');
    const b = calculateCheckoutBilling({
      reservation: baseReservation(),
      spot,
      user: {},
      checkOutTime: out,
    });
    expect(b.overstayCharge).toBe(0);
    expect(b.penaltyCharge).toBe(0);
    expect(b.finalAmount).toBe(100);
  });

  test('charges 1 hour of overtime at 1.5x when overstay is between 1 and 60 min past grace', () => {
    const out = new Date('2026-05-24T11:30:00Z'); // 90 min → 15 over grace
    const b = calculateCheckoutBilling({
      reservation: baseReservation(),
      spot,
      user: {},
      checkOutTime: out,
    });
    expect(b.overstayCharge).toBe(75); // 1 * 50 * 1.5
    expect(b.finalAmount).toBe(175);
  });

  test('rounds overstay up to the next started hour', () => {
    // booked 60 + grace 15 + 61 min overstay = needs 2 hours billed
    const out = new Date('2026-05-24T12:16:00Z'); // 136 min → 61 over grace
    const b = calculateCheckoutBilling({
      reservation: baseReservation(),
      spot,
      user: {},
      checkOutTime: out,
    });
    expect(b.overstayHours).toBe(2);
    expect(b.overstayCharge).toBe(150); // 2 * 50 * 1.5
  });

  test('applies a 20% penalty when violationCount >= 3', () => {
    const out = new Date('2026-05-24T11:30:00Z');
    const b = calculateCheckoutBilling({
      reservation: baseReservation(),
      spot,
      user: { violationCount: 3 },
      checkOutTime: out,
    });
    expect(b.penaltyCharge).toBe(35); // 175 * 0.2
    expect(b.finalAmount).toBe(210);
  });

  test('applies penalty when penaltyActive flag is set', () => {
    const out = new Date('2026-05-24T11:30:00Z');
    const b = calculateCheckoutBilling({
      reservation: baseReservation(),
      spot,
      user: { penaltyActive: true },
      checkOutTime: out,
    });
    expect(b.penaltyCharge).toBe(35);
  });

  test('rejects when checkInTime is missing', () => {
    expect(() =>
      calculateCheckoutBilling({
        reservation: baseReservation({ checkInTime: null }),
        spot,
        user: {},
        checkOutTime: new Date(),
      })
    ).toThrow(/missing/i);
  });

  test('rejects when checkOutTime precedes checkInTime', () => {
    expect(() =>
      calculateCheckoutBilling({
        reservation: baseReservation({ checkInTime: new Date('2026-05-24T12:00:00Z') }),
        spot,
        user: {},
        checkOutTime: new Date('2026-05-24T10:00:00Z'),
      })
    ).toThrow(/invalid/i);
  });

  test('rejects when an overstay occurs but the spot has no price', () => {
    expect(() =>
      calculateCheckoutBilling({
        reservation: baseReservation(),
        spot: { price: 0 },
        user: {},
        checkOutTime: new Date('2026-05-24T13:00:00Z'),
      })
    ).toThrow(/price/i);
  });
});
