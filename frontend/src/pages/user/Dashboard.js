import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Car, 
  Clock, 
  MapPin, 
  User, 
  Calendar,
  Settings,
  LogOut,
  ChevronRight,
  Shield,
  Zap,
  BarChart3,
  Smartphone
} from 'lucide-react';
import '../../styles/Dashboard.css';const API_URL = 'http://localhost:5001/api';

const Dashboard = () => {
  const [parkingStats, setParkingStats] = useState({
    total: 156,
    available: 89,
    occupied: 42,
    reserved: 25,
    efficiency: '87%'
  });
  const [realtimeData, setRealtimeData] = useState({
    peakHours: '8-10 AM, 4-6 PM',
    averageStay: '2.3 hours',
    monthlyUsers: '1,245',
    lastUpdated: new Date().toLocaleTimeString()
  });
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
    fetchDashboardData();
    // Simulate real-time updates
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const checkAuth = () => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    setIsLoggedIn(!!token && !!user);
  };

  const fetchDashboardData = async () => {
    try {
      // In a real app, this would be your actual API call
      // For demo, we're using mock data
      const mockData = {
        total: Math.floor(Math.random() * 50) + 150,
        available: Math.floor(Math.random() * 40) + 80,
        occupied: Math.floor(Math.random() * 30) + 40,
        reserved: Math.floor(Math.random() * 20) + 20,
        efficiency: `${Math.floor(Math.random() * 10) + 85}%`
      };
      setParkingStats(mockData);
      setRealtimeData(prev => ({
        ...prev,
        lastUpdated: new Date().toLocaleTimeString()
      }));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading parking analytics...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-page">

      {/* Welcome & Quick Stats */}
      <div className="welcome-section">
        <div className="welcome-card">
          <div className="welcome-content">
            <h2>Optimize Your Parking Experience</h2>
            <p>
              Real-time parking analytics and management platform. 
              Monitor occupancy, manage reservations, and improve parking efficiency 
              with intelligent insights.
            </p>
            <div className="quick-stats">
              <div className="quick-stat">
                <Shield size={20} />
                <div>
                  <div className="stat-number">{parkingStats.efficiency}</div>
                  <div className="stat-label">System Efficiency</div>
                </div>
              </div>
              <div className="quick-stat">
                <Clock size={20} />
                <div>
                  <div className="stat-number">{realtimeData.averageStay}</div>
                  <div className="stat-label">Avg. Stay Time</div>
                </div>
              </div>
              <div className="quick-stat">
                <User size={20} />
                <div>
                  <div className="stat-number">{realtimeData.monthlyUsers}</div>
                  <div className="stat-label">Monthly Users</div>
                </div>
              </div>
            </div>
          </div>
          <div className="cta-section">
            <button 
              className="primary-button"
              onClick={() => isLoggedIn ? navigate('/parking') : navigate('/login')}
            >
              {isLoggedIn ? 'Book Parking Now' : 'Get Started'}
              <ChevronRight size={18} />
            </button>
            <button 
              className="secondary-button"
              onClick={() => navigate('/parking')}
            >
              View Live Map
              <MapPin size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="stats-section">
        <div className="section-header">
          <h3 className="section-title">
            <BarChart3 size={20} />
            Parking Analytics
          </h3>
          <div className="last-updated">
            Updated: {realtimeData.lastUpdated}
          </div>
        </div>
        <div className="stats-container">
          <div className="stat-card main-stat">
            <div className="stat-content">
              <div className="stat-label">Total Capacity</div>
              <div className="stat-value">{parkingStats.total}</div>
              <div className="stat-desc">Parking spots across 3 zones</div>
            </div>
            <div className="stat-icon">
              <Car size={24} />
            </div>
          </div>
          
          <div className="stat-card available">
            <div className="stat-content">
              <div className="stat-label">Available Now</div>
              <div className="stat-value">{parkingStats.available}</div>
              <div className="stat-desc">Ready for immediate use</div>
            </div>
          </div>
          
          <div className="stat-card reserved">
            <div className="stat-content">
              <div className="stat-label">Pre-booked</div>
              <div className="stat-value">{parkingStats.reserved}</div>
              <div className="stat-desc">Reserved for later use</div>
            </div>
          </div>
          
          <div className="stat-card occupied">
            <div className="stat-content">
              <div className="stat-label">Currently Occupied</div>
              <div className="stat-value">{parkingStats.occupied}</div>
              <div className="stat-desc">In active use</div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Cards */}
      <div className="actions-section">
        <h3 className="section-title">
          <Zap size={20} />
          Quick Actions
        </h3>
        <div className="actions-grid">
          <div 
            className="action-card" 
            onClick={() => navigate('/parking')}
          >
            <div className="action-icon">
              <MapPin size={24} />
            </div>
            <div className="action-content">
              <div className="action-title">Live Parking Map</div>
              <div className="action-desc">Interactive map with real-time availability</div>
            </div>
            <ChevronRight size={18} className="action-arrow" />
          </div>
          
          <div 
            className="action-card" 
            onClick={() => isLoggedIn ? navigate('/reservations') : navigate('/login')}
          >
            <div className="action-icon">
              <Calendar size={24} />
            </div>
            <div className="action-content">
              <div className="action-title">Manage Bookings</div>
              <div className="action-desc">View, modify, or cancel reservations</div>
            </div>
            <ChevronRight size={18} className="action-arrow" />
          </div>
          
          <div 
            className="action-card" 
            onClick={() => isLoggedIn ? navigate('/profile') : navigate('/register')}
          >
            <div className="action-icon">
              <User size={24} />
            </div>
            <div className="action-content">
              <div className="action-title">
                {isLoggedIn ? 'Account Settings' : 'Create Account'}
              </div>
              <div className="action-desc">
                {isLoggedIn ? 'Update profile & preferences' : 'Join SmartPark today'}
              </div>
            </div>
            <ChevronRight size={18} className="action-arrow" />
          </div>
          
          <div 
            className="action-card" 
            onClick={() => navigate('/analytics')}
          >
            <div className="action-icon">
              <BarChart3 size={24} />
            </div>
            <div className="action-content">
              <div className="action-title">Advanced Analytics</div>
              <div className="action-desc">Usage reports & trend analysis</div>
            </div>
            <ChevronRight size={18} className="action-arrow" />
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="features-section">
        <div className="section-header">
          <h3 className="section-title">Why Choose SmartPark?</h3>
          <p className="section-subtitle">Enterprise-grade parking solutions</p>
        </div>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">
              <Zap size={24} />
            </div>
            <h4>Real-time Monitoring</h4>
            <p>Live updates on parking availability with 99.9% accuracy</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">
              <Smartphone size={24} />
            </div>
            <h4>Mobile Integration</h4>
            <p>Seamless mobile experience with push notifications</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">
              <Shield size={24} />
            </div>
            <h4>Secure & Reliable</h4>
            <p>Bank-level security for all transactions and data</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">
              <Settings size={24} />
            </div>
            <h4>Scalable Infrastructure</h4>
            <p>Handles thousands of concurrent users with ease</p>
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="status-section">
        <div className="status-card">
          <div className="status-header">
            <h4>System Status</h4>
            <div className="status-indicator active">
              <div className="status-dot"></div>
              All Systems Operational
            </div>
          </div>
          <div className="status-details">
            <div className="status-item">
              <span>API Response Time</span>
              <span className="status-value">47ms</span>
            </div>
            <div className="status-item">
              <span>Database Uptime</span>
              <span className="status-value">99.95%</span>
            </div>
            <div className="status-item">
              <span>Active Sessions</span>
              <span className="status-value">324</span>
            </div>
            <div className="status-item">
              <span>Peak Hours Today</span>
              <span className="status-value">{realtimeData.peakHours}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="footer">
        <div className="footer-content">
          <div className="footer-section">
            <h5>SmartPark</h5>
            <p>Intelligent Parking Solutions</p>
            <div className="footer-links">
              <a href="/about">About</a>
              <a href="/contact">Contact</a>
              <a href="/privacy">Privacy</a>
              <a href="/terms">Terms</a>
            </div>
          </div>
          <div className="footer-section">
            <h5>Contact</h5>
            <p>support@smartpark.com</p>
            <p>+1 (555) 123-4567</p>
          </div>
          <div className="footer-section">
            <h5>Business Hours</h5>
            <p>24/7 System Monitoring</p>
            <p>Support: 8AM-8PM EST</p>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© 2024 SmartPark Analytics. All rights reserved.</p>
          <p className="footer-version">v2.1.4 • Updated 5 mins ago</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;