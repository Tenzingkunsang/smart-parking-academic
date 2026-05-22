import React from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Shield, LayoutDashboard, MapPin, QrCode, Calendar, Users, LogOut, ChevronLeft, CarFront } from 'lucide-react';

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const navLinks = [
    { name: 'Console', path: '/admin', icon: LayoutDashboard },
    { name: 'Capacity', path: '/admin/spots', icon: MapPin },
    { name: 'Validator', path: '/admin/scan', icon: QrCode },
    { name: 'Logs', path: '/admin/reservations', icon: Calendar },
    { name: 'Units', path: '/admin/users', icon: Users },
  ];

  return (
    <div className="min-h-screen bg-[#050505] flex font-sans overflow-hidden">
      
      {/* Sidebar Sector */}
      <aside className="hidden lg:flex w-72 flex-col bg-[#0a0a0a] border-r border-white/[0.06] relative z-20">
         <div className="p-10">
            <Link to="/" className="flex items-center gap-3 group">
               <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-black shadow-lg shadow-cyan-400/20 group-hover:scale-105 transition-all">
                  <CarFront size={22} strokeWidth={2.5} />
               </div>
               <span className="font-display font-black text-2xl tracking-tighter text-white">SmartPark</span>
            </Link>
         </div>

         <nav className="flex-1 px-6 space-y-2 pt-4">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-700 ml-4 mb-4 block">Command Grid</span>
            {navLinks.map((link) => {
               const isActive = location.pathname === link.path;
               return (
                  <Link 
                     key={link.path}
                     to={link.path}
                     className={`flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 group ${
                        isActive 
                           ? 'bg-cyan-400 text-black shadow-xl shadow-cyan-400/10' 
                           : 'text-slate-500 hover:text-white hover:bg-white/[0.03]'
                     }`}
                  >
                     <link.icon size={18} strokeWidth={isActive ? 2.5 : 1.5} />
                     <span className={`text-xs font-black uppercase tracking-widest ${isActive ? 'opacity-100' : 'opacity-80 group-hover:opacity-100'}`}>{link.name}</span>
                  </Link>
               );
            })}
         </nav>

         <div className="p-8 border-t border-white/[0.05]">
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] mb-4">
               <div className="w-10 h-10 rounded-xl bg-cyan-400/10 flex items-center justify-center text-cyan-400 font-display font-black text-sm">
                  {user.name?.charAt(0).toUpperCase()}
               </div>
               <div className="overflow-hidden">
                  <h4 className="text-xs font-bold text-white truncate">{user.name}</h4>
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 italic">Root Access</span>
               </div>
            </div>
            <button 
               onClick={handleLogout}
               className="w-full h-12 flex items-center justify-center gap-2 rounded-xl bg-red-500/5 text-red-500 hover:bg-red-500/10 border border-red-500/10 text-[10px] font-black uppercase tracking-widest transition-all"
            >
               <LogOut size={14} /> Terminate
            </button>
         </div>
      </aside>

      {/* Main Command Layer */}
      <main className="flex-1 relative flex flex-col h-screen overflow-hidden">
         
         {/* Top Meta Bar */}
         <header className="h-20 border-b border-white/[0.05] flex items-center justify-between px-10 bg-[#050505]/50 backdrop-blur-xl shrink-0">
            <div className="flex items-center gap-4">
               <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#00f2ff]" />
               <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">System State: Decentralized Grid Active</span>
            </div>
            <div className="flex items-center gap-6">
               <div className="flex flex-col items-end">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-700">Epoch Time</span>
                  <span className="text-[10px] font-bold text-slate-400 font-variant-numeric:tabular-nums">{new Date().toLocaleTimeString([], { hour12: false })}</span>
               </div>
               <div className="w-px h-8 bg-white/5" />
               <button onClick={() => navigate('/')} className="text-xs font-black uppercase tracking-widest text-slate-500 hover:text-cyan-400 transition-colors">
                  Exit Root
               </button>
            </div>
         </header>

         {/* Content Sector */}
         <div className="flex-1 overflow-y-auto custom-scrollbar p-10 relative">
            {/* Background Decorative */}
            <div className="fixed top-1/2 right-1/4 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none" />
            
            <div className="max-w-6xl mx-auto relative z-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
               <Outlet />
            </div>
         </div>
      </main>

      <style>{`
         .custom-scrollbar::-webkit-scrollbar { width: 4px; }
         .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
         .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 2px; }
         .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #00F2FF; }
      `}</style>
    </div>
  );
};

export default AdminLayout;
