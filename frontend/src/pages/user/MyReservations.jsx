import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import toast from 'react-hot-toast';
import { Search } from 'lucide-react';
import { API_BASE } from '../../config/api';
import './MyReservations.css';

const MyReservations = () => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancellingId, setCancellingId] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.success) {
      toast.success(location.state.message || 'Booking confirmed!');
    }
    fetchReservations();
  }, [location.state?.success, location.state?.message]);

  const fetchReservations = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/reservations/my`, {
        headers: { 'Authorization': `Bearer ${token}` }
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

  const getStatusConfig = (status) => {
    const configs = {
      'reserved': { 
        class: 'status-reserved', 
        text: 'Confirmed', 
        icon: '✓',
        color: '#2563eb',
        bg: 'rgba(37, 99, 235, 0.1)'
      },
      'checked-in': { 
        class: 'status-checked-in', 
        text: 'Active', 
        icon: '●',
        color: '#10b981',
        bg: 'rgba(16, 185, 129, 0.1)'
      },
      'completed': { 
        class: 'status-completed', 
        text: 'Completed', 
        icon: '✓',
        color: '#6b7280',
        bg: 'rgba(107, 114, 128, 0.1)'
      },
      'cancelled': { 
        class: 'status-cancelled', 
        text: 'Cancelled', 
        icon: '✕',
        color: '#ef4444',
        bg: 'rgba(239, 68, 68, 0.1)'
      },
      'expired': { 
        class: 'status-expired', 
        text: 'Expired', 
        icon: '!',
        color: '#f59e0b',
        bg: 'rgba(245, 158, 11, 0.1)'
      }
    };
    return configs[status] || configs['reserved'];
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit'
    });
  };

  const handleViewTicket = (reservation) => {
    navigate('/ticket', {
      state: {
        spot: reservation.parkingSpot,
        duration: reservation.duration,
        totalAmount: reservation.finalAmount || reservation.totalAmount,
        paymentMethod: reservation.paymentMethod || 'khalti',
        bookingId: reservation._id,
        createdAt: reservation.createdAt,
        scheduledArrival: reservation.scheduledArrival,
        paymentStatus: reservation.paymentStatus || 'pending',
        status: reservation.status
      }
    });
  };

  const handleCancelReservation = async (reservationId) => {
    const result = await Swal.fire({
      title: 'Cancel this reservation?',
      html: '<p style="text-align:left;margin:0;font-size:15px;line-height:1.5">This action cannot be undone. Your spot will be released and may be booked by another driver.</p>',
      icon: 'warning',
      showCancelButton: true,
      focusCancel: true,
      confirmButtonText: 'Yes, cancel',
      cancelButtonText: 'Keep booking',
      confirmButtonColor: '#6366f1',
      cancelButtonColor: '#64748b',
      background: '#1e293b',
      color: '#f1f5f9',
    });

    if (!result.isConfirmed) return;

    setCancellingId(reservationId);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/reservations/${reservationId}/cancel`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      
      if (data.success) {
        toast.success('Booking cancelled.');
        fetchReservations();
      } else {
        toast.error(data.message || 'Failed to cancel reservation');
      }
    } catch (error) {
      console.error('Error cancelling reservation:', error);
      toast.error('Failed to cancel reservation. Please try again.');
    } finally {
      setCancellingId(null);
    }
  };

  const handleCheckOut = (reservation) => {
    if (window.confirm('Confirm check-out? This will complete your parking session.')) {
      alert('Check-out initiated. Please visit the parking exit gate.');
    }
  };

  if (loading) {
    return (
      <div className="reservations-loading">
        <div className="loading-spinner"></div>
        <p>Loading your reservations...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="reservations-error">
        <div className="error-icon">⚠️</div>
        <h3>Unable to Load Reservations</h3>
        <p>{error}</p>
        <button onClick={fetchReservations} className="retry-button">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="reservations-page">
      {/* Page Header - Full Width */}
      <div className="page-header">
        <div className="header-content">
          <div>
            <h1>My Reservations</h1>
            <p>View and manage your parking bookings</p>
          </div>
          <button className="book-new-btn" onClick={() => navigate('/parking')}>
            + New Booking
          </button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="info-banner">
        <div className="banner-container">
          <div className="banner-icon">ℹ️</div>
          <div className="banner-text">
            <strong>Important:</strong> If you don't check in within 15 minutes of your reservation time, 
            your spot may be reallocated to other users.
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="reservations-container">
        {reservations.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon empty-icon-svg" aria-hidden>
              <Search size={48} strokeWidth={1.25} />
            </div>
            <h3>No reservations yet</h3>
            <p>Nothing to show here. Search for a zone and book a spot — your sessions will appear in this list.</p>
            <button type="button" className="find-parking-btn" onClick={() => navigate('/parking')}>
              Find parking
            </button>
          </div>
        ) : (
          <div className="reservations-grid">
            {reservations.map((reservation) => {
              const statusConfig = getStatusConfig(reservation.status);
              
              return (
                <div key={reservation._id} className="reservation-card">
                  {/* Card Header */}
                  <div className="card-header">
                    <div className="spot-info">
                      <h3>{reservation.parkingSpot?.locationName || 'Parking Spot'}</h3>
                      <div className="spot-location">
                        📍 {reservation.parkingSpot?.location?.address || 'Kathmandu, Nepal'}
                      </div>
                    </div>
                    <div 
                      className="status-badge"
                      style={{
                        background: statusConfig.bg,
                        color: statusConfig.color
                      }}
                    >
                      <span className="status-icon">{statusConfig.icon}</span>
                      <span>{statusConfig.text}</span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="card-body">
                    <div className="details-grid">
                      <div className="detail-item">
                        <label>Spot Number</label>
                        <span>#{reservation.parkingSpot?.spotNumber || 'N/A'}</span>
                      </div>
                      <div className="detail-item">
                        <label>Vehicle Type</label>
                        <span>
                          {reservation.parkingSpot?.vehicleType === 'car' ? '🚗 Car' : '🛵 Bike'}
                        </span>
                      </div>
                      <div className="detail-item">
                        <label>Duration</label>
                        <span>{reservation.duration} mins</span>
                      </div>
                      <div className="detail-item">
                        <label>Scheduled Date</label>
                        <span>{formatDate(reservation.scheduledArrival || reservation.reservationTime)}</span>
                      </div>
                      <div className="detail-item">
                        <label>Scheduled Time</label>
                        <span>{formatTime(reservation.scheduledArrival || reservation.reservationTime)}</span>
                      </div>
                      <div className="detail-item">
                        <label>Total Amount</label>
                        <span className="amount">Rs. {reservation.finalAmount || reservation.totalAmount || 0}</span>
                      </div>
                      <div className="detail-item">
                        <label>Payment</label>
                        <span>
                          {reservation.paymentMethod === 'cash' ? 'Pay on Spot' : 'Khalti'} · {reservation.paymentStatus || 'pending'}
                        </span>
                      </div>
                    </div>

                    {reservation.checkInTime && (
                      <div className="checkin-info">
                        <div className="checkin-icon">✓</div>
                        <div>
                          <strong>Checked in</strong> at {formatTime(reservation.checkInTime)}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Footer */}
                  <div className="card-footer">
                    {reservation.status === 'reserved' && (
                      <>
                        <button 
                          className="btn-view-ticket"
                          onClick={() => handleViewTicket(reservation)}
                        >
                          View Ticket
                        </button>
                        <button 
                          className="btn-cancel"
                          onClick={() => handleCancelReservation(reservation._id)}
                          disabled={cancellingId === reservation._id}
                        >
                          {cancellingId === reservation._id ? 'Cancelling...' : 'Cancel'}
                        </button>
                      </>
                    )}
                    
                    {reservation.status === 'checked-in' && (
                      <>
                        <button 
                          className="btn-view-ticket"
                          onClick={() => handleViewTicket(reservation)}
                        >
                          View Ticket
                        </button>
                        <button 
                          className="btn-checkout"
                          onClick={() => handleCheckOut(reservation)}
                        >
                          Check Out
                        </button>
                      </>
                    )}
                    
                    {reservation.status === 'completed' && (
                      <button 
                        className="btn-view-receipt"
                        onClick={() => handleViewTicket(reservation)}
                      >
                        View Receipt
                      </button>
                    )}
                    
                    {(reservation.status === 'cancelled' || reservation.status === 'expired') && (
                      <div className="inactive-message">
                        {reservation.status === 'cancelled' ? 'This booking was cancelled' : 'This booking has expired'}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyReservations;