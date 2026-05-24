import React, { useEffect, useState, useCallback } from 'react';
import ProximityCard from './ProximityCard';
import { API_BASE } from '../../config/api';

/**
 * The "Smart" dashboard grid. On mount it asks for the user's geolocation,
 * then queries the smart aggregation endpoint and renders ranked cards.
 *
 * Props:
 *   onBook(spot)   -> invoked when the user taps "Book Now"
 *   fallbackCoords -> optional { lat, lng } if geolocation denied
 */
export default function ProximityGrid({ onBook, fallbackCoords }) {
  const [coords, setCoords] = useState(null);
  const [geoError, setGeoError] = useState(null);
  const [spots, setSpots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Request the user's live location
  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation not supported');
      if (fallbackCoords) setCoords(fallbackCoords);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        setGeoError(err.message);
        if (fallbackCoords) setCoords(fallbackCoords);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  }, [fallbackCoords]);

  const fetchSpots = useCallback(async () => {
    if (!coords) return;
    setLoading(true);
    setError(null);
    try {
      const url = `${API_BASE}/parking/smart/nearby?lat=${coords.lat}&lng=${coords.lng}&maxDistance=15000&limit=24`;
      const res = await fetch(url);
      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'Failed to load spots');
      setSpots(json.data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [coords]);

  useEffect(() => { fetchSpots(); }, [fetchSpots]);

  if (!coords && !geoError) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-500">
        <svg className="animate-spin w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
        </svg>
        Locating you…
      </div>
    );
  }

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
            <span className="inline-block w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            Smart Picks Near You
          </h2>
          <p className="text-sm text-gray-500">
            Ranked by distance, price, and rider rating
          </p>
        </div>
        <button
          onClick={fetchSpots}
          className="text-sm font-semibold text-blue-600 hover:text-blue-800 px-3 py-1.5 rounded-md hover:bg-blue-50 transition"
        >
          ↻ Refresh
        </button>
      </div>

      {geoError && (
        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
          Location unavailable ({geoError}). Showing fallback results.
        </div>
      )}

      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-72 rounded-2xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : spots.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          No parking spots within range.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {spots.map((spot) => (
            <ProximityCard key={spot._id} spot={spot} onBook={onBook} />
          ))}
        </div>
      )}
    </section>
  );
}
