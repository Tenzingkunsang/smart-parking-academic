import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { QRCodeCanvas } from 'qrcode.react';
import CancelBookingModal from '../CancelBooking/CancelBookingModal';
import { getCancellationStatus } from '../../utils/Cancellationpolicy';
import { Printer, ChevronLeft, Calendar, ArrowLeft, ShieldCheck, Ticket, Download, Clock, Loader2, AlertTriangle, RefreshCw, CreditCard, XCircle } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { API_BASE, getAuthToken, handleAuthExpiry } from '../../config/api';

const TicketPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    spot,
    duration,
    totalAmount,
    paymentMethod: initialPaymentMethod,
    bookingId,
    paymentStatus: initialPaymentStatus,
    createdAt,
    scheduledArrival,
  } = location.state || {};

  const [qrValue, setQrValue] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelStatus, setCancelStatus] = useState(null);
  const [isCancelled, setIsCancelled] = useState(false);

  // Live state we refresh from the backend so users see truth even after
  // returning from a stuck/aborted Khalti flow.
  const [status, setStatus] = useState(null);
  const [checkInTime, setCheckInTime] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(initialPaymentStatus);
  const [paymentMethod, setPaymentMethod] = useState(initialPaymentMethod);
  const [verifying, setVerifying] = useState(false);
  const [initiatingPayment, setInitiatingPayment] = useState(false);

  const isNoShow = status === 'no-show';
  const reservationStart = scheduledArrival ? new Date(scheduledArrival) : new Date(createdAt || Date.now());
  const checkInDeadline = new Date(reservationStart.getTime() + 15 * 60 * 1000);
  const isExpired = !isCancelled && !isNoShow && !checkInTime && new Date() > checkInDeadline;

  const isPending =
    status === 'pending' ||
    (paymentMethod === 'khalti' && paymentStatus !== 'completed' && status !== 'reserved' && status !== 'checked-in');

  const fetchReservation = useCallback(async () => {
    if (!bookingId) return;
    try {
      const res = await fetch(`${API_BASE}/reservations/${bookingId}`, {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      });
      if (res.status === 401) { handleAuthExpiry(); return; }
      const data = await res.json();
      if (data.success && data.data) {
        setStatus(data.data.status);
        setCheckInTime(data.data.checkInTime);
        setPaymentStatus(data.data.paymentStatus);
        if (data.data.paymentMethod) setPaymentMethod(data.data.paymentMethod);
      }
    } catch (err) {
      // Silent: we still have the cached state from navigation
    }
  }, [bookingId]);

  useEffect(() => {
    fetchReservation();
    // Refresh status every 30s to detect no-show/expiry transitions
    const id = setInterval(fetchReservation, 30000);
    return () => clearInterval(id);
  }, [fetchReservation]);

  useEffect(() => {
    if (spot && bookingId) {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const qrData = JSON.stringify({
        reservationId: bookingId,
        bookingId: bookingId,
        userId: user._id,
        spotNumber: spot.spotNumber,
        location: spot.locationName,
        timestamp: Date.now()
      });
      setQrValue(qrData);
    }
  }, [spot, bookingId]);

  const handleAttemptVerification = async () => {
    setVerifying(true);
    try {
      const res = await fetch(`${API_BASE}/payments/khalti/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({ reservationId: bookingId }),
      });
      if (res.status === 401) { handleAuthExpiry(); return; }
      const data = await res.json();
      if (data.success) {
        toast.success('Payment verified — permit activated');
        await fetchReservation();
      } else {
        toast.error(data.message || 'Verification failed');
      }
    } catch (err) {
      toast.error('Network error during verification');
    } finally {
      setVerifying(false);
    }
  };

  const handleInitiatePayment = async () => {
    setInitiatingPayment(true);
    try {
      const res = await fetch(`${API_BASE}/payments/khalti/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({ reservationId: bookingId }),
      });
      if (res.status === 401) { handleAuthExpiry(); return; }
      const data = await res.json();
      if (data.success && data.payment_url) {
        window.location.href = data.payment_url;
      } else {
        toast.error(data.message || 'Could not start payment');
        setInitiatingPayment(false);
      }
    } catch (err) {
      toast.error('Network error starting payment');
      setInitiatingPayment(false);
    }
  };

  const downloadQR = () => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `SmartPark-Permit-${bookingId?.slice(-6)}.png`;
      link.href = url;
      link.click();
      toast.success('Permit saved to device');
    }
  };

  useEffect(() => {
    if (!createdAt) return;
    const compute = () => setCancelStatus(getCancellationStatus(createdAt));
    compute();
    const interval = setInterval(compute, 30_000);
    return () => clearInterval(interval);
  }, [createdAt]);

  if (!spot) {
    navigate('/parking');
    return null;
  }

  const hours = Math.ceil(duration / 60);
  const reservationStart = scheduledArrival ? new Date(scheduledArrival) : new Date(createdAt || Date.now());
  const checkInDeadline = new Date(reservationStart.getTime() + 15 * 60 * 1000);

  const handleCancelled = () => {
    setShowCancelModal(false);
    setIsCancelled(true);
  };

  return (
    <div className="min-h-screen pt-32 pb-24 px-6 max-w-5xl mx-auto flex flex-col items-center space-y-12 animate-in fade-in duration-700">
      
      <div className="fixed top-0 right-0 w-[400px] h-[400px] bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none -z-10" />

      <div className="w-full max-w-2xl flex justify-between items-center print:hidden">
         <button onClick={() => navigate('/reservations')} className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors group">
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-widest text-white">Back to Console</span>
         </button>
         <div className="flex gap-3">
            <Button variant="secondary" onClick={() => window.print()} className="!px-4 !py-3"><Printer size={18} /></Button>
            <Button variant="secondary" onClick={downloadQR} className="!px-4 !py-3"><Download size={18} /></Button>
         </div>
      </div>

      <Card className={`w-full max-w-xl !p-0 overflow-hidden relative ${isCancelled ? 'opacity-50 grayscale' : ''}`}>
         <div className={`h-2 w-full ${isCancelled ? 'bg-red-500' : 'bg-cyan-400 animate-pulse'}`} />
         
         <div className="p-10 md:p-14 space-y-12">
            <div className="flex justify-between items-start">
               <div className="space-y-2">
                  <div className="flex items-center gap-2 text-cyan-400">
                     <Ticket size={20} />
                     <span className="text-[10px] font-black uppercase tracking-[0.2em]">Temporal Permit</span>
                  </div>
                  <h1 className="text-4xl font-black font-display tracking-tight text-white uppercase italic">SmartPark <span className="text-slate-700">/</span> Grid</h1>
               </div>
               <div className="text-right">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 block mb-1">Permit Hash</span>
                  <span className="font-mono text-xs font-bold text-white bg-white/5 px-2 py-1 rounded-md border border-white/5">
                     {bookingId?.substring(bookingId.length - 8).toUpperCase() || 'PENDING'}
                  </span>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-10">
               <div className="space-y-1">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">Allocation Zone</span>
                  <h3 className="text-2xl font-black font-display text-white leading-tight">{spot.locationName}</h3>
                  <p className="text-[10px] text-slate-500 font-medium">{spot.location?.address || 'Standard Sector'}</p>
               </div>
               <div className="text-right space-y-1">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">Unit ID</span>
                  <h3 className="text-4xl font-black font-display text-cyan-400 leading-none">#{spot.spotNumber}</h3>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-10 pt-10 border-t border-white/5">
               <div className="space-y-1">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">Epoch Start</span>
                  <div className="flex items-center gap-2 text-white font-bold text-lg">
                     <Calendar size={16} className="text-cyan-400" />
                     <span>{reservationStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-bold">{reservationStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
               </div>
               <div className="text-right space-y-1">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">Validation Deadline</span>
                  <div className="flex items-center justify-end gap-2 text-red-400 font-bold text-lg">
                     <Clock size={16} />
                     <span>{checkInDeadline.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
               </div>
            </div>

            {!isCancelled && !isPending && !isNoShow && !isExpired && (
               <div className="py-10 flex flex-col items-center gap-8 bg-white/[0.02] border border-white/5 rounded-[2.5rem]">
                  <div className="bg-white p-6 rounded-3xl shadow-[0_0_50px_rgba(255,255,255,0.05)]">
                     {qrValue ? (
                        <QRCodeCanvas value={qrValue} size={180} level="H" includeMargin={true} />
                     ) : (
                        <Loader2 className="animate-spin text-slate-300" size={40} />
                     )}
                  </div>
                  <div className="text-center space-y-2">
                     <div className="flex items-center justify-center gap-2 text-emerald-400">
                        <ShieldCheck size={18} />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Hash Verified</span>
                     </div>
                     <p className="text-[10px] text-slate-500 font-medium max-w-[220px] mx-auto italic">
                        Scan temporal token at gate terminal to authorize entry protocol.
                     </p>
                  </div>
               </div>
            )}

            {(isNoShow || isExpired) && (
               <div className="py-10 px-8 flex flex-col items-center gap-6 bg-red-500/[0.04] border border-red-500/20 rounded-[2.5rem] text-center">
                  <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 shadow-[0_0_30px_rgba(239,68,68,0.1)]">
                     <XCircle size={32} />
                  </div>
                  <div className="space-y-2 max-w-sm">
                     <h3 className="text-2xl font-black font-display tracking-tight text-white uppercase italic">Access Revoked</h3>
                     <p className="text-xs font-medium text-slate-400 leading-relaxed">
                        {isNoShow 
                          ? "This permit was revoked because you did not arrive within the 15-minute grace period." 
                          : "The validation window for this permit has closed. Your spot has been released."}
                     </p>
                  </div>
               </div>
            )}

            {!isCancelled && isPending && (
               <div className="py-10 px-8 flex flex-col items-center gap-6 bg-amber-500/[0.04] border border-amber-500/20 rounded-[2.5rem] text-center">
                  <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shadow-[0_0_30px_rgba(251,191,36,0.1)]">
                     <AlertTriangle size={32} />
                  </div>
                  <div className="space-y-2 max-w-sm">
                     <h3 className="text-2xl font-black font-display tracking-tight text-white uppercase italic">Payment Pending</h3>
                     <p className="text-xs font-medium text-slate-400 leading-relaxed">
                        Your QR permit is locked until payment is verified. If you already completed payment on Khalti, click <span className="text-amber-300 font-bold">Attempt Verification</span>. Otherwise, complete payment to activate the permit.
                     </p>
                  </div>

                  <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                     <Button
                        onClick={handleAttemptVerification}
                        disabled={verifying || initiatingPayment}
                        className="flex items-center justify-center gap-2 !py-3 !text-[10px]"
                     >
                        {verifying ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} />}
                        Attempt Verification
                     </Button>
                     <Button
                        variant="secondary"
                        onClick={handleInitiatePayment}
                        disabled={verifying || initiatingPayment}
                        className="flex items-center justify-center gap-2 !py-3 !text-[10px]"
                     >
                        {initiatingPayment ? <Loader2 className="animate-spin" size={14} /> : <CreditCard size={14} />}
                        Pay with Khalti
                     </Button>
                  </div>
               </div>
            )}

            <div className="pt-10 border-t border-white/5 flex justify-between items-center">
               <div className="space-y-1">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">Settlement Total</span>
                  <span className="text-3xl font-display font-black text-white italic">Rs.{totalAmount}</span>
               </div>
               <div className="text-right space-y-1">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">Temporal duration</span>
                  <span className="text-sm font-bold text-slate-400">{hours} Hour{hours > 1 ? 's' : ''} Allocation</span>
               </div>
            </div>
         </div>
         
         <div className="p-6 bg-white/[0.01] border-t border-white/5 text-center">
            <span className="text-[8px] font-black uppercase tracking-[0.4em] text-slate-700 italic">SmartPark Autonomous Grid System</span>
         </div>
      </Card>

      {!isCancelled && cancelStatus?.canCancel && (
         <button onClick={() => setShowCancelModal(true)} className="text-[10px] font-black uppercase tracking-[0.3em] text-red-500/40 hover:text-red-500 transition-colors">
            Abort Permit Allocation
         </button>
      )}

      {showCancelModal && (
        <CancelBookingModal
          booking={{ _id: bookingId, createdAt, paymentMethod, totalAmount }}
          onClose={() => setShowCancelModal(false)}
          onCancelled={handleCancelled}
        />
      )}
    </div>
  );
};

export default TicketPage;
