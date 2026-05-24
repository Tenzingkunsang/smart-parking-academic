import React from 'react';

/**
 * Compact star-rating display. Accepts a 0..5 number; renders 5 stars with
 * fractional fill via CSS.
 */
export default function StarRating({ value = 0, count = 0, size = 'sm' }) {
  const pct = Math.max(0, Math.min(5, value)) / 5 * 100;
  const dim = size === 'lg' ? 'text-xl' : size === 'md' ? 'text-base' : 'text-sm';

  return (
    <div className="inline-flex items-center gap-1.5">
      <div className={`relative leading-none ${dim}`} aria-label={`Rated ${value.toFixed(1)} of 5`}>
        <span className="text-gray-300 select-none">★★★★★</span>
        <span
          className="absolute inset-0 overflow-hidden text-yellow-400 select-none"
          style={{ width: `${pct}%` }}
        >
          ★★★★★
        </span>
      </div>
      <span className="text-xs text-gray-500">
        {value > 0 ? value.toFixed(1) : 'New'}
        {count > 0 && ` (${count})`}
      </span>
    </div>
  );
}
