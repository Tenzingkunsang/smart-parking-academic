import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Shield, Trash2, ShieldAlert, ShieldCheck, Loader2, Search, Zap, Mail, Phone, Car } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { API_BASE } from '../../config/api';
import toast from 'react-hot-toast';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) setUsers(data.data);
      else setError(data.message || 'Entity registry sync failure');
    } catch { setError('Protocol error: User registry unreachable'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleRoleChange = async (userId, newRole) => {
    if (!window.confirm(`Escalate privileges for entity to ${newRole}?`)) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ role: newRole })
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Privilege hash updated.');
        fetchUsers();
      }
    } catch { toast.error('Privilege escalation protocol failed.'); }
  };

  const handleResetViolations = async (userId) => {
    if (!window.confirm('Reset Entity Grid Violations?')) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/admin/users/${userId}/reset-violations`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Grid violations cleared.');
        fetchUsers();
      }
    } catch { toast.error('Reset protocol failed.'); }
  };

  const filtered = users.filter(u => {
    const q = searchQuery.toLowerCase();
    return u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      
      <section className="flex justify-between items-end border-b border-white/5 pb-10">
         <div className="space-y-1">
            <div className="flex items-center gap-2 text-cyan-400">
               <Users size={14} className="fill-current" />
               <span className="text-[10px] font-black uppercase tracking-[0.2em]">Entity Registry</span>
            </div>
            <h1 className="text-4xl font-black font-display text-white uppercase italic">Grid Entities</h1>
         </div>
         <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-700 group-focus-within:text-cyan-400 transition-colors" size={16} />
            <input 
               type="text" 
               placeholder="Search Identity..." 
               value={searchQuery}
               onChange={e => setSearchQuery(e.target.value)}
               className="h-12 bg-white/5 border border-white/10 rounded-xl pl-12 pr-6 text-sm font-bold text-white focus:outline-none focus:border-cyan-400 focus:bg-white/[0.08] transition-all w-64 md:w-80"
            />
         </div>
      </section>

      {loading ? (
         <div className="py-24 flex flex-col items-center gap-4 text-slate-700">
            <Loader2 className="animate-spin text-cyan-400" size={40} />
            <span className="text-[10px] font-black uppercase tracking-widest">Scanning Identity Cluster...</span>
         </div>
      ) : (
         <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filtered.map((user) => (
              <Card key={user._id} className="group hover:border-white/20 !p-8 flex flex-col justify-between h-[380px] transition-all relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/[0.02] rounded-full blur-3xl group-hover:bg-blue-500/10" />
                 
                 <div className="space-y-6 relative z-10">
                    <div className="flex justify-between items-start">
                       <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white font-display font-black text-xl shadow-2xl group-hover:border-cyan-400/30 group-hover:text-cyan-400 transition-all">
                          {user.name?.charAt(0).toUpperCase()}
                       </div>
                       <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${user.userType === 'admin' ? 'bg-cyan-400/10 text-cyan-400 border border-cyan-400/20 shadow-[0_0_10px_rgba(0,242,255,0.1)]' : 'bg-white/5 text-slate-600 border border-white/5'}`}>
                          {user.userType} Access
                       </span>
                    </div>

                    <div className="space-y-4">
                       <div>
                          <h4 className="text-xl font-black font-display text-white truncate">{user.name}</h4>
                          <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest flex items-center gap-2 mt-1">
                             <Mail size={12} /> {user.email}
                          </p>
                       </div>

                       <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                          <div className="space-y-1">
                             <span className="text-[8px] font-black uppercase tracking-widest text-slate-700 block">Linkage</span>
                             <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400">
                                <Car size={14} className="text-slate-700" /> {user.vehicleNumber || 'UNLINKED'}
                             </div>
                          </div>
                          <div className="space-y-1">
                             <span className="text-[8px] font-black uppercase tracking-widest text-slate-700 block">Archives</span>
                             <div className="flex items-center gap-2 text-[11px] font-bold text-white">
                                <Zap size={14} className="text-cyan-400" /> {user.totalBookings || 0} LOGS
                             </div>
                          </div>
                       </div>
                       
                       {user.violationCount > 0 && (
                          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
                             <span className="text-[9px] font-black uppercase tracking-widest text-amber-500">Grid Violations</span>
                             <span className="text-sm font-black font-display text-white">{user.violationCount}</span>
                          </div>
                       )}
                    </div>
                 </div>

                 <div className="flex gap-3 pt-6 border-t border-white/5 relative z-10">
                    <Button 
                      variant="secondary" 
                      onClick={() => handleRoleChange(user._id, user.userType === 'admin' ? 'user' : 'admin')} 
                      className="flex-1 !py-0 h-10 !text-[9px] flex items-center justify-center gap-2"
                    >
                       {user.userType === 'admin' ? <ShieldAlert size={14} /> : <ShieldCheck size={14} />}
                       {user.userType === 'admin' ? 'Revoke Root' : 'Grant Root'}
                    </Button>
                    {user.violationCount > 0 && (
                      <button 
                        onClick={() => handleResetViolations(user._id)}
                        className="h-10 px-3 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/10 flex items-center justify-center hover:bg-amber-500/20 transition-all text-[9px] font-black uppercase"
                        title="Reset Violations"
                      >
                         Reset
                      </button>
                    )}
                    <button
                      onClick={async () => {
                        if (!window.confirm(`Delete ${user.name}? This cannot be undone.`)) return;
                        try {
                          const token = localStorage.getItem('token');
                          const response = await fetch(`${API_BASE}/admin/users/${user._id}`, {
                            method: 'DELETE',
                            headers: { Authorization: `Bearer ${token}` },
                          });
                          const data = await response.json();
                          if (data.success) {
                            toast.success('User deleted.');
                            fetchUsers();
                          } else {
                            toast.error(data.message || 'Delete failed.');
                          }
                        } catch {
                          toast.error('Network error during delete.');
                        }
                      }}
                      className="w-10 h-10 rounded-xl bg-red-500/5 text-red-500 border border-red-500/10 flex items-center justify-center hover:bg-red-500/10 transition-all"
                    >
                       <Trash2 size={16} />
                    </button>
                 </div>
              </Card>
            ))}
         </div>
      )}
    </div>
  );
};

export default AdminUsers;
