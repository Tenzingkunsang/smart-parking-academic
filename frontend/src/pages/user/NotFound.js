import React from 'react';
import { Link } from 'react-router-dom';
import { Home, Search, AlertCircle, ArrowRight } from 'lucide-react';

const NotFound = () => {
  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden">
      
      {/* Decorative Lights */}
      <div className="fixed top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-md w-full text-center space-y-10 animate-in zoom-in-95 duration-500 relative z-10">
        <div className="space-y-4">
           <div className="w-24 h-24 rounded-[2.5rem] bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-red-500 shadow-[0_0_40px_rgba(239,68,68,0.1)]">
              <AlertCircle size={48} />
           </div>
           <h1 className="text-8xl font-black font-display tracking-tighter text-white">404</h1>
           <h2 className="text-2xl font-black uppercase tracking-[0.2em] text-slate-400">Node Not Found</h2>
           <p className="text-slate-500 font-medium leading-relaxed">
             The requested temporal coordinate does not exist in the current grid master.
           </p>
        </div>

        <div className="grid gap-3">
           <Link to="/" className="h-14 rounded-2xl bg-white text-black font-display font-black text-xs uppercase tracking-widest hover:bg-cyan-400 transition-all flex items-center justify-center gap-2 shadow-xl">
              <Home size={16} /> Return to Console
           </Link>
           <Link to="/parking" className="h-14 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-slate-400 font-display font-black text-xs uppercase tracking-widest hover:text-white transition-all flex items-center justify-center gap-2">
              <Search size={16} /> Locate Capacity
           </Link>
        </div>

        <div className="pt-10 border-t border-white/5">
           <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-700 mb-6">Redirect Protocols</p>
           <div className="grid grid-cols-2 gap-4">
              {[
                { name: 'Identity', path: '/login' },
                { name: 'Registry', path: '/register' },
                { name: 'Archive', path: '/reservations' },
                { name: 'Profile', path: '/profile' }
              ].map((link) => (
                <Link key={link.name} to={link.path} className="text-[10px] font-bold text-slate-500 hover:text-cyan-400 transition-colors flex items-center justify-center gap-2 group">
                   {link.name} <ArrowRight size={10} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
