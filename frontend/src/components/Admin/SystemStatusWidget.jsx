import React, { useEffect, useState } from 'react';
import { API_BASE } from '../../config/api';

const StatusRow = ({ label, online, detail }) => (
  <div className="flex items-center justify-between py-2.5 border-b border-slate-700/50 last:border-0">
    <div className="flex items-center gap-3">
      <span
        className={`w-2 h-2 rounded-full ${
          online ? 'bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse' : 'bg-rose-500 shadow-[0_0_8px_#f43f5e]'
        }`}
      />
      <div>
        <p className="text-sm font-semibold text-slate-100">{label}</p>
        {detail && <p className="text-[11px] text-slate-400">{detail}</p>}
      </div>
    </div>
    <span
      className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${
        online
          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/30'
          : 'bg-rose-500/15 text-rose-300 border border-rose-400/30'
      }`}
    >
      {online ? 'Online' : 'Offline'}
    </span>
  </div>
);

export default function SystemStatusWidget() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const fetchStatus = async () => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      const res = await fetch(`${API_BASE}/admin/analytics/system-status`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setStatus(json.data);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const id = setInterval(fetchStatus, 30000); // poll every 30s
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative rounded-2xl border border-emerald-500/20 bg-slate-900/60 backdrop-blur-xl p-5 overflow-hidden">
      <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative flex items-center justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
            System Status
          </div>
          <h3 className="text-xl font-bold text-white mt-1">SmartPark Console</h3>
        </div>
        {status?.checkedAt && (
          <span className="text-[10px] text-slate-500 uppercase">
            {new Date(status.checkedAt).toLocaleTimeString()}
          </span>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 bg-slate-800/40 rounded animate-pulse" />
          ))}
        </div>
      ) : err ? (
        <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">{err}</div>
      ) : (
        <div className="relative">
          <StatusRow
            label="Geospatial Index (2dsphere)"
            online={status.geoIndex.online}
            detail={`Collection: ${status.geoIndex.collection} · ${status.geoIndex.indexCount} indexes`}
          />
          <StatusRow
            label="Platform-Aware Navigation API"
            online={status.platformNavApi.online}
            detail={status.platformNavApi.providers.join(' · ')}
          />
          <StatusRow
            label="Smart Score Engine"
            online={status.smartScoreEngine.online}
            detail={`Weights: dist ${status.smartScoreEngine.weights.distance} / price ${status.smartScoreEngine.weights.price} / rating ${status.smartScoreEngine.weights.rating}`}
          />
          <StatusRow
            label="MongoDB Atlas"
            online={status.database.online}
            detail={status.database.host}
          />
        </div>
      )}
    </div>
  );
}
