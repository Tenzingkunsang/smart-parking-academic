import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  MessageSquare, Loader2, RefreshCw, Send, X, User as UserIcon,
  MapPin, Calendar, ArrowLeft, CheckCheck, Circle,
} from 'lucide-react';
import { API_BASE } from '../../config/api';
import toast from 'react-hot-toast';

// ─── Helpers ───────────────────────────────────────────────────────────────────

const fmtDate = (d) => d ? new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—';
const fmtTime = (d) => d ? new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
const fmtFull = (d) => d ? `${fmtDate(d)} ${fmtTime(d)}` : '—';

const token = () => localStorage.getItem('token');
const hdr   = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` });

// ─── Chat Panel ────────────────────────────────────────────────────────────────

const ChatPanel = ({ thread, onClose, onRefresh }) => {
  const [messages, setMessages]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [input, setInput]         = useState('');
  const [sending, setSending]     = useState(false);
  const bottomRef                 = useRef(null);
  const me = JSON.parse(localStorage.getItem('user') || '{}');

  const reservationId = thread.reservationId;

  const fetchMessages = useCallback(async () => {
    try {
      const r = await fetch(`${API_BASE}/business/messages/reservation/${reservationId}`, { headers: hdr() });
      const d = await r.json();
      if (d.success) { setMessages(d.data); onRefresh(); }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [reservationId]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    setSending(true);
    try {
      const r = await fetch(`${API_BASE}/business/messages/reservation/${reservationId}`, {
        method: 'POST', headers: hdr(), body: JSON.stringify({ content: input.trim() }),
      });
      const d = await r.json();
      if (d.success) { setInput(''); fetchMessages(); }
      else toast.error(d.message || 'Failed to send.');
    } catch { toast.error('Network error.'); }
    finally { setSending(false); }
  };

  const res = thread.reservation;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.06] shrink-0">
        <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/5 border border-white/[0.08] flex items-center justify-center text-slate-400 hover:text-white transition-all">
          <ArrowLeft size={14} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white truncate">{res?.user?.name || 'Customer'}</p>
          <p className="text-[10px] text-slate-500 truncate">
            {res?.parkingSpot?.locationName || '—'} · {fmtDate(res?.scheduledArrival)}
          </p>
        </div>
        <button onClick={fetchMessages} className="w-7 h-7 rounded-lg bg-white/5 border border-white/[0.08] flex items-center justify-center text-slate-500 hover:text-white transition-all">
          <RefreshCw size={11} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-violet-400" size={24} /></div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12 text-slate-600 text-sm">No messages yet.</div>
        ) : messages.map((msg) => {
          const isMe = msg.senderRole !== 'user';
          return (
            <div key={msg._id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] space-y-1`}>
                <div className={`px-4 py-2.5 rounded-2xl text-sm font-medium ${
                  isMe
                    ? 'bg-violet-500/25 border border-violet-500/30 text-white rounded-br-sm'
                    : 'bg-white/[0.05] border border-white/[0.08] text-slate-300 rounded-bl-sm'
                }`}>
                  {msg.content}
                </div>
                <p className={`text-[9px] text-slate-600 ${isMe ? 'text-right' : 'text-left'}`}>
                  {isMe ? 'You' : (msg.sender?.name || 'Customer')} · {fmtTime(msg.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="flex items-center gap-2 px-5 py-4 border-t border-white/[0.06] shrink-0">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Reply to customer…"
          maxLength={1000}
          className="flex-1 h-10 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/60 transition-all"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-violet-400 hover:bg-violet-500/30 transition-all disabled:opacity-40"
        >
          {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
        </button>
      </form>
    </div>
  );
};

// ─── Thread Row ────────────────────────────────────────────────────────────────

const ThreadRow = ({ thread, onClick }) => {
  const res  = thread.reservation;
  const last = thread.lastMessage;
  const hasUnread = thread.unreadCount > 0;

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-4 p-4 rounded-2xl border text-left transition-all hover:bg-white/[0.03] group ${
        hasUnread
          ? 'bg-violet-500/5 border-violet-500/20'
          : 'bg-white/[0.02] border-white/[0.06]'
      }`}
    >
      {/* Avatar */}
      <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/15 flex items-center justify-center text-violet-400 text-sm font-black shrink-0">
        {res?.user?.name?.charAt(0)?.toUpperCase() || '?'}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className={`text-sm font-bold truncate ${hasUnread ? 'text-white' : 'text-slate-300'}`}>
            {res?.user?.name || 'Customer'}
          </p>
          {hasUnread && (
            <span className="shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-violet-500 text-white text-[9px] font-black flex items-center justify-center">
              {thread.unreadCount}
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 truncate">
          {last?.content || '—'}
        </p>
        <p className="text-[10px] text-slate-600 mt-0.5">
          {res?.parkingSpot?.locationName || '—'} · {fmtDate(res?.scheduledArrival)}
        </p>
      </div>

      {/* Time */}
      <div className="text-right shrink-0">
        <p className="text-[10px] text-slate-600">{fmtTime(last?.createdAt)}</p>
        {last?.senderRole === 'user' && !hasUnread && (
          <CheckCheck size={11} className="text-violet-400 mt-1 ml-auto" />
        )}
      </div>
    </button>
  );
};

// ─── Main Page ─────────────────────────────────────────────────────────────────

const BusinessMessages = () => {
  const [threads, setThreads]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [activeThread, setActive]   = useState(null);
  const [search, setSearch]         = useState('');

  const fetchThreads = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/business/messages`, { headers: hdr() });
      const d = await r.json();
      if (d.success) setThreads(d.data || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchThreads(); }, [fetchThreads]);

  const filtered = threads.filter((t) => {
    const q = search.toLowerCase();
    return !q
      || t.reservation?.user?.name?.toLowerCase().includes(q)
      || t.reservation?.vehiclePlate?.toLowerCase().includes(q)
      || t.reservation?.parkingSpot?.locationName?.toLowerCase().includes(q);
  });

  const unreadTotal = threads.reduce((s, t) => s + (t.unreadCount || 0), 0);

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden -m-8">
      {/* Thread list */}
      <div className={`flex flex-col w-full lg:w-[360px] shrink-0 border-r border-white/[0.06] ${activeThread ? 'hidden lg:flex' : 'flex'}`}>
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-sm font-extrabold text-white">Messages</h1>
              {unreadTotal > 0 && (
                <p className="text-[10px] text-violet-400 font-bold mt-0.5">{unreadTotal} unread</p>
              )}
            </div>
            <button onClick={fetchThreads} className="w-7 h-7 rounded-lg bg-white/5 border border-white/[0.08] flex items-center justify-center text-slate-500 hover:text-white transition-all">
              <RefreshCw size={11} />
            </button>
          </div>
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search customers…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/50 transition-all"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="animate-spin text-violet-400" size={24} /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <MessageSquare size={32} className="text-slate-700 mx-auto" />
              <p className="text-slate-600 text-sm">
                {search ? 'No matches.' : 'No messages yet.'}
              </p>
            </div>
          ) : filtered.map((t) => (
            <ThreadRow
              key={t.reservationId}
              thread={t}
              onClick={() => setActive(t)}
            />
          ))}
        </div>
      </div>

      {/* Chat panel */}
      <div className={`flex-1 flex flex-col ${activeThread ? 'flex' : 'hidden lg:flex'}`}>
        {activeThread ? (
          <ChatPanel
            thread={activeThread}
            onClose={() => setActive(null)}
            onRefresh={fetchThreads}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
            <div className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
              <MessageSquare size={28} className="text-violet-400/60" />
            </div>
            <p className="text-slate-500 text-sm">Select a conversation to view messages.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BusinessMessages;
