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
  MapPin,
  Camera, // New Icon
  User as UserIcon
} from 'lucide-react';
import '../styles/Profile.css';

const API_URL = 'http://localhost:5001/api';

const Profile = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});
  const [passwordModal, setPasswordModal] = useState(false);
  
  // Photo State
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);

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
    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
    setPreviewUrl(parsedUser.profilePic || null); // Set existing pic if available
    setEditData({
      name: parsedUser.name,
      phone: parsedUser.phone || '',
      vehicleNumber: parsedUser.vehicleNumber || ''
    });
    setLoading(false);
  }, [navigate]);

  // Handle Photo Selection & Auto-Upload
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Local Preview
    setPreviewUrl(URL.createObjectURL(file));
    setSelectedFile(file);

    // Prepare for Backend
    const formData = new FormData();
    formData.append('profilePic', file);

    try {
      setUploading(true);
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/user/upload-photo`, formData, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      if (res.data.success) {
        const updatedUser = { ...user, profilePic: res.data.imageUrl };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        alert('Profile photo updated!');
      }
    } catch (error) {
      alert('Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  // ... (handleEditSubmit and handlePasswordChange functions remain the same)
  // [Paste your existing handleEditSubmit and handlePasswordChange here]

  if (loading) return <div className="loading-spinner"></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>My Profile</h1>
        <p>Manage your account and vehicle details</p>
      </div>

      <div className="profile-container">
        <div className="profile-card">
          
          {/* PHOTO UPLOAD SECTION */}
          <div className="profile-avatar-section">
            <div className="avatar-wrapper">
              {previewUrl ? (
                <img src={previewUrl} alt="Profile" className="profile-img" />
              ) : (
                <div className="profile-img-placeholder">
                  <UserIcon size={40} />
                </div>
              )}
              
              <label htmlFor="photo-upload" className="photo-upload-label">
                <Camera size={18} />
                <input 
                  id="photo-upload" 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileChange} 
                  hidden 
                />
              </label>
            </div>
            {uploading && <p className="uploading-text">Uploading...</p>}
          </div>

          <div className="profile-header">
            <h2>Personal Information</h2>
            <button className="btn logout-btn" onClick={() => {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              navigate('/login');
            }}>
              <LogOut size={16} /> Logout
            </button>
          </div>
          
          {/* ... (Rest of your profile-info rows and password modal) */}
        </div>
        
        {/* ... (Rest of your quick-actions) */}
      </div>
    </div>
  );
};

export default Profile;