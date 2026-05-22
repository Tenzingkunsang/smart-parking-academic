import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ChevronLeft, CreditCard, Wallet, MapPin, Clock, ArrowRight, ShieldCheck, Zap, Info, Loader2 } from 'lucide-react';
import { API_BASE } from '../../config/api';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

const PaymentPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { spot, duration, totalAmount, pendingReservationId, scheduledArrival } = location.state || {};
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('');

  if (!spot) {
    navigate('/parking');
    return null;
  }

  const hours = Math.ceil(duration / 60);

  const handlePayment = async () => {
    if (!paymentMethod) {
      toast.error('Temporal Link: Method Identification Required');
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (paymentMethod === 'khalti') {
        const response = await fetch(`${API_BASE}/payments/khalti/initiate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ reservationId: pendingReservationId })
        });
        const data = await response.json();
        if (data.success && data.payment_url) {
          window.location.href = data.payment_url;
          return;
        }
        toast.error('Khalti link failure');
      } else {
        const response = await fetch(`${API_BASE}/reservations/confirm/${pendingReservationId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ paymentMethod, paymentStatus: 'completed' })
        });
        const data = await response.json();
        if (data.success) {
          toast.success('Hash Settled Successfully');
          navigate('/ticket', {
            state: { spot, duration, totalAmount, paymentMethod, bookingId: data.data._id, paymentStatus: 'completed', scheduledArrival, createdAt: data.data.createdAt }
          });
        }
      }
    } catch (error) {
      toast.error('System synchronization error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-32 pb-24 px-6 max-w-5xl mx-auto space-y-12 animate-in fade-in duration-700">
      
      <div className="fixed top-0 right-0 w-[400px] h-[400px] bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none -z-10" />

      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors group">
        <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
        <span className="text-[10px] font-black uppercase tracking-widest text-white">Adjust Allocation</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
         
         <div className="lg:col-span-2 space-y-8">
            <div className="space-y-2">
               <h1 className="text-5xl font-black font-display tracking-tight text-white uppercase italic">Settlement</h1>
               <p className="text-slate-500 font-medium italic leading-relaxed">Finalizing temporal hash for grid node #{spot.spotNumber}.</p>
            </div>

            <Card className="!p-10 space-y-8">
               <div className="flex items-center gap-4 text-cyan-400">
                  <Zap size={20} className="fill-current" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">Matrix Summary</span>
               </div>
               
               <div className="space-y-6">
                  <div>
                     <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 block mb-1">Zone Node</span>
                     <h3 className="text-2xl font-black text-white">{spot.locationName}</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-6 pt-6 border-t border-white/5">
                     <div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 block mb-1">Unit</span>
                        <span className="text-xl font-display font-black text-white">#{spot.spotNumber}</span>
                     </div>
                     <div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 block mb-1">Window</span>
                        <span className="text-xl font-display font-black text-white">{hours}h <span className="text-xs text-slate-600">({duration}m)</span></span>
                     </div>
                  </div>
               </div>

               <div className="p-8 rounded-[2rem] bg-cyan-400/[0.02] border border-cyan-400/10 flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400">Settlement Total</span>
                  <span className="text-3xl font-display font-black text-white font-variant-numeric:tabular-nums">Rs.{totalAmount}</span>
               </div>
            </Card>
         </div>

         <div className="lg:col-span-3 space-y-10">
            <div className="flex items-center gap-3">
               <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#00f2ff]" />
               <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Secure Gateway Selection</h2>
            </div>

            <div className="space-y-4">
               {[
                 { id: 'khalti', name: 'Khalti Wallet', icon: Wallet, color: 'bg-[#5C2D91]' },
                 { id: 'cash', name: 'Pay on Spot', icon: CreditCard, color: 'bg-white/5' }
               ].map((m) => (
                 <button
                   key={m.id}
                   onClick={() => setPaymentMethod(m.id)}
                   className={`w-full p-8 rounded-[2.5rem] border transition-all duration-500 text-left flex items-center justify-between group relative overflow-hidden ${
                     paymentMethod === m.id ? 'bg-white/[0.03] border-cyan-400' : 'bg-white/[0.01] border-white/5 hover:border-white/10'
                   }`}
                 >
                    <div className="flex items-center gap-6 relative z-10">
                       <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${paymentMethod === m.id ? 'bg-cyan-400 text-black shadow-xl shadow-cyan-400/20' : 'bg-white/5 text-slate-600'}`}>
                          <m.icon size={28} />
                       </div>
                       <div>
                          <h4 className={`text-xl font-black font-display transition-colors ${paymentMethod === m.id ? 'text-white' : 'text-slate-500'}`}>{m.name}</h4>
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">Digital Protocol</span>
                       </div>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 transition-all ${paymentMethod === m.id ? 'border-cyan-400' : 'border-white/10'}`}>
                       {paymentMethod === m.id && <div className="w-full h-full rounded-full border-4 border-[#050505] bg-cyan-400" />}
                    </div>
                 </button>
               ))}
            </div>

            <Card className="!p-6 border-white/5 bg-transparent flex items-center gap-6 italic">
               <ShieldCheck size={24} className="text-slate-700" />
               <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                 End-to-end encrypted link. Transaction hash will be signed and stored in the grid archive upon successful settlement.
               </p>
            </Card>

            <Button onClick={handlePayment} disabled={loading || !paymentMethod} className="w-full !py-6 !text-base shadow-2xl flex items-center justify-center gap-3">
               {loading ? <Loader2 className="animate-spin" size={24} /> : 'Establish Temporal Link'}
               {!loading && <ArrowRight size={20} />}
            </Button>
         </div>
      </div>
    </div>
  );
};

export default PaymentPage;
