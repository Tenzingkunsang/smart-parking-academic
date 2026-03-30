import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Dashboard from './pages/user/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import ParkingSpots from './components/Parking/ParkingSpots';
import Profile from './pages/user/Profile';
import ForgotPassword from './pages/user/ForgotPassword';
import NotFound from './pages/user/NotFound';
import MyReservations from './pages/user/MyReservations';

// Booking flow components
import ReservationPage from './pages/user/ReservationPage';
import PaymentPage from './pages/user/PaymentPage';
import TicketPage from './pages/user/TicketPage';
import PaymentSuccess from './pages/user/PaymentSuccess';
import Notifications from './pages/user/Notifications';

// Admin components
import AdminDashboard from './pages/Admin/AdminDashboard';
import AdminSpots from './pages/Admin/AdminSpots';
import AdminReservations from './pages/Admin/AdminReservations';
import AdminUsers from './pages/Admin/AdminUsers';
import QRScannerPage from './pages/Admin/QRScannerPage';

import 'leaflet/dist/leaflet.css';
import './App.css';

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
};

const AdminRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  if (!token) {
    return <Navigate to="/login" />;
  }
  
  if (user.userType !== 'admin') {
    return <Navigate to="/parking" />;
  }
  
  return children;
};

const PublicOnlyRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return !token ? children : <Navigate to="/" />;
};

function App() {
  return (
    <Router>
      <div className="app">
        <Navbar />
        
        <main className="main-content">
          <Routes>
            {/* Discovery & Search */}
            <Route path="/" element={<Dashboard />} />
            <Route path="/parking" element={<ParkingSpots />} />
            
            {/* My Reservations */}
            <Route 
              path="/reservations" 
              element={
                <ProtectedRoute>
                  <MyReservations />
                </ProtectedRoute>
              } 
            />
            
            {/* Booking Journey */}
            <Route 
              path="/payment" 
              element={
                <ProtectedRoute>
                  <PaymentPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/ticket" 
              element={
                <ProtectedRoute>
                  <TicketPage />
                </ProtectedRoute>
              } 
            />
            <Route path="/payment-success" element={<PaymentSuccess />} />
            
            {/* Alternative booking route */}
            <Route 
              path="/reserve/:spotId" 
              element={
                <ProtectedRoute>
                  <ReservationPage />
                </ProtectedRoute>
              } 
            />

            {/* Auth Routes */}
            <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
            <Route path="/register" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />
            <Route path="/forgot-password" element={<PublicOnlyRoute><ForgotPassword /></PublicOnlyRoute>} />
            
            {/* User Profile */}
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            
            {/* Notifications */}
            <Route
              path="/notifications"
              element={
                <ProtectedRoute>
                  <Notifications />
                </ProtectedRoute>
              }
            />
            
            {/* Admin Routes */}
            <Route 
              path="/admin" 
              element={
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              } 
            />
            <Route 
              path="/admin/spots" 
              element={
                <AdminRoute>
                  <AdminSpots />
                </AdminRoute>
              } 
            />
            <Route 
              path="/admin/reservations" 
              element={
                <AdminRoute>
                  <AdminReservations />
                </AdminRoute>
              } 
            />
            <Route 
              path="/admin/users" 
              element={
                <AdminRoute>
                  <AdminUsers />
                </AdminRoute>
              } 
            />
            <Route 
              path="/admin/scan" 
              element={
                <AdminRoute>
                  <QRScannerPage />
                </AdminRoute>
              } 
            />
            
            {/* 404 - Not Found */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        
        <Footer />
      </div>
    </Router>
  );
}

export default App;
