import React from 'react';
import StarRating from './StarRating';
import QuickReview from './QuickReview';
import { openInMaps, detectPlatform } from '../../utils/platformNavigation';

const formatDistance = (meters) => {
  if (meters == null) return '—';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
};

const platformLabel = () => {
  const p = detectPlatform();
  if (p === 'ios') return 'Apple Maps';
  if (p === 'android') return 'Google Maps';
  return 'Maps';
};

export default function ProximityCard({ spot, onBook }) {
  const lat = spot?.geoLocation?.coordinates?.[1] ?? spot?.location?.lat;
  const lng = spot?.geoLocation?.coordinates?.[0] ?? spot?.location?.lng;

  const handleNavigate = (e) => {
    e.stopPropagation();
    if (lat != null && lng != null) {
      openInMaps(lat, lng, spot.locationName);
    }
  };

  const available = spot.availableSpaces ?? 0;
  const total = spot.totalSpaces ?? 0;
  const isLow = total > 0 && available / total < 0.2;

  return (
    <article className="group relative flex flex-col bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 overflow-hidden">
      {/* Smart score badge */}
      {typeof spot.smartScore === 'number' && (
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1 px-2 py-1 rounded-full bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-[10px] font-bold shadow">
          <span>⚡</span>
          <span>SMART PICK</span>
        </div>
      )}

      <div className="p-4 flex-1 flex flex-col gap-3">
        {/* Header */}
        <div>
          <h3 className="text-base font-bold text-gray-900 line-clamp-1 pr-20">
            {spot.locationName}
          </h3>
          <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{spot.address}</p>
        </div>

        {/* Distance + rating row */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1.5 text-gray-700">
            <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .2.08.39.22.53l3 3a.75.75 0 101.06-1.06L10.75 9.69V5z" clipRule="evenodd" />
            </svg>
            <span className="font-semibold">{formatDistance(spot.distance)}</span>
          </div>
          <StarRating value={spot.averageRating || 0} count={spot.reviewCount || 0} />
        </div>

        {/* Price + availability */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-2xl font-extrabold text-gray-900">₱{spot.price}</span>
            <span className="text-xs text-gray-500 ml-1">/hr</span>
          </div>
          <div className={`text-xs font-semibold px-2 py-1 rounded-md ${
            available === 0
              ? 'bg-red-100 text-red-700'
              : isLow
              ? 'bg-amber-100 text-amber-700'
              : 'bg-emerald-100 text-emerald-700'
          }`}>
            {available} / {total} free
          </div>
        </div>

        {/* Features chips */}
        {Array.isArray(spot.features) && spot.features.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {spot.features.slice(0, 3).map((f) => (
              <span key={f} className="text-[10px] uppercase font-semibold tracking-wide bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                {f.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        )}

        {/* Quick review snippet */}
        <QuickReview review={spot.latestReview} />
      </div>

      {/* Action row */}
      <div className="grid grid-cols-2 border-t border-gray-100">
        <button
          type="button"
          onClick={handleNavigate}
          className="py-3 text-sm font-semibold text-blue-600 hover:bg-blue-50 transition flex items-center justify-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          {platformLabel()}
        </button>
        <button
          type="button"
          disabled={available === 0}
          onClick={() => onBook?.(spot)}
          className="py-3 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {available === 0 ? 'Full' : 'Book Now'}
        </button>
      </div>
    </article>
  );
}
