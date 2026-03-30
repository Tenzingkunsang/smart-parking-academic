import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './MyReservations.css';

const MyReservations = () => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check if coming from successful payment
    if (location.state?.success) {
      setSuccessMessage(location.state.message || 'Booking confirmed successfully!');
      // Clear the state after showing message
      setTimeout(() => setSuccessMessage(''), 5000);
    }
    fetchReservations();
  }, []);

  const fetchReservations = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5001/api/reservations/my', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setReservations(data.data);
      } else {
        setError(data.message || 'Failed to fetch reservations');
      }
    } catch (error) {
      console.error('Error fetching reservations:', error);
      setError('Failed to load reservations');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'reserved': { class: 'status-reserved', text: 'Reserved', icon: '⏰' },
      'checked-in': { class: 'status-checked-in', text: 'Checked In', icon: '✓' },
      'completed': { class: 'status-completed', text: 'Completed', icon: '✅' },
      'cancelled': { class: 'status-cancelled', text: 'Cancelled', icon: '❌' },
      'expired': { class: 'status-expired', text: 'Expired', icon: '⌛' },
      'no-show': { class: 'status-no-show', text: 'No Show (Auto-reallocated)', icon: '⚠️' }
    };
    const config = statusConfig[status] || statusConfig['reserved'];
    return (
      <span className={`status-badge ${config.class}`}>
        <span>{config.icon}</span>
        <span>{config.text}</span>
      </span>
    );
  };

  const getVehicleIcon = (type) => {
    return type === 'car' ? '🚗' : '🛵';
  };

  const handleViewTicket = (reservation) => {
    navigate('/ticket', {
      state: {
        spot: reservation.parkingSpot,
        duration: reservation.duration,
        totalAmount: reservation.totalAmount,
        paymentMethod: 'Khalti',
        bookingId: reservation._id
      }
    });
  };

  const handleCancelReservation = async (reservationId) => {
    if (!window.confirm('Are you sure you want to cancel this reservation?')) return;
    
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await fetch(`http://localhost:5001/api/reservations/${reservationId}/cancel`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (data.success) {
        alert('Reservation cancelled successfully');
        fetchReservations();
      } else {
        alert(data.message || 'Failed to cancel reservation');
      }
    } catch (error) {
      console.error('Error cancelling reservation:', error);
      alert('Failed to cancel reservation');
    }
  };

  if (loading) {
    return (
      <div className="reservations-loading">
        <div className="spinner"></div>
        <p>Loading your reservations...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="reservations-error">
        <div className="error-icon">⚠️</div>
        <h3>Error Loading Reservations</h3>
        <p>{error}</p>
        <button onClick={fetchReservations} className="retry-btn">Try Again</button>
      </div>
    );
  }

  return (
    <div className="reservations-container">
      <div className="reservations-hero">
        <h1>My Reservations</h1>
        <p>View and manage your parking bookings</p>
      </div>

      {successMessage && (
        <div className="success-banner">
          <div className="success-icon">✅</div>
          <div className="success-text">
            <strong>{successMessage}</strong>
          </div>
          <button className="close-btn" onClick={() => setSuccessMessage('')}>×</button>
        </div>
      )}

      <div className="info-banner">
        <div className="info-icon">ℹ️</div>
        <div className="info-text">
          <strong>Dynamic Reallocation:</strong> If you don't check in within 15 minutes of your reservation time, your spot will be automatically reallocated to other users. This helps maximize parking availability.
        </div>
      </div>

      <div className="reservations-content">
        {reservations.length === 0 ? (
          <div className="empty-reservations">
            <div className="empty-icon">📅</div>
            <h3>No Reservations Yet</h3>
            <p>You haven't made any parking reservations yet.</p>
            <button onClick={() => navigate('/parking')} className="book-now-btn">
              Find Parking Now
            </button>
          </div>
        ) : (
          <div className="reservations-list">
            {reservations.map((reservation) => (
              <div key={reservation._id} className="reservation-card">
                <div className="card-header">
                  <div className="spot-info">
                    <h3>{reservation.parkingSpot.locationName}</h3>
                    <p className="spot-address">
                      📍 {reservation.parkingSpot.location.address || 'Kathmandu'}
                    </p>
                  </div>
                  {getStatusBadge(reservation.status)}
                </div>

                <div className="card-details">
                  <div className="detail-row">
                    <span className="detail-label">Spot Number</span>
                    <span className="detail-value">#{reservation.parkingSpot.spotNumber}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Vehicle Type</span>
                    <span className="detail-value">
                      {getVehicleIcon(reservation.parkingSpot.vehicleType)} {reservation.parkingSpot.vehicleType}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Duration</span>
                    <span className="detail-value">{reservation.duration} minutes</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Reservation Time</span>
                    <span className="detail-value">
                      {new Date(reservation.reservationTime).toLocaleString()}
                    </span>
                  </div>
                  {reservation.checkInTime && (
                    <div className="detail-row">
                      <span className="detail-label">Check-in Time</span>
                      <span className="detail-value">
                        {new Date(reservation.checkInTime).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {reservation.checkOutTime && (
                    <div className="detail-row">
                      <span className="detail-label">Check-out Time</span>
                      <span className="detail-value">
                        {new Date(reservation.checkOutTime).toLocaleString()}
                      </span>
                    </div>
                  )}
                  <div className="detail-row">
                    <span className="detail-label">Total Amount</span>
                    <span className="detail-value amount">NPR {reservation.totalAmount || 0}</span>
                  </div>
                </div>

                <div className="card-actions">
                  {reservation.status === 'reserved' && (
                    <button 
                      onClick={() => handleViewTicket(reservation)}
                      className="action-btn view-ticket"
                    >
                      View Ticket
                    </button>
                  )}
                  {reservation.status === 'reserved' && (
                    <button 
                      onClick={() => handleCancelReservation(reservation._id)}
                      className="action-btn cancel"
                    >
                      Cancel
                    </button>
                  )}
                  {reservation.status === 'checked-in' && (
                    <button 
                      onClick={() => alert('Please check out at the parking location')}
                      className="action-btn check-out"
                    >
                      Check Out
                    </button>
                  )}
                  {reservation.status === 'completed' && (
                    <button 
                      onClick={() => handleViewTicket(reservation)}
                      className="action-btn view-ticket"
                    >
                      View Receipt
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyReservations;
