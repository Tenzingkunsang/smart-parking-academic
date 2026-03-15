import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import ParkingSpots from './components/ParkingSpots';
import Profile from './pages/Profile';
import ForgotPassword from './pages/ForgotPassword';
import NotFound from './pages/NotFound';


// NEW COMPONENTS FOR THE BOOKING FLOW
import ReservationPage from './pages/ReservationPage';
import PaymentPage from './pages/PaymentPage';
import TicketPage from './pages/TicketPage.js';

import 'leaflet/dist/leaflet.css';
import './App.css';

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
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
            
            {/* The Booking Journey (Human-Friendly Flow) */}
            <Route 
              path="/reserve/:spotId" 
              element={
                <ProtectedRoute>
                  <ReservationPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/payment/:bookingId" 
              element={
                <ProtectedRoute>
                  <PaymentPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/ticket/:bookingId" 
              element={
                <ProtectedRoute>
                  <TicketPage />
                </ProtectedRoute>
              } 
            />

            {/* Auth Routes */}
            <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
            <Route path="/register" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />
            <Route path="/forgot-password" element={<PublicOnlyRoute><ForgotPassword /></PublicOnlyRoute>} />
            
            {/* User Profile & History */}
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/reservationpage" element={<ProtectedRoute><ReservationPage  /></ProtectedRoute>} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        
        <Footer />
      </div>
    </Router>
  );
}




export default App;