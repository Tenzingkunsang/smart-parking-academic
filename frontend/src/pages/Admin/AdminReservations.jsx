import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, User, MapPin, Clock, ShieldCheck, Loader2, Search, ArrowLeft, Filter, Trash2, ChevronRight, Zap } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { API_BASE } from '../../config/api';

const AdminReservations = () => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const fetchReservations = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/admin/reservations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) setReservations(data.data);
      else setError(data.message || 'Log synchronization failed');
    } catch { setError('Protocol error: Grid logs unreachable'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchReservations(); }, [fetchReservations]);

  const filtered = reservations.filter(r => {
    const q = searchQuery.toLowerCase();
    return r.user?.name?.toLowerCase().includes(q) || r.user?.email?.toLowerCase().includes(q) || r._id.includes(q);
  });

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      
      <section className="flex justify-between items-end border-b border-white/5 pb-10">
         <div className="space-y-1">
            <div className="flex items-center gap-2 text-cyan-400">
               <Calendar size={14} className="fill-current" />
               <span className="text-[10px] font-black uppercase tracking-[0.2em]">System Archives</span>
            </div>
            <h1 className="text-4xl font-black font-display text-white uppercase italic">Temporal Logs</h1>
         </div>
         <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-700 group-focus-within:text-cyan-400 transition-colors" size={16} />
            <input 
               type="text" 
               placeholder="Search Identity Hash..." 
               value={searchQuery}
               onChange={e => setSearchQuery(e.target.value)}
               className="h-12 bg-white/5 border border-white/10 rounded-xl pl-12 pr-6 text-sm font-bold text-white focus:outline-none focus:border-cyan-400 focus:bg-white/[0.08] transition-all w-64 md:w-80"
            />
         </div>
      </section>

      {loading ? (
         <div className="py-24 flex flex-col items-center gap-4 text-slate-700">
            <Loader2 className="animate-spin text-cyan-400" size={40} />
            <span className="text-[10px] font-black uppercase tracking-widest">Indexing Grid Archives...</span>
         </div>
      ) : error ? (
         <Card className="py-20 text-center space-y-4 border-red-500/20 bg-red-500/[0.01]">
            <p className="text-red-400 font-bold uppercase tracking-widest text-[10px]">{error}</p>
            <Button variant="secondary" onClick={fetchReservations}>Reconnect Grid</Button>
         </Card>
      ) : (
         <div className="grid gap-4">
            {filtered.map((res) => (
              <Card key={res._id} className="group !p-6 md:!p-8 flex flex-col md:flex-row md:items-center justify-between gap-8 hover:bg-white/[0.03] transition-all relative overflow-hidden">
                 <div className="absolute top-0 left-0 w-1 h-full bg-white/5 group-hover:bg-cyan-400 transition-colors" />
                 
                 <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-8">
                    <div className="space-y-1">
                       <span className="text-[9px] font-black uppercase tracking-widest text-slate-700">Link Identifier</span>
                       <p className="font-mono text-[10px] font-bold text-slate-400 uppercase tracking-tighter">#{res._id.slice(-12)}</p>
                       <span className={`inline-block px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${res.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-slate-600'}`}>
                          {res.status}
                       </span>
                    </div>

                    <div className="space-y-1">
                       <span className="text-[9px] font-black uppercase tracking-widest text-slate-700">Entity Identity</span>
                       <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center text-cyan-400 font-bold text-[10px]">
                             {res.user?.name?.charAt(0) || 'U'}
                          </div>
                          <p className="text-sm font-bold text-white truncate max-w-[140px]">{res.user?.name || 'System Entity'}</p>
                       </div>
                       <p className="text-[10px] text-slate-600 truncate">{res.user?.email}</p>
                    </div>

                    <div className="space-y-1">
                       <span className="text-[9px] font-black uppercase tracking-widest text-slate-700">Grid Sector</span>
                       <div className="flex items-center gap-2 text-sm font-bold text-slate-300">
                          <MapPin size={12} className="text-cyan-400" />
                          <span className="truncate">{res.parkingSpot?.locationName || 'Unlinked Node'}</span>
                       </div>
                       <p className="text-[10px] text-slate-600 font-bold">NODE #{res.parkingSpot?.spotNumber || '000'}</p>
                    </div>

                    <div className="space-y-1">
                       <span className="text-[9px] font-black uppercase tracking-widest text-slate-700">Temporal Range</span>
                       <div className="flex items-center gap-2 text-sm font-bold text-white">
                          <Clock size={12} className="text-slate-600" />
                          <span>{new Date(res.reservationTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                       </div>
                       <p className="text-[10px] text-slate-600">{new Date(res.reservationTime).toLocaleDateString()}</p>
                    </div>
                 </div>

                 <div className="flex items-center gap-8 pl-8 border-l border-white/5">
                    <div className="text-right space-y-1">
                       <span className="text-[9px] font-black uppercase tracking-widest text-slate-700">Settlement</span>
                       <p className="text-xl font-display font-black text-white italic tracking-tighter">Rs.{res.totalAmount}</p>
                    </div>
                    <button className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-700 hover:text-white hover:bg-cyan-400 transition-all">
                       <ChevronRight size={18} />
                    </button>
                 </div>
              </Card>
            ))}
         </div>
      )}
    </div>
  );
};

export default AdminReservations;
