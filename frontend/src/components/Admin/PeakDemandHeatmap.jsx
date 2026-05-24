import React, { useEffect, useState } from 'react';
import { API_BASE } from '../../config/api';

const formatHour = (h) => {
  const period = h >= 12 ? 'PM' : 'AM';
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}${period}`;
};

const intensityClass = (i) => {
  if (i >= 0.85) return 'from-cyan-400 to-emerald-400 shadow-[0_0_18px_rgba(34,211,238,0.65)]';
  if (i >= 0.6)  return 'from-cyan-500 to-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.55)]';
  if (i >= 0.35) return 'from-blue-600 to-indigo-600';
  if (i >= 0.1)  return 'from-indigo-700 to-indigo-800';
  return 'from-slate-700 to-slate-800';
};

export default function PeakDemandHeatmap({ days = 7 }) {
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token') || localStorage.getItem('authToken');
        const res = await fetch(`${API_BASE}/admin/analytics/peak-demand?days=${days}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        const json = await res.json();
        if (cancelled) return;
        if (!json.success) throw new Error(json.message);
        setData(json.data);
        setMeta(json.meta);
      } catch (e) {
        if (!cancelled) setErr(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [days]);

  return (
    <div className="relative rounded-2xl border border-cyan-500/20 bg-slate-900/60 backdrop-blur-xl p-5 overflow-hidden">
      {/* Glow */}
      <div className="absolute -top-20 -right-20 w-60 h-60 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative flex items-end justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#22d3ee]" />
            Peak Demand
          </div>
          <h3 className="text-xl font-bold text-white mt-1">Hourly Occupancy Heatmap</h3>
          <p className="text-xs text-slate-400">Last {days} days · grouped by hour</p>
        </div>
        {meta && (
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-widest text-slate-400">Peak Hour</p>
            <p className="text-2xl font-extrabold text-cyan-300 leading-none">
              {formatHour(meta.peakHour)}
            </p>
            <p className="text-xs text-emerald-400 mt-0.5">{meta.peakBookings} bookings</p>
          </div>
        )}
      </div>

      {err && (
        <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
          {err}
        </div>
      )}

      {loading ? (
        <div className="flex gap-1 h-40">
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} className="flex-1 bg-slate-700/40 rounded animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="relative">
          {/* Bars */}
          <div className="flex items-end gap-1 h-40">
            {data.map((d) => (
              <div key={d.hour} className="flex-1 flex flex-col items-center justify-end group">
                <div className="relative w-full">
                  <div
                    className={`w-full rounded-t-md bg-gradient-to-t ${intensityClass(d.intensity)} transition-all duration-300 group-hover:scale-y-105 origin-bottom`}
                    style={{ height: `${Math.max(4, d.intensity * 140)}px` }}
                  />
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block z-20 whitespace-nowrap">
                    <div className="px-2 py-1.5 rounded-md bg-slate-950 border border-cyan-500/40 text-xs text-white shadow-xl">
                      <div className="font-bold text-cyan-300">{formatHour(d.hour)}</div>
                      <div>{d.bookings} bookings</div>
                      <div className="text-emerald-300">₱{d.revenue.toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {/* Hour labels (sparse) */}
          <div className="flex gap-1 mt-2">
            {data.map((d) => (
              <div key={d.hour} className="flex-1 text-center text-[10px] text-slate-500">
                {d.hour % 3 === 0 ? formatHour(d.hour) : ''}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-3 mt-4 pt-3 border-t border-slate-700/50">
        <span className="text-[10px] uppercase tracking-widest text-slate-500">Intensity</span>
        <div className="flex items-center gap-1.5">
          {['from-slate-700 to-slate-800', 'from-indigo-700 to-indigo-800', 'from-blue-600 to-indigo-600', 'from-cyan-500 to-blue-500', 'from-cyan-400 to-emerald-400'].map((c, i) => (
            <div key={i} className={`w-6 h-2 rounded-sm bg-gradient-to-r ${c}`} />
          ))}
        </div>
        <span className="text-[10px] text-slate-500">low → peak</span>
      </div>
    </div>
  );
}
