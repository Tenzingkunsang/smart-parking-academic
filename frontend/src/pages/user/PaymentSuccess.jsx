import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { API_BASE, getAuthToken } from '../../config/api';
import { CheckCircle2, AlertCircle, Loader2, ArrowRight, ShieldCheck, Zap } from 'lucide-react';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [verifying, setVerifying] = useState(true);
  const [paymentData, setPaymentData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        const token = getAuthToken();
        const pidx = searchParams.get('pidx');
        const reservationId = searchParams.get('reservationId') || searchParams.get('purchase_order_id');

        // Khalti GET redirect sends ?error=... when payment fails or is incomplete.
        // Show that message directly instead of "Callback data integrity violation".
        const callbackError = searchParams.get('error');
        if (callbackError) {
          setError(decodeURIComponent(callbackError));
          return;
        }

        if (!token) {
          setError('Authentication required for verification.');
          return;
        }

        if (!pidx || !reservationId) {
          setError('Callback data integrity violation.');
          return;
        }

        const response = await fetch(`${API_BASE}/payments/khalti/verify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ reservationId, pidx })
        });

        const data = await response.json();
        if (!data.success) {
          setError(data.message || 'System validation failed.');
          return;
        }

        // BUG-H1: store amount directly — no paisa conversion.
        setPaymentData({
          transaction_id: data.data?.transactionId || 'N/A',
          total_amount: data.data?.amount || 0,
          status: 'Verified'
        });
      } catch (err) {
        // BUG-L4: plain language error instead of technical jargon.
        setError('Something went wrong while verifying your payment. Please check your bookings or contact support.');
      } finally {
        setVerifying(false);
      }
    };

    verifyPayment();
  }, [searchParams]);

  if (verifying) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center gap-6 font-sans">
        <Loader2 className="animate-spin text-cyan-400" size={48} />
        <div className="text-center space-y-2">
           <h3 className="text-xl font-black font-display text-white uppercase tracking-tight">Verifying Hash</h3>
           <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Synchronizing transaction with Khalti gateway...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden">
      
      <div className="fixed top-0 right-0 w-[400px] h-[400px] bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none -z-10" />

      <div className="w-full max-w-md p-10 rounded-[3rem] bg-white/[0.01] border border-white/[0.08] backdrop-blur-2xl shadow-2xl space-y-10 animate-in zoom-in-95 duration-500 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-400/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="text-center space-y-3">
          <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-6 ${error ? 'bg-red-500/10 border border-red-500/20 text-red-500' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 shadow-[0_0_40px_rgba(16,185,129,0.1)]'}`}>
            {error ? <AlertCircle size={40} /> : <CheckCircle2 size={40} />}
          </div>
          <h2 className="text-3xl font-black font-display tracking-tight text-white uppercase">
            {error ? 'System Error' : 'Success Verified'}
          </h2>
          <p className="text-slate-500 text-sm font-medium leading-relaxed">
            {error ? error : 'Allocation secured. Temporal permit has been generated in your console.'}
          </p>
        </div>

        {!error && (
          <div className="space-y-4 p-8 rounded-[2rem] bg-white/[0.02] border border-white/[0.06]">
            <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-slate-600">
              <span>Transaction Identity</span>
              <span className="font-mono text-xs font-bold text-white">{paymentData?.transaction_id?.substring(0, 12)}</span>
            </div>
            <div className="pt-4 border-t border-white/5 flex justify-between items-center">
               <span className="text-[9px] font-black uppercase tracking-widest text-cyan-400">Verified Settlement</span>
               {/* BUG-H1: render directly, no /100 */}
               <span className="text-2xl font-display font-black text-white font-variant-numeric:tabular-nums">Rs. {paymentData?.total_amount || 0}</span>
            </div>
          </div>
        )}

        <div className="pt-4 space-y-6">
           {!error && (
             <div className="flex items-center justify-center gap-2 text-emerald-500 animate-pulse">
                <ShieldCheck size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest">Protocol Active</span>
             </div>
           )}

           <button 
             onClick={() => navigate('/reservations')}
             className="w-full h-16 rounded-2xl bg-white text-black font-display font-black text-xs uppercase tracking-widest hover:bg-cyan-400 hover:scale-[1.02] transition-all flex items-center justify-center gap-3 shadow-xl shadow-cyan-400/10"
           >
             {error ? 'Retry Settlement' : 'Access Digital Permits'}
             <ArrowRight size={16} />
           </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
