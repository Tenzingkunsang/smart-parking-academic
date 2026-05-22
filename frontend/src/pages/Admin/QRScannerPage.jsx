import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { QrCode, ShieldCheck, AlertCircle, CheckCircle2, ArrowLeft, Zap, Loader2, Info } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { API_BASE } from '../../config/api';

const QRScannerPage = () => {
  const [scanning, setScanning] = useState(true);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [action, setAction] = useState('checkin');
  const scannerRef = useRef(null);
  const navigate = useNavigate();
  const scanningRef = useRef(scanning);
  const actionRef = useRef(action);

  useEffect(() => { scanningRef.current = scanning; }, [scanning]);
  useEffect(() => { actionRef.current = action; }, [action]);

  useEffect(() => {
    if (scannerRef.current === null) {
      const scanner = new Html5QrcodeScanner("qr-reader", { qrbox: { width: 280, height: 280 }, fps: 10 }, false);
      scannerRef.current = scanner;
      scanner.render(onScanSuccess, (err) => {});
    }
    return () => { if (scannerRef.current) scannerRef.current.clear(); };
  }, []);

  const onScanSuccess = useCallback(async (decodedText) => {
    if (!scanningRef.current) return;
    setScanning(false);
    try {
      const token = localStorage.getItem('token');
      const endpoint = actionRef.current === 'checkin' ? '/checkin' : '/checkout';
      const response = await fetch(`${API_BASE}/reservations${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ qrData: decodedText })
      });
      const resultData = await response.json();
      if (resultData.success) {
        setResult(resultData);
        setTimeout(() => { setResult(null); setScanning(true); }, 8000);
      } else {
        setError(resultData.message);
        setTimeout(() => { setError(''); setScanning(true); }, 4000);
      }
    } catch {
      setError('Hash Integrity Violation: Invalid Token');
      setTimeout(() => { setError(''); setScanning(true); }, 2000);
    }
  }, []);

  return (
    <div className="space-y-12 animate-in fade-in duration-700 max-w-4xl mx-auto">
      
      <section className="text-center space-y-4">
         <div className="flex items-center justify-center gap-2 text-cyan-400">
            <QrCode size={18} />
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Grid Validator</span>
         </div>
         <h1 className="text-5xl font-black font-display text-white uppercase tracking-tight italic">Protocol Scanner</h1>
         <p className="text-slate-500 font-medium">Executing temporal allocation verification for grid arrival and departure.</p>
      </section>

      <div className="flex justify-center gap-4">
         {[
           { id: 'checkin', label: 'Check-In Protocol', icon: ShieldCheck },
           { id: 'checkout', label: 'Exit Protocol', icon: Zap }
         ].map(a => (
           <button
             key={a.id}
             onClick={() => setAction(a.id)}
             className={`flex-1 h-16 rounded-2xl border flex items-center justify-center gap-3 transition-all duration-300 font-black text-xs uppercase tracking-widest ${
               action === a.id ? 'bg-cyan-400 text-black border-cyan-400 shadow-xl shadow-cyan-400/20' : 'bg-white/5 border-white/10 text-slate-500 hover:text-white'
             }`}
           >
              <a.icon size={18} /> {a.label}
           </button>
         ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
         <Card className="!p-0 overflow-hidden border-white/10 bg-black relative">
            <div id="qr-reader" className="w-full" />
            {!scanning && (
               <div className="absolute inset-0 bg-[#050505]/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4 z-50">
                  <Loader2 className="animate-spin text-cyan-400" size={40} />
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Processing Hash...</span>
               </div>
            )}
         </Card>

         <div className="space-y-6">
            {error && (
              <Card className="border-red-500/20 bg-red-500/[0.02] !p-8 animate-in slide-in-from-right-4 duration-300">
                 <div className="flex items-start gap-4 text-red-500">
                    <AlertCircle size={24} className="shrink-0" />
                    <div className="space-y-1">
                       <h4 className="font-black font-display uppercase text-sm tracking-tight">Access Denied</h4>
                       <p className="text-xs font-medium opacity-80 leading-relaxed">{error}</p>
                    </div>
                 </div>
              </Card>
            )}

            {result && (
              <Card className="border-emerald-500/20 bg-emerald-500/[0.02] !p-10 animate-in slide-in-from-right-4 duration-500 space-y-8">
                 <div className="text-center space-y-2">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4 text-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
                       <CheckCircle2 size={32} />
                    </div>
                    <h3 className="text-2xl font-black font-display text-white uppercase italic">{action === 'checkin' ? 'Link Activated' : 'Hash Settled'}</h3>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Protocol sequence successful</p>
                 </div>

                 {action === 'checkout' && result.data && (
                    <div className="space-y-4 pt-6 border-t border-white/5">
                       {[
                         { label: 'Temporal Link', val: `${result.data.bookedDuration}m` },
                         { label: 'Grid Usage', val: `${result.data.actualDuration}m` },
                         { label: 'Delta Variance', val: `+${result.data.overtime}m`, color: 'text-red-400' },
                         { label: 'Final Settlement', val: `Rs.${result.data.finalAmount}`, color: 'text-white font-black font-display text-lg' }
                       ].map(d => (
                         <div key={d.label} className="flex justify-between items-center">
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">{d.label}</span>
                            <span className={`text-xs font-bold ${d.color || 'text-slate-300'}`}>{d.val}</span>
                         </div>
                       ))}
                    </div>
                 )}
              </Card>
            )}

            {!error && !result && (
              <Card className="!p-8 border-dashed flex flex-col items-center justify-center text-center space-y-6 h-full min-h-[300px] opacity-40">
                 <Info size={32} className="text-slate-800" />
                 <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-700">Awaiting temporal token input</p>
              </Card>
            )}
         </div>
      </div>
    </div>
  );
};

export default QRScannerPage;
