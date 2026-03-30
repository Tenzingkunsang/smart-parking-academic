import React, { useState } from 'react';

const Register = () => {
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

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('http://localhost:5001/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccess('Registration successful! Redirecting to login...');
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

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a', padding: '20px' }}>
      <div style={{ background: '#171717', padding: '2rem', borderRadius: '1rem', width: '100%', maxWidth: '500px' }}>
        <h2 style={{ color: 'white', marginBottom: '0.5rem' }}>Create Account</h2>
        <p style={{ color: '#a3a3a3', marginBottom: '1.5rem' }}>Sign up for SmartPark</p>
        
        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', color: '#ef4444', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>
            {error}
          </div>
        )}
        
        {success && (
          <div style={{ background: 'rgba(0,255,0,0.1)', border: '1px solid #00ff00', color: '#00ff00', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>
            {success}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', color: '#d4d4d4', marginBottom: '0.5rem' }}>Full Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              style={{ width: '100%', padding: '0.75rem', background: '#262626', border: '1px solid #404040', borderRadius: '0.5rem', color: 'white' }}
            />
          </div>
          
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', color: '#d4d4d4', marginBottom: '0.5rem' }}>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              style={{ width: '100%', padding: '0.75rem', background: '#262626', border: '1px solid #404040', borderRadius: '0.5rem', color: 'white' }}
            />
          </div>
          
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', color: '#d4d4d4', marginBottom: '0.5rem' }}>Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              style={{ width: '100%', padding: '0.75rem', background: '#262626', border: '1px solid #404040', borderRadius: '0.5rem', color: 'white' }}
            />
          </div>
          
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', color: '#d4d4d4', marginBottom: '0.5rem' }}>Phone (Optional)</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              style={{ width: '100%', padding: '0.75rem', background: '#262626', border: '1px solid #404040', borderRadius: '0.5rem', color: 'white' }}
            />
          </div>
          
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', color: '#d4d4d4', marginBottom: '0.5rem' }}>Vehicle Number (Optional)</label>
            <input
              type="text"
              name="vehicleNumber"
              value={formData.vehicleNumber}
              onChange={handleChange}
              style={{ width: '100%', padding: '0.75rem', background: '#262626', border: '1px solid #404040', borderRadius: '0.5rem', color: 'white' }}
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            style={{ width: '100%', padding: '0.75rem', background: '#00ff00', color: 'black', border: 'none', borderRadius: '0.5rem', fontWeight: 'bold', cursor: 'pointer' }}
          >
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>
        
        <div style={{ marginTop: '1rem', textAlign: 'center' }}>
          <a href="/login" style={{ color: '#00ff00', textDecoration: 'none' }}>Already have an account? Login</a>
        </div>
      </div>
    </div>
  );
};

export default Register;
