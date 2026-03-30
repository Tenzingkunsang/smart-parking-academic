import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Notifications.css';

const API_BASE = 'http://localhost:5001/api';

const Notifications = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [filter, setFilter] = useState('all'); // all | unread
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const token = useMemo(() => localStorage.getItem('token'), []);

  const fetchUnreadCount = async () => {
    const res = await fetch(`${API_BASE}/notifications/unread/count`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Failed to load notifications count');
    setUnreadCount(data.data?.unreadCount || 0);
  };

  const fetchNotifications = async () => {
    setLoading(true);
    setError('');
    try {
      const unreadOnly = filter === 'unread';
      const res = await fetch(
        `${API_BASE}/notifications?limit=50&skip=0&unreadOnly=${unreadOnly}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to load notifications');
      }

      setNotifications(data.data?.notifications || []);
    } catch (e) {
      setError(e.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetchUnreadCount().catch(() => {});
    fetchNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const handleMarkAllRead = async () => {
    try {
      await fetch(`${API_BASE}/notifications/read/all`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      setUnreadCount(0);
      setFilter('all');
      await fetchNotifications();
    } catch (e) {
      setError('Could not update notifications. Please try again.');
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await fetch(`${API_BASE}/notifications/${id}/read`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true, readAt: new Date().toISOString() } : n))
      );
      fetchUnreadCount().catch(() => {});
    } catch (e) {
      setError('Could not mark notification as read.');
    }
  };

  return (
    <div className="notifications-page">
      <div className="notifications-hero">
        <h1>Notifications</h1>
        <p>
          Stay updated with reservation updates and payment confirmations.
          {unreadCount > 0 ? ` You have ${unreadCount} unread message(s).` : ' You’re all caught up.'}
        </p>
        <p style={{ marginTop: '0.6rem', color: 'var(--gray-medium)', fontSize: '0.95rem' }}>
          You’ll always see updates here in the app. If email notifications are enabled on the server,
          we’ll also send them to your Gmail address.
        </p>
      </div>

      <div className="notifications-content">
        <div className="notifications-toolbar">
          <div className="segmented">
            <button
              className={`seg-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
              type="button"
            >
              All
            </button>
            <button
              className={`seg-btn ${filter === 'unread' ? 'active' : ''}`}
              onClick={() => setFilter('unread')}
              type="button"
            >
              Unread
            </button>
          </div>

          <button
            className="mark-all-btn"
            type="button"
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
          >
            Mark all as read
          </button>
        </div>

        {loading ? (
          <div className="notifications-loading">
            <div className="spinner" />
            <p>Loading notifications…</p>
          </div>
        ) : error ? (
          <div className="notifications-error">
            <div className="error-icon">⚠️</div>
            <h3>Couldn’t load notifications</h3>
            <p>{error}</p>
            <button className="retry-btn" type="button" onClick={() => { setError(''); fetchNotifications(); }}>
              Try again
            </button>
          </div>
        ) : notifications.length === 0 ? (
          <div className="notifications-empty">
            <div className="empty-icon">🔔</div>
            <h3>{filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}</h3>
            <p>
              {filter === 'unread'
                ? 'When something important happens, it will show up here instantly.'
                : 'Your payment confirmations and reservation updates will appear here.'}
            </p>
            <button className="primary-ghost-btn" type="button" onClick={() => navigate('/parking')}>
              Find parking
            </button>
          </div>
        ) : (
          <div className="notifications-list">
            {notifications.map((n) => (
              <div
                key={n._id}
                className={`notification-card ${n.read ? 'read' : 'unread'}`}
              >
                <div className="notification-left">
                  <div className="notification-dot" />
                </div>
                <div className="notification-main">
                  <div className="notification-title-row">
                    <div className="notification-title">{n.title}</div>
                    {!n.read && <span className="unread-pill">New</span>}
                  </div>
                  <div className="notification-message">{n.message}</div>
                  <div className="notification-meta">
                    <span>{new Date(n.createdAt).toLocaleString()}</span>
                  </div>
                </div>
                <div className="notification-actions">
                  {!n.read && (
                    <button
                      type="button"
                      className="small-btn"
                      onClick={() => handleMarkRead(n._id)}
                    >
                      Mark read
                    </button>
                  )}
                  <button
                    type="button"
                    className="small-btn secondary"
                    onClick={() => navigate('/reservations')}
                  >
                    View bookings
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;

