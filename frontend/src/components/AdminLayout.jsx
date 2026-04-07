import React from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import '../styles/AdminLayout.css';

const AdminLayout = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="admin-layout">
      <nav className="admin-navbar">
        <div className="admin-nav-container">
          <div className="admin-nav-brand">
            <Link to="/admin" className="admin-brand-link">
              <span className="admin-logo">SP</span>
              <span className="admin-title">SmartPark Admin</span>
            </Link>
          </div>
          <div className="admin-nav-links">
            <Link to="/admin" className="admin-nav-link">Dashboard</Link>
            <Link to="/admin/spots" className="admin-nav-link">Manage Spots</Link>
            <Link to="/admin/scan" className="admin-nav-link">QR Scanner</Link>
            <Link to="/admin/reservations" className="admin-nav-link">All Reservations</Link>
            <Link to="/admin/users" className="admin-nav-link">Users</Link>
            <button onClick={handleLogout} className="admin-logout-btn">Logout</button>
          </div>
        </div>
      </nav>
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
