import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminReservations.css';

const AdminReservations = () => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminAccess();
    fetchReservations();
  }, []);

  const checkAdminAccess = () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.userType !== 'admin') {
      navigate('/');
      alert('Admin access required');
    }
  };

  const fetchReservations = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5001/api/admin/reservations', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setReservations(data.data);
      } else {
        setError(data.message || 'Failed to fetch reservations');
      }
    } catch (err) {
      setError('Error fetching reservations');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const classes = {
      reserved: 'status-reserved',
      'checked-in': 'status-checked',
      completed: 'status-completed',
      cancelled: 'status-cancelled',
      expired: 'status-expired',
      'no-show': 'status-no-show'
    };
    return <span className={`status-badge ${classes[status] || ''}`}>{status}</span>;
  };

  if (loading) return <div className="admin-loading">Loading reservations...</div>;
  if (error) return <div className="admin-error">{error}</div>;

  return (
    <div className="admin-reservations">
      <div className="header">
        <h1>All Reservations</h1>
        <button onClick={() => navigate('/admin')} className="back-btn">Back to Dashboard</button>
      </div>
      <div className="reservations-table">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>User</th>
              <th>Location</th>
              <th>Spaces</th>
              <th>Duration</th>
              <th>Total</th>
              <th>Status</th>
              <th>Reserved At</th>
            </tr>
          </thead>
          <tbody>
            {reservations.map(res => (
              <tr key={res._id}>
                <td className="id">{res._id.slice(-6)}</td>
                <td>{res.user?.name || res.user?.email || 'N/A'}</td>
                <td>{res.parkingSpot?.locationName || 'N/A'}</td>
                <td>{res.quantity || 1}</td>
                <td>{res.duration} min</td>
                <td>NPR {res.totalAmount}</td>
                <td>{getStatusBadge(res.status)}</td>
                <td>{new Date(res.reservationTime).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminReservations;
