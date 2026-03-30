import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BookingModal from './BookingModal';
import ParkingMap from './ParkingMap';
import './ParkingSpots.css';

const ParkingSpots = () => {
  const [spots, setSpots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [vehicleFilter, setVehicleFilter] = useState('all');
  const [viewMode, setViewMode] = useState('list');
  const [selectedSpot, setSelectedSpot] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  const fetchSpots = async () => {
    try {
      const res = await fetch('http://localhost:5001/api/parking/spots');
      const data = await res.json();
      if (data.success) {
        setSpots(data.data);
      }
    } catch (err) {
      console.error('Error fetching parking spots:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSpots();
    const interval = setInterval(fetchSpots, 3000);
    return () => clearInterval(interval);
  }, []);

  const filteredSpots = spots.filter(spot => {
    if (filter !== 'all' && spot.status !== filter) return false;
    if (vehicleFilter !== 'all' && spot.vehicleType !== vehicleFilter) return false;
    return true;
  });

  const handleBook = (spot) => {
    setSelectedSpot(spot);
    setShowModal(true);
  };

  const handleConfirmBooking = async (spotId, duration) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5001/api/reservations/create-pending', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          parkingSpotId: spotId,
          duration: duration,
          quantity: 1
        })
      });

      const data = await response.json();
      
      if (data.success) {
        const pendingData = data.data;
        navigate('/payment', {
          state: {
            spot: selectedSpot,
            duration: duration,
            totalAmount: pendingData.totalAmount,
            pendingReservationId: pendingData.reservationId
          }
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
    switch(status) {
      case 'available': return 'Available';
      case 'reserved': return 'Reserved';
      case 'occupied': return 'Occupied';
      default: return 'Available';
    }
  };

  const getStatusClass = (status) => {
    switch(status) {
      case 'available': return 'status-available';
      case 'reserved': return 'status-reserved';
      case 'occupied': return 'status-occupied';
      default: return 'status-available';
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading parking spots...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="parking-container">
      <div className="parking-hero">
        <h1>SmartPark</h1>
        <p>Find and reserve parking spots in real-time</p>
      </div>

      <div className="view-toggle">
        <button 
          className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
          onClick={() => setViewMode('list')}
        >
          List View
        </button>
        <button 
          className={`toggle-btn ${viewMode === 'map' ? 'active' : ''}`}
          onClick={() => setViewMode('map')}
        >
          Map View
        </button>
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

      {filteredSpots.length > 0 ? (
        viewMode === 'map' ? (
          <div className="map-view">
            <ParkingMap spots={filteredSpots} onSpotClick={handleBook} />
          </div>
        ) : (
          <div className="parking-grid">
            {filteredSpots.map(spot => (
              <div key={spot._id} className="spot-card">
                <div className="card-gradient"></div>
                <div className="card-content">
                  <div className="card-header">
                    <div className="location-info">
                      <h3 className="location-name">{spot.locationName}</h3>
                      <div className="location-address">
                        <span>{spot.location.address || 'Kathmandu'}</span>
                      </div>
                    </div>
                    <div className={`status-badge ${getStatusClass(spot.status)}`}>
                      <span>{getStatusText(spot.status)}</span>
                    </div>
                  </div>

                  <div className="spot-badge">
                    <span>Spot #{spot.spotNumber}</span>
                  </div>

                  <div className="info-grid">
                    <div className="info-box price-box">
                      <div className="info-label">Price</div>
                      <div className="info-value price-value">NPR {spot.price}</div>
                      <div className="info-sub">per hour</div>
                    </div>
                    <div className="info-box vehicle-box">
                      <div className="info-label">Vehicle</div>
                      <div className="info-value vehicle-value">{spot.vehicleType}</div>
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
        )
      ) : (
        <div className="empty-state">
          <div className="empty-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h3 className="empty-title">No parking spots found</h3>
          <p className="empty-text">Try adjusting your filters to see more options</p>
          <button
            onClick={() => {
              setFilter('all');
              setVehicleFilter('all');
            }}
            className="clear-filters-btn"
          >
            Clear All Filters
          </button>
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
