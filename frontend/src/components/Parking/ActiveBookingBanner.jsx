import React, { useState, useEffect } from 'react';
import { Clock, ChevronRight } from 'lucide-react';
import './ActiveBookingBanner.css';

/**
 * ActiveBookingBanner
 *
 * Shows a live countdown timer at the top of the page
 * when the user has an active/checked-in reservation.
 * Inspired by the middle phone in the reference image.
 *
 * Props:
 *   booking     – Reservation object (must have reservationTime + duration)
 *   onViewTicket – fn() navigate to reservations
 */
const ActiveBookingBanner = ({ booking, onViewTicket }) => {
  const [timeLeft, setTimeLeft] = useState('');
  const [urgent, setUrgent] = useState(false);

  useEffect(() => {
    const compute = () => {
      const start = new Date(booking.reservationTime || booking.createdAt);
      const endMs = start.getTime() + (booking.duration || 60) * 60 * 1000;
      const diffMs = endMs - Date.now();

      if (diffMs <= 0) {
        setTimeLeft('Expired');
        setUrgent(true);
        return;
      }

      const totalSecs = Math.floor(diffMs / 1000);
      const hrs  = Math.floor(totalSecs / 3600);
      const mins = Math.floor((totalSecs % 3600) / 60);
      const secs = totalSecs % 60;

      setTimeLeft(
        hrs > 0
          ? `${String(hrs).padStart(2,'0')}:${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`
          : `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`
      );
      setUrgent(diffMs < 10 * 60 * 1000); // urgent when < 10 min left
    };

    compute();
    const interval = setInterval(compute, 1000);
    return () => clearInterval(interval);
  }, [booking]);

  const spotNumber = booking.parkingSpot?.spotNumber || booking.spotNumber || '—';
  const locationName = booking.parkingSpot?.locationName || '—';

  return (
    <div className={`active-banner ${urgent ? 'urgent' : ''}`} role="status" aria-live="polite">
      <div className="active-banner-left">
        <Clock size={16} className="active-banner-icon" />
        <div>
          <div className="active-banner-label">Active parking</div>
          <div className="active-banner-location">{locationName} · Spot #{spotNumber}</div>
        </div>
      </div>
      <div className="active-banner-right">
        <div className="active-banner-timer">{timeLeft}</div>
        <button
          type="button"
          className="active-banner-btn"
          onClick={onViewTicket}
          aria-label="View ticket"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default ActiveBookingBanner;