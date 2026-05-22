import React, { useEffect, useState } from 'react';
import { X, Sparkles, ChevronRight } from 'lucide-react';
import Button from './Button';
import Card from './Card';

const KEY = 'hasSeenWave2Onboarding';

const OnboardingHint = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const hasSeen = localStorage.getItem(KEY) === '1';
    if (!hasSeen) {
      const timer = setTimeout(() => setShow(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  if (!show) return null;

  const dismiss = () => {
    localStorage.setItem(KEY, '1');
    setShow(false);
  };

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="System Onboarding"
      className="fixed right-6 bottom-6 z-[2000] max-w-xs animate-in slide-in-from-right-full duration-500"
    >
      <Card className="!p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-cyan-500/20 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl group-hover:bg-cyan-500/10 transition-colors" />
        
        <div className="relative z-10 space-y-6">
           <div className="flex justify-between items-start">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                 <Sparkles size={20} />
              </div>
              <button onClick={dismiss} className="text-slate-600 hover:text-white transition-colors">
                 <X size={18} />
              </button>
           </div>

           <div className="space-y-2">
              <h4 className="text-lg font-black font-display text-white uppercase italic leading-tight">Link Established</h4>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                 Use the grid filters to identify available capacity. Real-time temporal links are now active.
              </p>
           </div>

           <Button onClick={dismiss} className="w-full !py-2.5 !text-[9px] flex items-center justify-center gap-2 group/btn">
              Acknowledge <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
           </Button>
        </div>
      </Card>
    </div>
  );
};

export default OnboardingHint;
