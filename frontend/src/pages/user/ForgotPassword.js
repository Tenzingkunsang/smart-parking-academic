import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Mail, Lock, Key, ArrowLeft } from 'lucide-react';
import { API_BASE } from '../../config/api';
import '../../styles/Auth.css';

const API_URL = API_BASE;

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [step, setStep] = useState(1); // 1: Enter email, 2: Enter code, 3: New password
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleEmailSubmit = async (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await axios.post(`${API_URL}/auth/forgot-password`, { email });
      if (res.data.success) {
        setSuccess('Password reset code has been sent to your email.');
        setStep(2);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send reset code');
    } finally {
      setLoading(false);
    }
  };

  const handleCodeSubmit = async (e) => {
    e.preventDefault();
    if (resetCode.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const res = await axios.post(`${API_URL}/auth/verify-reset-code`, {
        email,
        code: resetCode
      });
      
      if (res.data.success) {
        setSuccess('Code verified successfully');
        setStep(3);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid reset code');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const res = await axios.post(`${API_URL}/auth/reset-password`, {
        email,
        code: resetCode,
        newPassword
      });
      
      if (res.data.success) {
        setSuccess('Password reset successful! Redirecting to login...');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <button 
          className="back-button"
          onClick={() => navigate('/login')}
        >
          <ArrowLeft size={18} />
          Back to Login
        </button>
        
        <div className="auth-header">
          <div className="auth-icon">
            <Key size={32} />
          </div>
          <h2>Reset Password</h2>
          <p className="auth-subtitle">
            {step === 1 && 'Enter your email to receive a reset code'}
            {step === 2 && 'Enter the 6-digit code sent to your email'}
            {step === 3 && 'Create your new password'}
          </p>
        </div>
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
        
        {success && (
          <div className="success-message">
            {success}
          </div>
        )}
        
        {step === 1 && (
          <form onSubmit={handleEmailSubmit}>
            <div className="form-group">
              <label htmlFor="email">
                <Mail size={16} />
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Enter your registered email"
              />
            </div>
            
            <button 
              type="submit" 
              className="btn auth-btn"
              disabled={loading || !email}
            >
              {loading ? 'Sending...' : 'Send Reset Code'}
            </button>
          </form>
        )}
        
        {step === 2 && (
          <form onSubmit={handleCodeSubmit}>
            <div className="form-group">
              <label htmlFor="resetCode">
                <Key size={16} />
                6-Digit Reset Code
              </label>
              <input
                type="text"
                id="resetCode"
                value={resetCode}
                onChange={(e) => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                placeholder="Enter 6-digit code"
                maxLength={6}
              />
              <p className="hint-text">
                Check your email for the 6-digit reset code
              </p>
            </div>
            
            <div className="code-actions">
              <button 
                type="button"
                className="btn secondary-btn"
                onClick={() => setStep(1)}
              >
                Change Email
              </button>
              <button 
                type="submit" 
                className="btn auth-btn"
                disabled={loading || resetCode.length !== 6}
              >
                {loading ? 'Verifying...' : 'Verify Code'}
              </button>
            </div>
            
            <div className="resend-code">
              <p>Didn't receive the code?</p>
              <button 
                type="button"
                className="resend-btn"
                onClick={handleEmailSubmit}
                disabled={loading}
              >
                Resend Code
              </button>
            </div>
          </form>
        )}
        
        {step === 3 && (
          <form onSubmit={handlePasswordSubmit}>
            <div className="form-group">
              <label htmlFor="newPassword">
                <Lock size={16} />
                New Password
              </label>
              <input
                type="password"
                id="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                placeholder="Enter new password"
                minLength="6"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="confirmPassword">
                <Lock size={16} />
                Confirm New Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Confirm new password"
                minLength="6"
              />
            </div>
            
            <button 
              type="submit" 
              className="btn auth-btn"
              disabled={loading || !newPassword || !confirmPassword}
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        )}
        
        <div className="auth-links">
          <p>
            Remember your password?{' '}
            <Link to="/login" className="auth-link">
              Login here
            </Link>
          </p>
          <p>
            <Link to="/" className="auth-link">
              Back to Dashboard
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;