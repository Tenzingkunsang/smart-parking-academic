import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Bell, LogOut, CarFront, Moon, Sun } from 'lucide-react';
import { API_BASE, getAuthToken } from '../config/api';
import { useThemeMode } from '../theme/ThemeProvider';
import './Navbar.css';

const Navbar = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [preview, setPreview] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { theme, toggleTheme } = useThemeMode();
  const location = useLocation();
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    setIsLoggedIn(!!token);
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      setIsAdmin(parsedUser.userType === 'admin');
    }
  }, [location]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
    setUnreadCount(0);
    setPreview([]);
    navigate('/');
  };

  const refreshNotifications = async () => {
    const token = getAuthToken();
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE}/notifications/unread/count`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setUnreadCount(data.data?.unreadCount || 0);
    } catch (e) {
      // ignore
    }

    try {
      const res = await fetch(`${API_BASE}/notifications?limit=8&skip=0`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setPreview(data.data?.notifications || []);
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    if (!isLoggedIn) {
      setUnreadCount(0);
      setPreview([]);
      return;
    }
    refreshNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, location.pathname]);

  useEffect(() => {
    if (!isLoggedIn || !dropdownOpen) return;
    refreshNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dropdownOpen]);

  useEffect(() => {
    if (!isLoggedIn) return;
    const tick = () => {
      const token = getAuthToken();
      if (!token) return;
      fetch(`${API_BASE}/notifications/unread/count`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.success) setUnreadCount(data.data?.unreadCount || 0);
        })
        .catch(() => {});
    };
    const id = setInterval(tick, 45000);
    return () => clearInterval(id);
  }, [isLoggedIn]);

  useEffect(() => {
    if (!dropdownOpen) return;
    const handleClickOutside = (e) => {
      if (!dropdownRef.current) return;
      if (!dropdownRef.current.contains(e.target)) setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  const markRead = async (id) => {
    try {
      const token = getAuthToken();
      if (!token) return;

      await fetch(`${API_BASE}/notifications/${id}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });

      setPreview((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (e) {
      // ignore
    }
  };

  return (
    <nav className={`navbar ${isScrolled ? 'scrolled' : ''}`} role="navigation" aria-label="Main">
      <div className="nav-container">
        <Link to="/" className="nav-logo">
          <div className="logo-icon" aria-hidden>
            <CarFront size={22} strokeWidth={2} />
          </div>
          <span className="logo-text">SmartPark</span>
        </Link>

        <div className="nav-links">
          <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>
            Dashboard
          </Link>
          <Link
            to="/parking"
            className={`nav-link ${location.pathname === '/parking' ? 'active' : ''}`}
          >
            Parking
          </Link>
          {isLoggedIn && (
            <Link
              to="/reservations"
              className={`nav-link ${location.pathname === '/reservations' ? 'active' : ''}`}
            >
              Reservations
            </Link>
          )}
          {isAdmin && isLoggedIn && (
            <>
              <Link
                to="/admin"
                className={`nav-link admin-link ${location.pathname === '/admin' ? 'active' : ''}`}
              >
                Admin
              </Link>
              <Link
                to="/admin/spots"
                className={`nav-link admin-link ${location.pathname === '/admin/spots' ? 'active' : ''}`}
              >
                Spots
              </Link>
              <Link
                to="/admin/scan"
                className={`nav-link admin-link ${location.pathname === '/admin/scan' ? 'active' : ''}`}
              >
                Scanner
              </Link>
            </>
          )}
        </div>

        <div className="nav-actions">
          {isLoggedIn ? (
            <div className="nav-actions-inner">
              <div className="notif-dropdown-wrap" ref={dropdownRef}>
                <button
                  type="button"
                  className="notif-bell-btn"
                  aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
                  aria-expanded={dropdownOpen}
                  aria-haspopup="true"
                  onClick={() => setDropdownOpen((v) => !v)}
                >
                  <Bell size={20} strokeWidth={2} />
                  {unreadCount > 0 && (
                    <span className="notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
                  )}
                </button>

                {dropdownOpen && (
                  <div className="notif-dropdown">
                    <div className="notif-dropdown-header">
                      <span>Notifications</span>
                      {unreadCount > 0 && (
                        <span className="notif-header-pill">{unreadCount} unread</span>
                      )}
                    </div>

                    {preview.length === 0 ? (
                      <div className="notif-empty">No notifications yet.</div>
                    ) : (
                      <div className="notif-items">
                        {preview.map((n) => (
                          <button
                            key={n._id}
                            type="button"
                            className={`notif-item ${n.read ? 'read' : 'unread'}`}
                            onClick={async () => {
                              if (!n.read) await markRead(n._id);
                              setDropdownOpen(false);
                              navigate('/notifications');
                            }}
                          >
                            <div className="notif-item-title">{n.title}</div>
                            <div className="notif-item-message">{n.message}</div>
                            <div className="notif-item-time">
                              {new Date(n.createdAt).toLocaleString()}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="notif-dropdown-footer">
                      <button
                        type="button"
                        className="notif-view-all-btn"
                        onClick={() => {
                          setDropdownOpen(false);
                          navigate('/notifications');
                        }}
                      >
                        View all
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <Link
                to="/profile"
                className="nav-profile-btn"
                aria-label="Profile"
                title="Profile"
              >
                <span className="nav-avatar-fallback">
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </Link>

              <button type="button" className="logout-btn" onClick={handleLogout} aria-label="Sign out">
                <LogOut size={18} strokeWidth={2} aria-hidden />
                <span>Sign out</span>
              </button>
              <button type="button" className="logout-btn" onClick={toggleTheme} aria-label="Toggle theme">
                {theme === 'dark' ? <Sun size={18} strokeWidth={2} aria-hidden /> : <Moon size={18} strokeWidth={2} aria-hidden />}
              </button>
            </div>
          ) : (
            <div className="auth-buttons">
              <Link to="/login" className="login-btn">
                Sign in
              </Link>
              <Link to="/register" className="register-btn">
                Get started
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
