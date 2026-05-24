import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Car, Clock, History, ArrowRight, Bell, Sparkles, MapPin, Loader2, Zap, TrendingUp, ShieldCheck, ChevronRight, AlertTriangle } from 'lucide-react';
import reservationService from '../../services/reservationService';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import WalletComponent from '../../components/Parking/Wallet';

const formatSessionRemain = (ms) => {
  if (ms == null || Number.isNaN(ms)) return '—';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [sessionLeftMs, setSessionLeftMs] = useState(null);
  const [recentHistory, setRecentHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    const authToken = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (authToken && userData) {
      setIsLoggedIn(true);
      setCurrentUser(JSON.parse(userData));
    }
  }, []);

  const loadSession = useCallback(async () => {
    try {
      const res = await reservationService.getActiveReservation();
      if (res.success && res.data) setActiveSession(res.data);
      else setActiveSession(null);
    } catch {
      setActiveSession(null);
    }
  }, []);

  const loadRecentHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await reservationService.getMyReservations(null, 1, 6);
      if (res.success && Array.isArray(res.data)) setRecentHistory(res.data);
      else setRecentHistory([]);
    } catch {
      setRecentHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return undefined;
    loadSession();
    loadRecentHistory();
    const id = setInterval(loadSession, 30000);
    return () => clearInterval(id);
  }, [isLoggedIn, loadSession, loadRecentHistory]);

  useEffect(() => {
    if (!activeSession?.sessionEndsAt) {
      setSessionLeftMs(null);
      return undefined;
    }
    const tick = () => {
      const end = new Date(activeSession.sessionEndsAt).getTime();
      setSessionLeftMs(Math.max(0, end - Date.now()));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [activeSession]);

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-6">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[120px] animate-pulse" />
        <div className="max-w-4xl text-center z-10 space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-cyan-400">
            <Zap size={14} className="fill-current" /> Intelligent Parking Infrastructure
          </div>
          <h1 className="text-6xl md:text-8xl font-black font-display tracking-tighter text-white leading-none">
            Parking, <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">Perfected.</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto font-medium">
            Deploy secure, real-time parking allocations with millisecond precision. Your city's digital curb, managed.
          </p>
          <div className="flex gap-4 justify-center pt-6">
            <Button onClick={() => navigate('/register')} className="!px-10 !py-4 !text-base">Get Started</Button>
            <Button variant="secondary" onClick={() => navigate('/login')} className="!px-10 !py-4 !text-base">Sign In</Button>
          </div>
        </div>
      </div>
    );
  }

  const firstName = currentUser?.name?.split(' ')[0] || 'Member';

  return (
    <div className="min-h-screen pt-32 pb-24 px-6 max-w-7xl mx-auto space-y-12 animate-in fade-in duration-700">
      
      {/* Email Verification Hint */}
      {!currentUser?.googleEmailVerified && currentUser?.authMethod === 'email' && (
        <div className="flex items-center justify-between p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs font-medium">
           <div className="flex items-center gap-3">
              <AlertTriangle size={16} className="text-amber-400" />
              <span>Your email is not verified. Please check your inbox to enable all security features.</span>
           </div>
           <button onClick={() => navigate('/profile')} className="underline font-bold hover:text-white transition-colors">Verify Now</button>
        </div>
      )}

      {/* Hero Welcome */}
      <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 p-10 md:p-14 rounded-[2.5rem] bg-white/[0.01] border border-white/[0.06] backdrop-blur-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl group-hover:bg-cyan-500/10 transition-colors duration-700" />
        <div className="space-y-4 relative z-10">
          <div className="flex items-center gap-2 text-cyan-400">
             <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#00f2ff]" />
             <span className="text-[10px] font-black uppercase tracking-widest">System Online</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-black font-display tracking-tight text-white leading-tight">
            Welcome back, <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-500">{firstName}</span>
          </h1>
          <p className="text-lg text-slate-400 max-w-md font-medium">
            Manage your digital permits and real-time parking grid allocations.
          </p>
        </div>
        <Button onClick={() => navigate('/parking')} className="group z-10 flex items-center gap-3 !px-8 !py-4 !text-base">
          Find Capacity <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
        </Button>
      </section>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="flex flex-col justify-between h-48 border-cyan-500/20 bg-cyan-500/[0.01]">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                 <ShieldCheck size={20} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Security State</span>
           </div>
           <div className="space-y-1">
              <span className="text-4xl font-display font-black text-white">Active</span>
              <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">Network Verified</p>
           </div>
        </Card>

        <Card className="flex flex-col justify-between h-48 border-blue-500/20 bg-blue-500/[0.01]">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                 <Zap size={20} className="fill-current" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Grid Latency</span>
           </div>
           <div className="space-y-1">
              <span className="text-4xl font-display font-black text-white">24ms</span>
              <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">Real-time Sync</p>
           </div>
        </Card>

        <Card className="flex flex-col justify-between h-48 border-white/10">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white">
                 <History size={20} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Total Sessions</span>
           </div>
           <div className="space-y-1">
              <span className="text-4xl font-display font-black text-white">{recentHistory.length}</span>
              <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">Temporal Records</p>
           </div>
        </Card>
      </div>

      {/* Active Session & Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section>
          <div className="flex items-center justify-between mb-6">
             <h2 className="text-2xl font-black font-display text-white uppercase tracking-tight">Active Allocation</h2>
             {activeSession && <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest animate-pulse">Live Link</span>}
          </div>
          
          {activeSession ? (
            <Card className="!p-10 border-cyan-500/30 bg-cyan-500/[0.02] flex flex-col justify-between h-full min-h-[320px]">
               <div className="flex justify-between items-start">
                  <div className="space-y-2">
                     <h3 className="text-3xl font-black font-display text-white">{activeSession.parkingSpot?.locationName}</h3>
                     <p className="text-slate-400 font-medium flex items-center gap-2">
                        <MapPin size={16} className="text-cyan-400" /> #{activeSession.parkingSpot?.spotNumber}
                     </p>
                  </div>
                  <div className="w-16 h-16 rounded-2xl bg-cyan-500 flex items-center justify-center text-black shadow-xl shadow-cyan-500/20">
                     <Clock size={32} strokeWidth={2.5} />
                  </div>
               </div>

               <div className="py-8 text-center">
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 mb-2 block">Temporal Remainder</span>
                  <span className="text-7xl md:text-8xl font-display font-black text-white tracking-tighter">
                     {formatSessionRemain(sessionLeftMs)}
                  </span>
               </div>

               <div className="flex gap-4">
                  <Button variant="secondary" onClick={() => navigate('/reservations')} className="flex-1">Manage</Button>
                  <Button variant="danger" onClick={() => navigate('/reservations')} className="flex-1">End Session</Button>
               </div>
            </Card>
          ) : (
            <Card className="!p-12 border-dashed flex flex-col items-center justify-center text-center space-y-6 h-full min-h-[320px]">
               <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center text-slate-700">
                  <Car size={40} />
               </div>
               <div className="space-y-2">
                  <h3 className="text-2xl font-black font-display text-white">No active session</h3>
                  <p className="text-slate-500 font-medium max-w-xs">Initialize a new capacity search to secure a temporal allocation.</p>
               </div>
               <Button variant="secondary" onClick={() => navigate('/parking')}>Locate Capacity</Button>
            </Card>
          )}
        </section>

        <section className="space-y-10">
           <div>
              <h2 className="text-2xl font-black font-display text-white uppercase tracking-tight mb-6">Grid Wallet</h2>
              <WalletComponent />
           </div>

           <div>
              <h2 className="text-2xl font-black font-display text-white uppercase tracking-tight mb-6">Rapid Access</h2>
              <div className="grid gap-6">
                 <button 
                   onClick={() => navigate('/reservations')}
                   className="group p-8 rounded-[2.5rem] bg-white/[0.01] border border-white/[0.06] hover:bg-white/[0.03] hover:border-cyan-500/30 transition-all text-left flex items-center justify-between"
                 >
                   <div className="flex items-center gap-6">
                      <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
                         <History size={24} />
                      </div>
                      <div>
                         <h4 className="text-xl font-black font-display text-white mb-1">Archive</h4>
                         <p className="text-sm text-slate-500 font-medium">Audit logs and temporal history.</p>
                      </div>
                   </div>
                   <ChevronRight size={24} className="text-slate-700 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
                 </button>

                 <button 
                   onClick={() => navigate('/notifications')}
                   className="group p-8 rounded-[2.5rem] bg-white/[0.01] border border-white/[0.06] hover:bg-white/[0.03] hover:border-blue-500/30 transition-all text-left flex items-center justify-between"
                 >
                   <div className="flex items-center gap-6">
                      <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                         <Bell size={24} />
                      </div>
                      <div>
                         <h4 className="text-xl font-black font-display text-white mb-1">Protocol Alerts</h4>
                         <p className="text-sm text-slate-500 font-medium">Real-time system communication.</p>
                      </div>
                   </div>
                   <ChevronRight size={24} className="text-slate-700 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                 </button>
              </div>
           </div>
        </section>
      </div>

      {/* History */}
      <section className="space-y-8 pt-8 border-t border-white/5">
        <div className="flex items-center justify-between">
           <h2 className="text-3xl font-black font-display text-white tracking-tight uppercase">Recent Telemetry</h2>
           <Button variant="ghost" onClick={() => navigate('/reservations')} className="text-xs">Full Logbook</Button>
        </div>

        {historyLoading ? (
           <div className="py-24 flex flex-col items-center gap-4 text-slate-600">
              <Loader2 className="animate-spin text-cyan-400" size={40} />
              <span className="text-[10px] font-black uppercase tracking-widest">Retrieving Packets...</span>
           </div>
        ) : recentHistory.length === 0 ? (
           <Card className="py-20 text-center space-y-4 border-dashed bg-transparent">
              <p className="text-slate-500 font-medium">Zero temporal records identified in current grid segment.</p>
              <Button variant="secondary" onClick={() => navigate('/parking')}>Reserve First Spot</Button>
           </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentHistory.map((r) => (
              <Card key={r._id} className="group hover:bg-white/[0.03] !p-6 flex flex-col justify-between h-48 transition-all">
                <div className="flex justify-between items-start">
                   <div className="space-y-1">
                      <h5 className="font-bold text-white truncate max-w-[150px]">{r.parkingSpot?.locationName}</h5>
                      <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">Node #{r.parkingSpot?.spotNumber}</span>
                   </div>
                   <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${r.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-white/5 text-slate-500'}`}>
                      {r.status}
                   </div>
                </div>
                
                <div className="flex items-end justify-between">
                   <div className="space-y-0.5">
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-700 block">Amount</span>
                      <span className="text-xl font-display font-black text-white">Rs.{r.amountInfo?.totalAmount || 0}</span>
                   </div>
                   <span className="text-[9px] font-bold text-slate-600 italic">
                      {new Date(r.createdAt).toLocaleDateString()}
                   </span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Dashboard;
