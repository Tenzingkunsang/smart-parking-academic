import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, Zap } from 'lucide-react';

/**
 * CountdownTimer — shows time remaining until a target date.
 *
 * Props:
 *   targetDate  {string|Date}  The end time to count down to.
 *   label       {string}       Small label shown above the timer.
 *   onExpire    {function}     Called once when the timer hits zero.
 *   variant     {'upcoming'|'active'|'checkin'}
 *     - upcoming: countdown to booking start (neutral colour)
 *     - active:   countdown to booking end (yellow ≤10 min, red when overtime)
 *     - checkin:  15-min grace period countdown (red)
 */
const CountdownTimer = ({ targetDate, label, onExpire, variant = 'upcoming' }) => {
  const [msLeft, setMsLeft] = useState(null);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!targetDate) return;
    const target = new Date(targetDate).getTime();

    const tick = () => {
      const diff = target - Date.now();
      setMsLeft(diff);
      if (diff <= 0 && !expired) {
        setExpired(true);
        onExpire?.();
      }
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetDate]); // eslint-disable-line react-hooks/exhaustive-deps

  if (msLeft === null) return null;

  const isOvertime = msLeft < 0;
  const absMs = Math.abs(msLeft);
  const totalSeconds = Math.floor(absMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n) => String(n).padStart(2, '0');
  const timeStr = hours > 0
    ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;

  const isWarning = variant === 'active' && !isOvertime && msLeft <= 10 * 60 * 1000;
  const isCritical = isOvertime || variant === 'checkin';

  const colorClass = isCritical
    ? 'text-red-400 border-red-400/30 bg-red-400/5'
    : isWarning
    ? 'text-amber-400 border-amber-400/30 bg-amber-400/5'
    : 'text-cyan-400 border-cyan-400/30 bg-cyan-400/5';

  const Icon = isCritical ? AlertTriangle : isWarning ? AlertTriangle : Clock;

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-black uppercase tracking-widest transition-all ${colorClass} ${(isWarning || isCritical) ? 'animate-pulse' : ''}`}>
      <Icon size={12} className="shrink-0" />
      <span className="font-display">
        {isOvertime ? `+${timeStr} OVER` : timeStr}
      </span>
      {label && <span className="text-[9px] opacity-70 normal-case font-bold tracking-normal ml-1">{label}</span>}
    </div>
  );
};

export default CountdownTimer;
