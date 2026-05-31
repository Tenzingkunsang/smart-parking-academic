/**
 * BusinessScanner — QR scanner for business owners.
 * Uses /business/qr-lookup (ownership-gated) and
 * /business/reservations/:id/checkin|checkout routes.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import {
  QrCode, AlertCircle, CheckCircle2, Loader2, ArrowLeft,
  User, MapPin, Clock, CreditCard, LogIn, LogOut, Upload,
} from 'lucide-react';
import { API_BASE, handleAuthExpiry } from '../../config/api';

const AUTO_CONFIRM_SECONDS = 3;

const BusinessScanner = () => {
  const navigate = useNavigate();
  const [scanning, setScanning]             = useState(true);
  const [processing, setProcessing]         = useState(false);
  const [bookingData, setBookingData]       = useState(null);
  const [scanAction, setScanAction]         = useState(null);
  const [result, setResult]                 = useState(null);
  const [error, setError]                   = useState('');
  const [autoConfirmSeconds, setAutoConfirmSeconds] = useState(null);

  const scannerRef        = useRef(null);
  const scanningRef       = useRef(true);
  const scannedText       = useRef(null);
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
      const token    = localStorage.getItem('token');
      const endpoint = actionType === 'checkin' ? 'checkin' : 'checkout';
      const response = await fetch(`${API_BASE}/business/reservations/${bookingData._id}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ qrData: scannedText.current || JSON.stringify({ reservationId: bookingData._id }) }),
      });
      if (response.status === 401) { handleAuthExpiry(); return; }
      const data = await response.json();
      if (data.success) {
        if (navigator.vibrate) navigator.vibrate([80, 40, 80]);
        setResult({ ...data, actionType });
        setTimeout(() => resetScanner(), 8000);
      } else {
        setError(data.message || 'Action failed.');
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
      scannedText.current = decodedText;
      const token = localStorage.getItem('token');

      const lookupRes = await fetch(`${API_BASE}/business/qr-lookup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
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
        if (scannerRef.current) { try { scannerRef.current.resume(); } catch (_) {} }
        scanningRef.current = true;
        setScanning(true);
      }, 4000);
    } finally {
      setProcessing(false);
    }
  }, []);

  // Auto-confirm: countdown fires the action unless cancelled.
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanAction]);

  useEffect(() => {
    let isMounted = true;
    const container = document.getElementById('qr-reader-biz');
    if (container) container.innerHTML = '';

    const timer = setTimeout(() => {
      if (!isMounted) return;
      try {
        const scanner = new Html5Qrcode('qr-reader-biz');
        scannerRef.current = scanner;
        scanner.start(
          { facingMode: 'environment' },
          { fps: 30, qrbox: { width: 260, height: 260 }, experimentalFeatures: { useBarCodeDetectorIfSupported: true } },
          (text) => {
            if (!isMounted || !scanningRef.current) return;
            try { scanner.pause(); } catch (_) {}
            setScanning(false);
            onScanSuccess(text);
          },
          () => {}
        ).catch((err) => { if (isMounted) console.error('Camera start error:', err); });
      } catch (err) { console.error('QR Scanner init error:', err); }
    }, 150);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      const s = scannerRef.current;
      if (s) { s.stop().catch(() => {}); scannerRef.current = null; }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetScanner = useCallback(() => {
    cancelAutoConfirm();
    setResult(null);
    setBookingData(null);
    setScanAction(null);
    setError('');
    scannedText.current = null;
    if (scannerRef.current) { try { scannerRef.current.resume(); } catch (_) {} }
    scanningRef.current = true;
    setScanning(true);
  }, [cancelAutoConfirm]);

  const fileInputRef = useRef(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setError('');
    setProcessing(true);
    try {
      const { Html5Qrcode: H5Q } = await import('html5-qrcode');
      const tempId = 'qr-file-scanner-biz';
      let el = document.getElementById(tempId);
      if (!el) { el = document.createElement('div'); el.id = tempId; el.style.display = 'none'; document.body.appendChild(el); }
      const fileScanner = new H5Q(tempId);
      const decoded = await fileScanner.scanFile(file, false);
      await fileScanner.clear();
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

  const progressPct = autoConfirmSeconds !== null
    ? Math.round((autoConfirmSeconds / AUTO_CONFIRM_SECONDS) * 100)
    : 0;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/business')}
          className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-extrabold text-white">QR Scanner</h1>
          <p className="text-slate-500 text-sm">Scan customer QR codes — auto {AUTO_CONFIRM_SECONDS}s confirm</p>
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Camera */}
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
          <div className="p-5 border-b border-white/[0.06] flex items-center gap-3">
            <QrCode size={16} className="text-violet-400" />
            <span className="text-sm font-bold text-white">Camera</span>
            <div className={`ml-auto w-2 h-2 rounded-full ${scanning ? 'bg-violet-400 animate-pulse' : 'bg-slate-600'}`} />
          </div>
          <div className="p-5">
            {!result ? (
              <div id="qr-reader-biz" className="w-full rounded-xl overflow-hidden" style={{ minHeight: 260 }} />
            ) : (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
                  <CheckCircle2 size={32} className="text-emerald-400" />
                </div>
                <p className="text-white font-bold text-lg">
                  {result.actionType === 'checkin' ? 'Checked In!' : 'Checked Out!'}
                </p>
                <button onClick={resetScanner}
                  className="px-5 py-2.5 rounded-xl bg-violet-500/20 border border-violet-500/30 text-violet-400 text-sm font-bold hover:bg-violet-500/30 transition-all">
                  Scan Next
                </button>
              </div>
            )}

            {processing && (
              <div className="flex items-center justify-center gap-3 py-8">
                <Loader2 size={24} className="animate-spin text-violet-400" />
                <p className="text-slate-400 text-sm font-medium">Processing...</p>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 mt-4">
                <AlertCircle size={16} className="text-red-400 shrink-0" />
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={processing}
              className="w-full mt-4 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-slate-500 text-xs font-bold hover:text-white hover:border-violet-500/30 transition-all disabled:opacity-40"
            >
              <Upload size={12} /> Upload QR Image
            </button>
          </div>
        </div>

        {/* Booking info panel */}
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
          <div className="p-5 border-b border-white/[0.06]">
            <span className="text-sm font-bold text-white">Customer Info</span>
          </div>
          <div className="p-5">
            {!bookingData ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                <QrCode size={36} className="text-slate-700" />
                <p className="text-slate-600 text-sm">Scan a QR code to see customer info here.</p>
                <p className="text-slate-700 text-xs">Will auto-confirm in {AUTO_CONFIRM_SECONDS}s after scan.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <InfoGroup label="Customer" icon={User}>
                  <InfoRow k="Name"  v={bookingData.user?.name || '—'} />
                  <InfoRow k="Phone" v={bookingData.user?.phone || '—'} />
                  <InfoRow k="Plate" v={bookingData.vehiclePlate || '—'} />
                </InfoGroup>
                <InfoGroup label="Spot" icon={MapPin}>
                  <InfoRow k="Location" v={bookingData.parkingSpot?.locationName || '—'} />
                  <InfoRow k="Spot #"   v={`#${bookingData.parkingSpot?.spotNumber || '—'}`} />
                </InfoGroup>
                <InfoGroup label="Session" icon={Clock}>
                  <InfoRow k="Arrival"  v={bookingData.scheduledArrival ? new Date(bookingData.scheduledArrival).toLocaleString() : '—'} />
                  <InfoRow k="Duration" v={`${bookingData.duration} min`} />
                  {bookingData.checkInTime && (
                    <InfoRow k="Check-in" v={new Date(bookingData.checkInTime).toLocaleTimeString()} />
                  )}
                </InfoGroup>
                <InfoGroup label="Billing" icon={CreditCard}>
                  <InfoRow k="Amount" v={`NPR ${bookingData.amountInfo?.totalAmount || 0}`} />
                  <InfoRow k="Method" v={bookingData.paymentMethod} />
                </InfoGroup>

                {/* Action area */}
                {!result && !processing && (scanAction === 'checkin' || scanAction === 'checkout') && (
                  <div className="pt-2 space-y-2">
                    {autoConfirmSeconds !== null ? (
                      <>
                        <div className={`relative overflow-hidden flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-bold text-sm text-white ${
                          scanAction === 'checkin'
                            ? 'bg-emerald-500/20 border border-emerald-500/30'
                            : 'bg-blue-500/20 border border-blue-500/30'
                        }`}>
                          {scanAction === 'checkin' ? <LogIn size={16} /> : <LogOut size={16} />}
                          Auto {scanAction === 'checkin' ? 'check-in' : 'check-out'} in {autoConfirmSeconds}s
                          <div
                            className={`absolute bottom-0 left-0 h-[3px] transition-all duration-1000 ease-linear ${
                              scanAction === 'checkin' ? 'bg-emerald-400' : 'bg-blue-400'
                            }`}
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                        <button
                          onClick={cancelAutoConfirm}
                          className="w-full py-2.5 rounded-xl bg-white/5 border border-amber-500/20 text-xs font-bold text-amber-400 hover:bg-amber-500/10 transition-all"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <div className="flex gap-3">
                        {scanAction === 'checkin' && (
                          <button
                            onClick={() => handleAction('checkin')}
                            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold text-sm hover:bg-emerald-500/30 transition-all"
                          >
                            <LogIn size={16} /> Confirm Check-In
                          </button>
                        )}
                        {scanAction === 'checkout' && (
                          <button
                            onClick={() => handleAction('checkout')}
                            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400 font-bold text-sm hover:bg-blue-500/30 transition-all"
                          >
                            <LogOut size={16} /> Confirm Check-Out
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const InfoGroup = ({ label, icon: Icon, children }) => (
  <div>
    <div className="flex items-center gap-1.5 mb-1.5">
      <Icon size={11} className="text-slate-600" />
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">{label}</span>
    </div>
    <div className="rounded-xl bg-white/[0.02] border border-white/[0.05] divide-y divide-white/[0.04]">
      {children}
    </div>
  </div>
);
const InfoRow = ({ k, v }) => (
  <div className="flex justify-between px-4 py-2">
    <span className="text-xs text-slate-600">{k}</span>
    <span className="text-xs font-semibold text-slate-300">{v}</span>
  </div>
);

export default BusinessScanner;
