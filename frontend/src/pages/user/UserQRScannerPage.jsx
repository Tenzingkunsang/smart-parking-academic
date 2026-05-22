import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { CheckCircle, XCircle, QrCode, Clock, MapPin, AlertTriangle, ArrowLeft, Loader2, Zap, ShieldCheck, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { API_BASE } from '../../config/api';

const UserQRScannerPage = () => {
  const navigate = useNavigate();
  const [phase, setPhase] = useState('scanning');   // scanning | loading | result | error
  const [result, setResult] = useState(null);
  const scannerRef = useRef(null);
  const html5QrRef = useRef(null);
  const hasScannedRef = useRef(false);

  useEffect(() => {
    if (phase !== 'scanning') return;
    hasScannedRef.current = false;

    const scanner = new Html5Qrcode('user-qr-reader');
    html5QrRef.current = scanner;

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 260, height: 260 } },
        (decodedText) => {
          if (hasScannedRef.current) return;
          hasScannedRef.current = true;
          scanner.stop().catch(() => {});
          handleScan(decodedText);
        },
        () => {}
      )
      .catch((err) => {
        console.error('Camera error:', err);
        toast.error('Camera access denied. Please allow camera permissions.');
        setPhase('error');
        setResult({ message: 'Camera permission was denied. Please allow camera access and try again.' });
      });

    return () => {
      scanner.stop().catch(() => {});
    };
  }, [phase]);

  const handleScan = async (qrData) => {
    setPhase('loading');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/reservations/qr-scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ qrData }),
      });

      const data = await response.json();

      if (data.success) {
        setResult(data);
        setPhase('result');
        toast.success(data.action === 'checkin' ? '✅ Checked in!' : '✅ Checked out!');
      } else {
        setResult({ message: data.message || 'QR scan failed' });
        setPhase('error');
        toast.error(data.message || 'QR scan failed');
      }
    } catch (err) {
      console.error('QR scan error:', err);
      setResult({ message: 'Server error. Please try again.' });
      setPhase('error');
      toast.error('Server error. Please try again.');
    }
  };

  const reset = () => setPhase('scanning');

  const renderScanning = () => (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="relative group max-w-sm mx-auto">
        <div className="absolute -inset-1 bg-gradient-to-r from-cyan-400 to-blue-600 rounded-[2.5rem] blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
        <div className="relative bg-black rounded-[2.5rem] overflow-hidden border border-white/10 aspect-square shadow-2xl">
           <div id="user-qr-reader" className="w-full h-full" />
           
           {/* Overlay focus frame */}
           <div className="absolute inset-0 pointer-events-none border-[40px] border-black/40">
              <div className="w-full h-full border-2 border-cyan-400/50 rounded-2xl relative">
                 <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-cyan-400 rounded-tl-lg" />
                 <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-cyan-400 rounded-tr-lg" />
                 <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-cyan-400 rounded-bl-lg" />
                 <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-cyan-400 rounded-br-lg" />
                 
                 {/* Scanning line animation */}
                 <div className="absolute left-0 right-0 h-1 bg-cyan-400/50 shadow-[0_0_15px_#00f2ff] animate-scan-line top-1/2" />
              </div>
           </div>
        </div>
      </div>
      
      <div className="text-center space-y-2">
         <div className="flex items-center justify-center gap-2 text-cyan-400">
            <QrCode size={18} />
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Temporal Token Scanner</span>
         </div>
         <p className="text-slate-500 text-sm font-medium">Align verification code within the digital frame.</p>
      </div>
    </div>
  );

  const renderLoading = () => (
    <div className="py-24 flex flex-col items-center justify-center gap-6 animate-pulse">
      <div className="w-20 h-20 rounded-full border-4 border-white/5 border-t-cyan-400 animate-spin" />
      <div className="text-center space-y-2">
         <h3 className="text-xl font-black font-display tracking-tight text-white uppercase">Validating Hash</h3>
         <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Synchronizing with grid master...</p>
      </div>
    </div>
  );

  const renderCheckinResult = (data) => (
    <div className="max-w-md mx-auto p-10 rounded-[3rem] bg-white/[0.01] border border-white/[0.08] backdrop-blur-2xl shadow-2xl space-y-10 animate-in zoom-in-95 duration-500 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl" />
      
      <div className="text-center space-y-3">
        <div className="w-20 h-20 rounded-[2rem] bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-6 text-emerald-500 shadow-[0_0_40px_rgba(16,185,129,0.1)]">
          <ShieldCheck size={40} />
        </div>
        <h2 className="text-3xl font-black font-display tracking-tight text-white">ACCESS GRANTED</h2>
        <p className="text-slate-500 text-sm font-medium">Temporal allocation activated for node #{data.spotNumber}</p>
      </div>

      <div className="grid gap-4 py-8 border-y border-white/5">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">Location</span>
          <span className="text-sm font-bold text-white">{data.location || '—'}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">Epoch Time</span>
          <span className="text-sm font-bold text-cyan-400">{new Date(data.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">Allocation Window</span>
          <span className="text-sm font-bold text-white">{data.bookedDuration} Minutes</span>
        </div>
        <div className="flex items-center justify-between pt-4 border-t border-white/5">
          <span className="text-[9px] font-black uppercase tracking-widest text-red-400">Protocol Deadline</span>
          <span className="text-sm font-bold text-red-400">{new Date(data.estimatedCheckOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-cyan-400/5 border border-cyan-400/10 text-[10px] text-center font-black uppercase tracking-[0.2em] text-cyan-400 animate-pulse">
         Scan again at exit sector to terminate allocation.
      </div>

      <button className="w-full h-14 rounded-2xl bg-white text-black font-display font-black text-xs uppercase tracking-widest hover:bg-cyan-400 transition-all shadow-xl" onClick={() => navigate('/reservations')}>
        Open Active Permit
      </button>
    </div>
  );

  const renderCheckoutResult = (data) => (
    <div className="max-w-md mx-auto p-10 rounded-[3rem] bg-white/[0.01] border border-white/[0.08] backdrop-blur-2xl shadow-2xl space-y-8 animate-in zoom-in-95 duration-500 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-400/5 rounded-full blur-3xl" />
      
      <div className="text-center space-y-3">
        <div className="w-20 h-20 rounded-[2rem] bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center mx-auto mb-6 text-cyan-400 shadow-[0_0_40px_rgba(0,242,255,0.1)]">
          <CheckCircle size={40} />
        </div>
        <h2 className="text-3xl font-black font-display tracking-tight text-white uppercase">Hash Settled</h2>
        <p className="text-slate-500 text-sm font-medium">Parking session terminated successfully.</p>
      </div>

      <div className="space-y-4 p-8 rounded-[2rem] bg-white/[0.02] border border-white/[0.06]">
        <div className="flex justify-between items-center text-xs font-bold text-slate-400">
          <span className="uppercase tracking-widest text-[9px]">Total Duration</span>
          <span>{data.parkedMinutes}m / {data.bookedMinutes}m</span>
        </div>
        
        {data.overstayMinutes > 0 && (
          <div className="flex justify-between items-center text-xs font-black text-red-400">
             <span className="uppercase tracking-widest text-[9px]">Delta Overstay</span>
             <span>+{data.overstayMinutes}m</span>
          </div>
        )}

        <div className="pt-4 border-t border-white/5 flex justify-between items-center">
           <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Settlement Total</span>
           <span className="text-2xl font-display font-black text-white font-variant-numeric:tabular-nums">Rs. {data.finalTotal}</span>
        </div>
      </div>

      {data.overstayCharge > 0 && (
        <div className="p-5 rounded-2xl bg-red-500/5 border border-red-500/20 flex gap-4 items-start">
          <AlertTriangle className="text-red-500 shrink-0" size={18} />
          <p className="text-[10px] font-bold text-red-400/80 leading-relaxed uppercase tracking-wider">
             Delta charge of <span className="text-white">Rs. {data.overstayCharge}</span> identified. Clear balance before next allocation.
          </p>
        </div>
      )}

      <div className="grid gap-3 pt-4">
        <button className="h-14 rounded-2xl bg-white text-black font-display font-black text-xs uppercase tracking-widest hover:bg-cyan-400 transition-all" onClick={() => navigate('/')}>
          Return to Dashboard
        </button>
        <button className="h-14 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-slate-500 font-display font-black text-xs uppercase tracking-widest hover:text-white transition-all" onClick={() => navigate('/reservations')}>
          View Allocation Logs
        </button>
      </div>
    </div>
  );

  const renderError = () => (
    <div className="max-w-md mx-auto p-10 rounded-[3rem] bg-white/[0.01] border border-white/[0.08] shadow-2xl text-center space-y-8 animate-in zoom-in-95 duration-500">
      <div className="w-20 h-20 rounded-[2rem] bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-red-500 animate-shake">
        <XCircle size={40} />
      </div>
      <div className="space-y-2">
         <h2 className="text-2xl font-black font-display tracking-tight text-white uppercase">Validation Failure</h2>
         <p className="text-slate-500 text-sm font-medium">{result?.message || 'Hash integrity could not be verified'}</p>
      </div>
      <div className="grid gap-3 pt-4">
        <button className="h-14 rounded-2xl bg-white text-black font-display font-black text-xs uppercase tracking-widest hover:bg-cyan-400 transition-all" onClick={reset}>
          Retry Link
        </button>
        <button className="h-14 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-slate-500 font-display font-black text-xs uppercase tracking-widest hover:text-white transition-all" onClick={() => navigate('/reservations')}>
          Manual Management
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white pt-32 pb-24 px-6 md:px-10 max-w-7xl mx-auto font-sans relative">
      
      <div className="fixed top-0 right-0 w-[400px] h-[400px] bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none -z-10" />

      {/* Page Header */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-10 border-b border-white/[0.06] mb-12">
        <div className="space-y-2">
           <div className="flex items-center gap-2 text-cyan-400 mb-1">
              <ShieldCheck size={14} className="fill-current" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Gate Access Link</span>
           </div>
           <h1 className="text-5xl md:text-6xl font-black font-display tracking-tight uppercase">Verify Token</h1>
           <p className="text-slate-500 font-medium italic leading-relaxed">
             Executing protocol verification for arrival/exit sequence.
           </p>
        </div>
        <button 
           onClick={() => navigate(-1)}
           className="h-12 px-6 rounded-xl bg-white/[0.03] border border-white/[0.08] text-slate-400 text-[10px] font-black uppercase tracking-widest hover:text-white transition-all flex items-center gap-2"
        >
           <ArrowLeft size={14} /> Abort Validation
        </button>
      </section>

      {/* Status Badges */}
      <div className="flex justify-center gap-4 mb-16 overflow-x-auto no-scrollbar py-2">
         <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/[0.02] border border-white/[0.05] whitespace-nowrap">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Step 1: Check In</span>
         </div>
         <ArrowRight className="text-slate-800 shrink-0 self-center" size={16} />
         <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/[0.02] border border-white/[0.05] whitespace-nowrap">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#00f2ff]" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Step 2: Check Out</span>
         </div>
      </div>

      <div className="max-w-4xl mx-auto">
        {phase === 'scanning' && renderScanning()}
        {phase === 'loading'  && renderLoading()}
        {phase === 'result'   && result?.action === 'checkin'  && renderCheckinResult(result.data)}
        {phase === 'result'   && result?.action === 'checkout' && renderCheckoutResult(result.data)}
        {phase === 'error'    && renderError()}
      </div>

      <style>{`
        @keyframes scan-line {
          0%, 100% { top: 0%; opacity: 0; }
          5%, 95% { opacity: 1; }
          50% { top: 100%; }
        }
        .animate-scan-line {
          animation: scan-line 3s linear infinite;
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default UserQRScannerPage;
