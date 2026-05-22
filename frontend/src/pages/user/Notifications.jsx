import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { API_BASE, getAuthToken } from '../../config/api';
import { Bell, CheckCircle2, Clock, Trash2, Shield, Zap, Search, Loader2, Info, ArrowLeft, Filter, Calendar, ChevronRight } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

const Notifications = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); 
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [now, setNow] = useState(Date.now());

  const fetchUnreadCount = async () => {
    const token = getAuthToken();
    if (!token) return;
    const res = await fetch(`${API_BASE}/notifications/unread/count`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.success) setUnreadCount(data.data?.unreadCount || 0);
  };

  const fetchNotifications = async () => {
    const token = getAuthToken();
    if (!token) return;
    setLoading(true);
    try {
      const unreadOnly = filter === 'unread';
      const res = await fetch(`${API_BASE}/notifications?limit=50&skip=0&unreadOnly=${unreadOnly}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setNotifications(data.data?.notifications || []);
    } catch (e) {
      setError('System Log Sync Failure');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    fetchNotifications();
  }, [filter, location.key]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkRead = async (id) => {
    const token = getAuthToken();
    if (!token) return;
    try {
      await fetch(`${API_BASE}/notifications/${id}/read`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` } });
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
      fetchUnreadCount();
    } catch {}
  };

  return (
    <div className="min-h-screen pt-32 pb-24 px-6 max-w-7xl mx-auto space-y-12 animate-in fade-in duration-700">
      
      <div className="fixed top-0 right-0 w-[400px] h-[400px] bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none -z-10" />

      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-10 border-b border-white/[0.06]">
        <div className="space-y-2">
           <div className="flex items-center gap-2 text-cyan-400 mb-1">
              <Bell size={14} className="fill-current" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Protocol Alerts</span>
           </div>
           <h1 className="text-5xl md:text-6xl font-black font-display tracking-tight text-white uppercase italic">System Feed</h1>
           <p className="text-slate-500 font-medium italic">Monitoring real-time grid communications and temporal events.</p>
        </div>
        <div className="flex gap-4">
           <Button variant="secondary" onClick={() => setFilter(filter === 'all' ? 'unread' : 'all')} className="!px-6 !py-3 !text-[10px]">
              {filter === 'all' ? 'Show Unread' : 'Show All'}
           </Button>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
         
         <aside className="space-y-8">
            <Card className="!p-4 bg-white/[0.01]">
               <div className="grid gap-2">
                  <button onClick={() => setFilter('all')} className={`flex items-center justify-between p-4 rounded-xl transition-all ${filter === 'all' ? 'bg-white text-black font-black' : 'text-slate-500 hover:text-white'}`}>
                     <span className="text-[10px] uppercase tracking-widest">Master Feed</span>
                     <span className="text-[10px] opacity-60">{notifications.length}</span>
                  </button>
                  <button onClick={() => setFilter('unread')} className={`flex items-center justify-between p-4 rounded-xl transition-all ${filter === 'unread' ? 'bg-cyan-400 text-black font-black shadow-lg shadow-cyan-400/10' : 'text-slate-500 hover:text-white'}`}>
                     <span className="text-[10px] uppercase tracking-widest">Unread Logs</span>
                     <span className="text-[10px] opacity-60">{unreadCount}</span>
                  </button>
               </div>
            </Card>

            <Card className="!p-8 space-y-4 border-dashed">
               <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-700">Intelligence</h3>
               <p className="text-[11px] text-slate-600 leading-relaxed font-medium italic">
                  Grid notifications utilize TLS 1.3 encryption. Real-time updates active via KM-Grid WebSocket.
               </p>
            </Card>
         </aside>

         <main className="lg:col-span-3 space-y-6">
            {loading ? (
              <div className="py-24 flex flex-col items-center gap-6">
                 <Loader2 className="animate-spin text-cyan-400" size={40} />
                 <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">Syncing Logs...</span>
              </div>
            ) : notifications.length === 0 ? (
              <Card className="py-24 text-center space-y-4 border-dashed bg-transparent">
                 <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto text-slate-800">
                    <Bell size={32} />
                 </div>
                 <p className="text-slate-600 font-medium">Zero system alerts identified in current epoch.</p>
              </Card>
            ) : (
              <div className="grid gap-4">
                 {notifications.map((n) => (
                   <Card key={n._id} className={`group !p-8 flex items-start gap-8 transition-all relative overflow-hidden ${n.read ? 'opacity-40 grayscale' : 'border-cyan-400/20 bg-cyan-400/[0.01]'}`}>
                      {!n.read && <div className="absolute top-0 left-0 w-1.5 h-full bg-cyan-400 shadow-[0_0_15px_#00f2ff]" />}
                      
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${n.read ? 'bg-white/5 text-slate-700' : 'bg-cyan-400/10 text-cyan-400 shadow-xl'}`}>
                         <Zap size={20} />
                      </div>

                      <div className="flex-1 space-y-3">
                         <div className="flex justify-between items-start">
                            <h4 className={`text-lg font-black font-display tracking-tight ${n.read ? 'text-slate-400' : 'text-white'}`}>{n.title}</h4>
                            <span className="text-[9px] font-black text-slate-700 uppercase tracking-widest">{new Date(n.createdAt).toLocaleDateString()}</span>
                         </div>
                         <p className="text-sm text-slate-500 font-medium leading-relaxed max-w-2xl">{n.message}</p>
                         
                         <div className="pt-4 flex items-center gap-4">
                            {!n.read && (
                              <button onClick={() => handleMarkRead(n._id)} className="text-[9px] font-black uppercase tracking-widest text-cyan-400 hover:text-white transition-colors">Mark Processed</button>
                            )}
                            <button onClick={() => navigate('/reservations')} className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-600 hover:text-white transition-all group/btn">
                               View Allocation <ChevronRight size={12} className="group-hover/btn:translate-x-1 transition-transform" />
                            </button>
                         </div>
                      </div>
                   </Card>
                 ))}
              </div>
            )}
         </main>
      </div>
    </div>
  );
};

export default Notifications;
