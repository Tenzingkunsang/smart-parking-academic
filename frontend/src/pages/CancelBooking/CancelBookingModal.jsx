import React, { useState } from 'react';
import './CancelBookingModal.css';
import { API_BASE } from '../../config/api';
import toast from 'react-hot-toast';

const CancelBookingModal = ({ booking, onClose, onCancelled }) => {
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const handleCancel = async () => {
    if (!confirmed) {
      setConfirmed(true);
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/reservations/${booking._id}/cancel`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (!data.success) {
        toast.error(data.message || 'Cancellation failed. Please try again.');
        setConfirmed(false);
        return;
      }

      toast.success('Reservation cancelled.');
      onCancelled(booking._id);
    } catch (err) {
      toast.error('Something went wrong. Please try again.');
      setConfirmed(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Cancel booking">
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Cancel Reservation</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div
          className="refund-banner"
          style={{ background: '#fef2f2', border: '1px solid #fca5a5' }}
        >
          <div className="refund-badge" style={{ background: '#fee2e2' }}>
            <span style={{ color: '#b91c1c', fontWeight: 600, fontSize: 13 }}>Non-Refundable</span>
          </div>
          <p style={{ color: '#991b1b', marginTop: 8, fontSize: 14 }}>
            All bookings are non-refundable. Cancelling will forfeit the amount paid.
          </p>
        </div>

        {confirmed && (
          <div className="confirm-prompt">
            ⚠️ Are you sure? This action <strong>cannot be undone</strong>.
          </div>
        )}

        <div className="modal-actions">
          <button className="btn-keep" onClick={onClose} disabled={loading}>
            Keep Reservation
          </button>
          <button
            className={`btn-cancel-confirm ${confirmed ? 'danger' : ''}`}
            onClick={handleCancel}
            disabled={loading}
          >
            {loading ? 'Cancelling...' : confirmed ? 'Yes, Cancel Now' : 'Cancel Reservation'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CancelBookingModal;
