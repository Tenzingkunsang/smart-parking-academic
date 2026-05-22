import React from 'react';
import { Link } from 'react-router-dom';
import { CarFront, Zap, Shield, MapPin, ArrowRight } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-[#050505] border-t border-white/[0.05] pt-24 pb-12 px-6 md:px-10 font-sans relative overflow-hidden">
      
      {/* Subtle Background Glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 mb-20">
          
          {/* Brand Sector */}
          <div className="lg:col-span-1 space-y-8">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-black shadow-lg shadow-cyan-400/20 group-hover:scale-105 transition-all">
                <CarFront size={22} strokeWidth={2.5} />
              </div>
              <span className="font-display font-black text-2xl tracking-tighter text-white group-hover:text-cyan-400 transition-colors">
                SmartPark
              </span>
            </Link>
            <p className="text-sm text-slate-500 leading-relaxed font-medium">
              Autonomous grid coordination and temporal parking allocation for modern urban environments. Secure, real-time, and efficient.
            </p>
            <div className="flex gap-4">
               {[Zap, Shield, MapPin].map((Icon, i) => (
                 <div key={i} className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-slate-600 hover:text-cyan-400 hover:border-cyan-400/30 transition-all">
                    <Icon size={14} />
                 </div>
               ))}
            </div>
          </div>

          {/* Navigation Sector */}
          <div className="space-y-6">
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Grid Access</h4>
            <ul className="space-y-4">
              {[
                { name: 'Dashboard', path: '/' },
                { name: 'Parking Map', path: '/parking' },
                { name: 'Active Bookings', path: '/reservations' },
                { name: 'System Alerts', path: '/notifications' }
              ].map((link) => (
                <li key={link.name}>
                  <Link to={link.path} className="text-sm font-bold text-slate-500 hover:text-cyan-400 transition-all flex items-center gap-2 group">
                     <ArrowRight size={12} className="opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                     {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Protocol Sector */}
          <div className="space-y-6">
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white">System Protocol</h4>
            <ul className="space-y-4">
              {[
                'Initialize Allocation',
                'Verify Digital Permit',
                'Activate Gate Link',
                'Settle Temporal Hash'
              ].map((step, i) => (
                <li key={i} className="flex items-center gap-3 text-sm font-medium text-slate-500">
                  <span className="text-[9px] font-black font-display text-cyan-400/40">{String(i+1).padStart(2, '0')}</span>
                  {step}
                </li>
              ))}
            </ul>
          </div>

          {/* Contact / Support */}
          <div className="space-y-6">
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Network Support</h4>
            <div className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/[0.06] space-y-4">
               <p className="text-xs text-slate-500 leading-relaxed font-medium italic">
                  Operational 24/7 for grid maintenance and allocation support.
               </p>
               <button className="w-full h-12 rounded-xl bg-white text-black font-display font-black text-[10px] uppercase tracking-widest hover:bg-cyan-400 transition-all">
                  Open Support Link
               </button>
            </div>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="pt-8 border-t border-white/[0.05] flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-700">
            &copy; {new Date().getFullYear()} SmartPark NP Grid. Decentralized Allocation System.
          </p>
          <div className="flex gap-8">
             {['Privacy', 'Legal', 'SLA'].map((l) => (
               <button key={l} className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-700 hover:text-slate-400 transition-all">{l}</button>
             ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
