import React, { useState } from 'react';
import './BookingModal.css';

const BookingModal = ({ spot, isOpen, onClose, onConfirm }) => {
  const [duration, setDuration] = useState(60);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const calculateTotal = () => {
    const hours = Math.ceil(duration / 60);
    return hours * spot.price;
  };

  const handleConfirm = async () => {
    setLoading(true);
    await onConfirm(spot._id, duration);
    setLoading(false);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-header">
          <h2>Book Parking Spot</h2>
          <button onClick={onClose} className="modal-close">&times;</button>
        </div>
        
        <div className="modal-body">
          <div className="spot-info">
            <h3>{spot.locationName}</h3>
            <p className="spot-address">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                <circle cx="12" cy="9" r="3" />
              </svg>
              {spot.location.address || 'Kathmandu'}
            </p>
            <p className="spot-number">Spot #{spot.spotNumber}</p>
          </div>

          <div className="duration-selector">
            <label>Select Duration</label>
            <select value={duration} onChange={(e) => setDuration(parseInt(e.target.value))}>
              <option value={30}>30 minutes</option>
              <option value={60}>1 hour</option>
              <option value={120}>2 hours</option>
              <option value={180}>3 hours</option>
              <option value={240}>4 hours</option>
            </select>
          </div>

          <div className="price-breakdown">
            <div className="price-row">
              <span>Hourly Rate</span>
              <span>NPR {spot.price}</span>
            </div>
            <div className="price-row">
              <span>Duration</span>
              <span>{Math.ceil(duration / 60)} hour(s)</span>
            </div>
            <div className="price-row total">
              <span>Total Amount</span>
              <span className="total-amount">NPR {calculateTotal()}</span>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleConfirm} disabled={loading} className="btn-primary">
            {loading ? 'Processing...' : 'Proceed to Payment'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookingModal;
