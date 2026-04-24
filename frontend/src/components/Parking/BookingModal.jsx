/**
 * BookingModal.jsx  –  REWRITTEN
 *
 * Fix applied:
 *  [1] User now picks:  DATE  +  TIME  +  DURATION
 *      scheduledArrival is sent to the backend so the reallocation service
 *      and the "are you coming?" notification are anchored to a real future time.
 *
 * Previous version only had a duration selector — no arrival time picker.
 */

import React, { useState, useEffect } from 'react';
import { MapPin, Clock, Calendar } from 'lucide-react';
import './BookingModal.css';

const PLATE_KEY = 'vehiclePlate';

/** Returns the minimum datetime-local value (now + 5 min, rounded up to nearest minute). */
function minArrivalValue() {
  const d = new Date(Date.now() + 5 * 60 * 1000);
  d.setSeconds(0, 0);
  // datetime-local format: YYYY-MM-DDTHH:MM
  return d.toISOString().slice(0, 16);
}

const BookingModal = ({ spot, isOpen, onClose, onConfirm, onJoinWaitlist, mode = 'book' }) => {
  const [step,          setStep]         = useState(1);
  const [duration,      setDuration]     = useState(60);
  const [arrivalValue,  setArrivalValue] = useState('');   // FIX [1]: datetime-local string
  const [loading,       setLoading]      = useState(false);
  const [vehiclePlate,  setVehiclePlate] = useState(() => localStorage.getItem(PLATE_KEY) || '');
  const [arrivalError,  setArrivalError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setVehiclePlate(localStorage.getItem(PLATE_KEY) || '');
      setArrivalValue(minArrivalValue());
      setArrivalError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const addressLine = spot.address || spot.location?.address || '—';

  const calculateTotal = () => {
    const hours = Math.ceil(duration / 60);
    return hours * spot.price;
  };

  // FIX [1]: validate arrival is in the future before moving to step 2
  const handleReviewClick = () => {
    if (!arrivalValue) {
      setArrivalError('Please select an arrival date and time.');
      return;
    }
    const arrival = new Date(arrivalValue);
    if (arrival <= new Date()) {
      setArrivalError('Arrival time must be in the future.');
      return;
    }
    setArrivalError('');
    setStep(2);
  };

  const handleFinalConfirm = async () => {
    setLoading(true);
    try {
      const scheduledArrival = new Date(arrivalValue).toISOString();
      if (mode === 'waitlist') {
        await onJoinWaitlist?.(spot._id, duration, scheduledArrival);
      } else {
        await onConfirm(spot._id, duration, scheduledArrival);
      }
    } finally {
      setLoading(false);
    }
  };

  const hoursLabel       = Math.ceil(duration / 60);
  const total            = calculateTotal();
  const arrivalFormatted = arrivalValue
    ? new Date(arrivalValue).toLocaleString(undefined, {
        weekday: 'short', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : '—';

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
            {step === 1 ? (mode === 'waitlist' ? 'Join waitlist' : 'Book parking') : (mode === 'waitlist' ? 'Confirm waitlist' : 'Confirm booking')}
          </h2>
          <button type="button" onClick={onClose} className="modal-close" aria-label="Close">
            &times;
          </button>
        </div>

        {/* ── Step 1: Pick arrival + duration ──────────────────────────────── */}
        {step === 1 ? (
          <>
            <div className="modal-body">
              {/* Spot info */}
              <div className="spot-info">
                <h3>{spot.locationName}</h3>
                <p className="spot-address">
                  <MapPin size={14} aria-hidden />
                  {addressLine}
                </p>
                <p className="spot-number">Spot #{spot.spotNumber}</p>
              </div>

              {/* Vehicle plate */}
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
                    else          localStorage.removeItem(PLATE_KEY);
                  }}
                />
              </div>

              {/* FIX [1]: Arrival date & time picker */}
              <div className="duration-selector">
                <label htmlFor="arrival-datetime">
                  <Calendar size={14} aria-hidden /> Arrival date &amp; time
                </label>
                <input
                  id="arrival-datetime"
                  type="datetime-local"
                  min={minArrivalValue()}
                  value={arrivalValue}
                  onChange={(e) => {
                    setArrivalValue(e.target.value);
                    setArrivalError('');
                  }}
                />
                {arrivalError && (
                  <p className="field-error" role="alert">{arrivalError}</p>
                )}
              </div>

              {/* Duration picker */}
              <div className="duration-selector">
                <label htmlFor="booking-duration">
                  <Clock size={14} aria-hidden /> Duration
                </label>
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

              {/* Price breakdown */}
              <div className="price-breakdown">
                <div className="price-row">
                  <span>Hourly rate</span>
                  <span>NPR {spot.price}</span>
                </div>
                <div className="price-row">
                  <span>Billed duration</span>
                  <span>{hoursLabel} hour{hoursLabel !== 1 ? 's' : ''}</span>
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
              <button type="button" onClick={handleReviewClick} className="btn-primary">
                Review &amp; confirm
              </button>
            </div>
          </>

        ) : (
          /* ── Step 2: Review + confirm ──────────────────────────────────── */
          <>
            <div className="modal-body">
              <p className="confirm-lead">
                {mode === 'waitlist'
                  ? 'Confirm your waitlist request. We will notify you when a spot opens up.'
                  : 'Please confirm your booking details before payment.'}
              </p>
              <div className="confirm-summary">
                <div className="confirm-row">
                  <span>Location</span>
                  <strong>{spot.locationName}</strong>
                </div>
                <div className="confirm-row">
                  <span>Spot</span>
                  <strong>#{spot.spotNumber}</strong>
                </div>
                {/* FIX [1]: show scheduledArrival in summary */}
                <div className="confirm-row">
                  <span>Arrival</span>
                  <strong>{arrivalFormatted}</strong>
                </div>
                <div className="confirm-row">
                  <span>Duration</span>
                  <strong>{duration} min ({hoursLabel} hr billed)</strong>
                </div>
                <div className="confirm-row highlight">
                  <span>Total due</span>
                  <strong className="confirm-total">NPR {total}</strong>
                </div>
              </div>
              <p className="confirm-hint">
                A reminder will be sent 30 min before your arrival time. Overstaying beyond a 15-minute grace period incurs additional charges.
              </p>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="btn-secondary"
                disabled={loading}
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleFinalConfirm}
                disabled={loading}
                className="btn-primary"
              >
                {loading ? 'Processing…' : (mode === 'waitlist' ? 'Join waitlist' : 'Confirm booking')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BookingModal;