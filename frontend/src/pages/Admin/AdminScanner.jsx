import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import {
  QrCode,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Info,
  ArrowLeft,
  User,
  MapPin,
  Clock,
  CreditCard,
  LogIn,
  LogOut,
  Upload,
} from 'lucide-react';
import { API_BASE, handleAuthExpiry } from '../../config/api';

const AdminScanner = () => {
  const navigate = useNavigate();
  const [scanning, setScanning] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [bookingData, setBookingData] = useState(null);
  const [scanAction, setScanAction] = useState(null); // 'checkin' | 'checkout'
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const scannerRef = useRef(null);
  // scanningRef: ref-based guard so the success callback can't fire twice before
  // the scanner is paused (avoids double-processing on very fast scanners).
  const scanningRef = useRef(true);
  // Bug 3 fix: keep the raw scanned text so the action POST can send the
  // signed token verbatim to the backend for HMAC verification.
  const scannedTextRef = useRef(null);

  const onScanSuccess = useCallback(async (decodedText) => {
    if (!scanningRef.current) return;
    scanningRef.current = false; // prevent re-entry before scanner.pause() fully takes effect
    setScanning(false);
    setProcessing(true);
    setError('');
    setResult(null);
    setBookingData(null);
    setScanAction(null);

    try {
      // Send raw QR payload to the backend for HMAC verification + reservation lookup.
      // This avoids fragile client-side base64url decoding (atob + JSON.parse) and
      // validates the signature before any action is taken. Both signed tokens and
      // legacy plain-JSON QRs are handled by verifyQrPayload on the server.
      scannedTextRef.current = decodedText;

      const token = localStorage.getItem('token');

      const lookupRes = await fetch(`${API_BASE}/reservations/qr-lookup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ qrData: decodedText }),
      });
      if (lookupRes.status === 401) { handleAuthExpiry(); return; }
      const lookupData = await lookupRes.json();

      if (!lookupData.success) throw new Error(lookupData.message || 'Invalid QR code.');

      const booking = lookupData.data;
      setBookingData(booking);

      // BUG-M4: pending = unpaid; block check-in until payment is confirmed.
      // BUG-C6: check-in must strictly route to the admin-secured /checkin path.
      if (booking.status === 'pending') {
        throw new Error('Payment not completed — check-in blocked.');
      } else if (booking.status === 'reserved') {
        setScanAction('checkin');
      } else if (booking.status === 'checked-in' || booking.status === 'overstay') {
        setScanAction('checkout');
      } else {
        throw new Error(`Cannot process — booking status is "${booking.status}".`);
      }
    } catch (err) {
      setError(err.message || 'Failed to read QR code.');
      setTimeout(() => {
        setError('');
        setBookingData(null);
        // Resume detection on the live camera stream — no cold-start.
        if (scannerRef.current) {
          try { scannerRef.current.resume(); } catch (_) {}
        }
        scanningRef.current = true;
        setScanning(true);
      }, 4000);
    } finally {
      setProcessing(false);
    }
  }, []);

  // Performance fix: create the camera stream ONCE on mount and keep it alive.
  // Previously stop() + start() on every scan caused a 1-3s camera cold-start on
  // mobile. Now we use pause() (keeps video streaming) and resume() (restarts
  // detection) — switching between scans is nearly instant.
  useEffect(() => {
    let isMounted = true;

    const container = document.getElementById('qr-reader');
    if (container) container.innerHTML = ''; // Clear stale DOM nodes from HMR or previous mounts

    // Short delay: lets React finish painting the container before the library measures it.
    const timer = setTimeout(() => {
      if (!isMounted) return;
      try {
        const scanner = new Html5Qrcode('qr-reader');
        scannerRef.current = scanner;
        scanner.start(
          { facingMode: 'environment' },
          {
            fps: 30,  // was 24 — higher rate improves detection latency
            qrbox: { width: 280, height: 280 },
            experimentalFeatures: { useBarCodeDetectorIfSupported: true },
          },
          (text) => {
            if (!isMounted || !scanningRef.current) return;
            // Pause detection without stopping the video feed.
            // resume() will restart detection in < 50 ms — no cold-start.
            // NOTE: scanningRef.current is set to false inside onScanSuccess
            // (after its own guard check) to prevent double-processing.
            try { scanner.pause(); } catch (_) {}
            setScanning(false);
            onScanSuccess(text);
          },
          () => {} // frame-level decode errors are expected and can be ignored
        ).catch((err) => {
          if (isMounted) console.error('Camera start error:', err);
        });
      } catch (err) {
        console.error('QR Scanner init error:', err);
      }
    }, 150);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      const s = scannerRef.current;
      if (s) {
        s.stop().catch(() => {});
        scannerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount — camera stays alive for the component's lifetime

  const handleAction = async (actionType) => {
    if (!bookingData) return;
    setProcessing(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      // BUG-C6: explicitly name the admin-secured path for check-in.
      const endpoint = actionType === 'checkin' ? 'checkin' : 'admin-checkout';
      const response = await fetch(`${API_BASE}/reservations/${bookingData._id}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          // Send the raw scanned payload so the backend can verify the HMAC
          // on signed tokens. Legacy JSON QRs still pass through unchanged.
          qrData: scannedTextRef.current || JSON.stringify({ reservationId: bookingData._id }),
        }),
      });
      if (response.status === 401) { handleAuthExpiry(); return; }
      const resultData = await response.json();

      if (resultData.success) {
        setResult({ ...resultData, actionType });
        setTimeout(() => {
          resetScanner();
        }, 8000);
      } else {
        setError(resultData.message || 'Action failed.');
        setTimeout(() => {
          setError('');
        }, 4000);
      }
    } catch (err) {
      setError(err.message || 'Network error.');
    } finally {
      setProcessing(false);
    }
  };

  const resetScanner = () => {
    setResult(null);
    setBookingData(null);
    setScanAction(null);
    setError('');
    scannedTextRef.current = null;
    // Resume detection on the live camera stream — nearly instant, no cold-start.
    if (scannerRef.current) {
      try { scannerRef.current.resume(); } catch (_) {}
    }
    scanningRef.current = true;
    setScanning(true);
  };

  const fileInputRef = React.useRef(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setError('');
    setProcessing(true);
    try {
      // Use a separate Html5Qrcode instance for file scanning (no DOM element needed)
      const { Html5Qrcode: H5Q } = await import('html5-qrcode');
      const tempId = 'qr-file-scanner-admin';
      let el = document.getElementById(tempId);
      if (!el) { el = document.createElement('div'); el.id = tempId; el.style.display = 'none'; document.body.appendChild(el); }
      const fileScanner = new H5Q(tempId);
      const decoded = await fileScanner.scanFile(file, false);
      await fileScanner.clear();
      // Pause the live camera so it doesn't double-fire
      if (scannerRef.current) { try { scannerRef.current.pause(); } catch (_) {} }
      scanningRef.current = false;
      setScanning(false);
      await onScanSuccess(decoded);
    } catch (err) {
      setError('Could not read a QR code from this image. Try a clearer photo.');
      setTimeout(() => setError(''), 4000);
    } finally {
      setProcessing(false);
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 max-w-5xl mx-auto pb-10">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/admin')}
          className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">QR Scanner</h1>
          <p className="text-slate-400 text-sm font-medium">
            Scan booking QR codes for check-in or check-out
          </p>
        </div>
      </div>

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Camera Feed */}
        <div className="space-y-3">
        <div className="relative rounded-2xl overflow-hidden bg-black border border-white/10 shadow-2xl aspect-square">
          <div id="qr-reader" className="w-full h-full object-cover" />
          
          {/* Custom Overlay Focus Frame */}
          {scanning && !processing && (
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
          )}

          {(!scanning || processing) && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-50">
              {processing ? (
                <>
                  <Loader2 className="animate-spin text-cyan-400" size={40} />
                  <span className="text-xs font-semibold text-slate-400">Processing...</span>
                </>
              ) : (
                <>
                  <QrCode className="text-slate-600" size={40} />
                  <span className="text-xs font-semibold text-slate-500">Scanner paused</span>
                  {!bookingData && !result && (
                    <button
                      onClick={resetScanner}
                      className="mt-2 px-4 py-2 rounded-lg bg-cyan-500 text-white text-xs font-bold hover:bg-cyan-400 transition-colors"
                    >
                      Resume Scanner
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
        {/* Upload QR image button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={processing}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-slate-400 text-xs font-bold hover:text-white hover:bg-white/[0.08] hover:border-cyan-500/30 transition-all disabled:opacity-40"
        >
          <Upload size={13} /> Upload QR Image
        </button>
        </div>

        {/* Result Panel */}
        <div className="space-y-5">
          {/* Error state */}
          {error && (
            <div className="rounded-2xl bg-red-500/[0.06] border border-red-500/20 p-6 animate-in slide-in-from-right-4 duration-300">
              <div className="flex items-start gap-3 text-red-400">
                <AlertCircle size={22} className="shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm">Scan Error</h4>
                  <p className="text-xs mt-1 opacity-80 leading-relaxed">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Success state */}
          {result && (
            <div className="rounded-2xl bg-emerald-500/[0.06] border border-emerald-500/20 p-8 animate-in slide-in-from-right-4 duration-500 space-y-6">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400 shadow-lg shadow-emerald-500/10">
                  <CheckCircle2 size={32} />
                </div>
                <h3 className="text-xl font-extrabold text-white">
                  {result.actionType === 'checkin' ? 'Check-in Confirmed!' : 'Check-out Complete!'}
                </h3>
                <p className="text-xs text-slate-400">Operation processed successfully</p>
              </div>

              {result.actionType === 'checkout' && result.data && (
                <div className="space-y-3 pt-4 border-t border-white/5">
                  {[
                    { label: 'Booked Duration', val: `${result.data.bookedDuration || 0} min` },
                    { label: 'Actual Duration', val: `${result.data.actualDuration || 0} min` },
                    ...(result.data.overtime > 0
                      ? [{ label: 'Overtime', val: `+${result.data.overtime} min`, color: 'text-red-400' }]
                      : []),
                    {
                      label: 'Final Amount',
                      val: `Rs. ${result.data.finalAmount || 0}`,
                      color: 'text-white text-lg font-extrabold',
                    },
                  ].map((item) => (
                    <div key={item.label} className="flex justify-between items-center">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        {item.label}
                      </span>
                      <span className={`text-sm font-bold ${item.color || 'text-slate-300'}`}>{item.val}</span>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={resetScanner}
                className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-sm font-bold text-white hover:bg-white/10 transition-all"
              >
                Scan Next
              </button>
            </div>
          )}

          {/* Booking details after scan (before confirm) */}
          {bookingData && !result && !error && (
            <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] p-6 animate-in slide-in-from-right-4 duration-400 space-y-5">
              <div className="flex items-center gap-2 mb-1">
                <QrCode size={16} className="text-cyan-400" />
                <h3 className="text-lg font-bold text-white">Booking Details</h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <User size={12} />
                    <span className="text-[10px] font-semibold uppercase tracking-wide">User</span>
                  </div>
                  <p className="text-sm font-bold text-white">{bookingData.user?.name || 'Unknown'}</p>
                  <p className="text-[11px] text-slate-500">{bookingData.user?.email || ''}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <MapPin size={12} />
                    <span className="text-[10px] font-semibold uppercase tracking-wide">Spot</span>
                  </div>
                  <p className="text-sm font-bold text-white">
                    #{bookingData.parkingSpot?.spotNumber || 'N/A'}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {bookingData.parkingSpot?.locationName || ''}
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <Clock size={12} />
                    <span className="text-[10px] font-semibold uppercase tracking-wide">Booked At</span>
                  </div>
                  <p className="text-sm font-bold text-white">
                    {formatDateTime(bookingData.reservationTime || bookingData.createdAt)}
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <CreditCard size={12} />
                    <span className="text-[10px] font-semibold uppercase tracking-wide">Amount</span>
                  </div>
                  <p className="text-sm font-bold text-white">
                    Rs. {bookingData.totalAmount || bookingData.amountInfo?.totalAmount || 0}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 py-3 px-4 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                <span className="text-xs font-semibold text-slate-400">Current Status:</span>
                <span className="text-xs font-bold text-cyan-400 uppercase">{bookingData.status}</span>
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                {scanAction === 'checkin' ? (
                  <button
                    onClick={() => handleAction('checkin')}
                    disabled={processing}
                    className="col-span-2 flex items-center justify-center gap-2 py-4 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/20 transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    {processing ? (
                      <Loader2 className="animate-spin" size={18} />
                    ) : (
                      <LogIn size={18} />
                    )}
                    Confirm Check-in
                  </button>
                ) : scanAction === 'checkout' ? (
                  <button
                    onClick={() => handleAction('checkout')}
                    disabled={processing}
                    className="col-span-2 flex items-center justify-center gap-2 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-blue-600/20 transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    {processing ? (
                      <Loader2 className="animate-spin" size={18} />
                    ) : (
                      <LogOut size={18} />
                    )}
                    Confirm Check-out
                  </button>
                ) : null}
                <button
                  onClick={resetScanner}
                  className="col-span-2 py-3 rounded-xl bg-white/5 border border-white/10 text-sm font-bold text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                >
                  Cancel & Rescan
                </button>
              </div>
            </div>
          )}

          {/* Idle state */}
          {!error && !result && !bookingData && (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.01] p-12 flex flex-col items-center justify-center text-center space-y-4 min-h-[300px]">
              <div className="w-16 h-16 rounded-2xl bg-white/[0.03] flex items-center justify-center">
                <Info size={28} className="text-slate-700" />
              </div>
              <p className="text-sm font-semibold text-slate-600">Waiting for QR code scan...</p>
              <p className="text-xs text-slate-700 max-w-xs">
                Point the camera at a booking QR code. The system will auto-detect whether to check-in or check-out.
              </p>
            </div>
          )}
        </div>
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

export default AdminScanner;
