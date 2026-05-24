import React, { useEffect, useState, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Bell, LogOut, CarFront, Moon, Sun, Menu, X, User, LayoutDashboard, MapPin, History, Shield } from 'lucide-react';
import { API_BASE, getAuthToken } from '../config/api';
import { useThemeMode } from '../theme/ThemeProvider';
import Button from './ui/Button';

const Navbar = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, toggleTheme } = useThemeMode();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    setIsLoggedIn(!!token);
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      setIsAdmin(parsedUser.userType === 'admin');
    }
  }, [location]);

  // Fetch unread notification count whenever login state changes or location changes
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setUnreadCount(0);
      return;
    }
    const fetchUnread = async () => {
      try {
        const res = await fetch(`${API_BASE}/notifications/unread/count`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) setUnreadCount(data.data?.unreadCount || 0);
      } catch {
        // silently ignore — badge is non-critical
      }
    };
    fetchUnread();
    // Poll every 30 seconds while logged in
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [isLoggedIn, location.pathname]);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    setUser(null);
    setMobileMenuOpen(false);
    navigate('/');
  };

  const navLinks = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Parking', path: '/parking', icon: MapPin },
    ...(isLoggedIn ? [{ name: 'Reservations', path: '/reservations', icon: History }] : []),
  ];

  return (
    <nav 
      className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 ${
        isScrolled || mobileMenuOpen
          ? 'bg-[#050505]/80 backdrop-blur-xl border-b border-white/10 py-4' 
          : 'bg-transparent py-6'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
        
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 group z-[110]">
          <div className="w-10 h-10 rounded-xl bg-cyan-500 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-all">
            <CarFront size={22} strokeWidth={2.5} />
          </div>
          <span className="font-display font-black text-2xl tracking-tighter text-white">
            SmartPark
          </span>
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link 
              key={link.path}
              to={link.path} 
              className={`text-sm font-bold tracking-tight transition-colors ${
                location.pathname === link.path ? 'text-cyan-400' : 'text-slate-400 hover:text-white'
              }`}
            >
              {link.name}
            </Link>
          ))}
          
          {isAdmin && (
            <Link to="/admin" className="text-xs font-black uppercase tracking-widest text-slate-500 hover:text-cyan-400 border border-white/10 px-3 py-1 rounded-lg transition-all">
              Admin
            </Link>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4 z-[110]">
          {isLoggedIn ? (
            <div className="flex items-center gap-4">
              <Link to="/notifications" className="relative p-2 text-slate-400 hover:text-white transition-colors">
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 rounded-full text-[9px] font-black text-white flex items-center justify-center px-1 leading-none">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>
              
              <Link to="/profile" className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-cyan-400 font-bold hover:border-cyan-400/50 transition-all">
                {user?.name?.charAt(0).toUpperCase()}
              </Link>

              <button onClick={handleLogout} className="hidden lg:flex items-center gap-2 text-xs font-black uppercase tracking-widest text-red-400 hover:text-red-300 transition-colors">
                <LogOut size={16} />
                Logout
              </button>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-4">
              <Link to="/login" className="text-sm font-bold text-slate-400 hover:text-white transition-colors">Sign in</Link>
              <Button onClick={() => navigate('/register')} className="!px-5 !py-2.5 !text-[11px]">Get Started</Button>
            </div>
          )}

          {/* Mobile Toggle */}
          <button 
            className="md:hidden p-2 text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-[#050505] pt-24 px-6 space-y-8 animate-in fade-in slide-in-from-top-4">
          <div className="grid gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className="flex items-center gap-4 text-2xl font-display font-bold text-white"
                onClick={() => setMobileMenuOpen(false)}
              >
                <link.icon size={24} className="text-cyan-400" />
                {link.name}
              </Link>
            ))}
          </div>
          
          <div className="pt-8 border-t border-white/10">
            {isLoggedIn ? (
              <button onClick={handleLogout} className="w-full text-left text-2xl font-display font-bold text-red-400 flex items-center gap-4">
                <LogOut size={24} />
                Sign Out
              </button>
            ) : (
              <div className="grid gap-4">
                <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="text-2xl font-display font-bold text-white">Sign In</Link>
                <Button onClick={() => { setMobileMenuOpen(false); navigate('/register'); }} className="w-full">Get Started</Button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
