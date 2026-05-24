import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { isTokenValid } from './config/api';
import { GoogleOAuthProvider } from '@react-oauth/google';
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
import AdminLayout from './components/AdminLayout';
import AdminDashboard from './pages/Admin/AdminDashboard';
import AdminSpots from './pages/Admin/AdminSpots';
import AdminReservations from './pages/Admin/AdminReservations';
import AdminUsers from './pages/Admin/AdminUsers';
import AdminScanner from './pages/Admin/AdminScanner';
import AdminManageSpots from './pages/Admin/AdminManageSpots';
import OnboardingHint from './components/ui/OnboardingHint';

import 'leaflet/dist/leaflet.css';
import 'sweetalert2/dist/sweetalert2.min.css';
import { Toaster } from 'react-hot-toast';
import './styles/tailwind.css';

// Purge stale auth keys without triggering a hard redirect (safe during render)
const clearAuthStorage = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('authToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
};

const ProtectedRoute = ({ children }) => {
  if (!isTokenValid()) {
    clearAuthStorage();
    return <Navigate to="/login" replace />;
  }
  return children;
};

const AdminRoute = ({ children }) => {
  if (!isTokenValid()) {
    clearAuthStorage();
    return <Navigate to="/login" replace />;
  }
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (user.userType !== 'admin') {
    return <Navigate to="/parking" replace />;
  }
  return children;
};

const PublicOnlyRoute = ({ children }) => {
  return !isTokenValid() ? children : <Navigate to="/" replace />;
};

function App() {
  return (
    <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID || ''}>
      <Router>
        <div className="min-h-screen bg-[#050505] selection:bg-cyan-500/30">
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 4000,
              className: 'app-toast',
              style: {
                background: '#0a0a0a',
                color: '#fff',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(20px)',
                borderRadius: '1rem',
                fontFamily: 'Inter, sans-serif'
              },
            }}
          />
          <Navbar />
          <OnboardingHint />
          
          <main>
            <Routes>
            {/* Discovery & Search */}
            <Route path="/" element={<Dashboard />} />
            <Route
              path="/parking"
              element={
                <ProtectedRoute>
                  <ParkingSpots />
                </ProtectedRoute>
              }
            />
            
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
            
            {/* Admin Routes — all wrapped in AdminLayout for persistent sidebar */}
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminLayout />
                </AdminRoute>
              }
            >
              <Route index element={<AdminDashboard />} />
              <Route path="spots" element={<AdminSpots />} />
              <Route path="reservations" element={<AdminReservations />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="qr-scanner" element={<AdminScanner />} />
              <Route path="manage-spots" element={<AdminManageSpots />} />
            </Route>
            
            {/* 404 - Not Found */}
            <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          
          <Footer />
        </div>
      </Router>
    </GoogleOAuthProvider>
  );
}

export default App;
