import React, { useState, useEffect } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Building2, LayoutDashboard, MapPin, QrCode, Calendar,
  LogOut, CarFront, ChevronRight, Activity, Menu, X,
  TrendingUp, Settings, MessageSquare,
} from 'lucide-react';
import { API_BASE } from '../config/api';

const BusinessLayout = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const user      = JSON.parse(localStorage.getItem('user') || '{}');
  const bizName   = user.businessProfile?.businessName || user.name || 'My Business';
  const verified  = user.businessProfile?.verified;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [time, setTime] = useState(new Date());
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Poll unread message count every 30s
  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const token = localStorage.getItem('token');
        const r = await fetch(`${API_BASE}/business/messages/unread-count`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const d = await r.json();
        if (d.success) setUnreadMessages(d.data.count);
      } catch { /* silent */ }
    };
    fetchUnread();
    const id = setInterval(fetchUnread, 30000);
    return () => clearInterval(id);
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const navLinks = [
    { name: 'Dashboard',    path: '/business',              icon: LayoutDashboard, exact: true },
    { name: 'My Spots',     path: '/business/spots',        icon: MapPin },
    { name: 'Reservations', path: '/business/reservations', icon: Calendar },
    { name: 'Messages',     path: '/business/messages',     icon: MessageSquare, badge: unreadMessages },
    { name: 'QR Scanner',   path: '/business/qr-scanner',   icon: QrCode },
  ];

  const isActive = (link) =>
    link.exact ? location.pathname === link.path : location.pathname.startsWith(link.path);

  const Sidebar = ({ mobile = false }) => (
    <div className="flex flex-col h-full">
      {/* Logo + close */}
      <div className="px-6 py-7 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group" onClick={() => setMobileOpen(false)}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/25 group-hover:scale-105 transition-transform">
            <CarFront size={18} strokeWidth={2.5} className="text-white" />
          </div>
          <div>
            <span className="font-black text-[17px] tracking-tight text-white">SmartPark</span>
            <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-violet-400/70 -mt-0.5">Business Portal</p>
          </div>
        </Link>
        {mobile && (
          <button onClick={() => setMobileOpen(false)} className="text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        )}
      </div>

      {/* Business identity */}
      <div className="mx-4 mb-5 p-3.5 rounded-xl bg-violet-500/8 border border-violet-500/15">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-500/20 flex items-center justify-center shrink-0">
            <Building2 size={16} className="text-violet-400" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-white truncate">{bizName}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-1.5 h-1.5 rounded-full ${verified ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              <p className="text-[9px] font-semibold text-slate-500">
                {verified ? 'Verified' : 'Pending verification'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Live clock */}
      <div className="mx-4 mb-4 flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.05]">
        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse shadow-[0_0_6px_#8b5cf6]" />
        <span className="text-[9px] font-mono text-slate-600">
          {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 space-y-1">
        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-700 pl-3 mb-3">Management</p>
        {navLinks.map((link) => {
          const active = isActive(link);
          return (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all duration-200 group relative ${
                active
                  ? 'bg-violet-500/15 text-violet-300 border border-violet-500/25'
                  : 'text-slate-500 hover:text-white hover:bg-white/[0.04] border border-transparent'
              }`}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-violet-400 rounded-r-full" />
              )}
              <link.icon size={16} strokeWidth={active ? 2.5 : 1.8} />
              <span className="text-[11px] font-bold tracking-wide">{link.name}</span>
              {link.badge > 0 && (
                <span className="ml-auto min-w-[18px] h-[18px] px-1 rounded-full bg-violet-500 text-white text-[9px] font-black flex items-center justify-center">
                  {link.badge > 99 ? '99+' : link.badge}
                </span>
              )}
              {active && !link.badge && <ChevronRight size={12} className="ml-auto opacity-50" />}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="mx-4 mb-4 mt-4 space-y-2">
        <button
          onClick={() => { navigate('/'); setMobileOpen(false); }}
          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-slate-600 hover:text-slate-300 hover:bg-white/[0.03] transition-all text-[10px] font-bold tracking-wide border border-transparent hover:border-white/5"
        >
          <Activity size={13} /> View Public Site
        </button>
        <div className="flex items-center gap-3 px-3.5 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center text-violet-400 font-black text-sm border border-violet-500/20 shrink-0">
            {user.name?.charAt(0)?.toUpperCase() || 'B'}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-xs font-bold text-white truncate">{user.name || 'Business Owner'}</p>
            <p className="text-[9px] text-slate-600 font-medium truncate">{user.email || ''}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500/8 text-red-400 hover:bg-red-500/15 border border-red-500/12 text-[10px] font-bold uppercase tracking-widest transition-all"
        >
          <LogOut size={12} /> Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] flex font-sans">

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 flex-col bg-[#080808] border-r border-white/[0.05] fixed top-0 bottom-0 left-0 z-30">
        <Sidebar />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-72 bg-[#080808] border-r border-white/[0.05] flex flex-col h-full z-50">
            <Sidebar mobile />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="lg:pl-64 flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-20 h-14 border-b border-white/[0.04] flex items-center justify-between px-5 lg:px-8 bg-[#050505]/90 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="lg:hidden w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white">
              <Menu size={18} />
            </button>
            <div className="hidden sm:flex items-center gap-2 text-[10px] font-semibold text-slate-600 uppercase tracking-wider">
              {navLinks.find((l) => isActive(l))?.name || 'Dashboard'}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-bold border ${
              verified
                ? 'bg-emerald-500/8 text-emerald-400 border-emerald-500/15'
                : 'bg-amber-500/8 text-amber-400 border-amber-500/15'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${verified ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
              {verified ? 'Verified' : 'Pending'}
            </span>
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center text-violet-400 font-black text-xs border border-violet-500/15">
              {user.name?.charAt(0)?.toUpperCase() || 'B'}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-5 lg:px-8 py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default BusinessLayout;
