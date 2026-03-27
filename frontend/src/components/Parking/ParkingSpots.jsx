import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BookingModal from './BookingModal';
import './ParkingSpots.css';

// SVG Icons Component
const Icons = {
  Location: () => (
    <svg className="location-icon" viewBox="0 0 24 24">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="currentColor" fill="none" />
      <circle cx="12" cy="9" r="3" stroke="currentColor" fill="none" />
    </svg>
  ),
  Car: () => (
    <svg className="card-icon" viewBox="0 0 24 24">
      <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" fill="currentColor" />
    </svg>
  ),
  Motorcycle: () => (
    <svg className="card-icon" viewBox="0 0 24 24">
      <path d="M19.44 9.03L15.41 5H11v2h3.59l2 2H5c-2.8 0-5 2.2-5 5s2.2 5 5 5c2.46 0 4.45-1.69 4.9-4h1.65l2.77-2.77c-.21.54-.32 1.14-.32 1.77 0 2.8 2.2 5 5 5s5-2.2 5-5c0-2.65-1.97-4.77-4.56-4.97zM7.82 15C7.4 16.15 6.28 17 5 17c-1.65 0-3-1.35-3-3s1.35-3 3-3c1.28 0 2.4.85 2.82 2H5v2h2.82zM19 17c-1.65 0-3-1.35-3-3s1.35-3 3-3 3 1.35 3 3-1.35 3-3 3z" fill="currentColor" />
    </svg>
  ),
  Price: () => (
    <svg className="card-icon" viewBox="0 0 24 24">
      <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z" fill="currentColor" />
    </svg>
  ),
  Check: () => (
    <svg className="filter-icon" viewBox="0 0 24 24">
      <polyline points="20 6 9 17 4 12" stroke="currentColor" fill="none" strokeWidth="2" />
    </svg>
  ),
  Clock: () => (
    <svg className="filter-icon" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" stroke="currentColor" fill="none" strokeWidth="2" />
      <polyline points="12 6 12 12 16 14" stroke="currentColor" fill="none" strokeWidth="2" />
    </svg>
  ),
  Dot: () => (
    <svg className="filter-icon" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="8" fill="currentColor" />
    </svg>
  )
};

const ParkingSpots = () => {
  const [spots, setSpots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [vehicleFilter, setVehicleFilter] = useState('all');
  const [selectedSpot, setSelectedSpot] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('http://localhost:5001/api/parking/spots')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setSpots(data.data);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Error:', err);
        setLoading(false);
      });
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
    // Navigate to payment page with spot and duration data
    navigate('/payment', { 
      state: { 
        spot: selectedSpot,
        duration: duration,
        totalAmount: Math.ceil(duration / 60) * selectedSpot.price
      } 
    });
    setShowModal(false);
  };

  const getStatusInfo = (status) => {
    switch(status) {
      case 'available':
        return { text: 'Available', class: 'status-available', icon: Icons.Check };
      case 'reserved':
        return { text: 'Reserved', class: 'status-reserved', icon: Icons.Clock };
      case 'occupied':
        return { text: 'Occupied', class: 'status-occupied', icon: Icons.Dot };
      default:
        return { text: 'Available', class: 'status-available', icon: Icons.Check };
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
        <div className="parking-grid">
          {filteredSpots.map(spot => {
            const statusInfo = getStatusInfo(spot.status);
            const StatusIcon = statusInfo.icon;
            return (
              <div key={spot._id} className="spot-card">
                <div className="card-gradient"></div>
                <div className="card-content">
                  <div className="card-header">
                    <div className="location-info">
                      <h3 className="location-name">{spot.locationName}</h3>
                      <div className="location-address">
                        <Icons.Location />
                        <span>{spot.location.address || 'Kathmandu'}</span>
                      </div>
                    </div>
                    <div className={`status-badge ${statusInfo.class}`}>
                      <StatusIcon />
                      <span>{statusInfo.text}</span>
                    </div>
                  </div>

                  <div className="spot-badge">
                    <span>Spot</span>
                    <span className="spot-number">#{spot.spotNumber}</span>
                  </div>

                  <div className="info-grid">
                    <div className="info-box price-box">
                      <div className="info-label">Price</div>
                      <div className="info-value price-value">NPR {spot.price}</div>
                      <div className="info-sub">per hour</div>
                    </div>
                    <div className="info-box vehicle-box">
                      <div className="info-label">Vehicle</div>
                      <div className="info-value vehicle-value">
                        {spot.vehicleType === 'car' ? <Icons.Car /> : <Icons.Motorcycle />}
                        <span style={{ marginLeft: '8px' }}>{spot.vehicleType}</span>
                      </div>
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
            );
          })}
        </div>
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

      {/* Booking Modal */}
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
