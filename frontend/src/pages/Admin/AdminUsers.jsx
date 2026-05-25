import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Shield, Trash2, ShieldAlert, ShieldCheck, Loader2,
  Search, Mail, Phone, Car, ArrowLeft, RotateCcw, Building2,
  AlertTriangle, CheckCircle2, MoreHorizontal, RefreshCw,
  UserCheck, UserX, Wallet,
} from 'lucide-react';
import { API_BASE } from '../../config/api';
import toast from 'react-hot-toast';

const ROLE_STYLES = {
  admin:          { label: 'Admin',          bg: 'bg-cyan-500/12',   text: 'text-cyan-400',   border: 'border-cyan-500/25',   dot: 'bg-cyan-400' },
  business_owner: { label: 'Business Owner', bg: 'bg-violet-500/12', text: 'text-violet-400', border: 'border-violet-500/25', dot: 'bg-violet-400' },
  user:           { label: 'User',           bg: 'bg-slate-500/10',  text: 'text-slate-400',  border: 'border-slate-500/15',  dot: 'bg-slate-600' },
};

const RoleBadge = ({ role }) => {
  const s = ROLE_STYLES[role] || ROLE_STYLES.user;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border ${s.bg} ${s.text} ${s.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
};

// ─── Action menu ──────────────────────────────────────────────────────────────
const UserActionMenu = ({ user, onRoleChange, onResetViolations, onClearDebt, onDelete, onVerifyBusiness }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((p) => !p); }}
        className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all"
      >
        <MoreHorizontal size={14} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 z-20 w-52 rounded-xl bg-[#111114] border border-white/10 shadow-2xl overflow-hidden py-1">
            {user.userType !== 'admin' && (
              <MenuItem icon={ShieldCheck} label="Promote to Admin" onClick={() => { onRoleChange('admin'); setOpen(false); }} />
            )}
            {user.userType === 'admin' && (
              <MenuItem icon={ShieldAlert} label="Demote to User" onClick={() => { onRoleChange('user'); setOpen(false); }} danger />
            )}
            {user.userType !== 'business_owner' && user.userType !== 'admin' && (
              <MenuItem icon={Building2} label="Make Business Owner" onClick={() => { onRoleChange('business_owner'); setOpen(false); }} />
            )}
            {user.userType === 'business_owner' && (
              <MenuItem icon={CheckCircle2} label="Verify Business" onClick={() => { onVerifyBusiness(user._id, true); setOpen(false); }} />
            )}
            {user.violationCount > 0 && (
              <MenuItem icon={RotateCcw} label="Reset Violations" onClick={() => { onResetViolations(); setOpen(false); }} />
            )}
            {user.overstayDebt > 0 && (
              <MenuItem icon={Wallet} label="Clear Overstay Debt" onClick={() => { onClearDebt(); setOpen(false); }} />
            )}
            <div className="border-t border-white/[0.06] my-1" />
            <MenuItem icon={Trash2} label="Delete User" onClick={() => { onDelete(); setOpen(false); }} danger />
          </div>
        </>
      )}
    </div>
  );
};

const MenuItem = ({ icon: Icon, label, onClick, danger }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold transition-all ${
      danger ? 'text-red-400 hover:bg-red-500/10' : 'text-slate-300 hover:bg-white/[0.04]'
    }`}
  >
    <Icon size={13} /> {label}
  </button>
);

// ─── Main ─────────────────────────────────────────────────────────────────────
const AdminUsers = () => {
  const navigate = useNavigate();
  const [users, setUsers]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [searchQuery, setSearch]  = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const token = () => localStorage.getItem('token');
  const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const r = await fetch(`${API_BASE}/admin/users`, { headers: headers() });
      const d = await r.json();
      if (d.success) setUsers(d.data);
      else setError(d.message || 'Failed to load users');
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleRoleChange = async (userId, newRole) => {
    const label = ROLE_STYLES[newRole]?.label || newRole;
    if (!window.confirm(`Change this user's role to ${label}?`)) return;
    try {
      const r = await fetch(`${API_BASE}/admin/users/${userId}/role`, {
        method: 'PUT', headers: headers(), body: JSON.stringify({ role: newRole }),
      });
      const d = await r.json();
      if (d.success) { toast.success(`Role updated to ${label}.`); fetchUsers(); }
      else toast.error(d.message || 'Failed');
    } catch { toast.error('Network error'); }
  };

  const handleResetViolations = async (userId) => {
    if (!window.confirm('Reset this user\'s violations?')) return;
    try {
      const r = await fetch(`${API_BASE}/admin/users/${userId}/reset-violations`, {
        method: 'PUT', headers: headers(),
      });
      const d = await r.json();
      if (d.success) { toast.success('Violations reset.'); fetchUsers(); }
    } catch { toast.error('Network error'); }
  };

  const handleClearDebt = async (userId) => {
    if (!window.confirm('Clear this user\'s overstay debt?')) return;
    try {
      const r = await fetch(`${API_BASE}/admin/users/${userId}/clear-debt`, {
        method: 'PUT', headers: headers(),
      });
      const d = await r.json();
      if (d.success) { toast.success('Debt cleared.'); fetchUsers(); }
    } catch { toast.error('Network error'); }
  };

  const handleVerifyBusiness = async (userId, verified) => {
    try {
      const r = await fetch(`${API_BASE}/admin/users/${userId}/verify-business`, {
        method: 'PUT', headers: headers(), body: JSON.stringify({ verified }),
      });
      const d = await r.json();
      if (d.success) { toast.success(`Business account ${verified ? 'verified' : 'unverified'}.`); fetchUsers(); }
    } catch { toast.error('Network error'); }
  };

  const handleDelete = async (userId, name) => {
    if (!window.confirm(`Permanently delete "${name}"? This cannot be undone.`)) return;
    try {
      const r = await fetch(`${API_BASE}/admin/users/${userId}`, {
        method: 'DELETE', headers: headers(),
      });
      const d = await r.json();
      if (d.success) { toast.success('User deleted.'); fetchUsers(); }
      else toast.error(d.message || 'Failed');
    } catch { toast.error('Network error'); }
  };

  const filtered = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.phone?.includes(q);
    const matchRole   = roleFilter === 'all' || u.userType === roleFilter;
    return matchSearch && matchRole;
  });

  const counts = {
    all: users.length,
    user: users.filter((u) => u.userType === 'user').length,
    admin: users.filter((u) => u.userType === 'admin').length,
    business_owner: users.filter((u) => u.userType === 'business_owner').length,
  };

  return (
    <div className="space-y-7 pb-10 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/admin')}
            className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all shrink-0">
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-2xl font-black text-white">Users</h1>
            <p className="text-sm text-slate-500">{counts.all} registered account{counts.all !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <button onClick={fetchUsers}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all text-xs font-bold self-start sm:self-auto">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" size={15} />
          <input
            type="text" placeholder="Search by name, email, or phone..."
            value={searchQuery} onChange={(e) => setSearch(e.target.value)}
            className="w-full h-11 bg-[#0c0c0e] border border-white/8 rounded-xl pl-10 pr-4 text-sm font-medium text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/40 focus:bg-[#0f0f12] transition-all"
          />
        </div>
        {/* Role tabs */}
        <div className="flex items-center gap-1 bg-[#0c0c0e] border border-white/8 rounded-xl p-1 h-11">
          {[
            { key: 'all', label: 'All' },
            { key: 'user', label: 'Users' },
            { key: 'admin', label: 'Admins' },
            { key: 'business_owner', label: 'Business' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setRoleFilter(key)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap ${
                roleFilter === key
                  ? 'bg-white/10 text-white'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {label} <span className="opacity-50">{counts[key]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl bg-red-500/8 border border-red-500/20 p-4 text-sm text-red-400">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="animate-spin text-cyan-400" size={32} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl bg-[#0c0c0e] border border-white/[0.05] p-16 text-center">
          <Users size={36} className="text-slate-700 mx-auto mb-3" />
          <p className="text-slate-500 font-semibold">No users match your search.</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden lg:block rounded-2xl bg-[#0c0c0e] border border-white/[0.06] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.05]">
                  {['User', 'Contact', 'Role', 'Activity', 'Flags', ''].map((h) => (
                    <th key={h} className="text-left px-5 py-3.5 text-[9px] font-black uppercase tracking-widest text-slate-700 first:pl-6 last:pr-6">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {filtered.map((u) => (
                  <tr key={u._id} className="hover:bg-white/[0.015] transition-colors group">
                    {/* User */}
                    <td className="px-5 py-4 pl-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 border border-white/8 flex items-center justify-center text-white font-black text-sm shrink-0">
                          {u.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white truncate max-w-[140px]">{u.name}</p>
                          <p className="text-[10px] text-slate-600 truncate max-w-[140px]">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    {/* Contact */}
                    <td className="px-5 py-4">
                      <p className="text-xs text-slate-400">{u.phone || <span className="text-slate-700">—</span>}</p>
                      <p className="text-[10px] text-slate-700">{u.vehicleNumber || '—'}</p>
                    </td>
                    {/* Role */}
                    <td className="px-5 py-4">
                      <RoleBadge role={u.userType} />
                      {u.userType === 'business_owner' && (
                        <p className="text-[9px] text-slate-700 mt-1">
                          {u.businessProfile?.verified ? '✓ verified' : '⏳ pending'}
                        </p>
                      )}
                    </td>
                    {/* Activity */}
                    <td className="px-5 py-4">
                      <p className="text-sm font-bold text-white">{u.totalBookings || 0}</p>
                      <p className="text-[10px] text-slate-700">bookings</p>
                    </td>
                    {/* Flags */}
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-1">
                        {u.violationCount > 0 && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
                            <AlertTriangle size={9} /> {u.violationCount} violation{u.violationCount !== 1 ? 's' : ''}
                          </span>
                        )}
                        {u.penaltyActive && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-md">
                            <UserX size={9} /> Penalised
                          </span>
                        )}
                        {u.overstayDebt > 0 && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-md">
                            <Wallet size={9} /> NPR {u.overstayDebt} debt
                          </span>
                        )}
                        {!u.violationCount && !u.penaltyActive && !u.overstayDebt && (
                          <span className="text-[10px] text-slate-700">Clean</span>
                        )}
                      </div>
                    </td>
                    {/* Actions */}
                    <td className="px-5 py-4 pr-6">
                      <UserActionMenu
                        user={u}
                        onRoleChange={(role) => handleRoleChange(u._id, role)}
                        onResetViolations={() => handleResetViolations(u._id)}
                        onClearDebt={() => handleClearDebt(u._id)}
                        onDelete={() => handleDelete(u._id, u.name)}
                        onVerifyBusiness={handleVerifyBusiness}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="lg:hidden space-y-3">
            {filtered.map((u) => (
              <div key={u._id} className="rounded-2xl bg-[#0c0c0e] border border-white/[0.06] p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 border border-white/8 flex items-center justify-center text-white font-black text-base shrink-0">
                      {u.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{u.name}</p>
                      <p className="text-[11px] text-slate-600">{u.email}</p>
                    </div>
                  </div>
                  <UserActionMenu
                    user={u}
                    onRoleChange={(role) => handleRoleChange(u._id, role)}
                    onResetViolations={() => handleResetViolations(u._id)}
                    onClearDebt={() => handleClearDebt(u._id)}
                    onDelete={() => handleDelete(u._id, u.name)}
                    onVerifyBusiness={handleVerifyBusiness}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <RoleBadge role={u.userType} />
                  <div className="flex items-center gap-2">
                    {u.violationCount > 0 && (
                      <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
                        {u.violationCount} violations
                      </span>
                    )}
                    {u.overstayDebt > 0 && (
                      <span className="text-[9px] font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-md">
                        NPR {u.overstayDebt} debt
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-white/[0.03] py-2">
                    <p className="text-sm font-bold text-white">{u.totalBookings || 0}</p>
                    <p className="text-[9px] text-slate-600">Bookings</p>
                  </div>
                  <div className="rounded-lg bg-white/[0.03] py-2">
                    <p className="text-sm font-bold text-white">{u.violationCount || 0}</p>
                    <p className="text-[9px] text-slate-600">Violations</p>
                  </div>
                  <div className="rounded-lg bg-white/[0.03] py-2">
                    <p className="text-sm font-bold text-white">NPR {u.walletBalance || 0}</p>
                    <p className="text-[9px] text-slate-600">Wallet</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default AdminUsers;
