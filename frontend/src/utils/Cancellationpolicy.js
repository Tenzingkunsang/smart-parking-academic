/**
 * SmartPark Cancellation & Refund Policy
 *
 * - Within 15 min of booking  → 100% refund
 * - 15 to 30 min of booking   → 50% refund
 * - After 30 min              → No refund, cancellation blocked
 * - Cash / Pay on Spot        → No refund needed, just cancel
 */

export const CANCELLATION_WINDOW_MINUTES = 30;
export const FULL_REFUND_WINDOW_MINUTES = 15;

/**
 * @param {string|Date} bookedAt - ISO date string or Date of when booking was made
 * @returns {{ canCancel: boolean, refundPercent: number, minutesElapsed: number, label: string }}
 */
export const getCancellationStatus = (bookedAt) => {
  const now = new Date();
  const booked = new Date(bookedAt);
  const minutesElapsed = (now - booked) / 1000 / 60;

  if (minutesElapsed <= FULL_REFUND_WINDOW_MINUTES) {
    return {
      canCancel: true,
      refundPercent: 100,
      minutesElapsed,
      label: 'Full Refund',
      description: 'You will receive a 100% refund to your Khalti wallet.',
      minutesLeft: Math.floor(FULL_REFUND_WINDOW_MINUTES - minutesElapsed),
      urgency: 'full',
    };
  }

  if (minutesElapsed <= CANCELLATION_WINDOW_MINUTES) {
    return {
      canCancel: true,
      refundPercent: 50,
      minutesElapsed,
      label: '50% Refund',
      description: 'You will receive a 50% refund to your Khalti wallet.',
      minutesLeft: Math.floor(CANCELLATION_WINDOW_MINUTES - minutesElapsed),
      urgency: 'partial',
    };
  }

  return {
    canCancel: false,
    refundPercent: 0,
    minutesElapsed,
    label: 'No Refund',
    description: 'Cancellation window (30 minutes) has passed. No refund is available.',
    minutesLeft: 0,
    urgency: 'none',
  };
};

/**
 * @param {number} totalAmount
 * @param {number} refundPercent
 * @returns {number}
 */
export const calculateRefundAmount = (totalAmount, refundPercent) => {
  return Math.round((totalAmount * refundPercent) / 100);
};