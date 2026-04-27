import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { API_BASE, getAuthToken } from '../config/api';
import '../styles/Navbar.css';

const Navbar = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewNotifications, setPreviewNotifications] = useState([]);
  const dropdownRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const token = getAuthToken();
    const userData = localStorage.getItem('user');
    
    setIsLoggedIn(!!token);
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      setIsAdmin(parsedUser.userType === 'admin');
    }
  }, [location]);

  useEffect(() => {
    if (!isLoggedIn) {
      setUnreadCount(0);
      setDropdownOpen(false);
      return;
    }

    const fetchUnreadCount = async () => {
      const t = getAuthToken();
      if (!t) return;
      try {
        const res = await fetch(`${API_BASE}/notifications/unread/count`, {
          headers: { Authorization: `Bearer ${t}` }
        });
        const data = await res.json();
        if (!data.success) return;
        setUnreadCount(data.data?.unreadCount || 0);
      } catch (e) {
        // Silently ignore; navbar should never block navigation
      }
    };

    fetchUnreadCount();
  }, [isLoggedIn, location.pathname]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!dropdownOpen) return;
      if (!dropdownRef.current) return;
      if (!dropdownRef.current.contains(e.target)) setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  const fetchPreview = async () => {
    const t = getAuthToken();
    if (!t) return;
    setPreviewLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/notifications?limit=50&skip=0&unreadOnly=false`,
        { headers: { Authorization: `Bearer ${t}` } }
      );
      const data = await res.json();
      if (!data.success) return;
      setPreviewNotifications(data.data?.notifications || []);
    } catch (e) {
      // keep preview empty on errors
      setPreviewNotifications([]);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleOpenNotifications = () => {
    setDropdownOpen((prev) => {
      const next = !prev;
      if (next) {
        fetchPreview();
        const t = getAuthToken();
        if (t) {
          fetch(`${API_BASE}/notifications/unread/count`, {
            headers: { Authorization: `Bearer ${t}` },
          })
            .then((r) => r.json())
            .then((data) => {
              if (data.success) setUnreadCount(data.data?.unreadCount || 0);
            })
            .catch(() => {});
        }
      }
      return next;
    });
  };

  const handleMarkAllRead = async () => {
    const t = getAuthToken();
    if (!t) return;
    try {
      await fetch(`${API_BASE}/notifications/read/all`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${t}`
        }
      });
      setUnreadCount(0);
      setPreviewNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (e) {
      // no-op
    }
  };

  const handleMarkRead = async (id) => {
    const t = getAuthToken();
    if (!t) return;
    try {
      await fetch(`${API_BASE}/notifications/${id}/read`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${t}`
        }
      });
      setPreviewNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (e) {
      // no-op
    }
  };

  const handleLogout = () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      }).catch(() => {});
    }
    localStorage.removeItem('token');
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    setUser(null);
    setIsAdmin(false);
    setUnreadCount(0);
    setDropdownOpen(false);
    navigate('/');
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        <div className="nav-brand">
          <Link to="/" className="brand-link">
            <div className="brand-logo">SP</div>
            <div>
              <h1 className="brand-title">SmartPark</h1>
              <p className="brand-subtitle">Smart Parking Reservation</p>
            </div>
          </Link>
        </div>

        <div className="nav-links">
          <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>
            Dashboard
          </Link>
          <Link to={isLoggedIn ? "/parking" : "/login"} className={`nav-link ${location.pathname === '/parking' ? 'active' : ''}`}>
            {isLoggedIn ? 'Parking Spots' : 'Explore Smart Parking'}
          </Link>

          {isLoggedIn ? (
            <>
              <Link to="/reservations" className={`nav-link ${location.pathname === '/reservations' ? 'active' : ''}`}>
                My Reservations
              </Link>

              <div className="notifications-wrapper" ref={dropdownRef}>
                <button
                  type="button"
                  className={`notifications-btn ${dropdownOpen ? 'active' : ''}`}
                  onClick={handleOpenNotifications}
                  aria-label="Open notifications"
                >
                  <span className="notifications-icon">🔔</span>
                  {unreadCount > 0 && <span className="notifications-badge">{unreadCount}</span>}
                </button>

                {dropdownOpen && (
                  <div className="notifications-dropdown" role="menu" aria-label="Notifications menu">
                    <div className="notifications-dropdown-header">
                      <div className="notifications-dropdown-title">Notifications</div>
                      <button
                        className="notifications-mark-all"
                        type="button"
                        onClick={handleMarkAllRead}
                        disabled={unreadCount === 0}
                      >
                        Mark all as read
                      </button>
                    </div>

                    {previewLoading ? (
                      <div className="notifications-dropdown-loading">
                        <div className="dropdown-spinner" />
                        <div className="dropdown-loading-text">Loading…</div>
                      </div>
                    ) : previewNotifications.length === 0 ? (
                      <div className="notifications-dropdown-empty">
                        <div className="dropdown-empty-icon">✓</div>
                        <div className="dropdown-empty-title">You’re all caught up</div>
                        <div className="dropdown-empty-text">No new updates right now.</div>
                      </div>
                    ) : (
                      <div className="notifications-dropdown-list">
                        {previewNotifications.map((n) => (
                          <div key={n._id} className={`notifications-dropdown-item ${n.read ? 'read' : 'unread'}`}>
                            <div className="dropdown-item-dot" />
                            <div className="dropdown-item-main">
                              <div className="dropdown-item-title">
                                {n.title}
                                {!n.read && <span className="dropdown-unread-pill">New</span>}
                              </div>
                              <div className="dropdown-item-message">{n.message}</div>
                            </div>
                            <div className="dropdown-item-actions">
                              {!n.read && (
                                <button
                                  type="button"
                                  className="dropdown-item-read-btn"
                                  onClick={() => handleMarkRead(n._id)}
                                >
                                  Read
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="notifications-dropdown-footer">
                      <Link
                        to="/notifications"
                        className="notifications-view-all"
                        onClick={() => setDropdownOpen(false)}
                      >
                        View all notifications
                      </Link>
                      <button
                        type="button"
                        className="notifications-close"
                        onClick={() => setDropdownOpen(false)}
                      >
                        Close
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              {isAdmin && (
                <>
                  <Link to="/admin" className={`nav-link admin-link ${location.pathname === '/admin' ? 'active' : ''}`}>
                    Admin Dashboard
                  </Link>
                  <Link to="/admin/spots" className={`nav-link admin-link ${location.pathname === '/admin/spots' ? 'active' : ''}`}>
                    Manage Spots
                  </Link>
                  <Link to="/admin/scan" className={`nav-link admin-link ${location.pathname === '/admin/scan' ? 'active' : ''}`}>
                    QR Scanner
                  </Link>
                </>
              )}
              
              <Link to="/profile" className={`nav-link ${location.pathname === '/profile' ? 'active' : ''}`}>
                Profile
              </Link>
              
              <div className="user-menu">
                <span className="user-name">
                  {isAdmin ? 'Admin' : 'User'} | {user?.name?.split(' ')[0] || 'User'}
                </span>
                <button className="btn logout-btn-small" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className={`nav-link ${location.pathname === '/login' ? 'active' : ''}`}>
                Login
              </Link>
              <Link to="/register" className="btn nav-btn">
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
