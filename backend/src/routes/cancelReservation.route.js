/**
 * POST /api/reservations/cancel/:id
 *
 * Cancels a reservation and initiates Khalti refund if applicable.
 * Policy:
 *   - Within 15 min of booking → 100% refund
 *   - 15–30 min of booking     → 50% refund
 *   - After 30 min             → blocked (no cancel, no refund)
 *   - Cash / Pay on Spot       → just cancel, no refund needed
 */

const express = require('express');
const router = express.Router();
const Reservation = require('../models/Reservation');
const { protect } = require('../middleware/auth');
const axios = require('axios');
const { releaseReservedSpotAndPromote } = require('../services/reservationLifecycleService');


const CANCELLATION_WINDOW_MS = 30 * 60 * 1000;  // 30 minutes
const FULL_REFUND_WINDOW_MS  = 15 * 60 * 1000;  // 15 minutes

const getRefundPercent = (createdAt) => {
  const elapsed = Date.now() - new Date(createdAt).getTime();
  if (elapsed <= FULL_REFUND_WINDOW_MS)  return 100;
  if (elapsed <= CANCELLATION_WINDOW_MS) return 50;
  return 0;
};

router.post('/cancel/:id', protect, async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);

    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Reservation not found.' });
    }

    // Ownership check
    if (reservation.user.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized.' });
    }

    if (reservation.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Reservation is already cancelled.' });
    }

    if (reservation.status === 'completed') {
      return res.status(400).json({ success: false, message: 'Completed reservations cannot be cancelled.' });
    }

    const isCash = reservation.paymentMethod === 'cash';
    const refundPercent = isCash ? 0 : getRefundPercent(reservation.createdAt);

    // Block cancellation after window (Khalti only)
    if (!isCash && refundPercent === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cancellation window (30 minutes) has passed. Cancellation is no longer allowed.',
      });
    }

    const refundAmount = Math.round((reservation.totalAmount * refundPercent) / 100);

    // Initiate Khalti refund if applicable
    let refundTransactionId = null;
    if (!isCash && refundAmount > 0 && reservation.khaltiTransactionId) {
      try {
        const khaltiRes = await axios.post(
          'https://khalti.com/api/v2/payment/refund/',
          {
            transaction_id: reservation.khaltiTransactionId,
            amount: refundAmount * 100, // Khalti uses paisa (1 NPR = 100 paisa)
          },
          {
            headers: {
              Authorization: `Key ${process.env.KHALTI_SECRET_KEY}`,
            },
          }
        );
        refundTransactionId = khaltiRes.data?.idx || null;
      } catch (khaltiError) {
        console.error('Khalti refund error:', khaltiError?.response?.data || khaltiError.message);
        // Do not block cancellation if refund API fails — flag for manual review
        // You can push to a RefundQueue collection here for admin to process manually
      }
    }

    // Update reservation
    reservation.status = 'cancelled';
    reservation.lifecycleStage = 'cancelled';
    reservation.cancelledAt = new Date();
    reservation.refundPercent = refundPercent;
    reservation.refundAmount = refundAmount;
    reservation.refundTransactionId = refundTransactionId;
    await reservation.save();

    // Free up the parking spot and promote next waitlist entry
    await reservation.populate('parkingSpot');
    if (reservation.parkingSpot) {
      await releaseReservedSpotAndPromote({ reservation, releaseReason: 'user_cancelled' });
    }

    return res.json({
      success: true,
      message: isCash
        ? 'Reservation cancelled successfully.'
        : refundAmount > 0
        ? `Reservation cancelled. NPR ${refundAmount} will be refunded to your Khalti wallet within 3–5 business days.`
        : 'Reservation cancelled. No refund applicable.',
      data: {
        reservationId: reservation._id,
        refundPercent,
        refundAmount,
        refundTransactionId,
        isCash,
      },
    });
  } catch (error) {
    console.error('Cancel reservation error:', error);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
});

module.exports = router;