import React from 'react';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-content">
          <div className="footer-section">
            <h3>Smart Parking System</h3>
            <p>Academic Project 2025/2026</p>
            <p>University of Wolverhampton</p>
          </div>
          
          <div className="footer-section">
            <h4>Student Information</h4>
            <p>Tenzing Kunsang Sherpa</p>
            <p>Group: L6CG4</p>
            <p>Supervisor: Adhish Suwal</p>
          </div>
          
          <div className="footer-section">
            <h4>Project Features</h4>
            <ul className="footer-list">
              <li>Real-time Parking Management</li>
              <li>Reservation System</li>
              <li>Automatic Expiry</li>
              <li>User Authentication</li>
            </ul>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p>© 2025 Smart Parking System - Academic Project. Built with React, Node.js & MongoDB.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
