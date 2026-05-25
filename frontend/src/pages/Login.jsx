import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { AlertCircle, Loader2, ArrowLeft, Mail, Car, Building2, ArrowRight, ShieldCheck } from 'lucide-react';
import { API_BASE } from '../config/api';
import AuthLayout from '../components/AuthLayout';
import Button from '../components/ui/Button';

// ─── Role cards (same as Register.jsx) ───────────────────────────────────────
const GOOGLE_ROLES = [
  {
    value: 'user',
    label: 'Parker',
    description: 'Find and book parking spots near you. Manage reservations and track sessions.',
    icon: Car,
    accent: 'cyan',
  },
  {
    value: 'business_owner',
    label: 'Business Owner',
    description: 'List and manage your parking spaces. Accept bookings and track revenue.',
    icon: Building2,
    accent: 'violet',
  },
];

const accentClasses = {
  cyan:   { border: 'border-cyan-400',   bg: 'bg-cyan-400/10',   text: 'text-cyan-400',   ring: 'ring-cyan-400/30'   },
  violet: { border: 'border-violet-400', bg: 'bg-violet-400/10', text: 'text-violet-400', ring: 'ring-violet-400/30' },
};

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);

  // Google role-selection state (new users only)
  const [pendingGoogleToken, setPendingGoogleToken] = useState(null);
  const [googleUserEmail, setGoogleUserEmail] = useState('');

  const navigate = useNavigate();

  const redirectByRole = (userType) => {
    window.location.href =
      userType === 'admin'          ? '/admin'    :
      userType === 'business_owner' ? '/business' : '/';
  };

  const storeAuth = (data) => {
    localStorage.setItem('token', data.token);
    localStorage.setItem('authToken', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
  };

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
        storeAuth(data);
        redirectByRole(data.user.userType);
      } else {
        setError(data.message || 'Invalid email or password.');
      }
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setGoogleLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: credentialResponse.credential })
      });
      const data = await response.json();
      if (!data.success) {
        setError(data.message || 'Google sign-in failed. Please try again.');
        return;
      }
      // New user — backend needs role before creating account
      if (data.roleSelectionRequired) {
        setPendingGoogleToken(data.pendingToken);
        setGoogleUserEmail(data.email || '');
        return;
      }
      // Existing user — log in directly
      storeAuth(data);
      redirectByRole(data.user.userType);
    } catch {
      setError('Google sign-in failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleRoleSelect = async (userType) => {
    setGoogleLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/auth/google/complete-registration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pendingToken: pendingGoogleToken, userType }),
      });
      const data = await response.json();
      if (data.success) {
        storeAuth(data);
        redirectByRole(data.user.userType);
      } else {
        setError(data.message || 'Registration failed. Please try again.');
        setPendingGoogleToken(null);
      }
    } catch {
      setError('Network error. Please try again.');
      setPendingGoogleToken(null);
    } finally {
      setGoogleLoading(false);
    }
  };

  // ─── Google role-selection screen ─────────────────────────────────────────
  if (pendingGoogleToken) {
    return (
      <AuthLayout title="One More Step" subtitle={`Signed in as ${googleUserEmail}. Choose your account type.`}>
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-red-400 text-xs font-bold">
            <AlertCircle size={16} className="shrink-0 mt-0.5" /> <span>{error}</span>
          </div>
        )}

        <div className="space-y-4">
          {GOOGLE_ROLES.map((role) => {
            const Icon = role.icon;
            const ac = accentClasses[role.accent];
            return (
              <button
                key={role.value}
                onClick={() => handleGoogleRoleSelect(role.value)}
                disabled={googleLoading}
                className={`w-full text-left p-6 rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:border-white/20 hover:bg-white/[0.06] transition-all group flex items-start gap-5 ring-0 hover:ring-1 ${ac.ring} focus:outline-none disabled:opacity-50`}
              >
                <div className={`w-12 h-12 rounded-xl ${ac.bg} border ${ac.border}/30 flex items-center justify-center shrink-0 ${ac.text} group-hover:scale-105 transition-transform`}>
                  <Icon size={22} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-base font-black text-white">{role.label}</span>
                    {googleLoading
                      ? <Loader2 size={16} className="text-slate-500 animate-spin shrink-0" />
                      : <ArrowRight size={16} className="text-slate-600 group-hover:text-white group-hover:translate-x-1 transition-all shrink-0" />
                    }
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">{role.description}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Business owner verification note */}
        <div className="mt-6 flex items-start gap-3 p-4 rounded-2xl bg-violet-500/[0.06] border border-violet-500/20">
          <ShieldCheck size={16} className="text-violet-400 shrink-0 mt-0.5" />
          <p className="text-xs text-slate-400 leading-relaxed">
            Business Owner accounts require <span className="text-violet-300 font-bold">admin verification</span> before listing spots.
          </p>
        </div>

        <button
          onClick={() => { setPendingGoogleToken(null); setError(''); }}
          className="mt-6 flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-xs font-bold"
        >
          <ArrowLeft size={14} /> Back to sign in
        </button>
      </AuthLayout>
    );
  }

  // ─── Normal login screen ───────────────────────────────────────────────────
  return (
    <AuthLayout title="Welcome Back" subtitle="Sign in to your SmartPark account.">

      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-red-400 text-sm font-semibold">
          <AlertCircle className="shrink-0 mt-0.5" size={16} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 ml-1">Email Address</label>
          <div className="relative group">
            <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-cyan-400 transition-colors" size={18} />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full h-14 bg-white/[0.03] border border-white/[0.08] rounded-2xl pl-14 pr-6 text-sm font-bold text-white focus:outline-none focus:border-cyan-400 focus:bg-white/[0.05] transition-all"
            />
          </div>
        </div>

        <div className="space-y-2">
           <div className="flex justify-between items-center px-1">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">Password</label>
              <Link to="/forgot-password" className="text-[9px] font-black text-slate-500 hover:text-cyan-400 uppercase tracking-widest transition-colors">Forgot password?</Link>
           </div>
           <input
             type="password"
             value={password}
             onChange={(e) => setPassword(e.target.value)}
             required
             placeholder="••••••••"
             className="w-full h-14 bg-white/[0.03] border border-white/[0.08] rounded-2xl px-6 text-sm font-bold text-white focus:outline-none focus:border-cyan-400 focus:bg-white/[0.05] transition-all"
           />
        </div>

        <Button type="submit" disabled={loading} className="w-full !py-4 shadow-2xl flex items-center justify-center gap-3">
          {loading ? <Loader2 className="animate-spin" size={20} /> : 'Sign In'}
        </Button>
      </form>

      <div className="my-10 relative">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
        <div className="relative flex justify-center text-[9px] uppercase font-black tracking-[0.3em]"><span className="bg-[#0b0b0b] px-4 text-slate-700">or continue with</span></div>
      </div>

      <div className="flex justify-center">
        <GoogleLogin
          onSuccess={handleGoogleSuccess}
          onError={() => setError('Google sign-in failed. Please try again.')}
          theme="filled_black"
          shape="pill"
        />
      </div>

      <div className="mt-10 pt-8 border-t border-white/5 text-center">
         <p className="text-xs text-slate-600 font-medium">
           Don't have an account? <Link to="/register" className="text-white font-black hover:text-cyan-400 transition-colors underline decoration-cyan-400/30 underline-offset-4 ml-1">Create Account</Link>
         </p>
      </div>
    </AuthLayout>
  );
};

export default Login;
