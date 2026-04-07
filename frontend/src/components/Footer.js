import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-content">
          <div className="footer-section">
            <h3>SmartPark</h3>
            <p>
              Reserve parking in seconds with real-time availability, secure digital payments,
              and clear reservation updates.
            </p>
            <p style={{ marginTop: '10px' }}>
              Designed for busy streets, SmartPark helps you find and book parking
              spots effortlessly, so you can focus on what matters most.
            </p>
          </div>
          
          <div className="footer-section">
            <h4>Quick Links</h4>
            <ul className="footer-list">
              <li>
                <Link to="/" style={{ color: 'inherit', textDecoration: 'none' }}>Home</Link>
              </li>
              <li>
                <Link to="/parking" style={{ color: 'inherit', textDecoration: 'none' }}>Find Parking</Link>
              </li>
              <li>
                <Link to="/reservations" style={{ color: 'inherit', textDecoration: 'none' }}>My Reservations</Link>
              </li>
              <li>
                <Link to="/notifications" style={{ color: 'inherit', textDecoration: 'none' }}>Notifications</Link>
              </li>
            </ul>
          </div>
          
          <div className="footer-section">
            <h4>How It Works</h4>
            <ul className="footer-list">
              <li>1. Reserve a spot with your preferred duration</li>
              <li>2. Check-in on time (QR support on the admin side)</li>
              <li>3. Checkout and receive payment confirmation</li>
              <li>4. Get notified about updates and action windows</li>
            </ul>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} SmartPark. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
