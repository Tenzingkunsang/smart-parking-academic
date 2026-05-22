import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { AlertCircle, CheckCircle2, Loader2, User, Mail, Phone, Car, Zap } from 'lucide-react';
import { API_BASE } from '../config/api';
import AuthLayout from '../components/AuthLayout';
import Button from '../components/ui/Button';

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ name: '', email: '', password: '', phone: '', vehicleNumber: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await response.json();
      if (data.success) {
        setSuccess('Account Registry Synchronized. Redirecting...');
        setTimeout(() => navigate('/login'), 2000);
      } else {
        setError(data.message || 'Registry creation failed');
      }
    } catch {
      setError('System Registry Error: Network unstable');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout wide title="Registry" subtitle="Initialize your global grid identity.">
      
      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-red-400 text-xs font-bold uppercase tracking-widest">
          <AlertCircle size={16} /> <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3 text-emerald-400 text-xs font-bold uppercase tracking-widest animate-fade-in">
          <CheckCircle2 size={16} /> <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 ml-1">Full Identity</label>
            <div className="relative group">
              <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-cyan-400" size={18} />
              <input type="text" name="name" value={formData.name} onChange={handleChange} required placeholder="Name" className="w-full h-14 bg-white/[0.03] border border-white/[0.08] rounded-2xl pl-14 pr-6 text-sm font-bold text-white focus:outline-none focus:border-cyan-400 transition-all" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 ml-1">Network Email</label>
            <div className="relative group">
              <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-cyan-400" size={18} />
              <input type="email" name="email" value={formData.email} onChange={handleChange} required placeholder="user@grid.park" className="w-full h-14 bg-white/[0.03] border border-white/[0.08] rounded-2xl pl-14 pr-6 text-sm font-bold text-white focus:outline-none focus:border-cyan-400 transition-all" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 ml-1">Access Key</label>
            <input type="password" name="password" value={formData.password} onChange={handleChange} required minLength={6} placeholder="••••••••" className="w-full h-14 bg-white/[0.03] border border-white/[0.08] rounded-2xl px-6 text-sm font-bold text-white focus:outline-none focus:border-cyan-400 transition-all" />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 ml-1">Contact Link</label>
            <div className="relative group">
              <Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-cyan-400" size={18} />
              <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="+977" className="w-full h-14 bg-white/[0.03] border border-white/[0.08] rounded-2xl pl-14 pr-6 text-sm font-bold text-white focus:outline-none focus:border-cyan-400 transition-all" />
            </div>
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 ml-1">Vehicle Plate Identifier</label>
            <div className="relative group">
              <Car className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-cyan-400" size={18} />
              <input type="text" name="vehicleNumber" value={formData.vehicleNumber} onChange={handleChange} placeholder="e.g. BA 1 PA 1234" className="w-full h-14 bg-white/[0.03] border border-white/[0.08] rounded-2xl pl-14 pr-6 text-sm font-bold text-white focus:outline-none focus:border-cyan-400 transition-all" />
            </div>
          </div>
        </div>

        <Button type="submit" disabled={loading} className="w-full !py-4 shadow-2xl flex items-center justify-center gap-3">
          {loading ? <Loader2 className="animate-spin" size={20} /> : 'Sync Grid Identity'}
        </Button>
      </form>

      <div className="mt-10 pt-8 border-t border-white/5 text-center">
         <p className="text-xs text-slate-600 font-medium italic">
           Already identifying? <Link to="/login" className="text-white font-black hover:text-cyan-400 transition-colors ml-1 underline decoration-cyan-400/30 underline-offset-4">Identity Link</Link>
         </p>
      </div>
    </AuthLayout>
  );
};

export default Register;
