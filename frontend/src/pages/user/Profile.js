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
  User,
  Phone,
  CarFront,
  ShieldAlert,
  ChevronRight,
  ShieldCheck,
  Zap,
  ArrowRight,
  Shield,
  Clock,
  Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { API_BASE } from '../../config/api';

const Profile = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});
  const [passwordModal, setPasswordModal] = useState(false);
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
    const parsed = JSON.parse(userData);
    setUser(parsed);
    setEditData({
      name: parsed.name,
      phone: parsed.phone || '',
      vehicleNumber: parsed.vehicleNumber || ''
    });
    setLoading(false);
  }, [navigate]);

  const handleEditSubmit = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.put(`${API_BASE}/user/profile`, editData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        const updatedUser = { ...user, ...editData };
        setUser(updatedUser);
        setEditMode(false);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        toast.success('Identity profile updated.');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Update synchronization failed');
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Encryption mismatch: Passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Security violation: Minimum 6 characters required');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await axios.put(`${API_BASE}/user/change-password`, {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        toast.success('Security hash updated.');
        setPasswordModal(false);
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Credential update failed');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-cyan-400" size={48} />
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Retrieving Identity...</span>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#050505] text-white pt-32 pb-24 px-6 md:px-10 max-w-7xl mx-auto font-sans relative">
      
      {/* Decorative Lights */}
      <div className="fixed top-0 right-0 w-[400px] h-[400px] bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="fixed bottom-0 left-0 w-[300px] h-[300px] bg-blue-600/5 rounded-full blur-[100px] pointer-events-none -z-10" />

      {/* Page Header */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-10 border-b border-white/[0.06] mb-12">
        <div className="space-y-2">
           <div className="flex items-center gap-2 text-cyan-400 mb-1">
              <Shield size={14} className="fill-current" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Identity Console</span>
           </div>
           <h1 className="text-5xl md:text-6xl font-black font-display tracking-tight">Account System</h1>
           <p className="text-slate-500 font-medium italic">Managing credential hierarchy and vehicle allocation links.</p>
        </div>
        <button 
           onClick={handleLogout}
           className="h-12 px-6 rounded-xl bg-red-500/5 text-red-400 border border-red-500/10 hover:bg-red-500/10 hover:border-red-500/20 text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
        >
           <LogOut size={14} /> Terminate Session
        </button>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        
        {/* Profile Card */}
        <div className="lg:col-span-2 space-y-8">
           <div className="p-8 md:p-10 rounded-[2.5rem] bg-white/[0.01] border border-white/[0.06] backdrop-blur-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-400/[0.02] rounded-full blur-3xl" />
              
              <div className="flex items-center gap-6 mb-12 pb-10 border-b border-white/5 relative z-10">
                 <div className="w-24 h-24 rounded-[2rem] bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-cyan-400 font-display font-black text-4xl shadow-2xl relative">
                    {user.name?.charAt(0).toUpperCase()}
                    <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-xl bg-cyan-400 text-black flex items-center justify-center shadow-lg">
                       <ShieldCheck size={18} strokeWidth={2.5} />
                    </div>
                 </div>
                 <div className="space-y-1">
                    <h2 className="text-3xl font-black font-display text-white">{user.name}</h2>
                    <span className="inline-block px-3 py-1 rounded-full bg-cyan-400/10 border border-cyan-400/20 text-[9px] font-black uppercase tracking-widest text-cyan-400">
                       {user.userType} Access Level
                    </span>
                 </div>
              </div>

              <div className="grid gap-y-10 relative z-10">
                 {[
                   { label: 'Full Name', val: user.name, key: 'name', type: 'text', icon: User },
                   { label: 'Network Address', val: user.email, key: 'email', type: 'email', icon: Zap, readonly: true },
                   { label: 'Contact Coordinate', val: user.phone || 'NOT LINKED', key: 'phone', type: 'tel', icon: Phone },
                   { label: 'Vehicle Identity', val: user.vehicleNumber || 'NO PLATE REGISTERED', key: 'vehicleNumber', type: 'text', icon: CarFront }
                 ].map((field) => (
                   <div key={field.label} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-3 md:w-1/3">
                         <div className="w-8 h-8 rounded-lg bg-white/[0.02] border border-white/[0.05] flex items-center justify-center text-slate-600">
                            <field.icon size={14} />
                         </div>
                         <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{field.label}</span>
                      </div>
                      
                      {editMode && !field.readonly ? (
                        <input 
                           type={field.type}
                           value={editData[field.key]}
                           onChange={(e) => setEditData({...editData, [field.key]: e.target.value})}
                           className="flex-1 max-w-md h-12 bg-white/[0.03] border border-white/[0.08] rounded-xl px-5 text-sm font-bold text-white focus:outline-none focus:border-cyan-400 focus:bg-white/[0.05] transition-all"
                        />
                      ) : (
                        <span className={`flex-1 text-sm font-bold ${field.val.includes('NOT') ? 'text-slate-700 italic' : 'text-slate-300'}`}>
                           {field.val}
                        </span>
                      )}
                   </div>
                 ))}

                 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-4 border-t border-white/5">
                    <div className="flex items-center gap-3 md:w-1/3">
                       <div className="w-8 h-8 rounded-lg bg-white/[0.02] border border-white/[0.05] flex items-center justify-center text-slate-600">
                          <Clock size={14} />
                       </div>
                       <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Identity Age</span>
                    </div>
                    <span className="flex-1 text-[10px] font-black uppercase tracking-widest text-slate-600">
                       ESTABLISHED {new Date(user.createdAt).toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                 </div>
              </div>

              <div className="mt-12 flex gap-4 relative z-10">
                 {editMode ? (
                   <>
                      <button onClick={() => setEditMode(false)} className="flex-1 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-slate-500 font-display font-black text-xs uppercase tracking-widest hover:text-white transition-all">Cancel</button>
                      <button onClick={handleEditSubmit} className="flex-[2] h-14 rounded-2xl bg-white text-black font-display font-black text-xs uppercase tracking-widest hover:bg-cyan-400 transition-all shadow-xl shadow-cyan-400/10">Synchronize Identity</button>
                   </>
                 ) : (
                   <button onClick={() => setEditMode(true)} className="w-full h-14 rounded-2xl bg-white text-black font-display font-black text-xs uppercase tracking-widest hover:bg-cyan-400 transition-all flex items-center justify-center gap-3 group">
                      <Edit2 size={16} /> Edit Identity <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                   </button>
                 )}
              </div>
           </div>
        </div>

        {/* Sidebar Actions */}
        <div className="space-y-8">
           <div className="p-8 rounded-[2.5rem] bg-white/[0.01] border border-white/[0.06] backdrop-blur-2xl space-y-6">
              <div className="flex items-center gap-3 pb-5 border-b border-white/5">
                 <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                    <Lock size={20} />
                 </div>
                 <h3 className="text-lg font-black font-display text-white uppercase tracking-tight">Security</h3>
              </div>
              
              <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                 Update your authentication credentials regularly to ensure the integrity of your digital parking wallet and identity tokens.
              </p>

              <button 
                 onClick={() => setPasswordModal(true)}
                 className="w-full h-14 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-white font-display font-black text-[10px] uppercase tracking-[0.2em] hover:bg-white/[0.06] hover:border-white/20 transition-all"
              >
                 Reset Hash Credentials
              </button>
           </div>

           <div className="p-8 rounded-[2.5rem] bg-cyan-400/[0.02] border border-cyan-400/10 space-y-6 group">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-xl bg-cyan-400/10 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
                    <Zap size={20} />
                 </div>
                 <h3 className="text-lg font-black font-display text-white uppercase tracking-tight">Rapid Access</h3>
              </div>
              
              <div className="grid gap-3">
                 {[
                   { label: 'Active Map', path: '/parking', icon: MapPin },
                   { label: 'Booking Logs', path: '/reservations', icon: Calendar }
                 ].map((link) => (
                   <button 
                     key={link.label}
                     onClick={() => navigate(link.path)}
                     className="w-full p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-between hover:bg-white/[0.05] hover:border-cyan-400/40 transition-all group/link"
                   >
                      <div className="flex items-center gap-3">
                         <link.icon size={16} className="text-slate-500 group-hover/link:text-cyan-400 transition-colors" />
                         <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">{link.label}</span>
                      </div>
                      <ChevronRight size={14} className="text-slate-600 group-hover/link:translate-x-1 transition-all" />
                   </button>
                 ))}
              </div>
           </div>
        </div>
      </div>

      {/* Password Modal */}
      {passwordModal && (
        <div className="fixed inset-0 z-[3000] bg-[#050505]/95 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="w-full max-w-md p-10 rounded-[3rem] bg-white/[0.01] border border-white/[0.08] shadow-2xl space-y-8 relative overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="text-center space-y-2">
               <div className="w-20 h-20 rounded-[2rem] bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-6">
                  <Lock className="text-amber-500" size={32} />
               </div>
               <h3 className="text-2xl font-black font-display text-white uppercase tracking-tight">Security Hash Update</h3>
               <p className="text-[11px] text-slate-500 font-medium">Establishing new cryptographic link for your identity.</p>
            </div>
            
            <div className="space-y-4">
               {[
                 { label: 'Active Password', key: 'currentPassword' },
                 { label: 'New Secure Hash', key: 'newPassword' },
                 { label: 'Verify Hash', key: 'confirmPassword' }
               ].map((f) => (
                 <div key={f.key} className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-600 ml-1">{f.label}</label>
                    <input 
                      type="password"
                      placeholder="••••••••"
                      value={passwordData[f.key]}
                      onChange={(e) => setPasswordData({...passwordData, [f.key]: e.target.value})}
                      className="w-full h-12 bg-white/[0.03] border border-white/[0.08] rounded-xl px-5 text-sm font-bold text-white focus:outline-none focus:border-amber-500/40 transition-all"
                    />
                 </div>
               ))}
            </div>

            <div className="flex gap-4 pt-4">
              <button onClick={() => setPasswordModal(false)} className="flex-1 h-14 rounded-xl bg-white/[0.03] border border-white/[0.08] text-slate-500 font-display font-black text-[10px] uppercase tracking-widest hover:text-white transition-all">Abort</button>
              <button onClick={handlePasswordChange} className="flex-[2] h-14 rounded-xl bg-white text-black font-display font-black text-[10px] uppercase tracking-widest hover:bg-amber-500 transition-all shadow-xl">Apply Update</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
