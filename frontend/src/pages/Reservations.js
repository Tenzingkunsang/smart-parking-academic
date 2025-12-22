import React, { useState, useEffect, useCallback } from 'react'; // Added useCallback
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = 'http://localhost:5001/api';

const Reservations = () => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Wrap fetchReservations in useCallback to prevent infinite re-renders
  const fetchReservations = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const res = await axios.get(`${API_URL}/parking/my-reservations`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        setReservations(res.data.data);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to load reservations');
    } finally {
      setLoading(false);
    }
  }, [navigate]); // Add dependencies

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]); // Now fetchReservations is stable

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading reservations...</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>My Reservations</h1>
        <p>View and manage your parking reservations</p>
      </div>

      <div className="reservations-container">
        {reservations.length === 0 ? (
          <div className="empty-state">
            <h3>No Reservations Found</h3>
            <p>You haven't made any parking reservations yet.</p>
            <button 
              className="btn main-btn"
              onClick={() => navigate('/parking')}
            >
              Reserve a Parking Spot
            </button>
          </div>
        ) : (
          <>
            <div className="reservations-header">
              <h2>All Reservations ({reservations.length})</h2>
              <button 
                className="btn secondary-btn"
                onClick={() => navigate('/parking')}
              >
                Make New Reservation
              </button>
            </div>

            <div className="reservations-list">
              {reservations.map((res) => (
                <div key={res._id} className="reservation-card">
                  <div className="reservation-header">
                    <div>
                      <h3>Spot #{res.parkingSpot?.spotNumber}</h3>
                      <p className="reservation-date">
                        Reserved: {formatDate(res.reservationTime)}
                      </p>
                    </div>
                    <span className={`status-badge ${res.status}`}>
                      {res.status}
                    </span>
                  </div>
                  
                  <div className="reservation-details">
                    <div className="detail-row">
                      <span className="detail-label">Vehicle Type:</span>
                      <span className="detail-value">{res.parkingSpot?.vehicleType || 'Car'}</span>
                    </div>
                    
                    <div className="detail-row">
                      <span className="detail-label">Duration:</span>
                      <span className="detail-value">{res.duration} minutes</span>
                    </div>
                    
                    {res.checkInTime && (
                      <div className="detail-row">
                        <span className="detail-label">Check-in:</span>
                        <span className="detail-value">{formatDate(res.checkInTime)}</span>
                      </div>
                    )}
                    
                    {res.qrCodeData && (
                      <div className="qr-section">
                        <p className="detail-label">QR Code Data:</p>
                        <p className="qr-data">{res.qrCodeData.substring(0, 30)}...</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Reservations;