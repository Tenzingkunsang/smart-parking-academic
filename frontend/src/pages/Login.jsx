import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { API_BASE } from '../config/api';
import AuthLayout from '../components/AuthLayout';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [googleLoading, setGoogleLoading] = useState(false);
  const [verificationRequired, setVerificationRequired] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [testCode, setTestCode] = useState(null);
  const [verifyLoading, setVerifyLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('authToken', data.token);
        if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
        localStorage.setItem('user', JSON.stringify(data.user));

        if (data.user.userType === 'admin') {
          window.location.href = '/admin';
        } else {
          window.location.href = '/';
        }
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (err) {
      setError('Cannot connect to server. Make sure backend is running on port 5001');
    } finally {
      setLoading(false);
    }
  };

  const finishLogin = (data) => {
    localStorage.setItem('token', data.token);
    localStorage.setItem('authToken', data.token);
    if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('user', JSON.stringify(data.user));

    if (data.user.userType === 'admin') navigate('/admin');
    else navigate('/');
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
        setError(data.message || 'Google login failed');
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
        finishLogin(data);
      } else {
        setError('Google login failed: missing token');
      }
    } catch (err) {
      setError('Google login failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Google login failed. Please try again.');
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

      finishLogin(data);
    } catch (e) {
      setError('Verification failed. Please try again.');
    } finally {
      setVerifyLoading(false);
    }
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to manage bookings, payments, and tickets.">
      {error ? <div className="error-message">{error}</div> : null}

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
              test code: <strong>{testCode}</strong>
            </div>
          ) : null}

          <div className="form-group">
            <label htmlFor="verify-code">Verification code</label>
            <input
              id="verify-code"
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
            Back to email login
          </button>
        </div>
      ) : (
        <>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="login-email">Email</label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="@gmail.com"
              />
            </div>

            <div className="form-group">
              <label htmlFor="login-password">Password</label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
              />
            </div>

            <button type="submit" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="auth-divider">or</p>
          <div className="auth-google-wrap">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              text="signin_with"
              size="large"
              theme="filled_black"
              shape="pill"
              useOneTap={false}
            />
          </div>
          {googleLoading ? (
            <p style={{ textAlign: 'center', color: 'var(--gray-medium)', fontSize: '0.85rem', marginTop: '0.65rem' }}>
              Processing Google sign-in…
            </p>
          ) : null}
          <p style={{ textAlign: 'center', color: 'var(--gray-dark)', fontSize: '0.78rem', marginTop: '0.65rem' }}>
            Google sign-in may require a one-time email code for security.
          </p>

          <div className="auth-links-row">
            <Link to="/forgot-password">Forgot password?</Link>
            <span style={{ margin: '0 0.35rem', color: 'var(--gray-dark)' }}>·</span>
            <span>
              No account? <Link to="/register">Create one</Link>
            </span>
          </div>
        </>
      )}
    </AuthLayout>
  );
};

export default Login;
