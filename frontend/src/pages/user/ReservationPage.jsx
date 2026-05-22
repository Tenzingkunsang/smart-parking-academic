import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, Clock, MapPin, CreditCard, CheckCircle2, Loader2, Zap, ArrowRight, ShieldCheck } from 'lucide-react';
import reservationService from '../../services/reservationService';
import parkingService from '../../services/parkingService';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

const ReservationPage = () => {
  const { spotId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [spot, setSpot] = useState(null);
  const [duration, setDuration] = useState(60);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(null);
  const [step, setStep] = useState('details'); 

  const fetchSpotDetails = useCallback(async () => {
    try {
      let spotData;
      if (location.state?.spot) {
        spotData = location.state.spot;
        if (location.state.duration) setDuration(location.state.duration);
      } else {
        const response = await parkingService.getSpotById(spotId);
        spotData = response.data;
      }
      setSpot(spotData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching spot:', error);
      navigate('/parking');
    }
  }, [location.state, navigate, spotId]);

  useEffect(() => { fetchSpotDetails(); }, [fetchSpotDetails]);

  const calculateTotal = () => {
    const hours = Math.ceil(duration / 60);
    return hours * (spot?.price || 0);
  };

  const handleBooking = async () => {
    try {
      setLoading(true);
      const scheduledArrival = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      const response = await reservationService.createReservation(spotId, duration, scheduledArrival);
      setBooking(response.data);
      setStep('payment');
    } catch (error) {
      console.error('Booking error:', error);
      alert(error.response?.data?.message || 'Booking failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async (paymentMethod) => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep('confirm');
      setTimeout(() => {
        navigate('/reservations', {
          state: { success: true, message: 'Your spot is secured!' }
        });
      }, 3000);
    }, 1500);
  };

  if (loading && !spot) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6">
        <Loader2 className="animate-spin text-cyan-400" size={48} />
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Initializing Grid Link...</span>
      </div>
    );
  }

  if (!spot) return null;

  return (
    <div className="min-h-screen pt-32 pb-24 px-6 max-w-5xl mx-auto space-y-12 animate-in fade-in duration-700">
      
      <div className="fixed top-0 right-0 w-[400px] h-[400px] bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none -z-10" />
      
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors group"
      >
        <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
        <span className="text-[10px] font-black uppercase tracking-widest">Abort Allocation</span>
      </button>

      {/* Stepper */}
      <div className="grid grid-cols-3 gap-6">
        {[
          { id: 'details', label: 'Configuration', icon: Zap },
          { id: 'payment', label: 'Transaction', icon: CreditCard },
          { id: 'confirm', label: 'Validation', icon: ShieldCheck }
        ].map((s) => {
          const isActive = step === s.id;
          const isDone = (step === 'payment' && s.id === 'details') || (step === 'confirm');
          return (
            <div key={s.id} className="space-y-3">
              <div className={`h-1 rounded-full transition-all duration-700 ${isActive ? 'bg-cyan-400' : isDone ? 'bg-emerald-500' : 'bg-white/5'}`} />
              <div className="flex items-center gap-3">
                 <s.icon size={16} className={isActive ? 'text-cyan-400' : isDone ? 'text-emerald-500' : 'text-slate-700'} />
                 <span className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-white' : 'text-slate-700'}`}>{s.label}</span>
              </div>
            </div>
          );
        })}
      </div>

      {step === 'details' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 animate-in slide-in-from-bottom-4 duration-500">
           <div className="space-y-8">
              <div className="space-y-2">
                 <h1 className="text-5xl font-black font-display tracking-tight text-white uppercase">Link Unit</h1>
                 <p className="text-slate-500 font-medium italic">Establishing temporal allocation hash for node #{spot.spotNumber}.</p>
              </div>

              <Card className="!p-10 border-white/5 bg-white/[0.01]">
                 <div className="space-y-8">
                    <div className="flex items-center gap-4 text-cyan-400">
                       <MapPin size={20} />
                       <span className="text-[10px] font-black uppercase tracking-[0.2em]">Grid Coordinate</span>
                    </div>
                    <div className="space-y-2">
                       <h3 className="text-3xl font-black font-display text-white">{spot.locationName}</h3>
                       <p className="text-slate-500 font-medium">{spot.location?.address || 'Kathmandu Sector'}</p>
                    </div>
                    <div className="pt-8 border-t border-white/5 flex justify-between items-end">
                       <div className="space-y-1">
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">Unit ID</span>
                          <span className="text-2xl font-display font-black text-white">#{spot.spotNumber}</span>
                       </div>
                       <div className="text-right space-y-1">
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">Temporal Rate</span>
                          <span className="text-2xl font-display font-black text-cyan-400">Rs.{spot.price}/hr</span>
                       </div>
                    </div>
                 </div>
              </Card>
           </div>

           <div className="space-y-10">
              <Card className="!p-10 space-y-8">
                 <div className="space-y-6">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 ml-1">Allocation Matrix (Minutes)</label>
                    <div className="grid grid-cols-2 gap-4">
                       {[30, 60, 120, 180, 240, 300].map((m) => (
                         <button
                           key={m}
                           onClick={() => setDuration(m)}
                           className={`h-14 rounded-2xl border font-black text-[10px] uppercase tracking-widest transition-all ${
                             duration === m ? 'bg-white text-black border-white shadow-xl' : 'bg-white/5 border-white/5 text-slate-500 hover:border-white/20'
                           }`}
                         >
                           {m >= 60 ? `${m/60} Hour${m > 60 ? 's' : ''}` : `${m} Mins`}
                         </button>
                       ))}
                    </div>
                 </div>

                 <div className="p-8 rounded-[2rem] bg-cyan-400/[0.02] border border-cyan-400/10 flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400">Projected Settlement</span>
                    <span className="text-3xl font-display font-black text-white">Rs.{calculateTotal()}</span>
                 </div>

                 <Button onClick={handleBooking} disabled={loading} className="w-full !py-5 flex items-center justify-center gap-3 group">
                    {loading ? <Loader2 className="animate-spin" size={20} /> : 'Initialize Secure Link'}
                    {!loading && <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />}
                 </Button>
              </Card>
           </div>
        </div>
      )}

      {/* Payment Step Simplified for this turn */}
      {step === 'payment' && (
         <div className="max-w-2xl mx-auto animate-in fade-in zoom-in-95 duration-500">
            <Card className="!p-12 text-center space-y-10">
               <div className="w-20 h-20 rounded-[2.5rem] bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto text-cyan-400">
                  <CreditCard size={40} />
               </div>
               <div className="space-y-2">
                  <h2 className="text-4xl font-black font-display text-white uppercase tracking-tight">Settlement Required</h2>
                  <p className="text-slate-500 font-medium">Finalizing link for Node #{spot.spotNumber} with Rs.{calculateTotal()}</p>
               </div>
               <div className="grid gap-4">
                  <Button onClick={() => handlePayment('khalti')} className="w-full !bg-[#5C2D91] hover:!bg-[#4A2475]">Pay with Khalti</Button>
                  <Button variant="secondary" onClick={() => handlePayment('cash')} className="w-full">Settle on Spot</Button>
               </div>
            </Card>
         </div>
      )}

      {step === 'confirm' && (
         <div className="max-w-md mx-auto text-center space-y-10 animate-in zoom-in-95 duration-500">
            <div className="w-24 h-24 rounded-[3rem] bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-500 shadow-[0_0_50px_rgba(16,185,129,0.15)]">
               <CheckCircle2 size={56} />
            </div>
            <div className="space-y-2">
               <h2 className="text-4xl font-black font-display text-white uppercase tracking-tight">Verified</h2>
               <p className="text-slate-500 font-medium">Temporal allocation secured. Synchronizing console...</p>
            </div>
            <Card className="p-8 border-dashed border-white/10 bg-transparent">
               <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 block mb-2">Permit Hash</span>
               <p className="font-mono text-xs font-bold text-cyan-400">{booking?.reservation?._id || 'LINK_ACTIVE'}</p>
            </Card>
         </div>
      )}
    </div>
  );
};

export default ReservationPage;
