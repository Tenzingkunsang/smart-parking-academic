import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Download,
  Loader2,
  ArrowLeft,
  Calendar,
  Filter,
  ChevronLeft,
  ChevronRight,
  User,
  MapPin,
  Clock,
  CreditCard,
  X,
} from 'lucide-react';
import { API_BASE } from '../../config/api';

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

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  // Filter logic
  const filtered = reservations.filter((r) => {
    const q = searchQuery.toLowerCase().trim();
    const matchSearch =
      !q ||
      r.user?.name?.toLowerCase().includes(q) ||
      r.user?.email?.toLowerCase().includes(q) ||
      r._id?.toLowerCase().includes(q);

    const matchStatus = statusFilter === 'all' || r.status === statusFilter;

    const bookingDate = new Date(r.reservationTime || r.createdAt);
    const matchDateFrom = !dateFrom || bookingDate >= new Date(dateFrom);
    const matchDateTo = !dateTo || bookingDate <= new Date(dateTo + 'T23:59:59');

    return matchSearch && matchStatus && matchDateFrom && matchDateTo;
  });

  // Pagination
  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, dateFrom, dateTo]);

  // CSV export
  const handleExportCSV = () => {
    if (!filtered.length) return;
    const headers = ['Booking ID', 'User Name', 'User Email', 'Location', 'Spot Number', 'Status', 'Date', 'Time', 'Amount'];
    const rows = filtered.map((r) => [
      r._id,
      r.user?.name || 'N/A',
      r.user?.email || 'N/A',
      r.parkingSpot?.locationName || 'N/A',
      r.parkingSpot?.spotNumber || 'N/A',
      r.status,
      new Date(r.reservationTime || r.createdAt).toLocaleDateString(),
      new Date(r.reservationTime || r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      r.totalAmount || r.amountInfo?.totalAmount || 0,
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

  const getStatusBadge = (status) => {
    const styles = {
      reserved: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
      'checked-in': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
      completed: 'bg-slate-500/15 text-slate-300 border-slate-500/20',
      cancelled: 'bg-red-500/15 text-red-400 border-red-500/20',
      'no-show': 'bg-amber-500/15 text-amber-400 border-amber-500/20',
      overstay: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
      pending: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
    };
    return styles[status] || 'bg-slate-500/15 text-slate-400 border-slate-500/20';
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setDateFrom('');
    setDateTo('');
  };

  const hasActiveFilters = searchQuery || statusFilter !== 'all' || dateFrom || dateTo;

  return (
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
              {filtered.length} reservation{filtered.length !== 1 ? 's' : ''} found
            </p>
          </div>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm font-bold text-white hover:bg-white/10 transition-all"
        >
          <Download size={16} />
          Export CSV
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
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
            <input
              type="text"
              placeholder="Search user or booking ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 text-sm font-medium text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:bg-white/[0.06] transition-all"
            />
          </div>
          {/* Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-11 bg-white/5 border border-white/10 rounded-xl px-4 text-sm font-medium text-white focus:outline-none focus:border-cyan-400 appearance-none cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="reserved">Reserved</option>
            <option value="pending">Pending</option>
            <option value="checked-in">Checked In</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="no-show">No-Show</option>
            <option value="overstay">Overstay</option>
          </select>
          {/* Date From */}
          <div className="relative">
            <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" size={16} />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full h-11 bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 text-sm font-medium text-white focus:outline-none focus:border-cyan-400 transition-all"
              placeholder="From date"
            />
          </div>
          {/* Date To */}
          <div className="relative">
            <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" size={16} />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full h-11 bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 text-sm font-medium text-white focus:outline-none focus:border-cyan-400 transition-all"
              placeholder="To date"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-24 flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-cyan-400" size={40} />
          <span className="text-sm font-semibold text-slate-500">Loading reservations...</span>
        </div>
      ) : error ? (
        <div className="rounded-2xl bg-red-500/[0.04] border border-red-500/20 p-12 text-center space-y-4">
          <p className="text-red-400 font-bold text-sm">{error}</p>
          <button
            onClick={fetchReservations}
            className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm font-bold text-white hover:bg-white/10 transition-all"
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block rounded-2xl bg-white/[0.03] border border-white/[0.06] overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">User</th>
                    <th className="text-left px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">Spot</th>
                    <th className="text-left px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">Date</th>
                    <th className="text-left px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">Time</th>
                    <th className="text-left px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">Status</th>
                    <th className="text-right px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">Amount</th>
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
                      <tr key={res._id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center text-cyan-400 text-xs font-bold">
                              {res.user?.name?.charAt(0)?.toUpperCase() || 'U'}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-white truncate max-w-[160px]">
                                {res.user?.name || 'Unknown User'}
                              </p>
                              <p className="text-[10px] text-slate-600 truncate max-w-[160px]">{res.user?.email || ''}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="text-sm font-medium text-slate-300">
                            {res.parkingSpot?.locationName || 'N/A'}
                          </div>
                          <div className="text-[10px] text-slate-600">
                            Spot #{res.parkingSpot?.spotNumber || '—'}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-300">
                          {new Date(res.reservationTime || res.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-400">
                          {new Date(res.reservationTime || res.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide border ${getStatusBadge(
                              res.status
                            )}`}
                          >
                            {res.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <span className="text-sm font-bold text-white">
                            Rs. {res.totalAmount || res.amountInfo?.totalAmount || 0}
                          </span>
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
                  className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-5 space-y-3 hover:border-white/[0.12] transition-all"
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
                    <span
                      className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${getStatusBadge(res.status)}`}
                    >
                      {res.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-slate-600">Spot</span>
                      <p className="text-white font-semibold">#{res.parkingSpot?.spotNumber || '—'}</p>
                    </div>
                    <div>
                      <span className="text-slate-600">Date</span>
                      <p className="text-white font-semibold">
                        {new Date(res.reservationTime || res.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-600">Amount</span>
                      <p className="text-white font-bold">Rs. {res.totalAmount || 0}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-600">
                Page {currentPage} of {totalPages}
              </span>
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
                  if (totalPages <= 5) {
                    page = i + 1;
                  } else if (currentPage <= 3) {
                    page = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    page = totalPages - 4 + i;
                  } else {
                    page = currentPage - 2 + i;
                  }
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
  );
};

export default AdminReservations;
