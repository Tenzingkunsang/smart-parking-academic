import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import BookingModal from './BookingModal';
import ParkingMap from './ParkingMap';
import SpotAmenities from './SpotAmenities';
import { io } from 'socket.io-client';
import { clusterSpotsByGrid, haversineMeters, formatDistance } from '../../utils/geo';
import { API_BASE, getSocketOrigin } from '../../config/api';
import './ParkingSpots.css';
const GEOFENCE_RADIUS_M = 500;

const ParkingSpots = () => {
  const [spots, setSpots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [vehicleFilter, setVehicleFilter] = useState('all');
  const [selectedSpotId, setSelectedSpotId] = useState(null);
  const [hoveredSpotId, setHoveredSpotId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalSpot, setModalSpot] = useState(null);
  const [userPosition, setUserPosition] = useState(null);
  const [geoConfirm, setGeoConfirm] = useState(null);
  const [clusterFocus, setClusterFocus] = useState(null);
  const cardRefs = useRef({});
  const navigate = useNavigate();

  const fetchSpots = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/parking/spots`);
      const data = await res.json();
      if (data.success) {
        setSpots(data.data);
      }
    } catch (err) {
      console.error('Error fetching parking spots:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSpots();
    const interval = setInterval(fetchSpots, 4000);
    const socket = io(getSocketOrigin(), { transports: ['websocket', 'polling'] });
    const onSpotChange = () => {
      fetchSpots();
    };
    socket.on('parkingSpotStatusChanged', onSpotChange);
    return () => {
      clearInterval(interval);
      socket.off('parkingSpotStatusChanged', onSpotChange);
      socket.disconnect();
    };
  }, [fetchSpots]);

  const loadLocationSilently = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {},
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  }, []);

  useEffect(() => {
    loadLocationSilently();
  }, [loadLocationSilently]);

  const refreshUserLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported in this browser');
      return;
    }
    toast.loading('Getting your location…', { id: 'geo' });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        toast.success('Location updated — distances are calculated from GPS', { id: 'geo' });
      },
      () => {
        toast.error('Location permission denied or unavailable', { id: 'geo' });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, []);

  const spotsWithDistance = useMemo(() => {
    return spots.map((spot) => {
      let distanceMeters = null;
      if (
        userPosition &&
        spot.location?.lat != null &&
        spot.location?.lng != null
      ) {
        distanceMeters = haversineMeters(
          userPosition.lat,
          userPosition.lng,
          spot.location.lat,
          spot.location.lng
        );
      }
      return { ...spot, distanceMeters };
    });
  }, [spots, userPosition]);

  const filteredSpots = useMemo(() => {
    return spotsWithDistance.filter((spot) => {
      if (filter !== 'all' && spot.status !== filter) return false;
      if (vehicleFilter !== 'all' && spot.vehicleType !== vehicleFilter) return false;
      return true;
    });
  }, [spotsWithDistance, filter, vehicleFilter]);

  const clusters = useMemo(
    () => clusterSpotsByGrid(filteredSpots, 0.012),
    [filteredSpots]
  );

  const selectedSpot = useMemo(
    () => filteredSpots.find((s) => s._id === selectedSpotId) || null,
    [filteredSpots, selectedSpotId]
  );

  const pickBestAndClosest = useCallback(
    (group) => {
      const best = [...group].sort((a, b) => (a.price || 0) - (b.price || 0))[0];
      let closest = null;
      if (userPosition) {
        closest = [...group]
          .map((s) => ({
            s,
            d:
              s.location?.lat != null
                ? haversineMeters(
                    userPosition.lat,
                    userPosition.lng,
                    s.location.lat,
                    s.location.lng
                  )
                : Infinity,
          }))
          .sort((a, b) => a.d - b.d)[0]?.s;
      }
      return { best, closest: closest || best };
    },
    [userPosition]
  );

  const scrollCardIntoView = (id) => {
    const el = cardRefs.current[id];
    if (el?.scrollIntoView) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  };

  const handleMapSpotClick = useCallback(
    (spot) => {
      setSelectedSpotId(spot._id);
      setClusterFocus(null);
      scrollCardIntoView(spot._id);
    },
    []
  );

  const handleClusterClick = useCallback(
    (group) => {
      const { best, closest } = pickBestAndClosest(group);
      setClusterFocus({ spots: group, best, closest });
      const primary = closest || best;
      if (primary) {
        setSelectedSpotId(primary._id);
        scrollCardIntoView(primary._id);
      }
    },
    [pickBestAndClosest]
  );

  const handleCardHover = useCallback((id) => {
    setHoveredSpotId(id);
  }, []);

  const openBooking = useCallback(
    (spot) => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      if (userPosition && spot.location?.lat != null) {
        const d = haversineMeters(
          userPosition.lat,
          userPosition.lng,
          spot.location.lat,
          spot.location.lng
        );
        if (d > GEOFENCE_RADIUS_M) {
          setGeoConfirm({ spot, distanceMeters: d });
          return;
        }
      }

      setModalSpot(spot);
      setShowModal(true);
    },
    [userPosition, navigate]
  );

  const confirmGeofenceAndBook = () => {
    if (geoConfirm?.spot) {
      setModalSpot(geoConfirm.spot);
      setShowModal(true);
    }
    setGeoConfirm(null);
  };

  const handleConfirmBooking = async (spotId, duration) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/reservations/create-pending`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          parkingSpotId: spotId,
          duration,
          quantity: 1,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const pendingData = data.data;
        navigate('/payment', {
          state: {
            spot: modalSpot,
            duration,
            totalAmount: pendingData.totalAmount,
            pendingReservationId: pendingData.reservationId,
          },
        });
      } else {
        alert(data.message || 'Booking failed');
      }
    } catch (error) {
      console.error('Booking error:', error);
      alert('Booking failed. Please try again.');
    } finally {
      setShowModal(false);
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'available':
        return 'Available';
      case 'reserved':
        return 'Reserved';
      case 'occupied':
        return 'Occupied';
      default:
        return 'Available';
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'available':
        return 'status-available';
      case 'reserved':
        return 'status-reserved';
      case 'occupied':
        return 'status-occupied';
      default:
        return 'status-available';
    }
  };

  const addressLine = (spot) =>
    spot.address || spot.location?.address || spot.locationName || '—';

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
      <div className="parking-map-stage" aria-hidden={false}>
        <ParkingMap
          clusters={clusters}
          selectedSpotId={selectedSpotId}
          hoveredSpotId={hoveredSpotId}
          onSpotClick={handleMapSpotClick}
          onClusterClick={handleClusterClick}
          onSpotHover={setHoveredSpotId}
          userPosition={userPosition}
        />
      </div>

      <section
        className="parking-bottom-sheet"
        aria-label="Parking spots and booking"
      >
        <div className="sheet-handle-wrap">
          <div className="sheet-handle" />
        </div>

        <div className="sheet-top">
          <div>
            <h1 className="sheet-title">Find parking</h1>
            <p className="sheet-sub">
              {filteredSpots.length} of {spots.length} spots
              {userPosition ? ' · GPS on' : ' · Tap below for distance'}
            </p>
            <button
              type="button"
              className="geo-refresh-btn"
              onClick={refreshUserLocation}
              aria-label="Use my location for distance"
            >
              <MapPin size={16} aria-hidden />
              Use my location
            </button>
            <p className="sheet-geo-hint">

            </p>
          </div>
        </div>

        <div className="sheet-filters" role="toolbar" aria-label="Filters">
          <div className="filter-row">
            <span className="filter-heading">Status</span>
            <div className="filter-chips">
              {[
                { value: 'all', label: 'All' },
                { value: 'available', label: 'Open' },
                { value: 'reserved', label: 'Held' },
                { value: 'occupied', label: 'Full' },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`filter-chip ${filter === option.value ? 'active' : ''}`}
                  onClick={() => setFilter(option.value)}
                >
                  {option.label}
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
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`filter-chip ${vehicleFilter === option.value ? 'active' : ''}`}
                  onClick={() => setVehicleFilter(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {clusterFocus && clusterFocus.spots.length > 1 && (
          <div className="cluster-picks" role="region" aria-label="Cluster suggestions">
            <div className="cluster-picks-title">Quick picks in this area</div>
            <div className="cluster-picks-grid">
              <button
                type="button"
                className="cluster-pick-card"
                onClick={() => {
                  handleMapSpotClick(clusterFocus.best);
                }}
              >
                <span className="cluster-pick-label">Best value</span>
                <span className="cluster-pick-price">NPR {clusterFocus.best?.price ?? '—'}/hr</span>
                <span className="cluster-pick-sub">{clusterFocus.best?.locationName}</span>
              </button>
              <button
                type="button"
                className="cluster-pick-card"
                onClick={() => {
                  handleMapSpotClick(clusterFocus.closest);
                }}
              >
                <span className="cluster-pick-label">Closest</span>
                <span className="cluster-pick-price">
                  {formatDistance(clusterFocus.closest?.distanceMeters)}
                </span>
                <span className="cluster-pick-sub">{clusterFocus.closest?.locationName}</span>
              </button>
            </div>
          </div>
        )}

        <div className="sheet-card-list">
          {filteredSpots.length === 0 ? (
            <div className="sheet-empty">
              <div className="sheet-empty-icon" aria-hidden>
                <Search size={40} strokeWidth={1.5} />
              </div>
              <p className="sheet-empty-title">No spots found in this area</p>
              <p className="sheet-empty-hint">Try zooming out on the map or clearing filters to see more options.</p>
              <button
                type="button"
                className="sheet-clear-btn"
                onClick={() => {
                  setFilter('all');
                  setVehicleFilter('all');
                }}
              >
                Reset filters
              </button>
            </div>
          ) : (
            filteredSpots.map((spot) => (
              <article
                key={spot._id}
                ref={(el) => {
                  cardRefs.current[spot._id] = el;
                }}
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
                  <div className={`sheet-status ${getStatusClass(spot.status)}`}>
                    {getStatusText(spot.status)}
                  </div>
                  <h2 className="sheet-card-name">{spot.locationName}</h2>
                  <p className="sheet-card-address">{addressLine(spot)}</p>

                  <div className="sheet-hero-metrics">
                    <div className="sheet-metric sheet-metric-price">
                      <span className="sheet-metric-label">Price / hr</span>
                      <span className="sheet-metric-value">NPR {spot.price}</span>
                    </div>
                    <div className="sheet-metric sheet-metric-distance">
                      <span className="sheet-metric-label">Distance</span>
                      <span className="sheet-metric-value">
                        {formatDistance(spot.distanceMeters)}
                      </span>
                    </div>
                  </div>

                  <SpotAmenities features={spot.features} />

                  <div className="sheet-card-actions">
                    <button
                      type="button"
                      className="sheet-select-btn"
                      onClick={() => handleMapSpotClick(spot)}
                      aria-label={`Highlight ${spot.locationName} on map`}
                    >
                      Show on map
                    </button>
                    <button
                      type="button"
                      className="sheet-book-btn"
                      disabled={spot.status !== 'available'}
                      onClick={() => openBooking(spot)}
                      aria-label={`Book ${spot.locationName}`}
                    >
                      Book now
                    </button>
                  </div>
                </div>
              </article>
            ))
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
                aria-label="Start parking and go to payment"
              >
                Start parking
              </button>
            </div>
          </div>
        )}
      </section>

      {geoConfirm && (
        <div
          className="geo-confirm-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="geo-title"
        >
          <div className="geo-confirm-card">
            <h2 id="geo-title">Are you at this zone?</h2>
            <p>
              Your GPS looks about{' '}
              <strong>{formatDistance(geoConfirm.distanceMeters)}</strong> away from{' '}
              <strong>{geoConfirm.spot.locationName}</strong> (Spot #{geoConfirm.spot.spotNumber}
              ). Continue only if you are parking here.
            </p>
            <div className="geo-confirm-actions">
              <button
                type="button"
                className="geo-cancel"
                onClick={() => setGeoConfirm(null)}
              >
                Choose another spot
              </button>
              <button type="button" className="geo-ok" onClick={confirmGeofenceAndBook}>
                Yes, I’m here
              </button>
            </div>
          </div>
        </div>
      )}

      {modalSpot && (
        <BookingModal
          spot={modalSpot}
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onConfirm={handleConfirmBooking}
        />
      )}
    </div>
  );
};

export default ParkingSpots;
