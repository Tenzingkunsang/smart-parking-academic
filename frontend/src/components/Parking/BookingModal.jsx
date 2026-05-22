import React, { useState, useEffect } from 'react';
import { MapPin, Clock, Calendar, X, CreditCard, ShieldCheck, Zap, Info, Loader2, ArrowRight, User } from 'lucide-react';

const PLATE_KEY = 'vehiclePlate';

function minArrivalValue() {
  const d = new Date(Date.now() + 5 * 60 * 1000);
  d.setSeconds(0, 0);
  return d.toISOString().slice(0, 16);
}

const BookingModal = ({ spot, isOpen, onClose, onConfirm, onJoinWaitlist, mode = 'book' }) => {
  const [step, setStep] = useState(1);
  const [duration, setDuration] = useState(60);
  const [arrivalValue, setArrivalValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [vehiclePlate, setVehiclePlate] = useState(() => localStorage.getItem(PLATE_KEY) || '');
  const [arrivalError, setArrivalError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setVehiclePlate(localStorage.getItem(PLATE_KEY) || '');
      setArrivalValue(minArrivalValue());
      setArrivalError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const calculateTotal = () => {
    const hours = Math.ceil(duration / 60);
    return hours * spot.price;
  };

  const handleReviewClick = () => {
    if (!arrivalValue) {
      setArrivalError('Temporal coordinate required.');
      return;
    }
    const arrival = new Date(arrivalValue);
    if (arrival <= new Date()) {
      setArrivalError('Allocation must be in future time.');
      return;
    }
    setArrivalError('');
    setStep(2);
  };

  const handleFinalConfirm = async () => {
    setLoading(true);
    try {
      const scheduledArrival = new Date(arrivalValue).toISOString();
      if (mode === 'waitlist') {
        await onJoinWaitlist?.(spot._id, duration, scheduledArrival);
      } else {
        await onConfirm(spot._id, duration, scheduledArrival);
      }
    } finally {
      setLoading(false);
    }
  };

  const hoursLabel = Math.ceil(duration / 60);
  const total = calculateTotal();
  const arrivalFormatted = arrivalValue
    ? new Date(arrivalValue).toLocaleString(undefined, {
        weekday: 'short', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : '—';

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-6 bg-[#050505]/90 backdrop-blur-md animate-in fade-in duration-300">
      <div 
        className="w-full max-w-xl bg-[#0a0a0a] border border-white/[0.08] rounded-[2.5rem] overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Branding */}
        <div className="h-1.5 w-full bg-cyan-400" />
        
        <div className="p-8 border-b border-white/[0.05] flex justify-between items-center bg-white/[0.01]">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-cyan-400/10 flex items-center justify-center text-cyan-400">
                <Zap size={20} className="fill-current" />
             </div>
             <h2 className="text-xl font-black font-display text-white tracking-tight uppercase">
               {step === 1 ? 'Configure Link' : 'Final Validation'}
             </h2>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-xl hover:bg-white/5 flex items-center justify-center text-slate-500 hover:text-white transition-all">
             <X size={20} />
          </button>
        </div>

        {step === 1 ? (
          <div className="p-8 space-y-8">
            {/* Spot Brief */}
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex justify-between items-center">
               <div className="space-y-1">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">Active Node</span>
                  <h3 className="text-lg font-black text-white font-display leading-none">{spot.locationName}</h3>
                  <p className="text-[10px] text-slate-500 font-medium truncate max-w-[200px]">{spot.location?.address || 'Standard Sector'}</p>
               </div>
               <div className="text-right">
                  <span className="text-[10px] font-black text-cyan-400 block font-display">#{spot.spotNumber}</span>
                  <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">ID</span>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {/* Plate Input */}
               <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-600 ml-1">Vehicle Identifier</label>
                  <div className="relative group">
                     <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
                     <input
                        type="text"
                        placeholder="BA 1 PA 1234"
                        value={vehiclePlate}
                        onChange={(e) => setVehiclePlate(e.target.value)}
                        className="w-full h-12 bg-white/[0.03] border border-white/[0.08] rounded-xl pl-11 pr-4 text-xs font-bold text-white focus:outline-none focus:border-cyan-400/40 focus:bg-white/[0.05] transition-all"
                     />
                  </div>
               </div>

               {/* Duration Select */}
               <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-600 ml-1">Temporal Window</label>
                  <div className="relative">
                     <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
                     <select
                        value={duration}
                        onChange={(e) => setDuration(parseInt(e.target.value))}
                        className="w-full h-12 bg-white/[0.03] border border-white/[0.08] rounded-xl pl-11 pr-4 text-xs font-bold text-white appearance-none focus:outline-none focus:border-cyan-400/40"
                     >
                        <option value={30}>30 Minutes</option>
                        <option value={60}>1 Hour</option>
                        <option value={120}>2 Hours</option>
                        <option value={180}>3 Hours</option>
                        <option value={240}>4 Hours</option>
                     </select>
                  </div>
               </div>

               {/* Arrival Picker */}
               <div className="col-span-full space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-600 ml-1">Allocation Start</label>
                  <div className="relative">
                     <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
                     <input
                        type="datetime-local"
                        min={minArrivalValue()}
                        value={arrivalValue}
                        onChange={(e) => { setArrivalValue(e.target.value); setArrivalError(''); }}
                        className="w-full h-12 bg-white/[0.03] border border-white/[0.08] rounded-xl pl-11 pr-4 text-xs font-bold text-white focus:outline-none focus:border-cyan-400/40 transition-all [color-scheme:dark]"
                     />
                  </div>
                  {arrivalError && <p className="text-[10px] font-bold text-red-500 mt-1 ml-1">{arrivalError}</p>}
               </div>
            </div>

            {/* Total Estimate */}
            <div className="p-6 rounded-2xl bg-cyan-400/5 border border-cyan-400/10 flex justify-between items-center">
               <div className="flex flex-col">
                  <span className="text-[9px] font-black uppercase tracking-widest text-cyan-400/60">Estimated Settlement</span>
                  <span className="text-xs font-bold text-slate-400">Rs. {spot.price} / hr · {hoursLabel}h window</span>
               </div>
               <span className="text-2xl font-display font-black text-white">Rs. {total}</span>
            </div>

            <div className="flex gap-4 pt-2">
               <button onClick={onClose} className="flex-1 h-14 rounded-xl bg-white/[0.03] border border-white/[0.08] text-slate-500 font-display font-black text-[10px] uppercase tracking-widest hover:text-white transition-all">Cancel</button>
               <button onClick={handleReviewClick} className="flex-[2] h-14 rounded-xl bg-white text-black font-display font-black text-[10px] uppercase tracking-widest hover:bg-cyan-400 shadow-xl transition-all flex items-center justify-center gap-2">
                  Review Allocation <ArrowRight size={14} />
               </button>
            </div>
          </div>
        ) : (
          <div className="p-8 space-y-8 animate-in slide-in-from-right-4 duration-300">
             <div className="text-center space-y-2">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                   <ShieldCheck className="text-emerald-500" size={28} />
                </div>
                <h3 className="text-xl font-black font-display text-white tracking-tight leading-none uppercase">Confirm Hash</h3>
                <p className="text-[11px] text-slate-500 font-medium">Verify temporal allocation parameters before link initialization.</p>
             </div>

             <div className="p-8 rounded-[2rem] bg-white/[0.01] border border-white/[0.06] space-y-5">
                <div className="flex justify-between items-center">
                   <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">Unit Identification</span>
                   <span className="text-sm font-bold text-white">{spot.locationName} <span className="text-cyan-400 font-display">#{spot.spotNumber}</span></span>
                </div>
                <div className="flex justify-between items-center border-t border-white/5 pt-4">
                   <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">Temporal Start</span>
                   <span className="text-sm font-bold text-white">{arrivalFormatted}</span>
                </div>
                <div className="flex justify-between items-center border-t border-white/5 pt-4">
                   <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">Duration Allocation</span>
                   <span className="text-sm font-bold text-white">{duration}m ({hoursLabel}h Billed)</span>
                </div>
                <div className="flex justify-between items-center border-t border-white/10 pt-6">
                   <span className="text-[9px] font-black uppercase tracking-widest text-cyan-400">Total Settlement</span>
                   <span className="text-2xl font-display font-black text-white">Rs. {total}</span>
                </div>
             </div>

             <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.04] flex gap-4 items-start">
                <Info size={16} className="text-slate-600 shrink-0 mt-0.5" />
                <p className="text-[10px] leading-relaxed text-slate-500 font-medium italic">
                   System lock will initiate upon confirmation. Arrival verification required within 15 minutes of scheduled time.
                </p>
             </div>

             <div className="flex gap-4">
               <button disabled={loading} onClick={() => setStep(1)} className="flex-1 h-14 rounded-xl bg-white/[0.03] border border-white/[0.08] text-slate-500 font-display font-black text-[10px] uppercase tracking-widest hover:text-white transition-all">Back</button>
               <button disabled={loading} onClick={handleFinalConfirm} className="flex-[2] h-14 rounded-xl bg-white text-black font-display font-black text-[10px] uppercase tracking-widest hover:bg-cyan-400 transition-all flex items-center justify-center gap-2">
                  {loading ? <Loader2 className="animate-spin" size={16} /> : (mode === 'waitlist' ? 'Link Waitlist' : 'Initiate Settlement')}
               </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingModal;
