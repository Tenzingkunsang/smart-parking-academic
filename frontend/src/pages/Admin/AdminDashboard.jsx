import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card';
import Skeleton from '../../components/ui/Skeleton';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalSpots: 0,
    availableSpots: 0,
    occupiedSpots: 0,
    reservedSpots: 0,
    totalUsers: 0,
    activeReservations: 0,
    todayRevenue: 0,
    noShowCount: 0,
    peakUsageByHour: []
  });
  const [loading, setLoading] = useState(true);
  const [jobMetrics, setJobMetrics] = useState(null);
  const [failedJobs, setFailedJobs] = useState([]);
  const navigate = useNavigate();

  const checkAdminAccess = useCallback(() => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (!token || user.userType !== 'admin') {
      navigate('/parking');
      alert('Admin access required');
    }
  }, [navigate]);

  const fetchStats = useCallback(async () => {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await fetch('http://localhost:5001/api/admin/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }

      const metricsRes = await fetch('http://localhost:5001/api/admin/jobs/metrics', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const metricsData = await metricsRes.json();
      if (metricsData.success) setJobMetrics(metricsData.data);

      const failedRes = await fetch('http://localhost:5001/api/admin/jobs/failed', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const failedData = await failedRes.json();
      if (failedData.success) setFailedJobs(failedData.data || []);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const retryJob = async (jobId) => {
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    await fetch(`http://localhost:5001/api/admin/jobs/${jobId}/retry`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
    fetchStats();
  };

  useEffect(() => {
    checkAdminAccess();
    fetchStats();
  }, [checkAdminAccess, fetchStats]);

  if (loading) {
    return (
      <div className="admin-loading">
        <Card style={{ width: 'min(700px, 94vw)', padding: 18 }}>
          <Skeleton height={22} width="30%" />
          <Skeleton height={14} width="65%" style={{ marginTop: 10 }} />
          <Skeleton height={120} width="100%" style={{ marginTop: 14 }} />
        </Card>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>Admin Dashboard</h1>
        <p>Manage parking spots, view analytics, and monitor check-ins</p>
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
        <div className="stat-card revenue">
          <div className="stat-icon">$</div>
          <div className="stat-info">
            <h3>Today's Revenue</h3>
            <p className="stat-number">NPR {stats.todayRevenue}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">N</div>
          <div className="stat-info">
            <h3>No-shows</h3>
            <p className="stat-number">{stats.noShowCount}</p>
          </div>
        </div>
      </div>

      <div className="admin-actions" style={{ marginTop: 12 }}>
        <button className="action-btn" disabled>
          Peak hours: {(stats.peakUsageByHour || []).map((p) => `${p._id}:00`).join(', ') || 'No data'}
        </button>
      </div>

      {jobMetrics && (
        <div className="admin-actions" style={{ marginTop: 12 }}>
          <button className="action-btn" disabled>
            Jobs: pending {jobMetrics.pending} · failed {jobMetrics.failed} · avg latency {jobMetrics.avgLatencyMs}ms
          </button>
        </div>
      )}

      {failedJobs.length > 0 && (
        <div className="admin-actions" style={{ marginTop: 12, flexDirection: 'column', alignItems: 'stretch' }}>
          {failedJobs.slice(0, 5).map((job) => (
            <button key={job._id} onClick={() => retryJob(job._id)} className="action-btn">
              Retry {job.type} ({job.lastError || 'no error'})
            </button>
          ))}
        </div>
      )}

      <div className="admin-actions">
        <button onClick={() => navigate('/admin/spots')} className="action-btn">
          Manage Parking Spots
        </button>
        <button onClick={() => navigate('/admin/reservations')} className="action-btn">
          View All Reservations
        </button>
        <button onClick={() => navigate('/admin/users')} className="action-btn">
          Manage Users
        </button>
        <button onClick={() => navigate('/admin/scan')} className="action-btn scanner-btn">
          QR Scanner
        </button>
      </div>
    </div>
  );
};

export default AdminDashboard;