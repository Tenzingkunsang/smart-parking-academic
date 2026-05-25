import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, MapPin, Calendar, AlertTriangle, QrCode,
  Loader2, RefreshCw, ArrowRight, Clock, DollarSign,
  Activity, CheckCircle, XCircle, BarChart3, Zap,
} from 'lucide-react';
import { API_BASE } from '../../config/api';

// ─── Sub-components ────────────────────────────────────────────────────────────

const StatCard = ({ label, value, sub, icon: Icon, color = 'violet', trend }) => {
  const palette = {
    violet:  { bg: 'bg-violet-500/10',  border: 'border-violet-500/20',  icon: 'text-violet-400',  glow: 'shadow-violet-500/10' },
    emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: 'text-emerald-400', glow: 'shadow-emerald-500/10' },
    blue:    { bg: 'bg-blue-500/10',    border: 'border-blue-500/20',    icon: 'text-blue-400',    glow: 'shadow-blue-500/10'   },
    orange:  { bg: 'bg-orange-500/10',  border: 'border-orange-500/20',  icon: 'text-orange-400',  glow: 'shadow-orange-500/10' },
    red:     { bg: 'bg-red-500/10',     border: 'border-red-500/20',     icon: 'text-red-400',     glow: 'shadow-red-500/10'    },
    amber:   { bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   icon: 'text-amber-400',   glow: 'shadow-amber-500/10'  },
  };
  const c = palette[color] || palette.violet;
  return (
    <div className={`relative rounded-2xl ${c.bg} border ${c.border} p-5 overflow-hidden shadow-lg ${c.glow}`}>
      {/* Background decoration */}
      <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full ${c.bg} opacity-50`} />
      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">{label}</p>
          <div className={`w-8 h-8 rounded-xl ${c.bg} border ${c.border} flex items-center justify-center shrink-0`}>
            <Icon size={14} className={c.icon} />
          </div>
        </div>
        <p className="text-3xl font-black text-white tracking-tight">{value}</p>
        {sub && <p className="text-[11px] text-slate-500 mt-1.5 font-medium">{sub}</p>}
        {trend !== undefined && (
          <div className={`inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-lg text-[10px] font-bold ${
            trend > 0 ? 'bg-emerald-500/15 text-emerald-400' : trend < 0 ? 'bg-red-500/15 text-red-400' : 'bg-slate-500/15 text-slate-400'
          }`}>
            <TrendingUp size={9} />
            {trend > 0 ? `+${trend}` : trend} today
          </div>
        )}
      </div>
    </div>
  );
};

const ActionCard = ({ label, desc, path, icon: Icon, color, onClick }) => {
  const palette = {
    violet:  { bg: 'hover:bg-violet-500/8',  border: 'border-violet-500/15 hover:border-violet-500/35',  icon: 'text-violet-400', dot: 'bg-violet-400' },
    blue:    { bg: 'hover:bg-blue-500/8',    border: 'border-blue-500/15 hover:border-blue-500/35',      icon: 'text-blue-400',   dot: 'bg-blue-400'   },
    emerald: { bg: 'hover:bg-emerald-500/8', border: 'border-emerald-500/15 hover:border-emerald-500/35',icon: 'text-emerald-400',dot: 'bg-emerald-400' },
  };
  const c = palette[color] || palette.violet;
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-4 p-5 rounded-2xl bg-white/[0.02] border ${c.border} ${c.bg} transition-all group text-left`}
    >
      <div className={`w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
        <Icon size={18} className={c.icon} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white">{label}</p>
        <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
      </div>
      <ArrowRight size={15} className="text-slate-600 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
    </button>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────

const BusinessDashboard = () => {
  const navigate  = useNavigate();
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const user    = JSON.parse(localStorage.getItem('user') || '{}');
  const bizName = user.businessProfile?.businessName || user.name || 'My Business';

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';
  const dateStr  = now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const r = await fetch(`${API_BASE}/business/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      if (d.success) setStats(d.data);
      else setError(d.message || 'Failed to load stats');
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-40 gap-4">
      <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
        <Loader2 className="animate-spin text-violet-400" size={24} />
      </div>
      <p className="text-slate-500 text-sm font-semibold">Loading dashboard…</p>
    </div>
  );

  if (error) return (
    <div className="rounded-2xl bg-red-500/5 border border-red-500/20 p-12 text-center space-y-4">
      <XCircle size={36} className="text-red-400 mx-auto" />
      <p className="text-red-400 font-bold">{error}</p>
      <button onClick={fetchStats} className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm font-bold text-white hover:bg-white/10 transition-all">
        Retry
      </button>
    </div>
  );

  const totalSpots    = stats?.totalSpots       ?? 0;
  const activePct     = totalSpots > 0 ? Math.round(((stats?.activeReservations ?? 0) / totalSpots) * 100) : 0;

  return (
    <div className="space-y-8 pb-12">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-violet-400/70 mb-1">{dateStr}</p>
          <h1 className="text-3xl font-black text-white tracking-tight">
            {greeting}, <span className="text-violet-400">{bizName}</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">Here's your parking business performance overview.</p>
        </div>
        <button
          onClick={fetchStats}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/10 transition-all text-xs font-bold self-start sm:self-auto"
        >
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {/* ── Primary Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Spots"
          value={totalSpots}
          sub={`${stats?.activeReservations ?? 0} active right now`}
          icon={MapPin}
          color="violet"
        />
        <StatCard
          label="Today's Revenue"
          value={`NPR ${(stats?.todayRevenue ?? 0).toLocaleString()}`}
          sub="completed checkouts"
          icon={DollarSign}
          color="emerald"
        />
        <StatCard
          label="Active Sessions"
          value={stats?.activeReservations ?? 0}
          sub={`${activePct}% occupancy`}
          icon={Activity}
          color="blue"
        />
        <StatCard
          label="Overstay Revenue"
          value={`NPR ${(stats?.todayOverstayRevenue ?? 0).toLocaleString()}`}
          sub="penalty charges today"
          icon={Clock}
          color={(stats?.todayOverstayRevenue ?? 0) > 0 ? 'orange' : 'violet'}
        />
      </div>

      {/* ── Secondary Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Total Revenue"
          value={`NPR ${(stats?.totalRevenue ?? 0).toLocaleString()}`}
          sub="all time"
          icon={TrendingUp}
          color="emerald"
        />
        <StatCard
          label="Completed Today"
          value={stats?.completedToday ?? 0}
          sub="checkouts processed"
          icon={CheckCircle}
          color="blue"
        />
        <StatCard
          label="No-Shows"
          value={stats?.noShowCount ?? 0}
          sub="missed arrivals"
          icon={AlertTriangle}
          color={(stats?.noShowCount ?? 0) > 0 ? 'amber' : 'violet'}
        />
      </div>

      {/* ── Occupancy Bar ── */}
      {totalSpots > 0 && (
        <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 size={14} className="text-violet-400" />
              <h2 className="text-sm font-extrabold text-white">Lot Utilization</h2>
            </div>
            <span className="text-xs font-bold text-violet-400">{activePct}% occupied</span>
          </div>

          {/* Progress bar */}
          <div className="h-3 bg-white/[0.04] rounded-full overflow-hidden flex">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-l-full transition-all duration-700"
              style={{ width: `${totalSpots > 0 ? ((totalSpots - (stats?.activeReservations ?? 0)) / totalSpots) * 100 : 100}%` }}
            />
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-purple-400 transition-all duration-700"
              style={{ width: `${activePct}%` }}
            />
          </div>

          {/* Legend */}
          <div className="flex items-center gap-5 text-xs font-semibold text-slate-500">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />Available ({totalSpots - (stats?.activeReservations ?? 0)})</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-violet-400 inline-block" />Occupied ({stats?.activeReservations ?? 0})</span>
          </div>
        </div>
      )}

      {/* ── Peak Hours Chart ── */}
      {stats?.peakUsageByHour?.length > 0 && (
        <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Zap size={14} className="text-violet-400" />
            <h2 className="text-sm font-extrabold text-white">Peak Hours</h2>
            <span className="text-[10px] text-slate-600 ml-auto">hourly reservation volume</span>
          </div>
          <div className="flex items-end gap-1.5 h-24">
            {stats.peakUsageByHour.map((h) => {
              const max = Math.max(...stats.peakUsageByHour.map((x) => x.count), 1);
              const pct = (h.count / max) * 100;
              return (
                <div key={h._id} className="flex flex-col items-center gap-1 flex-1 min-w-0">
                  <span className="text-[9px] text-slate-600 font-bold">{h.count > 0 ? h.count : ''}</span>
                  <div
                    style={{ height: `${Math.max(6, pct * 0.7)}px` }}
                    className={`w-full rounded-sm transition-all ${
                      pct > 70 ? 'bg-violet-500' : pct > 35 ? 'bg-violet-500/60' : 'bg-violet-500/25'
                    }`}
                  />
                  <span className="text-[9px] text-slate-700 font-bold truncate w-full text-center">{h._id}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Quick Actions ── */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600 mb-3">Quick Actions</p>
        <div className="grid sm:grid-cols-3 gap-3">
          <ActionCard
            label="Manage Spots"
            desc="Add, edit, or remove parking spots"
            icon={MapPin}
            color="violet"
            onClick={() => navigate('/business/spots')}
          />
          <ActionCard
            label="Reservations"
            desc="Check in, check out, and manage bookings"
            icon={Calendar}
            color="blue"
            onClick={() => navigate('/business/reservations')}
          />
          <ActionCard
            label="QR Scanner"
            desc="Scan customer codes for fast check-in"
            icon={QrCode}
            color="emerald"
            onClick={() => navigate('/business/qr-scanner')}
          />
        </div>
      </div>

    </div>
  );
};

export default BusinessDashboard;
