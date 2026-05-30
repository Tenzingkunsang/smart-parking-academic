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
  Keyboard,
  Camera,
} from 'lucide-react';
import { API_BASE, handleAuthExpiry } from '../../config/api';

const AUTO_CONFIRM_SECONDS = 3;

const AdminScanner = () => {
  const navigate = useNavigate();
  const [inputMode, setInputMode] = useState('camera'); // 'camera' | 'manual'
  const [manualInput, setManualInput] = useState('');
  const [scanning, setScanning] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [bookingData, setBookingData] = useState(null);
  const [scanAction, setScanAction] = useState(null); // 'checkin' | 'checkout'
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [autoConfirmSeconds, setAutoConfirmSeconds] = useState(null);

  const scannerRef = useRef(null);
  const scanningRef = useRef(true);
  const scannedTextRef = useRef(null);
  const autoConfirmTimerRef = useRef(null);

  const cancelAutoConfirm = useCallback(() => {
    if (autoConfirmTimerRef.current) {
      clearInterval(autoConfirmTimerRef.current);
      autoConfirmTimerRef.current = null;
    }
    setAutoConfirmSeconds(null);
  }, []);

  const handleAction = useCallback(async (actionType) => {
    if (!bookingData) return;
    cancelAutoConfirm();
    setProcessing(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const endpoint = actionType === 'checkin' ? 'checkin' : 'admin-checkout';
      const response = await fetch(`${API_BASE}/reservations/${bookingData._id}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          qrData: scannedTextRef.current || JSON.stringify({ reservationId: bookingData._id }),
        }),
      });
      if (response.status === 401) { handleAuthExpiry(); return; }
      const resultData = await response.json();

      if (resultData.success) {
        if (navigator.vibrate) navigator.vibrate([80, 40, 80]);
        setResult({ ...resultData, actionType });
        setTimeout(() => resetScanner(), 8000);
      } else {
        setError(resultData.message || 'Action failed.');
        setTimeout(() => setError(''), 4000);
      }
    } catch (err) {
      setError(err.message || 'Network error.');
    } finally {
      setProcessing(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingData, cancelAutoConfirm]);

  const onScanSuccess = useCallback(async (decodedText) => {
    if (!scanningRef.current) return;
    scanningRef.current = false;
    setScanning(false);
    setProcessing(true);
    setError('');
    setResult(null);
    setBookingData(null);
    setScanAction(null);
    setAutoConfirmSeconds(null);

    try {
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
      if (navigator.vibrate) navigator.vibrate(80);
      setBookingData(booking);

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

  // Auto-confirm: start countdown when scanAction is determined.
  // Fires the action after AUTO_CONFIRM_SECONDS unless admin cancels.
  useEffect(() => {
    if (!scanAction || !bookingData) return;
    let secs = AUTO_CONFIRM_SECONDS;
    setAutoConfirmSeconds(secs);
    autoConfirmTimerRef.current = setInterval(() => {
      secs -= 1;
      if (secs <= 0) {
        clearInterval(autoConfirmTimerRef.current);
        autoConfirmTimerRef.current = null;
        setAutoConfirmSeconds(null);
        handleAction(scanAction);
      } else {
        setAutoConfirmSeconds(secs);
      }
    }, 1000);
    return () => {
      clearInterval(autoConfirmTimerRef.current);
      autoConfirmTimerRef.current = null;
    };
  // handleAction is stable (useCallback with bookingData dep). scanAction doesn't
  // change until resetScanner. Safe to omit handleAction from deps here.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanAction]);

  useEffect(() => {
    let isMounted = true;

    const container = document.getElementById('qr-reader');
    if (container) container.innerHTML = '';

    const timer = setTimeout(() => {
      if (!isMounted) return;
      try {
        const scanner = new Html5Qrcode('qr-reader');
        scannerRef.current = scanner;
        scanner.start(
          { facingMode: 'environment' },
          {
            fps: 30,
            qrbox: { width: 280, height: 280 },
            experimentalFeatures: { useBarCodeDetectorIfSupported: true },
          },
          (text) => {
            if (!isMounted || !scanningRef.current) return;
            try { scanner.pause(); } catch (_) {}
            setScanning(false);
            onScanSuccess(text);
          },
          () => {}
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
  }, []);

  const resetScanner = useCallback(() => {
    cancelAutoConfirm();
    setResult(null);
    setBookingData(null);
    setScanAction(null);
    setError('');
    scannedTextRef.current = null;
    if (scannerRef.current) {
      try { scannerRef.current.resume(); } catch (_) {}
    }
    scanningRef.current = true;
    setScanning(true);
  }, [cancelAutoConfirm]);

  const fileInputRef = React.useRef(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setError('');
    setProcessing(true);
    try {
      let decoded = null;

      // Primary: native BarcodeDetector API (Chrome 83+, Edge 83+) — fast & reliable
      if ('BarcodeDetector' in window) {
        try {
          const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
          const bitmap = await createImageBitmap(file);
          const barcodes = await detector.detect(bitmap);
          if (barcodes.length > 0) decoded = barcodes[0].rawValue;
        } catch (_) {}
      }

      // Fallback: html5-qrcode scanFile
      if (!decoded) {
        const tempId = 'qr-file-scanner-admin';
        let el = document.getElementById(tempId);
        if (!el) {
          el = document.createElement('div');
          el.id = tempId;
          // Must be in DOM but not `display:none` — use off-screen position
          el.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:300px;height:300px;';
          document.body.appendChild(el);
        }
        const fileScanner = new Html5Qrcode(tempId);
        try {
          decoded = await fileScanner.scanFile(file, false);
        } finally {
          await fileScanner.clear().catch(() => {});
        }
      }

      if (decoded) {
        if (scannerRef.current) { try { scannerRef.current.pause(); } catch (_) {} }
        scanningRef.current = false;
        setScanning(false);
        await onScanSuccess(decoded);
      }
    } catch (err) {
      setError('Could not read QR code. Try a clearer photo or use Manual Entry tab.');
      setTimeout(() => setError(''), 5000);
    } finally {
      setProcessing(false);
    }
  };

  const handleManualSubmit = async () => {
    const text = manualInput.trim();
    if (!text) return;
    if (scannerRef.current) { try { scannerRef.current.pause(); } catch (_) {} }
    scanningRef.current = false;
    setScanning(false);
    setManualInput('');
    await onScanSuccess(text);
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  const progressPct = autoConfirmSeconds !== null
    ? Math.round((autoConfirmSeconds / AUTO_CONFIRM_SECONDS) * 100)
    : 0;

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

      {/* Mode tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setInputMode('camera')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${inputMode === 'camera' ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-400' : 'bg-white/5 border border-white/10 text-slate-400 hover:text-white'}`}
        >
          <Camera size={14} /> Camera / Upload
        </button>
        <button
          onClick={() => setInputMode('manual')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${inputMode === 'manual' ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-400' : 'bg-white/5 border border-white/10 text-slate-400 hover:text-white'}`}
        >
          <Keyboard size={14} /> Manual Entry
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Camera Feed / Manual Entry */}
        <div className="space-y-3">
          {inputMode === 'manual' ? (
            <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-6 space-y-4 min-h-[300px]">
              <h3 className="text-sm font-bold text-white">Paste QR Token or Reservation ID</h3>
              <p className="text-xs text-slate-500">Open the user's ticket page → copy the QR code text from the ticket, then paste it here.</p>
              <textarea
                value={manualInput}
                onChange={e => setManualInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleManualSubmit(); } }}
                placeholder="Paste QR token here..."
                rows={5}
                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 resize-none font-mono"
              />
              <button
                onClick={handleManualSubmit}
                disabled={!manualInput.trim() || processing}
                className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white text-sm font-bold transition-all flex items-center justify-center gap-2"
              >
                {processing ? <Loader2 className="animate-spin" size={16} /> : <QrCode size={16} />}
                Look Up Booking
              </button>
            </div>
          ) : (
          <>
          <div className="relative rounded-2xl overflow-hidden bg-black border border-white/10 shadow-2xl aspect-square">
            <div id="qr-reader" className="w-full h-full object-cover" />

            {/* Overlay focus frame */}
            {scanning && !processing && (
              <div className="absolute inset-0 pointer-events-none border-[40px] border-black/40">
                <div className="w-full h-full border-2 border-cyan-400/50 rounded-2xl relative">
                  <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-cyan-400 rounded-tl-lg" />
                  <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-cyan-400 rounded-tr-lg" />
                  <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-cyan-400 rounded-bl-lg" />
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-cyan-400 rounded-br-lg" />
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
          </> /* end camera mode */
          )}
        </div>

        {/* Result Panel */}
        <div className="space-y-5">
          {/* Error */}
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

          {/* Success */}
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

          {/* Booking details before confirm */}
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
                <span className="text-xs font-semibold text-slate-400">Status:</span>
                <span className="text-xs font-bold text-cyan-400 uppercase">{bookingData.status}</span>
              </div>

              {/* Action buttons */}
              <div className="space-y-3 pt-2">
                {(scanAction === 'checkin' || scanAction === 'checkout') && (
                  autoConfirmSeconds !== null ? (
                    <>
                      {/* Auto-confirm countdown button with draining progress bar */}
                      <div className={`relative overflow-hidden flex items-center justify-center gap-2.5 py-4 rounded-xl font-bold text-sm text-white ${
                        scanAction === 'checkin'
                          ? 'bg-emerald-600/30 border border-emerald-500/30'
                          : 'bg-blue-600/30 border border-blue-500/30'
                      }`}>
                        {scanAction === 'checkin' ? <LogIn size={18} /> : <LogOut size={18} />}
                        Auto {scanAction === 'checkin' ? 'check-in' : 'check-out'} in {autoConfirmSeconds}s
                        {/* Draining progress bar at the bottom */}
                        <div
                          className={`absolute bottom-0 left-0 h-[3px] transition-all duration-1000 ease-linear ${
                            scanAction === 'checkin' ? 'bg-emerald-400' : 'bg-blue-400'
                          }`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                      <button
                        onClick={cancelAutoConfirm}
                        className="w-full py-3 rounded-xl bg-white/5 border border-amber-500/20 text-sm font-bold text-amber-400 hover:bg-amber-500/10 hover:border-amber-400/30 transition-all"
                      >
                        Cancel Auto-Confirm
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleAction(scanAction)}
                      disabled={processing}
                      className={`w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-sm shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 ${
                        scanAction === 'checkin'
                          ? 'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white shadow-emerald-600/20'
                          : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-600/20'
                      }`}
                    >
                      {processing ? (
                        <Loader2 className="animate-spin" size={18} />
                      ) : scanAction === 'checkin' ? (
                        <LogIn size={18} />
                      ) : (
                        <LogOut size={18} />
                      )}
                      Confirm {scanAction === 'checkin' ? 'Check-in' : 'Check-out'}
                    </button>
                  )
                )}
                <button
                  onClick={resetScanner}
                  className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-sm font-bold text-slate-400 hover:text-white hover:bg-white/10 transition-all"
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
                Point the camera at a booking QR code. The system will auto check-in or check-out after {AUTO_CONFIRM_SECONDS} seconds.
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
          animation: scan-line 2s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default AdminScanner;
