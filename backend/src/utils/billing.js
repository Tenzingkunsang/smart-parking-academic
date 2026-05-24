/**
 * billing.js — single source of truth for reservation checkout billing.
 *
 * Bug H2: previously user-checkout and admin-checkout used different formulas
 * and produced different finalAmounts for identical data. Extracted here so
 * both controllers (and tests) reference the exact same logic.
 *
 * Rules:
 *   - Booked time is paid up-front via reservation.amountInfo.totalAmount.
 *   - First GRACE_MINUTES past the booked window are free.
 *   - Each started hour past grace is billed at hourlyRate * OVERTIME_MULTIPLIER.
 *   - If the user has 3+ active violations, a PENALTY_RATE surcharge is added.
 */

const GRACE_MINUTES = 15;
const OVERTIME_MULTIPLIER = 1.5;
const PENALTY_RATE = 0.20;

function calculateCheckoutBilling({ reservation, spot, user, checkOutTime }) {
  if (!reservation.checkInTime) {
    throw Object.assign(new Error('Check-in time is missing on this reservation.'), { statusCode: 400 });
  }
  const checkInTime = new Date(reservation.checkInTime);
  if (Number.isNaN(checkInTime.getTime()) || checkInTime >= checkOutTime) {
    throw Object.assign(new Error('Check-in time is invalid.'), { statusCode: 400 });
  }

  const actualMinutes = Math.ceil((checkOutTime - checkInTime) / 60000);
  const bookedMinutes = reservation.duration;
  const overstayMinutes = Math.max(0, actualMinutes - bookedMinutes - GRACE_MINUTES);

  const hourlyRate = spot?.price;
  if (overstayMinutes > 0 && (!hourlyRate || !isFinite(hourlyRate))) {
    throw Object.assign(new Error('Cannot calculate overstay charge — spot price unavailable.'), { statusCode: 500 });
  }

  const baseTotal = reservation.amountInfo?.totalAmount || 0;
  const overstayHours = overstayMinutes > 0 ? Math.ceil(overstayMinutes / 60) : 0;
  const overstayCharge = Math.round(overstayHours * (hourlyRate || 0) * OVERTIME_MULTIPLIER);

  const subtotal = baseTotal + overstayCharge;
  const hasActivePenalty = !!(user && (user.penaltyActive || (user.violationCount || 0) >= 3));
  const penaltyCharge = hasActivePenalty ? Math.round(subtotal * PENALTY_RATE) : 0;
  const finalAmount = subtotal + penaltyCharge;

  return {
    actualMinutes,
    overstayMinutes,
    overstayHours,
    overstayCharge,
    penaltyCharge,
    baseTotal,
    finalAmount,
    hasActivePenalty,
  };
}

module.exports = {
  calculateCheckoutBilling,
  GRACE_MINUTES,
  OVERTIME_MULTIPLIER,
  PENALTY_RATE,
};
