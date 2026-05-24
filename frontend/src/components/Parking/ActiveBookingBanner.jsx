import React, { useState, useEffect } from 'react';
import { Clock, ChevronRight, Zap } from 'lucide-react';

const ActiveBookingBanner = ({ booking, onViewTicket }) => {
  const [timeLeft, setTimeLeft] = useState('');
  const [urgent, setUrgent] = useState(false);

  useEffect(() => {
    const compute = () => {
      const isActive = booking.status === 'checked-in' || booking.status === 'overstay';

      if (isActive) {
        // For checked-in sessions: count down remaining booked time from checkInTime
        const checkIn = new Date(booking.checkInTime || booking.reservationTime || booking.createdAt);
        const endMs = checkIn.getTime() + (booking.duration || 60) * 60 * 1000;
        const diffMs = endMs - Date.now();

        if (diffMs <= 0) {
          setTimeLeft('OVERTIME ACTIVE');
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
        setUrgent(diffMs < 10 * 60 * 1000);
      } else {
        // For reserved (upcoming) sessions: count down until scheduledArrival
        const arrival = new Date(booking.scheduledArrival || booking.reservationTime || booking.createdAt);
        const diffMs = arrival.getTime() - Date.now();

        if (diffMs <= 0) {
          setTimeLeft('CHECK-IN NOW');
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
        setUrgent(diffMs < 10 * 60 * 1000);
      }
    };

    compute();
    const interval = setInterval(compute, 1000);
    return () => clearInterval(interval);
  }, [booking]);

  const spotNumber = booking.parkingSpot?.spotNumber || booking.spotNumber || '—';
  const locationName = booking.parkingSpot?.locationName || '—';

  return (
    <div className="fixed top-24 left-0 right-0 z-[100] px-6 print:hidden pointer-events-none">
      <div 
        className={`max-w-2xl mx-auto p-4 rounded-2xl border backdrop-blur-2xl shadow-2xl flex items-center justify-between gap-6 pointer-events-auto transition-all duration-500 animate-in slide-in-from-top-full ${
          urgent 
            ? 'bg-red-500/10 border-red-500/40 text-red-400' 
            : 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400'
        }`} 
        role="status" 
        aria-live="polite"
      >
        <div className="flex items-center gap-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${urgent ? 'bg-red-500 text-black shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'bg-cyan-400 text-black shadow-[0_0_15px_rgba(0,242,255,0.3)]'} transition-colors duration-500`}>
             <Clock size={20} strokeWidth={2.5} />
          </div>
          <div>
            <div className={`text-[10px] font-black uppercase tracking-widest ${urgent ? 'text-red-400' : 'text-cyan-400'} opacity-80`}>
              {(booking.status === 'checked-in' || booking.status === 'overstay') ? 'Active session' : 'Upcoming booking'}
            </div>
            <div className="text-sm font-bold text-white truncate max-w-[150px] sm:max-w-none">{locationName} · #{spotNumber}</div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-xl font-display font-black tracking-tighter text-white font-variant-numeric:tabular-nums leading-none">
             {timeLeft}
          </div>
          <button
            type="button"
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              urgent ? 'bg-red-500/10 hover:bg-red-500/20 border-red-500/20' : 'bg-white/5 hover:bg-white/10 border-white/10'
            } border pointer-events-auto`}
            onClick={onViewTicket}
            aria-label="View Ticket Details"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActiveBookingBanner;
