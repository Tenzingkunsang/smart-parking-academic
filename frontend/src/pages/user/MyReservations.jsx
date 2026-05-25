import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import toast from 'react-hot-toast';
import { Search, MapPin, Calendar, Clock, CreditCard, ChevronRight, AlertTriangle, ShieldCheck, Ticket, XCircle, CheckCircle2, Loader2, Info, ArrowRight, History, Download, ChevronDown, ChevronUp, Wallet, MessageSquare, Send, X } from 'lucide-react';
import { API_BASE, handleAuthExpiry } from '../../config/api';
import CountdownTimer from '../../components/common/CountdownTimer';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

// ─── Chat Modal ────────────────────────────────────────────────────────────────

const ChatModal = ({ reservation, onClose }) => {
  const [messages, setMessages]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [input, setInput]         = useState('');
  const [sending, setSending]     = useState(false);
  const bottomRef = useRef(null);

  const token = () => localStorage.getItem('token');
  const hdr   = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` });

  const fetchMessages = useCallback(async () => {
    try {
      const r = await fetch(`${API_BASE}/messages/reservation/${reservation._id}`, { headers: hdr() });
      const d = await r.json();
      if (d.success) setMessages(d.data || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [reservation._id]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    setSending(true);
    try {
      const r = await fetch(`${API_BASE}/messages/reservation/${reservation._id}`, {
        method: 'POST', headers: hdr(), body: JSON.stringify({ content: input.trim() }),
      });
      const d = await r.json();
      if (d.success) { setInput(''); fetchMessages(); }
      else toast.error(d.message || 'Failed to send.');
    } catch { toast.error('Network error.'); }
    finally { setSending(false); }
  };

  const venue = reservation.parkingSpot?.locationName || 'Venue';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#0c0c0e] border border-white/[0.08] rounded-2xl shadow-2xl flex flex-col" style={{ height: '70vh', maxHeight: 520 }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <MessageSquare size={14} className="text-cyan-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">{venue}</p>
              <p className="text-[10px] text-slate-500">Message the venue</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-xl bg-white/5 border border-white/[0.08] flex items-center justify-center text-slate-400 hover:text-white transition-all">
            <X size={13} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin text-cyan-400" size={22} /></div>
          ) : messages.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <MessageSquare size={28} className="text-slate-700 mx-auto" />
              <p className="text-slate-600 text-sm">No messages yet. Say hello to the venue!</p>
            </div>
          ) : messages.map((msg) => {
            const isMe = msg.senderRole === 'user';
            return (
              <div key={msg._id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[78%] space-y-1">
                  <div className={`px-3.5 py-2.5 rounded-2xl text-sm ${
                    isMe
                      ? 'bg-cyan-500/20 border border-cyan-500/25 text-white rounded-br-sm'
                      : 'bg-white/[0.05] border border-white/[0.08] text-slate-300 rounded-bl-sm'
                  }`}>
                    {msg.content}
                  </div>
                  <p className={`text-[9px] text-slate-600 ${isMe ? 'text-right' : 'text-left'}`}>
                    {isMe ? 'You' : (msg.sender?.name || 'Venue')} · {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form onSubmit={sendMessage} className="flex items-center gap-2 px-4 py-3 border-t border-white/[0.06] shrink-0">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message…"
            maxLength={1000}
            className="flex-1 h-10 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/60 transition-all"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center text-cyan-400 hover:bg-cyan-500/25 transition-all disabled:opacity-40"
          >
            {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          </button>
        </form>
      </div>
    </div>
  );
};

const MyReservations = () => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [chatReservation, setChatReservation] = useState(null);
  const navigate = useNavigate();

  const [error, setError] = useState('');

  const fetchReservations = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/reservations/my`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.status === 401) {
        handleAuthExpiry();
        return;
      }
      const data = await response.json();
      if (data.success) setReservations(data.data);
      else setError(data.message || 'Failed to load reservations.');
    } catch {
      setError('Network error — could not load reservations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations();
  }, []);

  const getStatusConfig = (status) => {
    const configs = {
      'pending': { text: 'Pending', colorClass: 'text-slate-400 bg-white/5 border-white/10', bullet: 'bg-slate-400' },
      'reserved': { text: 'Confirmed', colorClass: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20', bullet: 'bg-cyan-400' },
      'checked-in': { text: 'Active', colorClass: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20 animate-pulse', bullet: 'bg-emerald-400' },
      'overstay': { text: 'Overtime', colorClass: 'text-red-400 bg-red-400/10 border-red-400/20 animate-pulse', bullet: 'bg-red-400' },
      'completed': { text: 'Completed', colorClass: 'text-slate-500 bg-white/5 border-white/5', bullet: 'bg-slate-500' },
      'cancelled': { text: 'Cancelled', colorClass: 'text-red-400 bg-red-400/10 border-red-400/20', bullet: 'bg-red-400' },
      'no-show': { text: 'No-Show', colorClass: 'text-amber-500 bg-amber-500/10 border-amber-500/20', bullet: 'bg-amber-500' }
    };
    return configs[status] || configs['reserved'];
  };

  const filteredReservations = reservations.filter(res => {
    if (activeTab === 'upcoming') return res.status === 'reserved' || res.status === 'pending';
    if (activeTab === 'active') return res.status === 'checked-in' || res.status === 'overstay';
    if (activeTab === 'completed') return res.status === 'completed';
    if (activeTab === 'cancelled') return res.status === 'cancelled';
    if (activeTab === 'no-show') return res.status === 'no-show';
    return true;
  });

  const handleCancel = async (res) => {
    // Simulated refund calculation for the UI
    const scheduledStart = new Date(res.scheduledArrival || res.reservationTime);
    const now = new Date();
    const hoursUntil = (scheduledStart.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    let refundPercent = 0;
    if (hoursUntil >= 24) refundPercent = 100;
    else if (hoursUntil >= 12) refundPercent = 50;
    else if (hoursUntil >= 2) refundPercent = 25;

    const totalPaid = res.amountInfo?.totalAmount || res.totalAmount || 0;
    const refundAmount = totalPaid * (refundPercent / 100);

    const result = await Swal.fire({
      title: 'Abort Allocation?',
      html: `
        <div class="text-left space-y-4 font-sans p-2">
          <p class="text-slate-400 text-sm">Policy identified for current temporal range:</p>
          <div class="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
             <div class="flex justify-between text-xs font-black uppercase tracking-widest text-slate-500">
                <span>Original Fee</span>
                <span>Rs.${totalPaid}</span>
             </div>
             <div class="flex justify-between text-xs font-black uppercase tracking-widest text-emerald-400">
                <span>Refund (${refundPercent}%)</span>
                <span>+Rs.${refundAmount}</span>
             </div>
          </div>
          <p class="text-[10px] text-slate-500 italic">Temporal window: ${hoursUntil.toFixed(1)}h remaining.</p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Confirm Abort',
      background: '#0a0a0a',
      color: '#fff',
      confirmButtonColor: '#ef4444'
    });

    if (result.isConfirmed) {
      try {
        const token = localStorage.getItem('token');
        // Bug M3: actually inspect the response — previously we always toasted success.
        const response = await fetch(`${API_BASE}/reservations/${res._id}/cancel`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.status === 401) { handleAuthExpiry(); return; }
        const payload = await response.json().catch(() => ({}));
        if (response.ok && payload.success) {
          toast.success('Permit Revoked. Wallet Updated.');
          fetchReservations();
        } else {
          toast.error(payload.message || 'Cancellation failed.');
        }
      } catch {
        toast.error('Network error. Please retry.');
      }
    }
  };

  // Bug M4: implement Download Receipt instead of leaving the button dead.
  const handleDownloadReceipt = (res) => {
    const lines = [
      'SmartPark — Receipt',
      '====================',
      `Reservation ID : ${res._id}`,
      `Location       : ${res.parkingSpot?.locationName || ''}`,
      `Spot Number    : #${res.parkingSpot?.spotNumber ?? ''}`,
      `Booked at      : ${res.reservationTime ? new Date(res.reservationTime).toLocaleString() : ''}`,
      `Check-in       : ${res.checkInTime ? new Date(res.checkInTime).toLocaleString() : 'N/A'}`,
      `Check-out      : ${res.checkOutTime ? new Date(res.checkOutTime).toLocaleString() : 'N/A'}`,
      `Booked duration: ${res.duration ?? 0} min`,
      `Actual duration: ${res.actualDuration ?? 'N/A'} min`,
      `Payment method : ${res.paymentMethod || '—'}`,
      `Base amount    : Rs. ${res.amountInfo?.totalAmount ?? 0}`,
      `Overstay       : Rs. ${res.overstayInfo?.overstayCharge ?? 0}`,
      `Final amount   : Rs. ${res.amountInfo?.finalAmount ?? res.amountInfo?.totalAmount ?? 0}`,
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smartpark-receipt-${res._id}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handlePayOverstay = async (reservationId, chargeAmount) => {
    const confirm = await Swal.fire({
      title: 'Pay Overstay Charge',
      text: `Settle the overstay charge of Rs. ${chargeAmount} to enable new parking bookings?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Settle Now',
      cancelButtonText: 'Cancel',
      background: '#0a0a0a',
      color: '#fff',
      confirmButtonColor: '#00f2ff',
    });

    if (!confirm.isConfirmed) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/reservations/${reservationId}/pay-overstay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        handleAuthExpiry();
        return;
      }

      const data = await response.json();
      if (data.success) {
        toast.success(data.message || 'Overstay charge settled successfully!');
        fetchReservations();
      } else {
        toast.error(data.message || 'Failed to settle overstay charge.');
      }
    } catch (err) {
      toast.error('Network error. Unable to process payment.');
    }
  };

  return (
    <>
    {chatReservation && (
      <ChatModal reservation={chatReservation} onClose={() => setChatReservation(null)} />
    )}
    <div className="min-h-screen pt-32 pb-24 px-6 max-w-5xl mx-auto space-y-12 animate-in fade-in duration-700">
      
      <div className="fixed top-0 right-0 w-[400px] h-[400px] bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none -z-10" />

      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-10 border-b border-white/[0.06]">
        <div className="space-y-2">
           <div className="flex items-center gap-2 text-cyan-400 mb-1">
              <History size={14} className="fill-current" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Temporal Archive</span>
           </div>
           <h1 className="text-5xl md:text-6xl font-black font-display text-white uppercase italic">Grid History</h1>
        </div>
        <Button onClick={() => navigate('/parking')}>Locate Capacity</Button>
      </section>

      {/* Tabs */}
      <div className="flex overflow-x-auto no-scrollbar gap-2 pb-2">
         {['upcoming', 'active', 'completed', 'cancelled', 'no-show'].map(tab => (
           <button
             key={tab}
             onClick={() => setActiveTab(tab)}
             className={`px-6 h-12 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
               activeTab === tab ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20' : 'bg-white/5 border border-white/5 text-slate-500 hover:text-white'
             }`}
           >
             {tab.replace('-', ' ')}
           </button>
         ))}
      </div>

      {loading ? (
        <div className="py-24 flex flex-col items-center gap-4 text-slate-700">
           <Loader2 className="animate-spin text-cyan-400" size={40} />
           <span className="text-[10px] font-black uppercase tracking-widest">Indexing Logs...</span>
        </div>
      ) : error ? (
        <Card className="py-16 text-center space-y-4 border-dashed bg-transparent">
          <p className="text-red-400 font-bold text-sm">{error}</p>
          <button
            onClick={fetchReservations}
            className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm font-bold text-white hover:bg-white/10 transition-all"
          >
            Retry
          </button>
        </Card>
      ) : filteredReservations.length === 0 ? (
        <Card className="py-24 text-center border-dashed bg-transparent">
           <p className="text-slate-500 font-medium">Zero temporal records identified in this category.</p>
        </Card>
      ) : (
        <div className="grid gap-6">
          {filteredReservations.map((res) => {
            const config = getStatusConfig(res.status);
            const isExpanded = expandedId === res._id;
            
            return (
              <Card key={res._id} className={`group !p-0 overflow-hidden transition-all duration-500 ${isExpanded ? 'ring-1 ring-cyan-500/30 shadow-[0_20px_50px_rgba(0,0,0,0.5)]' : ''}`}>
                 <div 
                   onClick={() => setExpandedId(isExpanded ? null : res._id)}
                   className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 cursor-pointer hover:bg-white/[0.02]"
                 >
                    <div className="flex items-center gap-6">
                       <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${config.colorClass}`}>
                          <Calendar size={20} />
                       </div>
                       <div>
                          <h3 className="text-lg font-black font-display text-white uppercase tracking-tight leading-none mb-1">
                             {res.parkingSpot?.locationName || 'Standard Node'}
                          </h3>
                          <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                             <span>{new Date(res.reservationTime).toLocaleDateString()}</span>
                             <span>·</span>
                             <span>NODE #{res.parkingSpot?.spotNumber}</span>
                          </div>
                       </div>
                    </div>

                    <div className="flex items-center gap-8">
                       <div className="text-right">
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-700 block">Settlement</span>
                          <span className="text-xl font-display font-black text-white italic tracking-tighter">Rs.{res.amountInfo?.totalAmount ?? res.totalAmount ?? 0}</span>
                       </div>
                       {/* Timers */}
                       {(res.status === 'reserved' || res.status === 'pending') && res.scheduledArrival && (
                         <CountdownTimer
                           targetDate={res.scheduledArrival}
                           label="to start"
                           variant="upcoming"
                         />
                       )}
                       {(res.status === 'checked-in' || res.status === 'overstay') && res.checkInTime && (
                         <CountdownTimer
                           targetDate={new Date(new Date(res.checkInTime).getTime() + (res.duration || 60) * 60 * 1000)}
                           label="remaining"
                           variant="active"
                         />
                       )}
                       <div className={`px-4 py-2 rounded-xl border text-[9px] font-black uppercase tracking-widest flex items-center gap-2 ${config.colorClass}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${config.bullet}`} />
                          {config.text}
                       </div>
                       {isExpanded ? <ChevronUp size={20} className="text-slate-700" /> : <ChevronDown size={20} className="text-slate-700" />}
                    </div>
                 </div>

                 {isExpanded && (
                    <div className="px-8 pb-8 pt-4 space-y-8 animate-in slide-in-from-top-4 duration-300">
                       <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8 border-t border-white/5">
                          <div className="space-y-4">
                             <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-700">Detailed Telemetry</span>
                             <div className="space-y-2">
                                {[
                                  { label: 'Link Duration', val: `${res.duration}m` },
                                  { label: 'Check-In', val: res.checkInTime ? new Date(res.checkInTime).toLocaleTimeString() : 'N/A' },
                                  { label: 'Check-Out', val: res.checkOutTime ? new Date(res.checkOutTime).toLocaleTimeString() : 'N/A' },
                                  { label: 'Payment Method', val: res.paymentMethod || '—' }
                                ].map(i => (
                                  <div key={i.label} className="flex justify-between text-xs font-bold">
                                     <span className="text-slate-600">{i.label}</span>
                                     <span className="text-slate-400">{i.val}</span>
                                  </div>
                                ))}
                             </div>
                          </div>

                          <div className="space-y-4">
                             <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-700">Settlement Breakdown</span>
                             <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
                                <div className="flex justify-between text-xs font-bold text-slate-400">
                                   <span>Base Allocation</span>
                                   <span>Rs.{res.amountInfo?.totalAmount ?? res.totalAmount ?? 0}</span>
                                </div>
                                {res.overtimeApplied && (
                                  <div className="flex justify-between text-xs font-black text-red-400">
                                     <span>Delta Overtime (1.5x)</span>
                                     <span>+Rs.{Math.round((res.amountInfo?.finalAmount ?? 0) - (res.amountInfo?.totalAmount ?? 0))}</span>
                                  </div>
                                )}
                                {res.penaltyApplied && (
                                  <div className="flex justify-between text-xs font-black text-amber-500">
                                     <span>Grid Violation (20%)</span>
                                     <span>Applied</span>
                                  </div>
                                )}
                                <div className="pt-3 border-t border-white/5 flex justify-between text-sm font-black text-white italic">
                                   <span>Net Settlement</span>
                                   <span className="text-cyan-400 font-display">Rs.{res.amountInfo?.finalAmount || res.amountInfo?.totalAmount || res.totalAmount || 0}</span>
                                </div>
                             </div>
                          </div>

                          <div className="flex flex-col gap-3 justify-center">
                             {/* BUG-M3: hide the permit button for terminal states where the QR is useless */}
                             {!['completed', 'cancelled', 'no-show', 'expired'].includes(res.status) && (
                               <Button onClick={() => navigate('/ticket', { state: { spot: res.parkingSpot, duration: res.duration, totalAmount: res.amountInfo?.totalAmount || res.totalAmount, paymentMethod: res.paymentMethod, bookingId: res._id, createdAt: res.createdAt, scheduledArrival: res.scheduledArrival, paymentStatus: res.paymentStatus } })} className="flex items-center justify-center gap-2 !py-3 !text-[10px]">
                                  <Ticket size={14} /> Open Digital Permit
                               </Button>
                             )}
                             {/* Message venue — only when spot has an owner */}
                             {!['cancelled', 'expired'].includes(res.status) && (
                               <Button
                                 variant="secondary"
                                 onClick={() => setChatReservation(res)}
                                 className="flex items-center justify-center gap-2 !py-3 !text-[10px]"
                               >
                                 <MessageSquare size={14} /> Message Venue
                               </Button>
                             )}
                             {res.status === 'reserved' && (
                               <Button variant="danger" onClick={() => handleCancel(res)} className="!py-3 !text-[10px]">Abort Allocation</Button>
                             )}
                             {res.status === 'completed' && (
                               <>
                                 {res.overstayInfo?.overstayCharge > 0 && !res.overstayInfo?.overstayPaid ? (
                                   <Button onClick={() => handlePayOverstay(res._id, res.overstayInfo.overstayCharge)} className="flex items-center justify-center gap-2 !py-3 !text-[10px] bg-amber-500 hover:bg-amber-400 text-black font-black">
                                      <Wallet size={14} /> Settle Overstay (Rs.{res.overstayInfo.overstayCharge})
                                   </Button>
                                 ) : (
                                   <Button variant="secondary" onClick={() => handleDownloadReceipt(res)} className="flex items-center justify-center gap-2 !py-3 !text-[10px]">
                                      <Download size={14} /> Download Receipt
                                   </Button>
                                 )}
                               </>
                             )}
                          </div>
                       </div>
                    </div>
                 )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
    </>
  );
};

export default MyReservations;
