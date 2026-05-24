import React from 'react';
import StarRating from './StarRating';

/**
 * Tiny social-proof snippet inside a parking card. Shows the latest review's
 * star rating + a 1-line comment preview.
 */
export default function QuickReview({ review }) {
  if (!review || !review.comment) {
    return (
      <div className="text-xs text-gray-400 italic">
        No reviews yet — be the first!
      </div>
    );
  }

  return (
    <div className="border-l-2 border-blue-400 bg-blue-50/60 rounded-r-md px-2.5 py-1.5">
      <div className="flex items-center justify-between gap-2">
        <StarRating value={review.rating} size="sm" />
        <span className="text-[10px] uppercase tracking-wide text-blue-600 font-semibold">
          Verified
        </span>
      </div>
      <p className="text-xs text-gray-700 mt-0.5 line-clamp-1">
        &ldquo;{review.comment}&rdquo;
      </p>
      {review.userName && (
        <p className="text-[10px] text-gray-500 mt-0.5">— {review.userName}</p>
      )}
    </div>
  );
}
