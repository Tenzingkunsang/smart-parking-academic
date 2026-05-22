import React from 'react';
import { CarFront, Zap, ShieldCheck } from 'lucide-react';

export default function AuthLayout({ title, subtitle, wide, children }) {
  return (
    <div className="min-h-screen bg-[#050505] flex relative overflow-hidden font-sans">
      
      {/* Dynamic Background Mesh */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />

      {/* Side Visual Cluster (Desktop) */}
      <aside className="hidden lg:flex lg:w-1/2 flex-col justify-center px-20 xl:px-32 relative z-10 border-r border-white/5 bg-gradient-to-br from-white/[0.01] to-transparent">
        <div className="max-w-md space-y-12">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500 flex items-center justify-center text-white shadow-xl shadow-cyan-500/20">
              <CarFront size={28} strokeWidth={2.5} />
            </div>
            <span className="text-3xl font-display font-black text-white tracking-tighter">
              SmartPark
            </span>
          </div>

          <div className="space-y-6">
            <h1 className="text-6xl font-black font-display text-white leading-none tracking-tighter">
              Next-gen <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 italic">urban logic.</span>
            </h1>
            <p className="text-xl text-slate-500 font-medium leading-relaxed">
              Deploy secure temporal allocations and manage digital grid permits with industrial-grade precision.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
             {['Real-time Grid', 'Encrypted Hash', 'QR Validation'].map(item => (
               <div key={item} className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#00f2ff]" /> {item}
               </div>
             ))}
          </div>
        </div>
      </aside>

      {/* Terminal Content Cluster */}
      <main className="flex-1 flex flex-col justify-center items-center p-6 md:p-12 relative z-10">
        
        {/* Mobile Header */}
        <div className="lg:hidden flex flex-col items-center gap-4 mb-12">
           <div className="w-14 h-14 rounded-2xl bg-cyan-500 flex items-center justify-center text-white shadow-xl shadow-cyan-500/20">
              <CarFront size={32} strokeWidth={2.5} />
           </div>
           <span className="text-2xl font-display font-black text-white tracking-tighter">SmartPark</span>
        </div>

        <div className={`w-full ${wide ? 'max-w-2xl' : 'max-w-md'} animate-in fade-in slide-in-from-bottom-4 duration-700`}>
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-[2.5rem] p-8 md:p-12 backdrop-blur-2xl shadow-2xl relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
            
            <div className="relative z-10 space-y-10">
               <header className="space-y-2">
                  <div className="flex items-center gap-2 text-cyan-400 mb-2">
                     <Zap size={14} className="fill-current" />
                     <span className="text-[10px] font-black uppercase tracking-[0.2em]">Secure Protocol</span>
                  </div>
                  <h2 className="text-3xl font-black font-display text-white uppercase italic tracking-tight leading-none">{title}</h2>
                  <p className="text-slate-500 text-sm font-medium leading-relaxed">{subtitle}</p>
               </header>

               {children}
            </div>
          </div>

          <footer className="mt-12 text-center space-y-4">
             <div className="flex items-center justify-center gap-2 text-slate-800">
                <ShieldCheck size={14} />
                <span className="text-[9px] font-black uppercase tracking-[0.3em]">TLS 1.3 Encryption Active</span>
             </div>
             <p className="text-[9px] font-bold text-slate-700 uppercase tracking-widest">
               &copy; 2026 SmartPark NP · GRID NODE [KTM-MASTER]
             </p>
          </footer>
        </div>
      </main>
    </div>
  );
}
