import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Mail, Lock, Key, ArrowLeft, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { API_BASE } from '../../config/api';
import AuthLayout from '../../components/AuthLayout';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [step, setStep] = useState(1); 
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
      const res = await axios.post(`${API_BASE}/auth/forgot-password`, { email });
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
      const res = await axios.post(`${API_BASE}/auth/verify-reset-code`, {
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
      const res = await axios.post(`${API_BASE}/auth/reset-password`, {
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
    <AuthLayout 
      title="Reset Password" 
      subtitle={
        step === 1 ? 'Enter your email to receive a reset code' :
        step === 2 ? 'Enter the 6-digit code sent to your email' :
        'Create your new secure password'
      }
    >
      <div className="space-y-8 animate-in fade-in duration-500">
        
        {error && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-red-400 text-sm">
            <AlertCircle className="shrink-0 mt-0.5" size={18} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3 text-emerald-400 text-sm animate-fade-in">
            <CheckCircle2 className="shrink-0 mt-0.5" size={18} />
            <span>{success}</span>
          </div>
        )}

        {step === 1 && (
          <form onSubmit={handleEmailSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="email" className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="name@example.com"
                  className="w-full h-14 bg-white/[0.03] border border-white/[0.08] rounded-2xl pl-14 pr-6 text-white focus:outline-none focus:border-cyan-400 focus:bg-white/[0.05] transition-all"
                />
              </div>
            </div>
            
            <button 
              type="submit" 
              className="w-full h-14 bg-white text-black font-display font-black text-sm uppercase tracking-widest rounded-2xl hover:bg-cyan-400 transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2"
              disabled={loading || !email}
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : 'Send Reset Link'}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleCodeSubmit} className="space-y-8">
            <div className="space-y-2">
              <label htmlFor="resetCode" className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">6-Digit Hash Code</label>
              <input
                type="text"
                id="resetCode"
                value={resetCode}
                onChange={(e) => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                placeholder="123456"
                className="w-full h-14 bg-white/[0.03] border border-white/[0.08] rounded-2xl px-6 text-white font-display text-2xl tracking-[0.4em] text-center focus:outline-none focus:border-cyan-400 focus:bg-white/[0.05] transition-all"
                maxLength={6}
              />
            </div>
            
            <div className="grid gap-3">
              <button 
                type="submit" 
                className="w-full h-14 bg-white text-black font-display font-black text-sm uppercase tracking-widest rounded-2xl hover:bg-cyan-400 transition-all"
                disabled={loading || resetCode.length !== 6}
              >
                {loading ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Verify Security Hash'}
              </button>
              <button 
                type="button"
                className="h-12 bg-white/[0.03] border border-white/[0.08] text-slate-400 font-bold text-xs uppercase tracking-widest rounded-xl hover:text-white transition-all"
                onClick={() => setStep(1)}
              >
                Change Identity Link
              </button>
            </div>
            
            <div className="pt-6 border-t border-white/[0.05] text-center">
              <p className="text-xs text-slate-500 font-medium mb-4">Didn't receive the hash code?</p>
              <button 
                type="button"
                className="text-cyan-400 font-black text-[10px] uppercase tracking-[0.2em] hover:text-white transition-colors"
                onClick={handleEmailSubmit}
                disabled={loading}
              >
                Resend Protocol Code
              </button>
            </div>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={handlePasswordSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="newPassword" strokeWidth={2} className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">New Secure Hash</label>
                <div className="relative">
                   <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                   <input
                    type="password"
                    id="newPassword"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    minLength="6"
                    className="w-full h-14 bg-white/[0.03] border border-white/[0.08] rounded-2xl pl-14 pr-6 text-white focus:outline-none focus:border-cyan-400 focus:bg-white/[0.05] transition-all"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="confirmPassword" strokeWidth={2} className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Confirm Hash</label>
                <div className="relative">
                   <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                   <input
                    type="password"
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    minLength="6"
                    className="w-full h-14 bg-white/[0.03] border border-white/[0.08] rounded-2xl pl-14 pr-6 text-white focus:outline-none focus:border-cyan-400 focus:bg-white/[0.05] transition-all"
                  />
                </div>
              </div>
            </div>
            
            <button 
              type="submit" 
              className="w-full h-14 bg-white text-black font-display font-black text-sm uppercase tracking-widest rounded-2xl hover:bg-cyan-400 transition-all shadow-xl"
              disabled={loading || !newPassword || !confirmPassword}
            >
              {loading ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Update Security Link'}
            </button>
          </form>
        )}
        
        <div className="pt-8 border-t border-white/[0.05] flex flex-col items-center gap-4">
          <Link to="/login" className="flex items-center gap-2 text-slate-500 hover:text-white transition-all text-xs font-bold uppercase tracking-widest">
            <ArrowLeft size={14} /> Back to Entry Link
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
};

export default ForgotPassword;
