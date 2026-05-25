import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import {
  AlertCircle, CheckCircle2, Loader2, User, Mail, Phone,
  Car, Building2, ArrowRight, ArrowLeft, ShieldCheck,
} from 'lucide-react';
import { API_BASE } from '../config/api';
import AuthLayout from '../components/AuthLayout';
import Button from '../components/ui/Button';

// ─── Role cards shown on Step 1 ──────────────────────────────────────────────
const ROLES = [
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

const Register = () => {
  const navigate = useNavigate();

  // Step 1 = role selection, Step 2 = form fields
  const [step, setStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState(null);

  const [formData, setFormData] = useState({
    name: '', email: '', password: '', phone: '', vehicleNumber: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setStep(2);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, userType: selectedRole }),
      });
      const data = await response.json();
      if (data.success) {
        setSuccess('Account created. Redirecting to login…');
        setTimeout(() => navigate('/login'), 2000);
      } else {
        setError(data.message || 'Registration failed');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isBusinessOwner = selectedRole === 'business_owner';

  // ─── STEP 1: Role selection ─────────────────────────────────────────────────
  if (step === 1) {
    return (
      <AuthLayout title="Create Account" subtitle="Choose how you want to use SmartPark.">
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-red-400 text-xs font-bold">
            <AlertCircle size={16} className="shrink-0 mt-0.5" /> <span>{error}</span>
          </div>
        )}

        <div className="space-y-4">
          {ROLES.map((role) => {
            const Icon = role.icon;
            const ac = accentClasses[role.accent];
            return (
              <button
                key={role.value}
                onClick={() => handleRoleSelect(role.value)}
                className={`w-full text-left p-6 rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:border-white/20 hover:bg-white/[0.06] transition-all group flex items-start gap-5 ring-0 hover:ring-1 ${ac.ring} focus:outline-none`}
              >
                <div className={`w-12 h-12 rounded-xl ${ac.bg} border ${ac.border}/30 flex items-center justify-center shrink-0 ${ac.text} group-hover:scale-105 transition-transform`}>
                  <Icon size={22} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-base font-black text-white`}>{role.label}</span>
                    <ArrowRight size={16} className="text-slate-600 group-hover:text-white group-hover:translate-x-1 transition-all shrink-0" />
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">{role.description}</p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-10 pt-8 border-t border-white/5 text-center">
          <p className="text-xs text-slate-600 font-medium">
            Already have an account?{' '}
            <Link to="/login" className="text-white font-black hover:text-cyan-400 transition-colors ml-1 underline decoration-cyan-400/30 underline-offset-4">
              Sign In
            </Link>
          </p>
        </div>
      </AuthLayout>
    );
  }

  // ─── STEP 2: Registration form ──────────────────────────────────────────────
  const roleInfo = ROLES.find(r => r.value === selectedRole);
  const ac = accentClasses[roleInfo?.accent || 'cyan'];

  return (
    <AuthLayout wide title="Create Account" subtitle={`Registering as ${roleInfo?.label}`}>

      {/* Role badge + back button */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => { setStep(1); setError(''); }}
          className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-xs font-bold"
        >
          <ArrowLeft size={14} /> Change role
        </button>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl ${ac.bg} border ${ac.border}/30 ${ac.text} text-xs font-black`}>
          {roleInfo && <roleInfo.icon size={13} />}
          {roleInfo?.label}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-red-400 text-xs font-bold">
          <AlertCircle size={16} className="shrink-0 mt-0.5" /> <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3 text-emerald-400 text-xs font-bold">
          <CheckCircle2 size={16} /> <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Full name */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 ml-1">Full Name</label>
            <div className="relative group">
              <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-cyan-400" size={18} />
              <input
                type="text" name="name" value={formData.name} onChange={handleChange}
                required placeholder="Your name"
                className="w-full h-14 bg-white/[0.03] border border-white/[0.08] rounded-2xl pl-14 pr-6 text-sm font-bold text-white focus:outline-none focus:border-cyan-400 transition-all"
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 ml-1">Email Address</label>
            <div className="relative group">
              <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-cyan-400" size={18} />
              <input
                type="email" name="email" value={formData.email} onChange={handleChange}
                required placeholder="you@example.com"
                className="w-full h-14 bg-white/[0.03] border border-white/[0.08] rounded-2xl pl-14 pr-6 text-sm font-bold text-white focus:outline-none focus:border-cyan-400 transition-all"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 ml-1">Password</label>
            <input
              type="password" name="password" value={formData.password} onChange={handleChange}
              required minLength={8} placeholder="Min 8 chars, include A-z 0-9 !@#"
              className="w-full h-14 bg-white/[0.03] border border-white/[0.08] rounded-2xl px-6 text-sm font-bold text-white focus:outline-none focus:border-cyan-400 transition-all"
            />
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 ml-1">Phone Number</label>
            <div className="relative group">
              <Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-cyan-400" size={18} />
              <input
                type="tel" name="phone" value={formData.phone} onChange={handleChange}
                placeholder="+977 9XXXXXXXXX"
                className="w-full h-14 bg-white/[0.03] border border-white/[0.08] rounded-2xl pl-14 pr-6 text-sm font-bold text-white focus:outline-none focus:border-cyan-400 transition-all"
              />
            </div>
          </div>

          {/* Vehicle plate — only for regular users */}
          {!isBusinessOwner && (
            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 ml-1">Vehicle Plate <span className="text-slate-700 normal-case">(optional)</span></label>
              <div className="relative group">
                <Car className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-cyan-400" size={18} />
                <input
                  type="text" name="vehicleNumber" value={formData.vehicleNumber} onChange={handleChange}
                  placeholder="e.g. BA 1 PA 1234"
                  className="w-full h-14 bg-white/[0.03] border border-white/[0.08] rounded-2xl pl-14 pr-6 text-sm font-bold text-white focus:outline-none focus:border-cyan-400 transition-all"
                />
              </div>
            </div>
          )}

          {/* Business owner info note */}
          {isBusinessOwner && (
            <div className="md:col-span-2 flex items-start gap-3 p-4 rounded-2xl bg-violet-500/[0.06] border border-violet-500/20">
              <ShieldCheck size={16} className="text-violet-400 shrink-0 mt-0.5" />
              <p className="text-xs text-slate-400 leading-relaxed">
                Your account will need <span className="text-violet-300 font-bold">admin verification</span> before you can list parking spots. You'll be notified once approved.
              </p>
            </div>
          )}
        </div>

        <Button type="submit" disabled={loading} className="w-full !py-4 shadow-2xl flex items-center justify-center gap-3">
          {loading ? <Loader2 className="animate-spin" size={20} /> : `Create ${roleInfo?.label} Account`}
        </Button>
      </form>

      <div className="mt-10 pt-8 border-t border-white/5 text-center">
        <p className="text-xs text-slate-600 font-medium">
          Already have an account?{' '}
          <Link to="/login" className="text-white font-black hover:text-cyan-400 transition-colors ml-1 underline decoration-cyan-400/30 underline-offset-4">
            Sign In
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
};

export default Register;
