import React, { useEffect, useState } from 'react';
import { 
  LayoutDashboard, 
  MapPin, 
  Clock, 
  Users, 
  TrendingUp, 
  ShieldCheck, 
  Zap, 
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Loader2
} from 'lucide-react';
import Card from '../../components/ui/Card';
import { API_BASE } from '../../config/api';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/admin/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) setStats(data.data);
      } catch (err) {
        console.error('Stats fetch error');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Loader2 className="animate-spin text-cyan-400" size={40} />
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-700">Retrieving Grid Intelligence...</span>
      </div>
    );
  }

  const statConfig = [
    { label: 'Network Nodes', val: stats?.totalSpots || 0, icon: MapPin, color: 'text-cyan-400', bg: 'bg-cyan-400/10', trend: '+4%' },
    { label: 'Active Links', val: stats?.activeReservations || 0, icon: Activity, color: 'text-emerald-400', bg: 'bg-emerald-400/10', trend: '+12%' },
    { label: 'Grid Registry', val: stats?.totalUsers || 0, icon: Users, color: 'text-blue-400', bg: 'bg-blue-400/10', trend: '+2%' },
    { label: 'System Revenue', val: `Rs.${stats?.totalRevenue || 0}`, icon: TrendingUp, color: 'text-purple-400', bg: 'bg-purple-400/10', trend: '+8%' }
  ];

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      
      {/* Header */}
      <section className="flex justify-between items-end">
         <div className="space-y-1">
            <div className="flex items-center gap-2 text-cyan-400">
               <ShieldCheck size={14} className="fill-current" />
               <span className="text-[10px] font-black uppercase tracking-[0.2em]">Grid Master Console</span>
            </div>
            <h1 className="text-4xl font-black font-display text-white uppercase italic">Dashboard Telemetry</h1>
         </div>
         <div className="flex gap-4">
            <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2">
               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
               <span className="text-[9px] font-black uppercase text-slate-400">Grid Status: Optimal</span>
            </div>
         </div>
      </section>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         {statConfig.map((s) => (
            <Card key={s.label} className="!p-8 flex flex-col justify-between h-52 group hover:border-white/20">
               <div className="flex justify-between items-start">
                  <div className={`w-12 h-12 rounded-2xl ${s.bg} flex items-center justify-center ${s.color}`}>
                     <s.icon size={24} />
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-black text-emerald-400">
                     <ArrowUpRight size={12} /> {s.trend}
                  </div>
               </div>
               <div className="space-y-1">
                  <span className="text-3xl font-display font-black text-white tracking-tight">{s.val}</span>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">{s.label}</p>
               </div>
            </Card>
         ))}
      </div>

      {/* Primary Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <Card className="lg:col-span-2 !p-10 min-h-[400px] flex flex-col">
            <div className="flex justify-between items-start mb-10">
               <div className="space-y-1">
                  <h3 className="text-xl font-black font-display text-white uppercase">Temporal Load Grid</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Node Allocation History (24h)</p>
               </div>
               <div className="flex gap-2">
                  {['7D', '24H', '1H'].map(t => (
                    <button key={t} className={`px-3 py-1 rounded-lg text-[9px] font-black border transition-all ${t === '24H' ? 'bg-white text-black border-white' : 'bg-transparent text-slate-600 border-white/5 hover:text-white'}`}>{t}</button>
                  ))}
               </div>
            </div>
            <div className="flex-1 flex items-center justify-center border border-dashed border-white/5 rounded-3xl bg-white/[0.01]">
               <div className="text-center space-y-2 opacity-30">
                  <Activity size={40} className="mx-auto text-slate-700" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">Awaiting Data Visualization Cluster</span>
               </div>
            </div>
         </Card>

         <Card className="!p-10 space-y-8">
            <h3 className="text-xl font-black font-display text-white uppercase border-b border-white/5 pb-6">System Health</h3>
            
            <div className="space-y-6">
               {[
                 { label: 'Auth Subsystem', val: '99.9%', color: 'bg-emerald-500' },
                 { label: 'Database Grid', val: 'Operational', color: 'bg-emerald-500' },
                 { label: 'Khalti Gateway', val: 'Stable', color: 'bg-emerald-500' },
                 { label: 'Socket Cluster', val: '100% Load', color: 'bg-cyan-500' }
               ].map(h => (
                 <div key={h.label} className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                       <div className={`w-1.5 h-1.5 rounded-full ${h.color} shadow-[0_0_8px_currentColor]`} />
                       <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{h.label}</span>
                    </div>
                    <span className="text-[10px] font-bold text-white uppercase">{h.val}</span>
                 </div>
               ))}
            </div>

            <div className="pt-8 border-t border-white/5">
               <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05] space-y-4">
                  <div className="flex items-center gap-3 text-amber-400">
                     <Zap size={16} className="fill-current" />
                     <span className="text-[10px] font-black uppercase tracking-widest">Maintenance Mode</span>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-relaxed font-medium italic">
                     Scheduled grid synchronization in 4h 12m. System will remain operational.
                  </p>
               </div>
            </div>
         </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
