import React from 'react';
import { Link } from 'react-router-dom';
import { Home, Search } from 'lucide-react';

const NotFound = () => {
  return (
    <div className="page-container">
      <div className="not-found-container">
        <div className="not-found-content">
          <h1>404</h1>
          <h2>Page Not Found</h2>
          <p>Oops! The page you're looking for doesn't exist or has been moved.</p>
          
          <div className="not-found-actions">
            <Link to="/" className="btn primary-btn">
              <Home size={18} />
              Back to Home
            </Link>
            <Link to="/parking" className="btn secondary-btn">
              <Search size={18} />
              Find Parking
            </Link>
          </div>
          
          <div className="not-found-links">
            <p>Or try these pages:</p>
            <div className="links-grid">
              <Link to="/login">Login</Link>
              <Link to="/register">Register</Link>
              <Link to="/parking">Parking Spots</Link>
              <Link to="/profile">Profile</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;