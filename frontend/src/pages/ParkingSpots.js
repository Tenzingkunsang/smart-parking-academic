import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = 'http://localhost:5001/api';

const ParkingSpots = () => {
  const [spots, setSpots] = useState([]);
  const [selectedSpot, setSelectedSpot] = useState(null);
  const [duration, setDuration] = useState(60);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);
    fetchSpots();
  }, []);

  const fetchSpots = async () => {
    try {
      const res = await axios.get(`${API_URL}/parking/spots`);
      if (res.data.success) {
        setSpots(res.data.data);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to load parking spots');
    } finally {
      setLoading(false);
    }
  };

  const handleReserve = async (spot) => {
    if (!isLoggedIn) {
      alert('Please login to reserve a parking spot');
      navigate('/login');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        `${API_URL}/parking/reserve`,
        { spotNumber: spot.spotNumber, duration },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        alert(`Spot #${spot.spotNumber} reserved successfully!`);
        fetchSpots();
        setSelectedSpot(null);
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Reservation failed');
    }
  };

  const getSpotColor = (spot) => {
    if (spot.isOccupied) return 'occupied';
    if (spot.isReserved) return 'reserved';
    return 'available';
  };

  const getVehicleIcon = (type) => {
    switch(type) {
      case 'motorcycle': return '🏍️';
      case 'disabled': return '♿';
      case 'electric': return '⚡';
      default: return '🚗';
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading parking spots...</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Parking Spots</h1>
        <p>Real-time availability and reservations</p>
      </div>

      <div className="spots-container">
        <div className="spots-controls">
          <div className="spots-info">
            <h3>Total Spots: {spots.length}</h3>
            <div className="spots-summary">
              <span className="summary-item available">Available: {
                spots.filter(s => !s.isOccupied && !s.isReserved).length
              }</span>
              <span className="summary-item reserved">Reserved: {
                spots.filter(s => s.isReserved).length
              }</span>
              <span className="summary-item occupied">Occupied: {
                spots.filter(s => s.isOccupied).length
              }</span>
            </div>
          </div>

          <div className="duration-selector">
            <label>Reservation Duration:</label>
            <div className="duration-buttons">
              {[15, 30, 60, 120].map((mins) => (
                <button
                  key={mins}
                  className={`duration-btn ${duration === mins ? 'active' : ''}`}
                  onClick={() => setDuration(mins)}
                >
                  {mins} min
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="spots-grid">
          {spots.map((spot) => (
            <div 
              key={spot._id} 
              className={`spot-card ${getSpotColor(spot)}`}
              onClick={() => setSelectedSpot(spot)}
            >
              <div className="spot-header">
                <div className="spot-number">#{spot.spotNumber}</div>
                <div className="spot-type">
                  {getVehicleIcon(spot.vehicleType)} {spot.vehicleType}
                </div>
              </div>
              
              <div className="spot-status">
                {spot.isOccupied ? 'Occupied' : 
                 spot.isReserved ? 'Reserved' : 'Available'}
              </div>
              
              {!spot.isOccupied && !spot.isReserved && (
                <button 
                  className="btn reserve-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleReserve(spot);
                  }}
                >
                  Reserve
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Spot Details Modal */}
      {selectedSpot && (
        <div className="modal-overlay" onClick={() => setSelectedSpot(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Spot #{selectedSpot.spotNumber} Details</h3>
            
            <div className="modal-details">
              <div className="detail-row">
                <span className="detail-label">Vehicle Type:</span>
                <span className="detail-value">{selectedSpot.vehicleType}</span>
              </div>
              
              <div className="detail-row">
                <span className="detail-label">Status:</span>
                <span className={`detail-value status-${getSpotColor(selectedSpot)}`}>
                  {selectedSpot.isOccupied ? 'Occupied' : 
                   selectedSpot.isReserved ? 'Reserved' : 'Available'}
                </span>
              </div>
              
              {selectedSpot.reservationExpiry && (
                <div className="detail-row">
                  <span className="detail-label">Reserved Until:</span>
                  <span className="detail-value">
                    {new Date(selectedSpot.reservationExpiry).toLocaleTimeString()}
                  </span>
                </div>
              )}
            </div>

            {!selectedSpot.isOccupied && !selectedSpot.isReserved && (
              <div className="modal-actions">
                <p>Reserve for {duration} minutes?</p>
                <div className="action-buttons">
                  <button 
                    className="btn main-btn"
                    onClick={() => handleReserve(selectedSpot)}
                  >
                    Confirm Reservation
                  </button>
                  <button 
                    className="btn secondary-btn"
                    onClick={() => setSelectedSpot(null)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <button 
              className="btn close-btn"
              onClick={() => setSelectedSpot(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParkingSpots;
