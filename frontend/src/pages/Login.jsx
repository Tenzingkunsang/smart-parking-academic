import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { AlertCircle, CheckCircle2, Loader2, ArrowLeft, Mail, ShieldCheck, Zap } from 'lucide-react';
import { API_BASE } from '../config/api';
import AuthLayout from '../components/AuthLayout';
import Button from '../components/ui/Button';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
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
        localStorage.setItem('user', JSON.stringify(data.user));
        if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
        window.location.href =
          data.user.userType === 'admin'          ? '/admin'    :
          data.user.userType === 'business_owner' ? '/business' : '/';
      } else {
        setError(data.message || 'Invalid email or password.');
      }
    } catch (err) {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setGoogleLoading(true);
    try {
      const response = await fetch(`${API_BASE}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: credentialResponse.credential })
      });
      const data = await response.json();
      if (data.success) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
        const dest =
          data.user.userType === 'admin'          ? '/admin'    :
          data.user.userType === 'business_owner' ? '/business' : '/';
        navigate(dest);
      }
    } catch {
      setError('Google sign-in failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

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
