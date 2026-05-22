import React, { useState, useEffect } from 'react';
import { getCancellationStatus, calculateRefundAmount } from '../../utils/cancellationPolicy';
import { API_BASE } from '../../config/api';
import toast from 'react-hot-toast';

/**
 * CancelBookingModal
 *
 * Props:
 *   booking      – { _id, createdAt, paymentMethod, totalAmount }
 *   onClose      – fn() called when modal is dismissed
 *   onCancelled  – fn(bookingId) called after successful cancellation
 */
const CancelBookingModal = ({ booking, onClose, onCancelled }) => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  // Recompute every 30 seconds so the timer stays accurate
  useEffect(() => {
    const compute = () => setStatus(getCancellationStatus(booking.createdAt));
    compute();
    const interval = setInterval(compute, 30_000);
    return () => clearInterval(interval);
  }, [booking.createdAt]);

  if (!status) return null;

  const isCash = booking.paymentMethod === 'cash';
  const refundAmount = isCash
    ? 0
    : calculateRefundAmount(booking.totalAmount, status.refundPercent);

  const handleCancel = async () => {
    if (!confirmed) {
      setConfirmed(true);
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/reservations/cancel/${booking._id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          refundPercent: isCash ? 0 : status.refundPercent,
          refundAmount,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        toast.error(data.message || 'Cancellation failed. Please try again.');
        setConfirmed(false);
        return;
      }

      toast.success(
        isCash
          ? 'Reservation cancelled.'
          : refundAmount > 0
          ? `Cancelled! NPR ${refundAmount} will be refunded to your Khalti wallet within 3–5 business days.`
          : 'Reservation cancelled. No refund applicable.'
      );
      onCancelled(booking._id);
    } catch (err) {
      console.error('Cancellation error:', err);
      toast.error('Something went wrong. Please try again.');
      setConfirmed(false);
    } finally {
      setLoading(false);
    }
  };

  const urgencyColors = {
    full: { bg: '#f0fdf4', border: '#86efac', text: '#166534', badge: '#dcfce7', badgeText: '#15803d' },
    partial: { bg: '#fffbeb', border: '#fcd34d', text: '#92400e', badge: '#fef3c7', badgeText: '#b45309' },
    none: { bg: '#fef2f2', border: '#fca5a5', text: '#991b1b', badge: '#fee2e2', badgeText: '#b91c1c' },
  };
  const colors = urgencyColors[status.urgency];

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Cancel booking">
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <h2>Cancel Reservation</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Refund Status Banner */}
        <div
          className="refund-banner"
          style={{ background: colors.bg, border: `1px solid ${colors.border}` }}
        >
          <div className="refund-badge" style={{ background: colors.badge }}>
            <span style={{ color: colors.badgeText, fontWeight: 600, fontSize: 13 }}>
              {isCash ? 'No Payment Made' : status.label}
            </span>
          </div>

          {!isCash && status.canCancel && (
            <p style={{ color: colors.text, marginTop: 8, fontSize: 14 }}>
              {status.description}
              {status.minutesLeft > 0 && (
                <strong> You have {status.minutesLeft} minute(s) left in your cancellation window.</strong>
              )}
            </p>
          )}

          {!isCash && !status.canCancel && (
            <p style={{ color: colors.text, marginTop: 8, fontSize: 14 }}>
              {status.description}
            </p>
          )}

          {isCash && (
            <p style={{ color: '#374151', marginTop: 8, fontSize: 14 }}>
              This booking was Pay on Spot. No payment was made online — your reservation will simply be cancelled.
            </p>
          )}
        </div>

        {/* Refund Breakdown (Khalti only) */}
        {!isCash && status.canCancel && (
          <div className="refund-breakdown">
            <div className="breakdown-row">
              <span>Amount Paid</span>
              <span>NPR {booking.totalAmount}</span>
            </div>
            <div className="breakdown-row">
              <span>Refund ({status.refundPercent}%)</span>
              <span className="refund-amount">NPR {refundAmount}</span>
            </div>
            {status.refundPercent < 100 && (
              <div className="breakdown-row deducted">
                <span>Amount Forfeited ({100 - status.refundPercent}%)</span>
                <span>NPR {booking.totalAmount - refundAmount}</span>
              </div>
            )}
            <p className="refund-note">
              Refunds are processed to your Khalti wallet within 3–5 business days.
            </p>
          </div>
        )}

        {/* Cannot Cancel State */}
        {!isCash && !status.canCancel && (
          <div className="no-cancel-notice">
            <p>
              The 30-minute cancellation window has passed. Cancellations are no longer
              accepted for this booking.
            </p>
            <p>For disputes, please contact support.</p>
          </div>
        )}

        {/* Confirmation prompt */}
        {confirmed && (status.canCancel || isCash) && (
          <div className="confirm-prompt">
            ⚠️ Are you sure? This action <strong>cannot be undone</strong>.
          </div>
        )}

        {/* Actions */}
        <div className="modal-actions">
          <button className="btn-keep" onClick={onClose} disabled={loading}>
            Keep Reservation
          </button>

          {(status.canCancel || isCash) && (
            <button
              className={`btn-cancel-confirm ${confirmed ? 'danger' : ''}`}
              onClick={handleCancel}
              disabled={loading}
            >
              {loading
                ? 'Cancelling...'
                : confirmed
                ? 'Yes, Cancel Now'
                : 'Cancel Reservation'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CancelBookingModal;