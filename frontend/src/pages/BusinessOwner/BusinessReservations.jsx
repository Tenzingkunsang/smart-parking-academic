import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search, Loader2, ChevronLeft, ChevronRight, X,
  LogIn, LogOut, Ban, Send, RefreshCw, AlertTriangle, Eye,
  Clock, CreditCard, User as UserIcon, MapPin, Calendar,
  CheckCircle2, MessageSquare,
} from 'lucide-react';
import { API_BASE } from '../../config/api';
import toast from 'react-hot-toast';

// ─── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_META = {
  reserved:     { bg: 'bg-blue-500/12',    border: 'border-blue-500/25',    text: 'text-blue-400',    dot: 'bg-blue-400'    },
  'checked-in': { bg: 'bg-emerald-500/12', border: 'border-emerald-500/25', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  completed:    { bg: 'bg-slate-500/12',   border: 'border-slate-500/25',   text: 'text-slate-400',   dot: 'bg-slate-400'   },
  cancelled:    { bg: 'bg-red-500/12',     border: 'border-red-500/25',     text: 'text-red-400',     dot: 'bg-red-400'     },
  'no-show':    { bg: 'bg-amber-500/12',   border: 'border-amber-500/25',   text: 'text-amber-400',   dot: 'bg-amber-400'   },
  overstay:     { bg: 'bg-orange-500/12',  border: 'border-orange-500/25',  text: 'text-orange-400',  dot: 'bg-orange-400'  },
  pending:      { bg: 'bg-yellow-500/12',  border: 'border-yellow-500/25',  text: 'text-yellow-400',  dot: 'bg-yellow-400'  },
};

const StatusBadge = ({ status }) => {
  const m = STATUS_META[status] || STATUS_META.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[10px] font-bold border ${m.bg} ${m.border} ${m.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
      {status}
    </span>
  );
};

const fmtDate     = (d) => d ? new Date(d).toLocaleDateString() : '—';
const fmtTime     = (d) => d ? new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
const fmtDateTime = (d) => d ? `${fmtDate(d)} ${fmtTime(d)}` : '—';

// ─── Modal ─────────────────────────────────────────────────────────────────────

const Modal = ({ res: initial, onClose, onRefresh }) => {
  const [res, setRes]             = useState(initial);
  const [loading, setLoading]     = useState(false);
  const [notifyMsg, setNotifyMsg] = useState('');
  const [tab, setTab]             = useState('details'); // 'details' | 'messages'
  const [messages, setMessages]   = useState([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [msgInput, setMsgInput]   = useState('');
  const [msgSending, setMsgSending] = useState(false);
  const msgBottomRef = useRef(null);
  const token = () => localStorage.getItem('token');
  const hdr   = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` });

  const reload = async () => {
    try {
      const r = await fetch(`${API_BASE}/business/reservations/${res._id}`, { headers: hdr() });
      const d = await r.json();
      if (d.success) { setRes(d.data); onRefresh(); }
    } catch { /* silent */ }
  };

  const fetchMessages = useCallback(async () => {
    setMsgLoading(true);
    try {
      const r = await fetch(`${API_BASE}/business/messages/reservation/${res._id}`, { headers: hdr() });
      const d = await r.json();
      if (d.success) setMessages(d.data || []);
    } catch { /* silent */ }
    finally { setMsgLoading(false); }
  }, [res._id]);

  useEffect(() => {
    if (tab === 'messages') fetchMessages();
  }, [tab, fetchMessages]);

  useEffect(() => {
    msgBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMsg = async (e) => {
    e.preventDefault();
    if (!msgInput.trim()) return;
    setMsgSending(true);
    try {
      const r = await fetch(`${API_BASE}/business/messages/reservation/${res._id}`, {
        method: 'POST', headers: hdr(), body: JSON.stringify({ content: msgInput.trim() }),
      });
      const d = await r.json();
      if (d.success) { setMsgInput(''); fetchMessages(); }
      else toast.error(d.message || 'Failed to send.');
    } catch { toast.error('Network error.'); }
    finally { setMsgSending(false); }
  };

  const act = async (url, method = 'POST', body = {}) => {
    setLoading(true);
    try {
      const r = await fetch(url, { method, headers: hdr(), body: JSON.stringify(body) });
      const d = await r.json();
      if (d.success) { toast.success(d.message || 'Done'); await reload(); }
      else toast.error(d.message || 'Failed');
    } catch { toast.error('Network error'); }
    finally { setLoading(false); }
  };

  const canCheckIn  = res.status === 'reserved';
  const canCheckOut = ['checked-in', 'overstay'].includes(res.status);
  const canCancel   = ['pending', 'reserved', 'checked-in', 'overstay'].includes(res.status);
  const isOverstay  = res.status === 'overstay';
  const hasOverstay = (res.overstayInfo?.overstayMinutes ?? 0) > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-[#0c0c0e] border border-white/[0.08] rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 mb-1">
              <h2 className="text-sm font-extrabold text-white">Reservation Details</h2>
              <StatusBadge status={res.status} />
            </div>
            <p className="text-[10px] text-slate-600 font-mono truncate">{res._id}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/5 border border-white/[0.08] flex items-center justify-center text-slate-400 hover:text-white transition-all shrink-0 ml-3"
          >
            <X size={14} />
          </button>
        </div>

        {/* Overstay warning */}
        {isOverstay && (
          <div className="mx-5 mt-4 flex items-start gap-3 p-3.5 rounded-xl bg-orange-500/8 border border-orange-500/20">
            <AlertTriangle size={14} className="text-orange-400 mt-0.5 shrink-0" />
            <p className="text-orange-300 text-xs font-medium">Customer is in overstay — check them out to finalize charges.</p>
          </div>
        )}

        {/* Tab switcher */}
        <div className="flex items-center gap-1 px-5 py-2 border-b border-white/[0.06]">
          {['details', 'messages'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                tab === t
                  ? 'bg-violet-500/15 border border-violet-500/25 text-violet-400'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {t === 'messages' && <MessageSquare size={11} />}
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Action bar */}
        <div className={`flex items-center gap-2 px-5 py-3 border-b border-white/[0.06] flex-wrap ${tab !== 'details' ? 'hidden' : ''}`}>
          {canCheckIn && (
            <button
              onClick={() => act(`${API_BASE}/business/reservations/${res._id}/checkin`)}
              disabled={loading}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 text-xs font-bold hover:bg-emerald-500/25 disabled:opacity-40 transition-all"
            >
              <LogIn size={12} /> Check In
            </button>
          )}
          {canCheckOut && (
            <button
              onClick={() => act(`${API_BASE}/business/reservations/${res._id}/checkout`)}
              disabled={loading}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-500/15 border border-blue-500/25 text-blue-400 text-xs font-bold hover:bg-blue-500/25 disabled:opacity-40 transition-all"
            >
              <LogOut size={12} /> Check Out
            </button>
          )}
          {canCancel && (
            <button
              onClick={() => {
                const reason = window.prompt('Reason for cancellation:');
                if (reason !== null)
                  act(`${API_BASE}/business/reservations/${res._id}/force-cancel`, 'POST', { reason: reason || 'Cancelled by venue' });
              }}
              disabled={loading}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold hover:bg-red-500/20 disabled:opacity-40 transition-all"
            >
              <Ban size={12} /> Cancel
            </button>
          )}
          <button
            onClick={reload}
            disabled={loading}
            className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/[0.08] text-slate-500 text-xs font-bold hover:text-white transition-all disabled:opacity-40"
          >
            <RefreshCw size={11} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {/* Messages panel */}
        {tab === 'messages' && (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {msgLoading ? (
                <div className="flex justify-center py-10"><Loader2 className="animate-spin text-violet-400" size={22} /></div>
              ) : messages.length === 0 ? (
                <div className="text-center py-10 text-slate-600 text-sm">No messages yet for this reservation.</div>
              ) : messages.map((msg) => {
                const isMe = msg.senderRole !== 'user';
                return (
                  <div key={msg._id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className="max-w-[78%] space-y-1">
                      <div className={`px-3.5 py-2.5 rounded-2xl text-sm ${
                        isMe
                          ? 'bg-violet-500/20 border border-violet-500/25 text-white rounded-br-sm'
                          : 'bg-white/[0.05] border border-white/[0.08] text-slate-300 rounded-bl-sm'
                      }`}>
                        {msg.content}
                      </div>
                      <p className={`text-[9px] text-slate-600 ${isMe ? 'text-right' : 'text-left'}`}>
                        {isMe ? 'You' : (msg.sender?.name || 'Customer')} · {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={msgBottomRef} />
            </div>
            <form onSubmit={sendMsg} className="flex items-center gap-2 px-5 py-3 border-t border-white/[0.06] shrink-0">
              <input
                type="text"
                value={msgInput}
                onChange={(e) => setMsgInput(e.target.value)}
                placeholder="Reply to customer…"
                maxLength={1000}
                className="flex-1 h-9 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/60 transition-all"
              />
              <button
                type="submit"
                disabled={msgSending || !msgInput.trim()}
                className="w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center text-violet-400 hover:bg-violet-500/25 transition-all disabled:opacity-40"
              >
                {msgSending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
              </button>
            </form>
          </div>
        )}

        {/* Scrollable content */}
        <div className={`overflow-y-auto flex-1 p-5 space-y-4 ${tab !== 'details' ? 'hidden' : ''}`}>

          {/* Customer */}
          <InfoSection title="Customer" icon={UserIcon}>
            <InfoRow label="Name"    value={res.user?.name  || '—'} />
            <InfoRow label="Phone"   value={res.user?.phone || '—'} />
            <InfoRow label="Vehicle" value={res.vehiclePlate || '—'} />
          </InfoSection>

          {/* Spot */}
          <InfoSection title="Parking Spot" icon={MapPin}>
            <InfoRow label="Location" value={res.parkingSpot?.locationName || '—'} />
            <InfoRow label="Spot #"   value={res.parkingSpot?.spotNumber ? `#${res.parkingSpot.spotNumber}` : '—'} />
          </InfoSection>

          {/* Session */}
          <InfoSection title="Session" icon={Clock}>
            <InfoRow label="Scheduled"  value={fmtDateTime(res.scheduledArrival)} />
            <InfoRow label="Duration"   value={`${res.duration} min`} />
            <InfoRow label="Check-in"   value={fmtDateTime(res.checkInTime)} />
            <InfoRow label="Check-out"  value={fmtDateTime(res.checkOutTime)} />
          </InfoSection>

          {/* Billing */}
          <InfoSection title="Billing" icon={CreditCard}>
            <InfoRow label="Base Amount"  value={`NPR ${res.amountInfo?.baseAmount ?? 0}`} />
            <InfoRow label="Final Amount" value={`NPR ${res.amountInfo?.finalAmount ?? 0}`} bold />
            {hasOverstay && (
              <InfoRow
                label="Overstay Charge"
                value={`${res.overstayInfo.overstayMinutes} min · NPR ${res.overstayInfo.overstayCharge}`}
                warn
              />
            )}
          </InfoSection>

          {/* Notify */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-2.5">Message Customer</p>
            <div className="flex gap-2">
              <input
                type="text"
                maxLength={200}
                placeholder="Type a message to the customer…"
                value={notifyMsg}
                onChange={(e) => setNotifyMsg(e.target.value)}
                className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/60 transition-all"
              />
              <button
                onClick={() => {
                  if (!notifyMsg.trim()) return;
                  act(`${API_BASE}/business/reservations/${res._id}/send-notification`, 'POST', { message: notifyMsg });
                  setNotifyMsg('');
                }}
                disabled={loading || !notifyMsg.trim()}
                className="px-3.5 py-2.5 rounded-xl bg-violet-500/15 border border-violet-500/25 text-violet-400 hover:bg-violet-500/25 transition-all disabled:opacity-40"
              >
                <Send size={14} />
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

const InfoSection = ({ title, icon: Icon, children }) => (
  <div>
    <div className="flex items-center gap-2 mb-2">
      <Icon size={11} className="text-slate-600" />
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">{title}</span>
    </div>
    <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] divide-y divide-white/[0.04] overflow-hidden">
      {children}
    </div>
  </div>
);

const InfoRow = ({ label, value, bold, warn }) => (
  <div className="flex items-center justify-between px-4 py-2.5">
    <span className="text-xs text-slate-500">{label}</span>
    <span className={`text-xs font-semibold ${warn ? 'text-orange-400' : bold ? 'text-white' : 'text-slate-300'}`}>
      {String(value)}
    </span>
  </div>
);

// ─── Status Filter Tabs ────────────────────────────────────────────────────────

const TABS = [
  { key: 'all',         label: 'All'        },
  { key: 'reserved',    label: 'Reserved'   },
  { key: 'checked-in',  label: 'Active'     },
  { key: 'overstay',    label: 'Overstay'   },
  { key: 'completed',   label: 'Completed'  },
  { key: 'cancelled',   label: 'Cancelled'  },
  { key: 'no-show',     label: 'No-Show'    },
];

// ─── Main Page ─────────────────────────────────────────────────────────────────

const BusinessReservations = () => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatus] = useState('all');
  const [selected, setSelected]   = useState(null);
  const [page, setPage]           = useState(1);
  const perPage = 12;

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const r = await fetch(`${API_BASE}/business/reservations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      if (d.success) setReservations(d.data || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);
  useEffect(() => { setPage(1); }, [search, statusFilter]);

  const filtered = reservations.filter((r) => {
    const q           = search.toLowerCase();
    const matchSearch = !q
      || r.user?.name?.toLowerCase().includes(q)
      || r._id.toLowerCase().includes(q)
      || r.vehiclePlate?.toLowerCase().includes(q);
    return matchSearch && (statusFilter === 'all' || r.status === statusFilter);
  });

  const tabCounts   = TABS.reduce((acc, t) => {
    acc[t.key] = t.key === 'all' ? reservations.length : reservations.filter((r) => r.status === t.key).length;
    return acc;
  }, {});

  const totalPages  = Math.ceil(filtered.length / perPage);
  const paginated   = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    <>
      {selected && <Modal res={selected} onClose={() => setSelected(null)} onRefresh={fetch_} />}

      <div className="space-y-6 pb-12">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">Reservations</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              {loading ? '…' : `${filtered.length} reservation${filtered.length !== 1 ? 's' : ''} · click to manage`}
            </p>
          </div>
          <button
            onClick={fetch_}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 border border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/10 transition-all text-xs font-bold"
          >
            <RefreshCw size={12} /> Refresh
          </button>
        </div>

        {/* Status tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {TABS.map((t) => {
            const active = statusFilter === t.key;
            const count  = tabCounts[t.key] || 0;
            return (
              <button
                key={t.key}
                onClick={() => setStatus(t.key)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold border whitespace-nowrap transition-all ${
                  active
                    ? 'bg-violet-500/15 border-violet-500/30 text-violet-400'
                    : 'bg-transparent border-transparent text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]'
                }`}
              >
                {t.label}
                {count > 0 && (
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${
                    active ? 'bg-violet-500/25 text-violet-400' : 'bg-white/[0.06] text-slate-500'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
          <input
            type="text"
            placeholder="Search by name, reservation ID, or plate number…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-11 bg-white/[0.03] border border-white/[0.08] rounded-xl pl-10 pr-4 text-sm font-medium text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/50 transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <Loader2 className="animate-spin text-violet-400" size={32} />
            <p className="text-slate-600 text-sm">Loading reservations…</p>
          </div>
        ) : (
          <>
            {paginated.length === 0 ? (
              <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-14 text-center space-y-3">
                <Calendar size={32} className="text-slate-700 mx-auto" />
                <p className="text-slate-500 font-semibold">No reservations match your filters.</p>
                {(search || statusFilter !== 'all') && (
                  <button
                    onClick={() => { setSearch(''); setStatus('all'); }}
                    className="text-xs text-violet-400 hover:text-violet-300 font-bold transition-colors"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {paginated.map((res) => {
                  const hasOverstay = (res.overstayInfo?.overstayMinutes ?? 0) > 0;
                  const amount      = res.amountInfo?.finalAmount ?? res.amountInfo?.totalAmount ?? 0;
                  return (
                    <div
                      key={res._id}
                      onClick={() => setSelected(res)}
                      className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-violet-500/25 hover:bg-white/[0.03] cursor-pointer transition-all group"
                    >
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/15 flex items-center justify-center text-violet-400 text-sm font-black shrink-0">
                        {res.user?.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <p className="text-sm font-bold text-white truncate">{res.user?.name || 'Unknown'}</p>
                          <StatusBadge status={res.status} />
                          {hasOverstay && <AlertTriangle size={11} className="text-orange-400 shrink-0" />}
                        </div>
                        <p className="text-xs text-slate-500 truncate">
                          {res.parkingSpot?.locationName || '—'}
                          {res.vehiclePlate ? ` · ${res.vehiclePlate}` : ''}
                          {' · '}
                          {fmtDate(res.scheduledArrival)}
                        </p>
                      </div>

                      {/* Amount + eye */}
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-white">NPR {amount.toLocaleString()}</p>
                        {hasOverstay && (
                          <p className="text-[10px] text-orange-400 font-bold">
                            +{res.overstayInfo.overstayMinutes}m overstay
                          </p>
                        )}
                      </div>
                      <Eye size={13} className="text-slate-700 group-hover:text-violet-400 transition-colors shrink-0" />
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="w-9 h-9 rounded-xl bg-white/5 border border-white/[0.08] flex items-center justify-center text-slate-400 hover:text-white disabled:opacity-30 transition-all"
                >
                  <ChevronLeft size={15} />
                </button>
                <span className="text-xs text-slate-500 px-3 font-bold">{page} / {totalPages}</span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="w-9 h-9 rounded-xl bg-white/5 border border-white/[0.08] flex items-center justify-center text-slate-400 hover:text-white disabled:opacity-30 transition-all"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
};

export default BusinessReservations;
