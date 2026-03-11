import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/Parkingspots.css';


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

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchSpots, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchSpots = async () => {
    try {
      const res = await axios.get(`${API_URL}/parking/spots`);
      if (res.data.success) {
        setSpots(res.data.data);
      }
    } catch (error) {
      console.error('Error fetching spots:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReserve = async (spot) => {
    if (!isLoggedIn) {
      alert('Please login to reserve a spot 🔒');
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
        alert(`Success! Spot #${spot.spotNumber} reserved.`);
        fetchSpots();
        setSelectedSpot(null);
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Reservation failed');
    }
  };

  const getStatusClass = (spot) => {
    if (spot.isOccupied) return 'status-occupied';
    if (spot.isReserved) return 'status-reserved';
    return 'status-available';
  };

  const getIcon = (type) => {
    switch (type) {
      case 'motorcycle': return '🏍️';
      case 'disabled': return '♿';
      case 'electric': return '⚡';
      default: return '🚗';
    }
  };

  if (loading) {
    return <div className="loading-screen">Loading Parking System...</div>;
  }

  const availableCount = spots.filter(s => !s.isOccupied && !s.isReserved).length;

  return (
    <div className="parking-container">
      {/* Header & Stats */}
      <div className="header-section">
        <h1>🅿️ Smart Parking Dashboard</h1>
        
        <div className="stats-bar">
          <div className="stat-card">
            <span>Total Capacity</span>
            <strong>{spots.length}</strong>
          </div>
          <div className="stat-card active-stat">
            <span>Available Spots</span>
            <strong>{availableCount}</strong>
          </div>
          <div className="duration-picker">
            <span>Duration:</span>
            {[30, 60, 120].map((mins) => (
              <button
                key={mins}
                className={duration === mins ? 'active-btn' : ''}
                onClick={() => setDuration(mins)}
              >
                {mins}m
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="parking-grid">
        {spots.map((spot) => (
          <div
            key={spot._id}
            onClick={() => setSelectedSpot(spot)}
            className={`spot-card ${getStatusClass(spot)}`}
          >
            <div className="spot-header">
              <span className="spot-num">#{spot.spotNumber}</span>
              <span className="vehicle-icon">{getIcon(spot.vehicleType)}</span>
            </div>
            <div className="spot-status-text">
              {spot.isOccupied ? 'Occupied' : spot.isReserved ? 'Reserved' : 'Available'}
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {selectedSpot && (
        <div className="modal-overlay" onClick={() => setSelectedSpot(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Spot #{selectedSpot.spotNumber}</h3>
              <button className="close-btn" onClick={() => setSelectedSpot(null)}>✖</button>
            </div>

            <div className="modal-body">
              <p><strong>Type:</strong> {selectedSpot.vehicleType} {getIcon(selectedSpot.vehicleType)}</p>
              
              {selectedSpot.reservationExpiry && (
                <p className="expiry-text">
                  ⚠️ Reserved until: {new Date(selectedSpot.reservationExpiry).toLocaleTimeString()}
                </p>
              )}

              {!selectedSpot.isOccupied && !selectedSpot.isReserved ? (
                <button
                  className="reserve-action-btn"
                  onClick={() => handleReserve(selectedSpot)}
                >
                  Confirm Reservation ({duration} mins)
                </button>
              ) : (
                <button disabled className="disabled-btn">
                  Spot Unavailable
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParkingSpots;