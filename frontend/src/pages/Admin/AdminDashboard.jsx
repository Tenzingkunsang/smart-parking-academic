import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalSpots: 0,
    availableSpots: 0,
    occupiedSpots: 0,
    reservedSpots: 0,
    totalUsers: 0,
    totalAdmins: 0,
    activeReservations: 0,
    todayRevenue: 0
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminAccess();
    fetchStats();
  }, []);

  const checkAdminAccess = () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.userType !== 'admin') {
      navigate('/');
      alert('Admin access required');
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5001/api/admin/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="admin-loading">Loading dashboard...</div>;

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>Admin Dashboard</h1>
        <p>Welcome back, Admin! Here's your parking system overview.</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">P</div>
          <div className="stat-info">
            <h3>Total Spots</h3>
            <p className="stat-number">{stats.totalSpots}</p>
          </div>
        </div>
        <div className="stat-card available">
          <div className="stat-icon">A</div>
          <div className="stat-info">
            <h3>Available</h3>
            <p className="stat-number">{stats.availableSpots}</p>
          </div>
        </div>
        <div className="stat-card occupied">
          <div className="stat-icon">O</div>
          <div className="stat-info">
            <h3>Occupied</h3>
            <p className="stat-number">{stats.occupiedSpots}</p>
          </div>
        </div>
        <div className="stat-card reserved">
          <div className="stat-icon">R</div>
          <div className="stat-info">
            <h3>Reserved</h3>
            <p className="stat-number">{stats.reservedSpots}</p>
          </div>
        </div>
        <div className="stat-card users">
          <div className="stat-icon">U</div>
          <div className="stat-info">
            <h3>Total Users</h3>
            <p className="stat-number">{stats.totalUsers}</p>
          </div>
        </div>
        <div className="stat-card admins">
          <div className="stat-icon">A</div>
          <div className="stat-info">
            <h3>Admins</h3>
            <p className="stat-number">{stats.totalAdmins}</p>
          </div>
        </div>
        <div className="stat-card revenue">
          <div className="stat-icon">$</div>
          <div className="stat-info">
            <h3>Today's Revenue</h3>
            <p className="stat-number">NPR {stats.todayRevenue}</p>
          </div>
        </div>
      </div>

      <div className="admin-actions">
        <button onClick={() => navigate('/admin/spots')} className="action-btn">
          Manage Parking Spots
        </button>
        <button onClick={() => navigate('/admin/scan')} className="action-btn scanner-btn">
          QR Scanner
        </button>
        <button onClick={() => navigate('/admin/users')} className="action-btn">
          Manage Users
        </button>
        <button onClick={() => navigate('/admin/reservations')} className="action-btn">
          All Reservations
        </button>
      </div>
    </div>
  );
};

export default AdminDashboard;
