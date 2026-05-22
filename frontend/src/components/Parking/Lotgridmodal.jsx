import React, { useMemo } from 'react';
import { X, Car, ArrowDown, ArrowUp, LayoutGrid, Zap } from 'lucide-react';

const LotGridModal = ({ spot, onClose, onBook }) => {
  const total = spot.totalSpaces || 10;
  const available = spot.availableSpaces ?? 0;
  const reserved = spot.reservedSpaces ?? 0;
  const occupied = total - available - reserved;

  const spaces = useMemo(() => {
    return Array.from({ length: total }, (_, i) => {
      const num = i + 1;
      const row = String.fromCharCode(65 + Math.floor(i / 4));
      const col = (i % 4) + 1;
      const label = `${row}-${col}`;

      let status;
      if (i < occupied) status = 'occupied';
      else if (i < occupied + reserved) status = 'reserved';
      else status = 'available';

      return { num, label, status };
    });
  }, [total, available, reserved, occupied]);

  const availCount = spaces.filter((s) => s.status === 'available').length;

  const rows = useMemo(() => {
    const result = [];
    for (let i = 0; i < spaces.length; i += 4) {
      result.push(spaces.slice(i, i + 4));
    }
    return result;
  }, [spaces]);

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-6 bg-[#050505]/90 backdrop-blur-md animate-in fade-in duration-300">
      <div 
        className="w-full max-w-2xl bg-[#0a0a0a] border border-white/[0.08] rounded-[2.5rem] overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1.5 w-full bg-cyan-400" />

        {/* Header */}
        <div className="p-8 border-b border-white/[0.05] flex justify-between items-center bg-white/[0.01]">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-cyan-400/10 flex items-center justify-center text-cyan-400">
                <LayoutGrid size={20} />
             </div>
             <div>
                <h2 className="text-xl font-black font-display text-white tracking-tight leading-none uppercase">{spot.locationName}</h2>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Lot Visualization Grid</p>
             </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-xl hover:bg-white/5 flex items-center justify-center text-slate-500 hover:text-white transition-all">
             <X size={20} />
          </button>
        </div>

        {/* Body Scrollable */}
        <div className="p-8 flex-1 overflow-y-auto custom-scrollbar">
           
           {/* Stats Summary */}
           <div className="grid grid-cols-4 gap-4 mb-10">
              {[
                { label: 'Free', val: availCount, color: 'bg-emerald-500', text: 'text-emerald-400' },
                { label: 'Held', val: reserved, color: 'bg-amber-500', text: 'text-amber-400' },
                { label: 'Full', val: occupied > 0 ? occupied : 0, color: 'bg-slate-700', text: 'text-slate-500' },
                { label: 'Total', val: total, color: 'bg-white', text: 'text-white' }
              ].map((s) => (
                <div key={s.label} className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] text-center">
                   <div className="flex items-center justify-center gap-2 mb-1">
                      <div className={`w-1.5 h-1.5 rounded-full ${s.color}`} />
                      <span className="text-[8px] font-black uppercase tracking-widest text-slate-600">{s.label}</span>
                   </div>
                   <span className={`text-xl font-display font-black ${s.text}`}>{s.val}</span>
                </div>
              ))}
           </div>

           {/* Grid Visual */}
           <div className="relative p-10 bg-white/[0.01] border border-white/[0.05] rounded-[2rem]">
              <div className="flex items-center justify-center gap-2 text-[10px] font-black text-slate-700 uppercase tracking-[0.3em] mb-8">
                 <ArrowDown size={14} /> Entry Sector
              </div>

              <div className="space-y-6">
                {rows.map((row, rIdx) => (
                  <div key={rIdx} className="flex items-center justify-between gap-8">
                    {/* Left block */}
                    <div className="grid grid-cols-2 gap-3 flex-1">
                      {row.slice(0, 2).map((space) => (
                        <div
                          key={space.label}
                          className={`h-16 rounded-xl border flex items-center justify-center transition-all ${
                            space.status === 'available' 
                              ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' 
                              : space.status === 'reserved'
                              ? 'bg-amber-500/5 border-amber-500/20 text-amber-400'
                              : 'bg-white/[0.02] border-white/5 text-slate-800'
                          }`}
                        >
                          {space.status === 'available' ? (
                            <span className="text-[10px] font-black font-display">{space.label}</span>
                          ) : (
                            <Car size={20} strokeWidth={1.5} />
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Aisle */}
                    <div className="w-10 h-16 rounded-full bg-white/[0.02] border border-dashed border-white/5 flex items-center justify-center">
                       <span className="text-slate-800 text-xs font-black">↕</span>
                    </div>

                    {/* Right block */}
                    <div className="grid grid-cols-2 gap-3 flex-1">
                      {row.slice(2, 4).map((space) => (
                        <div
                          key={space.label}
                          className={`h-16 rounded-xl border flex items-center justify-center transition-all ${
                            space.status === 'available' 
                              ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' 
                              : space.status === 'reserved'
                              ? 'bg-amber-500/5 border-amber-500/20 text-amber-400'
                              : 'bg-white/[0.02] border-white/5 text-slate-800'
                          }`}
                        >
                          {space.status === 'available' ? (
                            <span className="text-[10px] font-black font-display">{space.label}</span>
                          ) : (
                            <Car size={20} strokeWidth={1.5} />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-center gap-2 text-[10px] font-black text-slate-700 uppercase tracking-[0.3em] mt-8">
                 <ArrowUp size={14} /> Exit Sector
              </div>
           </div>
        </div>

        {/* Footer Action */}
        <div className="p-8 border-t border-white/[0.05] bg-white/[0.01]">
          {availCount > 0 ? (
            <button
              onClick={() => onBook(spot)}
              className="w-full h-16 rounded-2xl bg-white text-black font-display font-black text-sm uppercase tracking-widest hover:bg-cyan-400 hover:scale-[1.02] transition-all flex items-center justify-center gap-3 shadow-2xl"
            >
              <Zap size={18} className="fill-current" />
              <span>Link Temporal Reservation</span>
            </button>
          ) : (
            <div className="w-full h-16 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-slate-500 font-black text-[10px] uppercase tracking-widest italic">
              Sector Capacity Exceeded — Manual Waitlist Required
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LotGridModal;
