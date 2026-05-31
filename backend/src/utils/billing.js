// Handles checkout billing — overstay charges and penalty calculation
// Used by both user checkout and admin checkout to keep billing consistent

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
  // Even 1 minute past grace counts as a full extra hour
  const overstayHours = overstayMinutes > 0 ? Math.ceil(overstayMinutes / 60) : 0;
  const overstayCharge = overstayHours > 0
    ? Math.round(overstayHours * (hourlyRate || 0) * OVERTIME_MULTIPLIER)
    : 0;

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
