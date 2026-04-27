import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { API_BASE } from '../config/api';
import AuthLayout from '../components/AuthLayout';

const Register = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    vehicleNumber: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [googleLoading, setGoogleLoading] = useState(false);
  const [verificationRequired, setVerificationRequired] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [testCode, setTestCode] = useState(null);
  const [verifyLoading, setVerifyLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Registration successful! Redirecting to login…');
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      } else {
        setError(data.message || 'Registration failed');
      }
    } catch (err) {
      setError('Cannot connect to server. Make sure backend is running on port 5001');
    } finally {
      setLoading(false);
    }
  };

  const finishGoogleAuth = (data) => {
    localStorage.setItem('token', data.token);
    localStorage.setItem('authToken', data.token);
    if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('user', JSON.stringify(data.user));
    if (data.user.userType === 'admin') navigate('/admin');
    else navigate('/parking');
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setGoogleLoading(true);
      setError('');

      const response = await fetch(`${API_BASE}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: credentialResponse.credential })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        setError(data.message || 'Google registration failed');
        return;
      }

      if (data.verificationRequired) {
        setVerificationRequired(true);
        setPendingEmail(data.email);
        setVerificationCode('');
        setTestCode(data.code || null);
        return;
      }

      if (data.token && data.user) {
        finishGoogleAuth(data);
      } else {
        setError('Google registration failed: missing token');
      }
    } catch (err) {
      setError('Google registration failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Google registration failed. Please try again.');
  };

  const handleResendCode = async () => {
    try {
      setError('');
      setVerifyLoading(true);
      const response = await fetch(`${API_BASE}/auth/google/send-verification-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: pendingEmail })
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        setError(data.message || 'Failed to resend code');
        return;
      }
      setTestCode(data.code || null);
    } catch (e) {
      setError('Failed to resend code.');
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    try {
      setError('');
      setVerifyLoading(true);
      const response = await fetch(`${API_BASE}/auth/google/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: pendingEmail, code: verificationCode })
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        setError(data.message || 'Invalid verification code');
        return;
      }
      finishGoogleAuth(data);
    } catch (e) {
      setError('Verification failed. Please try again.');
    } finally {
      setVerifyLoading(false);
    }
  };

  return (
    <AuthLayout
      wide
      title="Create your account"
      subtitle="Join SmartPark to book spots, pay securely, and use QR check-in."
    >
      {error ? <div className="error-message">{error}</div> : null}
      {success ? <div className="success-message-auth">{success}</div> : null}

      {verificationRequired ? (
        <div className="auth-verify-actions">
          <h3 className="subtitle" style={{ marginBottom: '0.35rem' }}>
            Verify your email
          </h3>
          <p style={{ textAlign: 'center', color: 'var(--gray-medium)', fontSize: '0.92rem', marginBottom: '1rem' }}>
            Enter the 6-digit code sent to{' '}
            <span style={{ color: 'var(--gray-light)', fontWeight: 600 }}>{pendingEmail}</span>
          </p>

          {testCode ? (
            <div className="dev-code-hint" role="status">
             code:  <strong>{testCode}</strong>
            </div>
          ) : null}

          <div className="form-group">
            <label htmlFor="reg-verify-code">Verification code</label>
            <input
              id="reg-verify-code"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              placeholder="123456"
              inputMode="numeric"
              autoComplete="one-time-code"
            />
          </div>

          <button
            type="button"
            disabled={verifyLoading || !verificationCode}
            onClick={handleVerifyCode}
          >
            {verifyLoading ? 'Verifying…' : 'Verify & continue'}
          </button>

          <button
            type="button"
            className="btn-secondary-outline"
            disabled={verifyLoading || !pendingEmail}
            onClick={handleResendCode}
          >
            {verifyLoading ? 'Please wait…' : 'Resend code'}
          </button>

          <button
            type="button"
            className="btn-ghost-link"
            onClick={() => {
              setVerificationRequired(false);
              setPendingEmail('');
              setVerificationCode('');
              setTestCode(null);
              setError('');
            }}
          >
            Back to sign-up form
          </button>
        </div>
      ) : (
        <>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="reg-name">Full name</label>
              <input
                id="reg-name"
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                autoComplete="name"
                placeholder="Full name "
              />
            </div>

            <div className="form-group">
              <label htmlFor="reg-email">Email</label>
              <input
                id="reg-email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                autoComplete="email"
                placeholder="@gmail.com"
              />
            </div>

            <div className="form-group">
              <label htmlFor="reg-password">Password</label>
              <input
                id="reg-password"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={6}
                autoComplete="new-password"
                placeholder="At least 6 characters"
              />
            </div>

            <div className="form-group">
              <label htmlFor="reg-phone">Phones</label>
              <input
                id="reg-phone"
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                autoComplete="tel"
                placeholder="+977 …"
              />
            </div>

            <div className="form-group">
              <label htmlFor="reg-vehicle">Vehicle number</label>
              <input
                id="reg-vehicle"
                type="text"
                name="vehicleNumber"
                value={formData.vehicleNumber}
                onChange={handleChange}
                autoComplete="off"
                placeholder="e.g. BA 1 PA 1234"
              />
            </div>

            <button type="submit" disabled={loading}>
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="auth-divider">or</p>
          <div className="auth-google-wrap">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              text="signup_with"
              size="large"
              theme="filled_black"
              shape="pill"
              useOneTap={false}
            />
          </div>
          {googleLoading ? (
            <p style={{ textAlign: 'center', color: 'var(--gray-medium)', fontSize: '0.85rem', marginTop: '0.65rem' }}>
              Processing Google sign-up…
            </p>
          ) : null}

          <div className="auth-links-row" style={{ marginTop: '1.25rem' }}>
            Already have an account? <Link to="/login">Sign in</Link>
          </div>
        </>
      )}
    </AuthLayout>
  );
};

export default Register;
