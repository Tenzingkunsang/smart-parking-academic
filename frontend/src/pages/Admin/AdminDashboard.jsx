import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign, CalendarCheck, RotateCcw, Loader2, QrCode,
  ClipboardList, ParkingSquare, TrendingUp, Users, AlertTriangle,
  ArrowRight, Activity, Clock, CheckCircle2, XCircle, Eye,
} from 'lucide-react';
import { API_BASE } from '../../config/api';

// ─── Stat card ────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, sub, icon: Icon, accent = 'cyan', trend }) => {
  const accents = {
    cyan:   { ring: 'border-cyan-500/20',   bg: 'bg-cyan-500/8',   icon: 'text-cyan-400',   glow: 'shadow-cyan-500/10' },
    emerald:{ ring: 'border-emerald-500/20', bg: 'bg-emerald-500/8', icon: 'text-emerald-400', glow: 'shadow-emerald-500/10' },
    violet: { ring: 'border-violet-500/20', bg: 'bg-violet-500/8', icon: 'text-violet-400', glow: 'shadow-violet-500/10' },
    amber:  { ring: 'border-amber-500/20',  bg: 'bg-amber-500/8',  icon: 'text-amber-400',  glow: 'shadow-amber-500/10' },
    blue:   { ring: 'border-blue-500/20',   bg: 'bg-blue-500/8',   icon: 'text-blue-400',   glow: 'shadow-blue-500/10' },
    rose:   { ring: 'border-rose-500/20',   bg: 'bg-rose-500/8',   icon: 'text-rose-400',   glow: 'shadow-rose-500/10' },
  };
  const a = accents[accent];
  return (
    <div className={`relative rounded-2xl bg-[#0c0c0e] border ${a.ring} p-5 hover:bg-[#0f0f12] transition-all duration-300 shadow-lg ${a.glow} group overflow-hidden`}>
      <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full ${a.bg} blur-2xl opacity-60 group-hover:opacity-100 transition-opacity`} />
      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div className={`w-10 h-10 rounded-xl ${a.bg} border ${a.ring} flex items-center justify-center`}>
            <Icon size={18} className={a.icon} />
          </div>
          {trend !== undefined && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${trend >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
              {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
            </span>
          )}
        </div>
        <p className="text-2xl font-black text-white tracking-tight">{value}</p>
        <p className="text-[11px] font-semibold text-slate-500 mt-1 uppercase tracking-wider">{label}</p>
        {sub && <p className="text-[10px] text-slate-700 mt-1">{sub}</p>}
      </div>
    </div>
  );
};

// ─── Quick action card ────────────────────────────────────────────────────────
const ActionCard = ({ label, desc, icon: Icon, onClick, gradient, shadow }) => (
  <button
    onClick={onClick}
    className={`group relative overflow-hidden rounded-2xl p-6 text-left transition-all duration-300 hover:scale-[1.02] active:scale-[0.99] ${gradient} ${shadow} border border-white/10`}
  >
    <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/5 group-hover:scale-150 transition-transform duration-500" />
    <div className="relative z-10 flex flex-col gap-3">
      <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
        <Icon size={20} className="text-white" strokeWidth={2} />
      </div>
      <div>
        <p className="text-base font-extrabold text-white">{label}</p>
        <p className="text-xs text-white/50 mt-0.5">{desc}</p>
      </div>
      <ArrowRight size={14} className="text-white/30 group-hover:text-white/70 group-hover:translate-x-1 transition-all" />
    </div>
  </button>
);

// ─── Status badge ─────────────────────────────────────────────────────────────
const statusBadge = (status) => {
  const map = {
    reserved:    'bg-blue-500/15 text-blue-400 border-blue-500/20',
    'checked-in':'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    completed:   'bg-slate-500/10 text-slate-500 border-slate-500/15',
    cancelled:   'bg-red-500/15 text-red-400 border-red-500/20',
    'no-show':   'bg-amber-500/15 text-amber-400 border-amber-500/20',
    overstay:    'bg-orange-500/15 text-orange-400 border-orange-500/20',
    pending:     'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  };
  return `inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wide border ${map[status] || 'bg-slate-500/10 text-slate-500 border-slate-500/15'}`;
};

// ─── Main ─────────────────────────────────────────────────────────────────────
const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentBookings, setRecentBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };
        const [statsRes, resRes] = await Promise.all([
          fetch(`${API_BASE}/admin/stats`, { headers }),
          fetch(`${API_BASE}/admin/reservations?limit=6`, { headers }),
        ]);
        const [statsData, resData] = await Promise.all([statsRes.json(), resRes.json()]);
        if (statsData.success) setStats(statsData.data);
        if (resData.success) setRecentBookings(resData.data || []);
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
      <div className="relative">
        <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
          <Loader2 className="animate-spin text-cyan-400" size={26} />
        </div>
      </div>
      <p className="text-sm font-semibold text-slate-500">Loading dashboard...</p>
    </div>
  );

  const utilizationPct = stats?.totalSpots
    ? Math.round(((stats.occupiedSpots || 0) / stats.totalSpots) * 100)
    : 0;

  return (
    <div className="space-y-8 pb-10 animate-in fade-in duration-500">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-600 mb-1">
            {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {greeting}, <span className="text-cyan-400">{user.name?.split(' ')[0] || 'Admin'}</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">Here's what's happening with your parking system today.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0c0c0e] border border-white/[0.06] self-start sm:self-auto">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-semibold text-slate-400">
            {stats?.activeReservations || 0} active now
          </span>
        </div>
      </div>

      {/* ── 6 stat cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatCard label="Total Revenue"    value={`NPR ${(stats?.totalRevenue || 0).toLocaleString()}`}   icon={DollarSign}   accent="emerald" />
        <StatCard label="Today Revenue"    value={`NPR ${(stats?.todayRevenue || 0).toLocaleString()}`}    icon={TrendingUp}   accent="cyan" />
        <StatCard label="Active Bookings"  value={stats?.activeReservations || 0}                          icon={Activity}     accent="blue" />
        <StatCard label="Total Users"      value={stats?.totalUsers || 0}                                  icon={Users}        accent="violet" />
        <StatCard label="No-Shows"         value={stats?.noShowCount || 0}                                 icon={AlertTriangle} accent="amber" sub="all time" />
        <StatCard label="Pending Refunds"  value={stats?.pendingRefundsCount || 0}                         icon={RotateCcw}    accent="rose" />
      </div>

      {/* ── Utilization bar + spot breakdown ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Utilization */}
        <div className="md:col-span-2 rounded-2xl bg-[#0c0c0e] border border-white/[0.06] p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Lot Utilization</p>
              <p className="text-2xl font-black text-white mt-0.5">{utilizationPct}%</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-600">Total capacity</p>
              <p className="text-sm font-bold text-white">{stats?.totalSpots || 0} spots</p>
            </div>
          </div>
          {/* Progress bar */}
          <div className="h-3 rounded-full bg-white/[0.05] overflow-hidden mb-3">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-1000"
              style={{ width: `${utilizationPct}%` }}
            />
          </div>
          {/* Legend */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            {[
              { label: 'Available', value: stats?.availableSpots || 0, color: 'bg-emerald-400' },
              { label: 'Reserved',  value: stats?.reservedSpots  || 0, color: 'bg-blue-400' },
              { label: 'Occupied',  value: stats?.occupiedSpots  || 0, color: 'bg-orange-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${color} shrink-0`} />
                <div>
                  <p className="text-sm font-bold text-white">{value}</p>
                  <p className="text-[9px] text-slate-600 uppercase tracking-wide">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Overstay revenue card */}
        <div className="rounded-2xl bg-[#0c0c0e] border border-orange-500/15 p-5 flex flex-col justify-between">
          <div>
            <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mb-3">
              <Clock size={16} className="text-orange-400" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Today Overstay</p>
            <p className="text-2xl font-black text-white mt-1">
              NPR {(stats?.todayOverstayRevenue || 0).toLocaleString()}
            </p>
          </div>
          <div className="mt-4 pt-4 border-t border-white/[0.05] flex items-center justify-between">
            <p className="text-[10px] text-slate-600">Users with debt</p>
            <p className="text-sm font-bold text-orange-400">{stats?.usersWithDebt || 0}</p>
          </div>
        </div>
      </div>

      {/* ── Quick actions ── */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-3">Quick Actions</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <ActionCard
            label="QR Scanner"
            desc="Check-in or check-out via QR"
            icon={QrCode}
            onClick={() => navigate('/admin/qr-scanner')}
            gradient="bg-gradient-to-br from-blue-600 to-blue-800"
            shadow="shadow-xl shadow-blue-900/30"
          />
          <ActionCard
            label="Reservations"
            desc="View and manage all bookings"
            icon={ClipboardList}
            onClick={() => navigate('/admin/reservations')}
            gradient="bg-gradient-to-br from-emerald-600 to-teal-800"
            shadow="shadow-xl shadow-emerald-900/30"
          />
          <ActionCard
            label="Manage Spots"
            desc="Add, edit, or deactivate spots"
            icon={ParkingSquare}
            onClick={() => navigate('/admin/manage-spots')}
            gradient="bg-gradient-to-br from-violet-600 to-purple-800"
            shadow="shadow-xl shadow-violet-900/30"
          />
        </div>
      </div>

      {/* ── Recent bookings ── */}
      <div className="rounded-2xl bg-[#0c0c0e] border border-white/[0.06] overflow-hidden">
        <div className="px-6 py-4 border-b border-white/[0.05] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CalendarCheck size={15} className="text-cyan-400" />
            <h2 className="text-sm font-extrabold text-white">Recent Reservations</h2>
            <span className="px-2 py-0.5 rounded-full bg-white/5 text-[10px] font-bold text-slate-500">{recentBookings.length}</span>
          </div>
          <button
            onClick={() => navigate('/admin/reservations')}
            className="flex items-center gap-1.5 text-[11px] font-bold text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            View All <ArrowRight size={12} />
          </button>
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.04]">
                {['Customer', 'Spot', 'Amount', 'Status', 'Date'].map((h) => (
                  <th key={h} className="text-left px-6 py-3 text-[9px] font-bold uppercase tracking-widest text-slate-700">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {recentBookings.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-14 text-center text-slate-700 text-sm">No reservations yet.</td>
                </tr>
              ) : recentBookings.map((b) => (
                <tr key={b._id} className="hover:bg-white/[0.015] transition-colors group">
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-slate-700 to-slate-800 border border-white/8 flex items-center justify-center text-white text-[10px] font-black shrink-0">
                        {b.user?.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white truncate max-w-[130px]">{b.user?.name || 'Unknown'}</p>
                        <p className="text-[10px] text-slate-700 truncate max-w-[130px]">{b.user?.email || ''}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3.5">
                    <p className="text-sm font-medium text-slate-300 truncate max-w-[120px]">
                      {b.parkingSpot?.locationName || 'N/A'}
                    </p>
                    <p className="text-[10px] text-slate-700">#{b.parkingSpot?.spotNumber || '—'}</p>
                  </td>
                  <td className="px-6 py-3.5">
                    <span className="text-sm font-bold text-white">
                      NPR {b.amountInfo?.finalAmount ?? b.amountInfo?.totalAmount ?? 0}
                    </span>
                  </td>
                  <td className="px-6 py-3.5">
                    <span className={statusBadge(b.status)}>{b.status}</span>
                  </td>
                  <td className="px-6 py-3.5">
                    <p className="text-sm text-slate-400">{new Date(b.createdAt || b.reservationTime).toLocaleDateString()}</p>
                    <p className="text-[10px] text-slate-700">
                      {new Date(b.createdAt || b.reservationTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile list */}
        <div className="md:hidden divide-y divide-white/[0.04]">
          {recentBookings.length === 0 ? (
            <div className="p-8 text-center text-slate-700 text-sm">No reservations yet.</div>
          ) : recentBookings.map((b) => (
            <div key={b._id} className="px-5 py-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-slate-800 border border-white/8 flex items-center justify-center text-white text-xs font-black shrink-0">
                  {b.user?.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{b.user?.name || 'Unknown'}</p>
                  <p className="text-[10px] text-slate-600">{b.parkingSpot?.locationName || '—'}</p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className={statusBadge(b.status)}>{b.status}</span>
                <p className="text-[10px] text-slate-600 mt-1">NPR {b.amountInfo?.totalAmount ?? 0}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
