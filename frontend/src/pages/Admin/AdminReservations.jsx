import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Download, Loader2, ArrowLeft, Calendar, Filter, ChevronLeft,
  ChevronRight, X, LogIn, LogOut, Ban, Edit3, Eye, Send, RefreshCw,
  AlertTriangle, CheckCircle, Clock, MapPin, User as UserIcon, CreditCard,
  Car, FileText,
} from 'lucide-react';
import { API_BASE } from '../../config/api';
import toast from 'react-hot-toast';

// ─── Status badge ─────────────────────────────────────────────────────────────
const STATUS_STYLES = {
  reserved:    'bg-blue-500/15 text-blue-400 border-blue-500/20',
  'checked-in':'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  completed:   'bg-slate-500/15 text-slate-300 border-slate-500/20',
  cancelled:   'bg-red-500/15 text-red-400 border-red-500/20',
  'no-show':   'bg-amber-500/15 text-amber-400 border-amber-500/20',
  overstay:    'bg-orange-500/15 text-orange-400 border-orange-500/20',
  pending:     'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
};
const badge = (status) =>
  `inline-flex items-center px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wide border ${
    STATUS_STYLES[status] || 'bg-slate-500/15 text-slate-400 border-slate-500/20'
  }`;

const fmtDate = (d) => d ? new Date(d).toLocaleDateString() : '—';
const fmtTime = (d) => d ? new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
const fmtDateTime = (d) => d ? `${fmtDate(d)} ${fmtTime(d)}` : '—';

// ─── Detail / Action Modal ────────────────────────────────────────────────────
const ReservationModal = ({ reservation: initial, onClose, onRefresh }) => {
  const [res, setRes] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('details'); // 'details' | 'edit' | 'notify'
  const [editForm, setEditForm] = useState({
    duration: initial.duration || '',
    scheduledArrival: initial.scheduledArrival
      ? new Date(initial.scheduledArrival).toISOString().slice(0, 16)
      : '',
    vehiclePlate: initial.vehiclePlate || '',
    overrideFinalAmount: initial.amountInfo?.finalAmount ?? '',
  });
  const [notifyForm, setNotifyForm] = useState({ title: 'Admin Message', message: '' });

  const token = () => localStorage.getItem('token');
  const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` });

  const reload = async () => {
    try {
      const r = await fetch(`${API_BASE}/admin/reservations/${res._id}`, { headers: headers() });
      const d = await r.json();
      if (d.success) { setRes(d.data); onRefresh(); }
    } catch { /* silent */ }
  };

  const doAction = async (url, method = 'POST', body = {}) => {
    setLoading(true);
    try {
      const r = await fetch(url, { method, headers: headers(), body: JSON.stringify(body) });
      const d = await r.json();
      if (d.success) {
        toast.success(d.message || 'Done');
        await reload();
      } else {
        toast.error(d.message || 'Failed');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = () =>
    doAction(`${API_BASE}/admin/reservations/${res._id}/checkin`);

  const handleCheckOut = () =>
    doAction(`${API_BASE}/admin/reservations/${res._id}/checkout`);

  const handleForceCancel = () => {
    const reason = window.prompt('Reason for cancellation (shown to user):');
    if (reason === null) return; // user clicked Cancel
    doAction(`${API_BASE}/admin/reservations/${res._id}/force-cancel`, 'POST', { reason: reason || 'Cancelled by admin' });
  };

  const handleEdit = (e) => {
    e.preventDefault();
    doAction(`${API_BASE}/admin/reservations/${res._id}`, 'PUT', editForm);
  };

  const handleNotify = (e) => {
    e.preventDefault();
    if (!notifyForm.message.trim()) { toast.error('Message required'); return; }
    doAction(`${API_BASE}/admin/reservations/${res._id}/send-notification`, 'POST', notifyForm);
    setNotifyForm((p) => ({ ...p, message: '' }));
  };

  // Derived action availability
  const canCheckIn  = res.status === 'reserved';
  const canCheckOut = ['checked-in', 'overstay'].includes(res.status);
  const canCancel   = ['pending', 'reserved', 'checked-in', 'overstay'].includes(res.status);
  const isActive    = ['pending', 'reserved', 'checked-in', 'overstay'].includes(res.status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-[#0f1117] border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <div>
            <h2 className="text-lg font-extrabold text-white">Reservation Control</h2>
            <p className="text-[11px] text-slate-500 font-mono mt-0.5">{res._id}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={badge(res.status)}>{res.status}</span>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Action bar */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-white/[0.06] overflow-x-auto">
          {canCheckIn && (
            <button
              onClick={handleCheckIn}
              disabled={loading}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold hover:bg-emerald-500/25 transition-all disabled:opacity-40 whitespace-nowrap"
            >
              <LogIn size={13} /> Check In
            </button>
          )}
          {canCheckOut && (
            <button
              onClick={handleCheckOut}
              disabled={loading}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-400 text-xs font-bold hover:bg-blue-500/25 transition-all disabled:opacity-40 whitespace-nowrap"
            >
              <LogOut size={13} /> Check Out
            </button>
          )}
          {canCancel && (
            <button
              onClick={handleForceCancel}
              disabled={loading}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-bold hover:bg-red-500/25 transition-all disabled:opacity-40 whitespace-nowrap"
            >
              <Ban size={13} /> Force Cancel
            </button>
          )}
          <button
            onClick={reload}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 text-xs font-bold hover:text-white hover:bg-white/10 transition-all disabled:opacity-40 ml-auto whitespace-nowrap"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-white/[0.06] px-6">
          {[
            { id: 'details', label: 'Details', icon: Eye },
            { id: 'edit',    label: 'Edit',    icon: Edit3 },
            { id: 'notify',  label: 'Notify User', icon: Send },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold border-b-2 transition-all ${
                tab === id
                  ? 'border-cyan-400 text-cyan-400'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              <Icon size={12} />{label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-6">

          {/* ── DETAILS TAB ── */}
          {tab === 'details' && (
            <div className="space-y-5">
              {/* User */}
              <Section title="User" icon={UserIcon}>
                <Row label="Name"  value={res.user?.name || '—'} />
                <Row label="Email" value={res.user?.email || '—'} />
                <Row label="Phone" value={res.user?.phone || '—'} />
                <Row label="Violations" value={res.user?.violationCount ?? 0} />
                <Row label="Penalty Active" value={res.user?.penaltyActive ? '⚠️ Yes' : 'No'} />
                <Row label="Overstay Debt" value={`NPR ${res.user?.overstayDebt ?? 0}`} warn={res.user?.overstayDebt > 0} />
              </Section>

              {/* Spot */}
              <Section title="Parking Spot" icon={MapPin}>
                <Row label="Location" value={res.parkingSpot?.locationName || '—'} />
                <Row label="Spot #"   value={res.parkingSpot?.spotNumber || '—'} />
                <Row label="Rate"     value={res.parkingSpot?.price ? `NPR ${res.parkingSpot.price}/hr` : '—'} />
              </Section>

              {/* Session */}
              <Section title="Session" icon={Clock}>
                <Row label="Scheduled Arrival" value={fmtDateTime(res.scheduledArrival)} />
                <Row label="Duration (booked)"  value={`${res.duration} min`} />
                <Row label="Check-in"           value={fmtDateTime(res.checkInTime)} />
                <Row label="Check-out"          value={fmtDateTime(res.checkOutTime)} />
                <Row label="Actual Duration"    value={res.actualDuration ? `${res.actualDuration} min` : '—'} />
                <Row label="Vehicle Plate"      value={res.vehiclePlate || '—'} />
                <Row label="Lifecycle Stage"    value={res.lifecycleStage} />
              </Section>

              {/* Billing */}
              <Section title="Billing" icon={CreditCard}>
                <Row label="Base Amount"    value={`NPR ${res.amountInfo?.baseAmount ?? 0}`} />
                <Row label="Total Amount"   value={`NPR ${res.amountInfo?.totalAmount ?? 0}`} />
                <Row label="Final Amount"   value={`NPR ${res.amountInfo?.finalAmount ?? 0}`} bold />
                <Row label="Overstay Mins"  value={res.overstayInfo?.overstayMinutes ?? 0} warn={res.overstayInfo?.overstayMinutes > 0} />
                <Row label="Overstay Charge" value={`NPR ${res.overstayInfo?.overstayCharge ?? 0}`} warn={res.overstayInfo?.overstayCharge > 0} />
                <Row label="Overstay Paid"  value={res.overstayInfo?.overstayPaid ? '✓ Yes' : 'No'} />
                <Row label="Payment Method" value={res.paymentMethod} />
                <Row label="Payment Status" value={res.paymentStatus} />
              </Section>

              {/* Overstay alert */}
              {res.status === 'overstay' && (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-orange-500/10 border border-orange-500/30">
                  <AlertTriangle size={16} className="text-orange-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-orange-400 font-bold text-sm">Currently in Overstay</p>
                    <p className="text-orange-300/70 text-xs mt-0.5">
                      User is still parked past their booked time. Use "Check Out" to end the session and calculate final charges.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── EDIT TAB ── */}
          {tab === 'edit' && (
            <form onSubmit={handleEdit} className="space-y-5">
              <p className="text-xs text-slate-500">
                Changes are logged and user is notified automatically.
                {!isActive && ' Non-active reservations: only amount override and plate are editable.'}
              </p>

              <FormField label="Duration (minutes)" hint="15–1440">
                <input
                  type="number" min={15} max={1440}
                  value={editForm.duration}
                  onChange={(e) => setEditForm((p) => ({ ...p, duration: e.target.value }))}
                  className={inputCls}
                />
              </FormField>

              <FormField label="Scheduled Arrival">
                <input
                  type="datetime-local"
                  value={editForm.scheduledArrival}
                  onChange={(e) => setEditForm((p) => ({ ...p, scheduledArrival: e.target.value }))}
                  className={inputCls}
                />
              </FormField>

              <FormField label="Vehicle Plate">
                <input
                  type="text" maxLength={20} placeholder="e.g. BA 1 KHA 1234"
                  value={editForm.vehiclePlate}
                  onChange={(e) => setEditForm((p) => ({ ...p, vehiclePlate: e.target.value }))}
                  className={inputCls}
                />
              </FormField>

              <FormField label="Override Final Amount (NPR)" hint="Leave blank to keep calculated amount">
                <input
                  type="number" min={0} step={0.01} placeholder="e.g. 250"
                  value={editForm.overrideFinalAmount}
                  onChange={(e) => setEditForm((p) => ({ ...p, overrideFinalAmount: e.target.value }))}
                  className={inputCls}
                />
              </FormField>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 text-sm font-bold hover:bg-cyan-500/25 transition-all disabled:opacity-40"
              >
                {loading ? <Loader2 size={14} className="animate-spin inline mr-2" /> : null}
                Save Changes
              </button>
            </form>
          )}

          {/* ── NOTIFY TAB ── */}
          {tab === 'notify' && (
            <form onSubmit={handleNotify} className="space-y-4">
              <p className="text-xs text-slate-500">
                Send an in-app notification directly to the user for this reservation.
              </p>

              <FormField label="Title">
                <input
                  type="text" maxLength={80} placeholder="Admin Message"
                  value={notifyForm.title}
                  onChange={(e) => setNotifyForm((p) => ({ ...p, title: e.target.value }))}
                  className={inputCls}
                />
              </FormField>

              <FormField label="Message">
                <textarea
                  rows={4} maxLength={500} placeholder="Type your message..."
                  value={notifyForm.message}
                  onChange={(e) => setNotifyForm((p) => ({ ...p, message: e.target.value }))}
                  className={`${inputCls} resize-none`}
                />
                <p className="text-[10px] text-slate-600 text-right mt-1">{notifyForm.message.length}/500</p>
              </FormField>

              <button
                type="submit"
                disabled={loading || !notifyForm.message.trim()}
                className="w-full py-2.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 text-sm font-bold hover:bg-cyan-500/25 transition-all disabled:opacity-40"
              >
                {loading ? <Loader2 size={14} className="animate-spin inline mr-2" /> : <Send size={13} className="inline mr-2" />}
                Send Notification
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

// Tiny helpers for detail layout
const Section = ({ title, icon: Icon, children }) => (
  <div>
    <div className="flex items-center gap-2 mb-2.5">
      <Icon size={13} className="text-slate-500" />
      <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">{title}</span>
    </div>
    <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] divide-y divide-white/[0.04]">
      {children}
    </div>
  </div>
);
const Row = ({ label, value, bold, warn }) => (
  <div className="flex items-center justify-between px-4 py-2.5">
    <span className="text-xs text-slate-500">{label}</span>
    <span className={`text-xs font-semibold ${warn ? 'text-orange-400' : bold ? 'text-white' : 'text-slate-300'}`}>
      {String(value)}
    </span>
  </div>
);
const FormField = ({ label, hint, children }) => (
  <div>
    <label className="block text-xs font-semibold text-slate-400 mb-1.5">
      {label}{hint && <span className="text-slate-600 font-normal ml-1">({hint})</span>}
    </label>
    {children}
  </div>
);
const inputCls = 'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-medium text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:bg-white/[0.06] transition-all';

// ─── Main Page ────────────────────────────────────────────────────────────────
const AdminReservations = () => {
  const navigate = useNavigate();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selected, setSelected] = useState(null); // open modal
  const perPage = 15;

  const fetchReservations = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/admin/reservations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setReservations(data.data || []);
      } else {
        setError(data.message || 'Failed to load reservations.');
      }
    } catch {
      setError('Network error — could not load reservations.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReservations(); }, [fetchReservations]);

  // After an action in modal, refresh list and update selected reservation
  const handleRefresh = useCallback(() => {
    fetchReservations();
  }, [fetchReservations]);

  // Filter
  const filtered = reservations.filter((r) => {
    const q = searchQuery.toLowerCase().trim();
    const matchSearch =
      !q ||
      r.user?.name?.toLowerCase().includes(q) ||
      r.user?.email?.toLowerCase().includes(q) ||
      r._id?.toLowerCase().includes(q) ||
      r.parkingSpot?.spotNumber?.toString().includes(q) ||
      r.vehiclePlate?.toLowerCase().includes(q);

    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    const rawDate = r.reservationTime || r.createdAt;
    const bookingDate = rawDate ? new Date(rawDate) : null;
    const matchDateFrom = !dateFrom || (bookingDate && bookingDate >= new Date(dateFrom));
    const matchDateTo   = !dateTo   || (bookingDate && bookingDate <= new Date(dateTo + 'T23:59:59'));

    return matchSearch && matchStatus && matchDateFrom && matchDateTo;
  });

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  useEffect(() => { setCurrentPage(1); }, [searchQuery, statusFilter, dateFrom, dateTo]);

  // CSV export — use finalAmount
  const handleExportCSV = () => {
    if (!filtered.length) return;
    const headers = ['Booking ID', 'User', 'Email', 'Location', 'Spot', 'Plate', 'Status', 'Check-in', 'Check-out', 'Duration', 'Overstay Min', 'Final Amount (NPR)'];
    const rows = filtered.map((r) => [
      r._id,
      r.user?.name || 'N/A',
      r.user?.email || 'N/A',
      r.parkingSpot?.locationName || 'N/A',
      r.parkingSpot?.spotNumber || 'N/A',
      r.vehiclePlate || '',
      r.status,
      fmtDateTime(r.checkInTime),
      fmtDateTime(r.checkOutTime),
      r.actualDuration || r.duration || 0,
      r.overstayInfo?.overstayMinutes || 0,
      r.amountInfo?.finalAmount ?? r.amountInfo?.totalAmount ?? 0,
    ]);
    const csvContent = [headers.join(','), ...rows.map((row) => row.map((v) => `"${v}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Reservations_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearFilters = () => {
    setSearchQuery(''); setStatusFilter('all'); setDateFrom(''); setDateTo('');
  };
  const hasActiveFilters = searchQuery || statusFilter !== 'all' || dateFrom || dateTo;

  return (
    <>
      {selected && (
        <ReservationModal
          reservation={selected}
          onClose={() => setSelected(null)}
          onRefresh={handleRefresh}
        />
      )}

      <div className="space-y-8 animate-in fade-in duration-700 pb-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/admin')}
              className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-3xl font-extrabold text-white tracking-tight">All Reservations</h1>
              <p className="text-slate-400 text-sm font-medium">
                {filtered.length} reservation{filtered.length !== 1 ? 's' : ''} — click any row to manage
              </p>
            </div>
          </div>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm font-bold text-white hover:bg-white/10 transition-all"
          >
            <Download size={16} /> Export CSV
          </button>
        </div>

        {/* Filters */}
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5 space-y-4">
          <div className="flex items-center gap-2 text-slate-400 mb-1">
            <Filter size={14} />
            <span className="text-xs font-semibold uppercase tracking-wide">Filters</span>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="ml-auto flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors">
                <X size={12} /> Clear All
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
              <input
                type="text" placeholder="Name, email, ID, plate..."
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-11 bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 text-sm font-medium text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:bg-white/[0.06] transition-all"
              />
            </div>
            <select
              value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="h-11 bg-white/5 border border-white/10 rounded-xl px-4 text-sm font-medium text-white focus:outline-none focus:border-cyan-400 appearance-none cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="reserved">Reserved</option>
              <option value="pending">Pending</option>
              <option value="checked-in">Checked In</option>
              <option value="overstay">Overstay</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="no-show">No-Show</option>
            </select>
            <div className="relative">
              <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" size={16} />
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                className="w-full h-11 bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 text-sm font-medium text-white focus:outline-none focus:border-cyan-400 transition-all" />
            </div>
            <div className="relative">
              <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" size={16} />
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                className="w-full h-11 bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 text-sm font-medium text-white focus:outline-none focus:border-cyan-400 transition-all" />
            </div>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="py-24 flex flex-col items-center gap-4">
            <Loader2 className="animate-spin text-cyan-400" size={40} />
            <span className="text-sm font-semibold text-slate-500">Loading reservations...</span>
          </div>
        ) : error ? (
          <div className="rounded-2xl bg-red-500/[0.04] border border-red-500/20 p-12 text-center space-y-4">
            <p className="text-red-400 font-bold text-sm">{error}</p>
            <button onClick={fetchReservations} className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm font-bold text-white hover:bg-white/10 transition-all">
              Retry
            </button>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block rounded-2xl bg-white/[0.03] border border-white/[0.06] overflow-hidden shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      {['User', 'Spot', 'Check-in', 'Status', 'Amount', 'Actions'].map((h) => (
                        <th key={h} className="text-left px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-5 py-16 text-center text-slate-600 text-sm">
                          No reservations match your filters.
                        </td>
                      </tr>
                    ) : (
                      paginated.map((res) => (
                        <tr
                          key={res._id}
                          onClick={() => setSelected(res)}
                          className="border-b border-white/[0.03] hover:bg-white/[0.03] cursor-pointer transition-colors group"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center text-cyan-400 text-xs font-bold shrink-0">
                                {res.user?.name?.charAt(0)?.toUpperCase() || 'U'}
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-white truncate max-w-[150px]">{res.user?.name || 'Unknown'}</p>
                                <p className="text-[10px] text-slate-600 truncate max-w-[150px]">{res.user?.email || ''}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <p className="text-sm font-medium text-slate-300">{res.parkingSpot?.locationName || 'N/A'}</p>
                            <p className="text-[10px] text-slate-600">
                              #{res.parkingSpot?.spotNumber || '—'}
                              {res.vehiclePlate ? ` · ${res.vehiclePlate}` : ''}
                            </p>
                          </td>
                          <td className="px-5 py-4 text-sm text-slate-400">
                            {res.checkInTime ? (
                              <>
                                <p>{fmtDate(res.checkInTime)}</p>
                                <p className="text-[10px] text-slate-600">{fmtTime(res.checkInTime)}</p>
                              </>
                            ) : (
                              <span className="text-slate-600 text-xs">{fmtDate(res.scheduledArrival)}</span>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <span className={badge(res.status)}>{res.status}</span>
                            {res.overstayInfo?.overstayMinutes > 0 && (
                              <p className="text-[10px] text-orange-400 mt-1">+{res.overstayInfo.overstayMinutes}m overstay</p>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <span className="text-sm font-bold text-white">
                              NPR {res.amountInfo?.finalAmount ?? res.amountInfo?.totalAmount ?? 0}
                            </span>
                            {res.overstayInfo?.overstayCharge > 0 && (
                              <p className="text-[10px] text-orange-400">+{res.overstayInfo.overstayCharge} overstay</p>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              {res.status === 'reserved' && (
                                <span className="px-2 py-1 rounded-md bg-emerald-500/15 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                                  Check In
                                </span>
                              )}
                              {['checked-in', 'overstay'].includes(res.status) && (
                                <span className="px-2 py-1 rounded-md bg-blue-500/15 text-blue-400 text-[10px] font-bold border border-blue-500/20">
                                  Check Out
                                </span>
                              )}
                              <span className="px-2 py-1 rounded-md bg-white/5 text-slate-400 text-[10px] font-bold border border-white/10">
                                View
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {paginated.length === 0 ? (
                <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-12 text-center text-slate-600 text-sm">
                  No reservations match your filters.
                </div>
              ) : (
                paginated.map((res) => (
                  <div
                    key={res._id}
                    onClick={() => setSelected(res)}
                    className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-5 space-y-3 hover:border-white/[0.12] active:bg-white/[0.05] transition-all cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400 text-xs font-bold">
                          {res.user?.name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">{res.user?.name || 'Unknown'}</p>
                          <p className="text-[10px] text-slate-600">{res.user?.email || ''}</p>
                        </div>
                      </div>
                      <span className={badge(res.status)}>{res.status}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-slate-600">Spot</span>
                        <p className="text-white font-semibold">#{res.parkingSpot?.spotNumber || '—'}</p>
                      </div>
                      <div>
                        <span className="text-slate-600">Date</span>
                        <p className="text-white font-semibold">{fmtDate(res.checkInTime || res.scheduledArrival)}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-600">Amount</span>
                        <p className="text-white font-bold">NPR {res.amountInfo?.finalAmount ?? res.amountInfo?.totalAmount ?? 0}</p>
                      </div>
                    </div>
                    {res.overstayInfo?.overstayMinutes > 0 && (
                      <p className="text-[10px] text-orange-400 flex items-center gap-1">
                        <AlertTriangle size={10} /> {res.overstayInfo.overstayMinutes}min overstay · NPR {res.overstayInfo.overstayCharge} extra
                      </p>
                    )}
                    <p className="text-[10px] text-slate-600 text-right">Tap to manage →</p>
                  </div>
                ))
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600">Page {currentPage} of {totalPages}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30 disabled:pointer-events-none"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let page;
                    if (totalPages <= 5)          page = i + 1;
                    else if (currentPage <= 3)    page = i + 1;
                    else if (currentPage >= totalPages - 2) page = totalPages - 4 + i;
                    else                          page = currentPage - 2 + i;
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-9 h-9 rounded-lg text-xs font-bold transition-all ${
                          currentPage === page
                            ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20'
                            : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30 disabled:pointer-events-none"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
};

export default AdminReservations;
