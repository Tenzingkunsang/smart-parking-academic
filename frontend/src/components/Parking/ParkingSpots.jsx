import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ParkingMap from './ParkingMap';
import BookingModal from './BookingModal';
import './ParkingSpots.css';

const ParkingSpots = () => {
  const [spots, setSpots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [vehicleFilter, setVehicleFilter] = useState('all');
  const [selectedSpot, setSelectedSpot] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [viewMode, setViewMode] = useState('list');
  const navigate = useNavigate();

  useEffect(() => {
    fetchSpots();
  }, []);

  const fetchSpots = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/parking/spots');
      const data = await response.json();
      if (data.success) {
        setSpots(data.data);
      }
    } catch (error) {
      console.error('Error fetching spots:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSpots = spots.filter(spot => {
    if (filter !== 'all' && spot.status !== filter) return false;
    if (vehicleFilter !== 'all' && spot.vehicleType !== vehicleFilter) return false;
    return true;
  });

  const handleBook = (spot) => {
    setSelectedSpot(spot);
    setShowModal(true);
  };

  const handleConfirmBooking = (spotId, duration) => {
    navigate('/payment', {
      state: {
        spot: selectedSpot,
        duration: duration,
        totalAmount: Math.ceil(duration / 60) * selectedSpot.price
      }
    });
    setShowModal(false);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading parking spots...</p>
      </div>
    );
  }

  return (
    <div className="parking-container">
      <div className="parking-hero">
        <h1>SmartPark</h1>
        <p>Find and reserve parking spots in real-time</p>
      </div>

      <div className="filters-section">
        <div className="filter-card">
          <div className="filter-group">
            <label className="filter-label">Filter by Status</label>
            <div className="filter-buttons">
              {[
                { value: 'all', label: 'All Spots' },
                { value: 'available', label: 'Available' },
                { value: 'reserved', label: 'Reserved' },
                { value: 'occupied', label: 'Occupied' }
              ].map(option => (
                <button
                  key={option.value}
                  onClick={() => setFilter(option.value)}
                  className={`filter-btn ${filter === option.value ? 'active' : ''}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <label className="filter-label">Filter by Vehicle Type</label>
            <div className="filter-buttons">
              {[
                { value: 'all', label: 'All Vehicles' },
                { value: 'car', label: 'Car' },
                { value: 'motorcycle', label: 'Motorcycle' }
              ].map(option => (
                <button
                  key={option.value}
                  onClick={() => setVehicleFilter(option.value)}
                  className={`filter-btn ${vehicleFilter === option.value ? 'active' : ''}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="results-count">
        Showing <span>{filteredSpots.length}</span> of <span>{spots.length}</span> parking spots
      </div>

      {/* View Toggle */}
      <div className="view-toggle">
        <button
          onClick={() => setViewMode('map')}
          className={`view-btn ${viewMode === 'map' ? 'active' : ''}`}
        >
          🗺️ Map View
        </button>
        <button
          onClick={() => setViewMode('list')}
          className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
        >
          📋 List View
        </button>
      </div>

      {/* Map View - Conditionally render to avoid reinitialization */}
      {viewMode === 'map' && filteredSpots.length > 0 && (
        <div className="map-view">
          <ParkingMap 
            spots={filteredSpots} 
            onSpotClick={handleBook} 
          />
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="parking-grid">
          {filteredSpots.map(spot => (
            <div key={spot._id} className="spot-card">
              <div className="card-gradient"></div>
              <div className="card-content">
                <div className="card-header">
                  <div>
                    <h3 className="location-name">{spot.locationName}</h3>
                    <p className="location-address">{spot.location.address || 'Kathmandu'}</p>
                  </div>
                  <span className={`status-badge status-${spot.status}`}>
                    {spot.status === 'available' ? '✓ Available' :
                     spot.status === 'reserved' ? '⏰ Reserved' : '🔴 Occupied'}
                  </span>
                </div>
                
                <div className="spot-badge">Spot #{spot.spotNumber}</div>
                
                <div className="info-grid">
                  <div className="info-box price-box">
                    <div className="info-label">Price</div>
                    <div className="info-value">NPR {spot.price}</div>
                    <div className="info-sub">per hour</div>
                  </div>
                  <div className="info-box vehicle-box">
                    <div className="info-label">Vehicle</div>
                    <div className="info-value">{spot.vehicleType === 'car' ? '🚗 Car' : '🛵 Motorcycle'}</div>
                    <div className="info-sub">type</div>
                  </div>
                </div>
                
                <button
                  onClick={() => handleBook(spot)}
                  disabled={spot.status !== 'available'}
                  className={`book-btn ${spot.status === 'available' ? 'book-btn-available' : 'book-btn-disabled'}`}
                >
                  {spot.status === 'available' ? 'Book Now' : 'Not Available'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedSpot && (
        <BookingModal
          spot={selectedSpot}
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onConfirm={handleConfirmBooking}
        />
      )}
    </div>
  );
};

export default ParkingSpots;
