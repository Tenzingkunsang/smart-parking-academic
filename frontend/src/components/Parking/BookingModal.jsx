import React, { useState, useEffect } from 'react';
import { MapPin } from 'lucide-react';
import './BookingModal.css';

const PLATE_KEY = 'vehiclePlate';

const BookingModal = ({ spot, isOpen, onClose, onConfirm }) => {
  const [step, setStep] = useState(1);
  const [duration, setDuration] = useState(60);
  const [loading, setLoading] = useState(false);
  const [vehiclePlate, setVehiclePlate] = useState(() => localStorage.getItem(PLATE_KEY) || '');

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setVehiclePlate(localStorage.getItem(PLATE_KEY) || '');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const addressLine = spot.address || spot.location?.address || '—';

  const calculateTotal = () => {
    const hours = Math.ceil(duration / 60);
    return hours * spot.price;
  };

  const handleFinalConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm(spot._id, duration);
    } finally {
      setLoading(false);
    }
  };

  const hoursLabel = Math.ceil(duration / 60);
  const total = calculateTotal();

  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="modal-container"
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="booking-modal-title">
            {step === 1 ? 'Book parking' : 'Confirm booking'}
          </h2>
          <button type="button" onClick={onClose} className="modal-close" aria-label="Close">
            &times;
          </button>
        </div>

        {step === 1 ? (
          <>
            <div className="modal-body">
              <div className="spot-info">
                <h3>{spot.locationName}</h3>
                <p className="spot-address">
                  <MapPin size={14} aria-hidden />
                  {addressLine}
                </p>
                <p className="spot-number">Spot #{spot.spotNumber}</p>
              </div>

              <div className="duration-selector">
                <label htmlFor="vehicle-plate">Vehicle plate (optional)</label>
                <input
                  id="vehicle-plate"
                  type="text"
                  autoComplete="off"
                  placeholder="e.g. BA 1 PA 1234"
                  value={vehiclePlate}
                  onChange={(e) => {
                    const v = e.target.value;
                    setVehiclePlate(v);
                    if (v.trim()) localStorage.setItem(PLATE_KEY, v.trim());
                    else localStorage.removeItem(PLATE_KEY);
                  }}
                />
              </div>

              <div className="duration-selector">
                <label htmlFor="booking-duration">Duration</label>
                <select
                  id="booking-duration"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value, 10))}
                >
                  <option value={30}>30 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={120}>2 hours</option>
                  <option value={180}>3 hours</option>
                  <option value={240}>4 hours</option>
                </select>
              </div>

              <div className="price-breakdown">
                <div className="price-row">
                  <span>Hourly rate</span>
                  <span>NPR {spot.price}</span>
                </div>
                <div className="price-row">
                  <span>Billed duration</span>
                  <span>
                    {hoursLabel} hour{hoursLabel !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="price-row total">
                  <span>Estimated total</span>
                  <span className="total-amount">NPR {total}</span>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" onClick={onClose} className="btn-secondary">
                Cancel
              </button>
              <button type="button" onClick={() => setStep(2)} className="btn-primary">
                Review &amp; confirm
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="modal-body">
              <p className="confirm-lead">Please confirm your booking details before payment.</p>
              <div className="confirm-summary">
                <div className="confirm-row">
                  <span>Location</span>
                  <strong>{spot.locationName}</strong>
                </div>
                <div className="confirm-row">
                  <span>Spot</span>
                  <strong>#{spot.spotNumber}</strong>
                </div>
                <div className="confirm-row">
                  <span>Duration</span>
                  <strong>
                    {duration} min ({hoursLabel} hr billed)
                  </strong>
                </div>
                <div className="confirm-row highlight">
                  <span>Total due</span>
                  <strong className="confirm-total">NPR {total}</strong>
                </div>
              </div>
              <p className="confirm-hint">You can choose a payment method on the next screen.</p>
            </div>
            <div className="modal-footer">
              <button type="button" onClick={() => setStep(1)} className="btn-secondary" disabled={loading}>
                Back
              </button>
              <button type="button" onClick={handleFinalConfirm} disabled={loading} className="btn-primary">
                {loading ? 'Processing…' : 'Confirm booking'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BookingModal;
