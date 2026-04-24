import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, X, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';
import parkingService from '../../services/parkingService';
import BookingModal from './BookingModal';
import ParkingMap from './ParkingMap';
import SpotAmenities from './SpotAmenities';
import LotGridModal from './Lotgridmodal';
import ActiveBookingBanner from './ActiveBookingBanner';
import { clusterSpotsByGrid, haversineMeters, formatDistance } from '../../utils/geo';
import { API_BASE, getSocketOrigin } from '../../config/api';
import './ParkingSpots.css';

const GEOFENCE_RADIUS_M = 500;
const FALLBACK_POLL_MS = 15000;

const ParkingSpots = () => {
  const [spots, setSpots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [vehicleFilter, setVehicleFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [selectedSpotId, setSelectedSpotId] = useState(null);
  const [hoveredSpotId, setHoveredSpotId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalSpot, setModalSpot] = useState(null);
  const [userPosition, setUserPosition] = useState(null);
  const [geoConfirm, setGeoConfirm] = useState(null);
  const [clusterFocus, setClusterFocus] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [lotGridSpot, setLotGridSpot] = useState(null); // for visual grid modal
  const [activeBooking, setActiveBooking] = useState(null);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [recommendedSpots, setRecommendedSpots] = useState([]);
  const [featureFilters, setFeatureFilters] = useState([]);
  const [modalMode, setModalMode] = useState('book');

  const cardRefs = useRef({});
  const socketRef = useRef(null);
  const pollIntervalRef = useRef(null);
  const navigate = useNavigate();

  // ── Fetch spots ────────────────────────────────────────────────────────────
  const fetchSpots = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/parking/spots`);
      const data = await res.json();
      if (data.success) setSpots(data.data);
    } catch (err) {
      console.error('[ParkingSpots] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRecommendations = useCallback(async () => {
    try {
      const res = await parkingService.getRecommendations();
      if (res.success) setRecommendedSpots(res.data || []);
    } catch {
      setRecommendedSpots([]);
    }
  }, []);

  // ── Fetch active booking for countdown banner ──────────────────────────────
  const fetchActiveBooking = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await fetch(`${API_BASE}/reservations/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        const active = (data.data || []).find(
          (r) => r.status === 'reserved' || r.status === 'checked-in'
        );
        setActiveBooking(active || null);
      }
    } catch (err) {
      // silent
    }
  }, []);

  // ── Socket setup ───────────────────────────────────────────────────────────
  useEffect(() => {
    fetchSpots();
    fetchRecommendations();
    fetchActiveBooking();

    const token = localStorage.getItem('token');
    const socket = io(getSocketOrigin(), {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      timeout: 10000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setSocketConnected(true);
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    });

    socket.on('spot:statusChanged', () => fetchSpots());
    socket.on('parkingSpotStatusChanged', () => fetchSpots());

    socket.on('disconnect', () => {
      setSocketConnected(false);
      if (!pollIntervalRef.current) {
        pollIntervalRef.current = setInterval(fetchSpots, FALLBACK_POLL_MS);
      }
    });

    socket.on('connect_error', () => {
      setSocketConnected(false);
      if (!pollIntervalRef.current) {
        pollIntervalRef.current = setInterval(fetchSpots, FALLBACK_POLL_MS);
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [fetchSpots, fetchRecommendations, fetchActiveBooking]);

  // ── Geolocation ────────────────────────────────────────────────────────────
  const loadLocationSilently = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  }, []);

  useEffect(() => { loadLocationSilently(); }, [loadLocationSilently]);

  const refreshUserLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported');
      return;
    }
    toast.loading('Getting your location…', { id: 'geo' });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        toast.success('Location updated', { id: 'geo' });
      },
      () => toast.error('Location permission denied', { id: 'geo' }),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, []);

  // ── Derived data ───────────────────────────────────────────────────────────
  const spotsWithDistance = useMemo(() => {
    return spots.map((spot) => {
      let distanceMeters = null;
      if (userPosition && spot.location?.lat != null && spot.location?.lng != null) {
        distanceMeters = haversineMeters(
          userPosition.lat, userPosition.lng,
          spot.location.lat, spot.location.lng
        );
      }
      return { ...spot, distanceMeters };
    });
  }, [spots, userPosition]);

  // ── Smart search + filters ─────────────────────────────────────────────────
  const filteredSpots = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const maxP = priceMax ? parseInt(priceMax) : null;

    return spotsWithDistance.filter((spot) => {
      // Status filter
      if (filter !== 'all' && spot.status !== filter) return false;
      // Vehicle filter
      if (vehicleFilter !== 'all' && spot.vehicleType !== vehicleFilter) return false;
      // Search query — name, address, spot number
      if (q) {
        const haystack = [
          spot.locationName,
          spot.address,
          spot.location?.address,
          spot.spotNumber?.toString(),
        ].filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      // Price filter
      if (maxP && spot.price > maxP) return false;
      if (featureFilters.length) {
        const spotFeatures = spot.features || [];
        const hasAll = featureFilters.every((f) => spotFeatures.includes(f));
        if (!hasAll) return false;
      }
      return true;
    });
  }, [spotsWithDistance, filter, vehicleFilter, searchQuery, priceMax, featureFilters]);

  const clusters = useMemo(
    () => clusterSpotsByGrid(filteredSpots, 0.012),
    [filteredSpots]
  );
  const totalAvailableSpaces = useMemo(
    () => spots.reduce((sum, spot) => sum + (spot.availableSpaces || 0), 0),
    [spots]
  );

  const selectedSpot = useMemo(
    () => filteredSpots.find((s) => s._id === selectedSpotId) || null,
    [filteredSpots, selectedSpotId]
  );

  const pickBestAndClosest = useCallback((group) => {
    const best = [...group].sort((a, b) => (a.price || 0) - (b.price || 0))[0];
    let closest = null;
    if (userPosition) {
      closest = [...group]
        .map((s) => ({
          s,
          d: s.location?.lat != null
            ? haversineMeters(userPosition.lat, userPosition.lng, s.location.lat, s.location.lng)
            : Infinity,
        }))
        .sort((a, b) => a.d - b.d)[0]?.s;
    }
    return { best, closest: closest || best };
  }, [userPosition]);

  // ── Availability helpers ───────────────────────────────────────────────────
  const getAvailabilityLabel = (spot) => {
    const total = spot.totalSpaces || 0;
    const avail = spot.availableSpaces ?? 0;
    if (total === 0) return null;
    return { avail, total, pct: Math.round((avail / total) * 100) };
  };

  const getAvailabilityColor = (pct) => {
    if (pct === 0) return '#ef4444';
    if (pct <= 30) return '#f59e0b';
    return '#16a34a';
  };

  // ── Handlers ───────────────────────────────────────────────────────────────
  const scrollCardIntoView = (id) => {
    cardRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  };

  const handleMapSpotClick = useCallback((spot) => {
    setSelectedSpotId(spot._id);
    setClusterFocus(null);
    scrollCardIntoView(spot._id);
  }, []);

  const handleClusterClick = useCallback((group) => {
    const { best, closest } = pickBestAndClosest(group);
    setClusterFocus({ spots: group, best, closest });
    const primary = closest || best;
    if (primary) {
      setSelectedSpotId(primary._id);
      scrollCardIntoView(primary._id);
    }
  }, [pickBestAndClosest]);

  const handleCardHover = useCallback((id) => setHoveredSpotId(id), []);

  const openBooking = useCallback((spot) => {
    const token = localStorage.getItem('token');
    if (!token) { navigate('/login'); return; }
    if (userPosition && spot.location?.lat != null) {
      const d = haversineMeters(
        userPosition.lat, userPosition.lng,
        spot.location.lat, spot.location.lng
      );
      if (d > GEOFENCE_RADIUS_M) {
        setGeoConfirm({ spot, distanceMeters: d });
        return;
      }
    }
    setModalSpot(spot);
    setModalMode('book');
    setShowModal(true);
  }, [userPosition, navigate]);

  const openWaitlist = useCallback((spot) => {
    const token = localStorage.getItem('token');
    if (!token) { navigate('/login'); return; }
    setModalSpot(spot);
    setModalMode('waitlist');
    setShowModal(true);
  }, [navigate]);

  const confirmGeofenceAndBook = () => {
    if (geoConfirm?.spot) { setModalSpot(geoConfirm.spot); setShowModal(true); }
    setGeoConfirm(null);
  };

  const handleConfirmBooking = async (spotId, duration, scheduledArrival) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/reservations/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ parkingSpotId: spotId, duration, quantity: 1, scheduledArrival }),
      });
      const data = await response.json();
      if (data.success) {
        navigate('/payment', {
          state: {
            spot: modalSpot,
            duration,
            totalAmount: data.data.totalAmount,
            pendingReservationId: data.data.reservationId,
            createdAt: new Date().toISOString(),
            scheduledArrival,
          },
        });
      } else {
        toast.error(data.message || 'Booking failed');
      }
    } catch (error) {
      toast.error('Booking failed. Please try again.');
    } finally {
      setShowModal(false);
    }
  };

  const handleJoinWaitlist = async (spotId, duration, scheduledArrival) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/reservations/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ parkingSpotId: spotId, duration, scheduledArrival, quantity: 1 }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Added to waitlist. We will notify you when available.');
      } else {
        toast.error(data.message || 'Failed to join waitlist');
      }
    } catch {
      toast.error('Failed to join waitlist');
    } finally {
      setShowModal(false);
      setModalMode('book');
    }
  };

  // ── Status helpers ─────────────────────────────────────────────────────────
  const getStatusText = (status) =>
    ({ available: 'Available', reserved: 'Reserved', occupied: 'Occupied' }[status] || 'Available');

  const getStatusClass = (status) =>
    ({ available: 'status-available', reserved: 'status-reserved', occupied: 'status-occupied' }[status] || 'status-available');

  const addressLine = (spot) =>
    spot.address || spot.location?.address || spot.locationName || '—';

  const hasActiveSearch = searchQuery || priceMax || filter !== 'all' || vehicleFilter !== 'all';

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">
          <div className="spinner" />
          <p>Loading parking spots...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="parking-map-page">
      {/* Active booking countdown banner */}
      {activeBooking && (
        <ActiveBookingBanner
          booking={activeBooking}
          onViewTicket={() => navigate('/reservations')}
        />
      )}

      <div className="parking-map-stage">
        <button
          type="button"
          className="geo-refresh-btn"
          onClick={() => setMapExpanded((prev) => !prev)}
          aria-label="Toggle map size"
          style={{ position: 'absolute', top: 10, right: 14, zIndex: 700 }}
        >
          {mapExpanded ? 'Collapse map' : 'Expand map'}
        </button>
        <ParkingMap
          clusters={clusters}
          selectedSpotId={selectedSpotId}
          hoveredSpotId={hoveredSpotId}
          onSpotClick={handleMapSpotClick}
          onClusterClick={handleClusterClick}
          onSpotHover={setHoveredSpotId}
          userPosition={userPosition}
          expanded={mapExpanded}
        />
      </div>

      <section className="parking-bottom-sheet" aria-label="Parking spots and booking">
        <div className="sheet-handle-wrap">
          <div className="sheet-handle" />
        </div>

        <div className="sheet-top">
          <div className="sheet-top-row">
            <div>
              <h1 className="sheet-title">Find parking</h1>
              <p className="sheet-sub">
                {filteredSpots.length} of {spots.length} spots
                {' · '}
                {totalAvailableSpaces} spaces open
                {userPosition ? ' · GPS on' : ''}
                {' · '}
                <span className={`live-dot ${socketConnected ? 'live' : 'polling'}`}>
                  {socketConnected ? '● Live' : '○ Polling'}
                </span>
              </p>
              {recommendedSpots[0] && (
                <p className="sheet-sub">
                  Smart pick: <strong>{recommendedSpots[0].locationName}</strong> (score {recommendedSpots[0].recommendationScore})
                </p>
              )}
            </div>
            <button
              type="button"
              className="geo-refresh-btn"
              onClick={refreshUserLocation}
              aria-label="Use my location"
            >
              <MapPin size={15} />
              My location
            </button>
          </div>

          {/* ── Smart Search Bar ── */}
          <div className="search-bar-wrap">
            <div className="search-bar">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                className="search-input"
                placeholder="Search by name, address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search parking spots"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="search-clear"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <div className="price-filter">
              <span className="price-filter-label">Max NPR</span>
              <input
                type="number"
                className="price-input"
                placeholder="Any"
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
                min="0"
                aria-label="Maximum price per hour"
              />
            </div>
          </div>
        </div>

        {/* ── Filters ── */}
        <div className="sheet-filters" role="toolbar" aria-label="Filters">
          <div className="filter-row">
            <span className="filter-heading">Status</span>
            <div className="filter-chips">
              {[
                { value: 'all', label: 'All' },
                { value: 'available', label: 'Open' },
                { value: 'reserved', label: 'Held' },
                { value: 'occupied', label: 'Full' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`filter-chip ${filter === opt.value ? 'active' : ''}`}
                  onClick={() => setFilter(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="filter-row">
            <span className="filter-heading">Vehicle</span>
            <div className="filter-chips">
              {[
                { value: 'all', label: 'Any' },
                { value: 'car', label: 'Car' },
                { value: 'motorcycle', label: 'Bike' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`filter-chip ${vehicleFilter === opt.value ? 'active' : ''}`}
                  onClick={() => setVehicleFilter(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="filter-row">
            <span className="filter-heading">Features</span>
            <div className="filter-chips">
              {[
                { value: 'ev_charging', label: 'EV' },
                { value: 'handicap', label: 'Handicap' },
                { value: 'covered', label: 'Covered' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`filter-chip ${featureFilters.includes(opt.value) ? 'active' : ''}`}
                  onClick={() =>
                    setFeatureFilters((prev) =>
                      prev.includes(opt.value) ? prev.filter((v) => v !== opt.value) : [...prev, opt.value]
                    )
                  }
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Cluster picks ── */}
        {clusterFocus && clusterFocus.spots.length > 1 && (
          <div className="cluster-picks" role="region" aria-label="Cluster suggestions">
            <div className="cluster-picks-title">Quick picks in this area</div>
            <div className="cluster-picks-grid">
              <button type="button" className="cluster-pick-card" onClick={() => handleMapSpotClick(clusterFocus.best)}>
                <span className="cluster-pick-label">Best value</span>
                <span className="cluster-pick-price">NPR {clusterFocus.best?.price ?? '—'}/hr</span>
                <span className="cluster-pick-sub">{clusterFocus.best?.locationName}</span>
              </button>
              <button type="button" className="cluster-pick-card" onClick={() => handleMapSpotClick(clusterFocus.closest)}>
                <span className="cluster-pick-label">Closest</span>
                <span className="cluster-pick-price">{formatDistance(clusterFocus.closest?.distanceMeters)}</span>
                <span className="cluster-pick-sub">{clusterFocus.closest?.locationName}</span>
              </button>
            </div>
          </div>
        )}

        {/* ── Spot cards ── */}
        <div className="sheet-card-list">
          {filteredSpots.length === 0 ? (
            <div className="sheet-empty">
              <div className="sheet-empty-icon">
                <Search size={40} strokeWidth={1.5} />
              </div>
              <p className="sheet-empty-title">
                {hasActiveSearch ? 'No spots match your search' : 'No spots found in this area'}
              </p>
              <p className="sheet-empty-hint">
                {hasActiveSearch
                  ? 'Try different keywords or clear filters.'
                  : 'Try zooming out on the map or clearing filters.'}
              </p>
              <button
                type="button"
                className="sheet-clear-btn"
                onClick={() => {
                  setFilter('all');
                  setVehicleFilter('all');
                  setSearchQuery('');
                  setPriceMax('');
                }}
              >
                Reset all filters
              </button>
            </div>
          ) : (
            filteredSpots.map((spot) => {
              const avInfo = getAvailabilityLabel(spot);
              const avColor = avInfo ? getAvailabilityColor(avInfo.pct) : null;

              return (
                <article
                  key={spot._id}
                  ref={(el) => { cardRefs.current[spot._id] = el; }}
                  className={`sheet-spot-card ${selectedSpotId === spot._id ? 'is-selected' : ''} ${hoveredSpotId === spot._id ? 'is-hovered' : ''}`}
                  onMouseEnter={() => handleCardHover(spot._id)}
                  onMouseLeave={() => handleCardHover(null)}
                  onFocus={() => handleCardHover(spot._id)}
                  onBlur={() => handleCardHover(null)}
                >
                  <div className="sheet-card-visual" aria-hidden>
                    <div className="sheet-card-thumb" />
                  </div>
                  <div className="sheet-card-body">
                    <div className="sheet-card-top-row">
                      <div className={`sheet-status ${getStatusClass(spot.status)}`}>
                        {getStatusText(spot.status)}
                      </div>

                      {/* ── Live availability badge ── */}
                      {avInfo && (
                        <div
                          className="avail-badge"
                          style={{ color: avColor, borderColor: avColor }}
                          title={`${avInfo.avail} of ${avInfo.total} spaces available`}
                        >
                          <span className="avail-dot" style={{ background: avColor }} />
                          {avInfo.avail}/{avInfo.total} open
                        </div>
                      )}
                    </div>

                    <h2 className="sheet-card-name">{spot.locationName}</h2>
                    <p className="sheet-card-address">{addressLine(spot)}</p>
                    {recommendedSpots.some((r) => r._id === spot._id) && (
                      <p className="sheet-sub">Predicted high availability for your arrival window</p>
                    )}

                    {/* ── Availability bar ── */}
                    {avInfo && (
                      <div className="avail-bar-wrap" title={`${avInfo.pct}% available`}>
                        <div className="avail-bar-track">
                          <div
                            className="avail-bar-fill"
                            style={{ width: `${avInfo.pct}%`, background: avColor }}
                          />
                        </div>
                        <span className="avail-bar-label">{avInfo.pct}% free</span>
                      </div>
                    )}

                    <div className="sheet-hero-metrics">
                      <div className="sheet-metric sheet-metric-price">
                        <span className="sheet-metric-label">Price / hr</span>
                        <span className="sheet-metric-value">NPR {spot.price}</span>
                      </div>
                      <div className="sheet-metric sheet-metric-distance">
                        <span className="sheet-metric-label">Distance</span>
                        <span className="sheet-metric-value">{formatDistance(spot.distanceMeters)}</span>
                      </div>
                    </div>

                    <SpotAmenities features={spot.features} />

                    <div className="sheet-card-actions">
                      {/* ── View lot layout button ── */}
                      <button
                        type="button"
                        className="sheet-select-btn"
                        onClick={() => setLotGridSpot(spot)}
                        aria-label={`View lot layout for ${spot.locationName}`}
                      >
                        View lot
                        <ChevronRight size={14} />
                      </button>
                      <button
                        type="button"
                        className="sheet-book-btn"
                        disabled={false}
                        onClick={() => (spot.status === 'available' && (!avInfo || avInfo.avail > 0) ? openBooking(spot) : openWaitlist(spot))}
                        aria-label={`Book ${spot.locationName}`}
                      >
                        {spot.status === 'available' && (!avInfo || avInfo.avail > 0) ? 'Book now' : 'Join waitlist'}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>

        {selectedSpot && selectedSpot.status === 'available' && (
          <div className="sheet-sticky-cta">
            <div className="sheet-sticky-inner">
              <div>
                <div className="sheet-sticky-label">Selected</div>
                <div className="sheet-sticky-spot">{selectedSpot.locationName}</div>
              </div>
              <button
                type="button"
                className="sheet-start-parking-btn"
                onClick={() => openBooking(selectedSpot)}
              >
                Start parking
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ── Geo confirm dialog ── */}
      {geoConfirm && (
        <div className="geo-confirm-overlay" role="dialog" aria-modal="true" aria-labelledby="geo-title">
          <div className="geo-confirm-card">
            <h2 id="geo-title">Are you at this zone?</h2>
            <p>
              Your GPS is about <strong>{formatDistance(geoConfirm.distanceMeters)}</strong> away
              from <strong>{geoConfirm.spot.locationName}</strong> (Spot #{geoConfirm.spot.spotNumber}).
              Continue only if you are parking here.
            </p>
            <div className="geo-confirm-actions">
              <button type="button" className="geo-cancel" onClick={() => setGeoConfirm(null)}>
                Choose another spot
              </button>
              <button type="button" className="geo-ok" onClick={confirmGeofenceAndBook}>
                Yes, I'm here
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Booking modal ── */}
      {modalSpot && (
        <BookingModal
          spot={modalSpot}
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onConfirm={handleConfirmBooking}
          onJoinWaitlist={handleJoinWaitlist}
          mode={modalMode}
        />
      )}

      {/* ── Lot grid modal ── */}
      {lotGridSpot && (
        <LotGridModal
          spot={lotGridSpot}
          onClose={() => setLotGridSpot(null)}
          onBook={(spot) => {
            setLotGridSpot(null);
            openBooking(spot);
          }}
        />
      )}
    </div>
  );
};

export default ParkingSpots;