import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import '../styles/Navbar.css';

const Navbar = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

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

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    setUser(null);
    setIsAdmin(false);
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
              <p className="brand-subtitle">Parking System</p>
            </div>
          </Link>
        </div>

        <div className="nav-links">
          <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>
            Dashboard
          </Link>
          <Link to="/parking" className={`nav-link ${location.pathname === '/parking' ? 'active' : ''}`}>
            Parking Spots
          </Link>

          {isLoggedIn ? (
            <>
              <Link to="/reservations" className={`nav-link ${location.pathname === '/reservations' ? 'active' : ''}`}>
                My Reservations
              </Link>
              
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
