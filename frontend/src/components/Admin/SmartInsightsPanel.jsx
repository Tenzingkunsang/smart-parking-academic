import React, { useEffect, useState } from 'react';
import { API_BASE } from '../../config/api';

const StatCard = ({ label, value, sub, accent = 'cyan', icon, trend }) => {
  const accentMap = {
    cyan: 'from-cyan-500/30 to-cyan-500/0 border-cyan-400/40 text-cyan-300 shadow-cyan-500/20',
    emerald: 'from-emerald-500/30 to-emerald-500/0 border-emerald-400/40 text-emerald-300 shadow-emerald-500/20',
    blue: 'from-blue-500/30 to-blue-500/0 border-blue-400/40 text-blue-300 shadow-blue-500/20',
    rose: 'from-rose-500/30 to-rose-500/0 border-rose-400/40 text-rose-300 shadow-rose-500/20'
  };
  return (
    <div className={`relative rounded-xl border bg-slate-900/60 backdrop-blur-xl p-4 overflow-hidden shadow-lg ${accentMap[accent]}`}>
      <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl bg-gradient-to-br ${accentMap[accent]}`} />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{label}</p>
          <p className="text-3xl font-extrabold text-white mt-1">{value}</p>
          {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
        </div>
        {icon && (
          <div className={`w-9 h-9 rounded-lg bg-slate-800/80 flex items-center justify-center border ${accentMap[accent].split(' ').find(c => c.startsWith('border-'))}`}>
            {icon}
          </div>
        )}
      </div>
      {trend != null && (
        <div className={`mt-3 inline-flex items-center gap-1 text-xs font-bold ${trend >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
          <span>{trend >= 0 ? '▲' : '▼'}</span>
          <span>{Math.abs(trend).toFixed(1)}%</span>
          <span className="text-slate-500 font-normal">vs yesterday</span>
        </div>
      )}
    </div>
  );
};

export default function SmartInsightsPanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = localStorage.getItem('token') || localStorage.getItem('authToken');
        const res = await fetch(`${API_BASE}/admin/analytics/insights`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        const json = await res.json();
        if (cancelled) return;
        if (!json.success) throw new Error(json.message);
        setData(json.data);
      } catch (e) {
        if (!cancelled) setErr(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 rounded-xl bg-slate-800/40 animate-pulse" />
        ))}
      </div>
    );
  }

  if (err) {
    return (
      <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
        {err}
      </div>
    );
  }

  const { occupancy, revenue, topRated } = data;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        label="Occupancy Rate"
        value={`${occupancy.occupancyRate}%`}
        sub={`${occupancy.activeBookings} active / ${occupancy.totalSpots} spots`}
        accent="cyan"
        icon={<span className="text-cyan-300 text-lg">⛶</span>}
      />
      <StatCard
        label="Today's Revenue"
        value={`₱${revenue.todayRevenue.toLocaleString()}`}
        sub={`${revenue.todayBookings} bookings`}
        accent="emerald"
        trend={revenue.revenueGrowthPct}
        icon={<span className="text-emerald-300 text-lg">₱</span>}
      />
      <StatCard
        label="Yesterday"
        value={`₱${revenue.yesterdayRevenue.toLocaleString()}`}
        sub="Baseline"
        accent="blue"
        icon={<span className="text-blue-300 text-lg">⌛</span>}
      />
      <div className="relative rounded-xl border border-emerald-400/40 bg-slate-900/60 backdrop-blur-xl p-4 overflow-hidden shadow-lg shadow-emerald-500/10">
        <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl bg-emerald-500/20" />
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-300">Top Rated Spot</p>
        {topRated ? (
          <>
            <p className="text-base font-bold text-white mt-1 line-clamp-1">{topRated.locationName}</p>
            <p className="text-xs text-slate-400 line-clamp-1">{topRated.address}</p>
            <div className="flex items-end justify-between mt-2">
              <div>
                <span className="text-2xl font-extrabold text-yellow-300">★ {topRated.averageRating}</span>
                <span className="text-xs text-slate-400 ml-1">/ 5</span>
              </div>
              <span className="text-[10px] text-slate-400 uppercase">{topRated.reviewCount} reviews</span>
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-400 mt-2">No reviews yet</p>
        )}
      </div>
    </div>
  );
}
