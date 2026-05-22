import React from 'react';
import { Zap, Accessibility, Home, Clock, Video } from 'lucide-react';

const FEATURE_CONFIG = {
  ev_charging: { label: 'EV Link', Icon: Zap },
  handicap: { label: 'Accessible', Icon: Accessibility },
  covered: { label: 'Covered', Icon: Home },
  '24_hours': { label: '24/7', Icon: Clock },
  cctv: { label: 'CCTV Secure', Icon: Video },
};

const SpotAmenities = ({ features, variant = 'standard' }) => {
  const list = Array.isArray(features) ? features : [];
  if (!list.length) return null;

  return (
    <div className="flex flex-wrap gap-2" role="list" aria-label="Parking amenities">
      {list.map((f) => {
        const cfg = FEATURE_CONFIG[f];
        if (!cfg) return null;
        const { Icon, label } = cfg;
        
        if (variant === 'minimal') {
           return (
            <div key={f} className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-cyan-400/60" title={label}>
               <Icon size={14} />
            </div>
           );
        }

        return (
          <div 
            key={f} 
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] text-[9px] font-black uppercase tracking-widest text-slate-400 transition-all hover:border-cyan-400/30 hover:text-cyan-400" 
            role="listitem" 
            title={label}
          >
            <Icon size={12} className="shrink-0" />
            <span>{label}</span>
          </div>
        );
      })}
    </div>
  );
};

export default SpotAmenities;
