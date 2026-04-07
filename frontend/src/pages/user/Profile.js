import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  LogOut, 
  Edit2,
  Check,
  X,
  Lock,
  Calendar,
  MapPin
} from 'lucide-react'; // Removed unused imports
import '../../styles/Profile.css';
import '../../styles/Auth.css';
import toast from 'react-hot-toast';
import { API_BASE } from '../../config/api';

const Profile = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});
  const [passwordModal, setPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const navigate = useNavigate();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      navigate('/login');
      return;
    }
    setUser(JSON.parse(userData));
    setEditData({
      name: JSON.parse(userData).name,
      phone: JSON.parse(userData).phone || '',
      vehicleNumber: JSON.parse(userData).vehicleNumber || ''
    });
    setLoading(false);
  }, [navigate]);

  const handleEditSubmit = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.put(`${API_BASE}/user/profile`, editData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        const updatedUser = { ...user, ...editData };
        setUser(updatedUser);
        setEditMode(false);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        toast.success('Profile updated.');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await axios.put(`${API_BASE}/user/change-password`, {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        toast.success('Password updated.');
        setPasswordModal(false);
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to change password');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading profile...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>My Profile</h1>
        <p>Manage your account information</p>
      </div>

      <div className="profile-container">
        <div className="profile-card">
          <div className="profile-header">
            <h2>Personal Information</h2>
            <button 
              className="btn logout-btn"
              onClick={handleLogout}
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
          
          <div className="profile-info">
            <div className="info-row">
              <span className="info-label">Name:</span>
              {editMode ? (
                <input 
                  type="text"
                  className="info-input"
                  value={editData.name}
                  onChange={(e) => setEditData({...editData, name: e.target.value})}
                />
              ) : (
                <span className="info-value">{user.name}</span>
              )}
            </div>
            
            <div className="info-row">
              <span className="info-label">Email:</span>
              <span className="info-value">{user.email}</span>
            </div>
            
            <div className="info-row">
              <span className="info-label">User Type:</span>
              <span className="info-value badge">{user.userType}</span>
            </div>
            
            <div className="info-row">
              <span className="info-label">Member Since:</span>
              <span className="info-value">
                {new Date(user.createdAt).toLocaleDateString()}
              </span>
            </div>
            
            <div className="info-row">
              <span className="info-label">Phone:</span>
              {editMode ? (
                <input 
                  type="tel"
                  className="info-input"
                  value={editData.phone}
                  onChange={(e) => setEditData({...editData, phone: e.target.value})}
                  placeholder="Enter phone number"
                />
              ) : (
                <span className="info-value">{user.phone || 'Not provided'}</span>
              )}
            </div>
            
            <div className="info-row">
              <span className="info-label">Vehicle Number:</span>
              {editMode ? (
                <input 
                  type="text"
                  className="info-input"
                  value={editData.vehicleNumber}
                  onChange={(e) => setEditData({...editData, vehicleNumber: e.target.value})}
                  placeholder="Enter vehicle number"
                />
              ) : (
                <span className="info-value">{user.vehicleNumber || 'Not provided'}</span>
              )}
            </div>
          </div>

          <div className="profile-actions">
            <div className="action-buttons">
              {editMode ? (
                <>
                  <button 
                    className="btn secondary-btn"
                    onClick={() => setEditMode(false)}
                  >
                    <X size={16} />
                    Cancel
                  </button>
                  <button 
                    className="btn main-btn"
                    onClick={handleEditSubmit}
                  >
                    <Check size={16} />
                    Save Changes
                  </button>
                </>
              ) : (
                <>
                  <button 
                    className="btn secondary-btn"
                    onClick={() => setEditMode(true)}
                  >
                    <Edit2 size={16} />
                    Edit Profile
                  </button>
                  <button 
                    className="btn secondary-btn"
                    onClick={() => setPasswordModal(true)}
                  >
                    <Lock size={16} />
                    Change Password
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="quick-actions">
          <h3>Quick Actions</h3>
          <div className="action-buttons">
            <button 
              className="btn secondary-btn"
              onClick={() => navigate('/parking')}
            >
              <MapPin size={18} />
              Reserve Parking Spot
            </button>
            
            <button 
              className="btn secondary-btn"
              onClick={() => navigate('/reservations')}
            >
              <Calendar size={18} />
              View My Reservations
            </button>
            
            <button 
              className="btn secondary-btn"
              onClick={() => navigate('/')}
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>

      {/* Password Change Modal */}
      {passwordModal && (
        <div className="modal-overlay" onClick={() => setPasswordModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Change Password</h3>
            
            <div className="modal-body">
              <div className="form-group">
                <label>Current Password</label>
                <input 
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                  placeholder="Enter current password"
                />
              </div>
              
              <div className="form-group">
                <label>New Password</label>
                <input 
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                  placeholder="Enter new password"
                />
              </div>
              
              <div className="form-group">
                <label>Confirm New Password</label>
                <input 
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                  placeholder="Confirm new password"
                />
              </div>
            </div>

            <div className="modal-actions">
              <button 
                className="btn secondary-btn"
                onClick={() => setPasswordModal(false)}
              >
                Cancel
              </button>
              <button 
                className="btn main-btn"
                onClick={handlePasswordChange}
              >
                Change Password
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;