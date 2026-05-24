import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign,
  CalendarCheck,
  RotateCcw,
  Loader2,
  QrCode,
  ClipboardList,
  ParkingSquare,
  TrendingUp,
  Camera,
} from 'lucide-react';
import { API_BASE } from '../../config/api';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentBookings, setRecentBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };

        // Fetch stats
        const statsRes = await fetch(`${API_BASE}/admin/stats`, { headers });
        const statsData = await statsRes.json();
        if (statsData.success) setStats(statsData.data);

        // Fetch recent reservations (last 5)
        const resRes = await fetch(`${API_BASE}/admin/reservations`, { headers });
        const resData = await resRes.json();
        if (resData.success) {
          const sorted = (resData.data || [])
            .sort((a, b) => new Date(b.reservationTime || b.createdAt) - new Date(a.reservationTime || a.createdAt))
            .slice(0, 5);
          setRecentBookings(sorted);
        }
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Loader2 className="animate-spin text-cyan-400" size={44} />
        <span className="text-sm font-semibold text-slate-400 tracking-wide">Loading Dashboard...</span>
      </div>
    );
  }

  const pendingRefunds = (recentBookings || []).filter(
    (b) => b.status === 'cancelled' && b.refundInfo?.refundStatus === 'pending'
  ).length;

  const statCards = [
    {
      label: 'Total Revenue',
      value: `Rs. ${stats?.totalRevenue?.toLocaleString() || '0'}`,
      icon: DollarSign,
      gradient: 'from-emerald-500 to-teal-600',
      bgGlow: 'shadow-emerald-500/20',
      iconBg: 'bg-emerald-500/15',
      iconColor: 'text-emerald-400',
    },
    {
      label: "Today's Revenue",
      value: `Rs. ${stats?.todayRevenue?.toLocaleString() || '0'}`,
      icon: TrendingUp,
      gradient: 'from-blue-500 to-indigo-600',
      bgGlow: 'shadow-blue-500/20',
      iconBg: 'bg-blue-500/15',
      iconColor: 'text-blue-400',
    },
    {
      label: 'Active Bookings',
      value: stats?.activeReservations || 0,
      icon: CalendarCheck,
      gradient: 'from-violet-500 to-purple-600',
      bgGlow: 'shadow-violet-500/20',
      iconBg: 'bg-violet-500/15',
      iconColor: 'text-violet-400',
    },
    {
      label: 'Pending Refunds',
      value: pendingRefunds,
      icon: RotateCcw,
      gradient: 'from-amber-500 to-orange-600',
      bgGlow: 'shadow-amber-500/20',
      iconBg: 'bg-amber-500/15',
      iconColor: 'text-amber-400',
    },
  ];

  const getStatusBadge = (status) => {
    const styles = {
      reserved: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
      'checked-in': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
      completed: 'bg-slate-500/15 text-slate-400 border-slate-500/20',
      cancelled: 'bg-red-500/15 text-red-400 border-red-500/20',
      'no-show': 'bg-amber-500/15 text-amber-400 border-amber-500/20',
      overstay: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
    };
    return styles[status] || 'bg-slate-500/15 text-slate-400 border-slate-500/20';
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-10">

      {/* ─── Page Header ─── */}
      <div className="space-y-1">
        <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
          Admin Dashboard
        </h1>
        <p className="text-slate-400 text-sm font-medium">
          Manage your Smart Parking system at a glance.
        </p>
      </div>

      {/* ─── 4 Stat Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((card) => (
          <div
            key={card.label}
            className={`relative overflow-hidden rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6 hover:border-white/[0.12] transition-all duration-300 shadow-lg ${card.bgGlow}`}
          >
            <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-gradient-to-br opacity-10" />
            <div className="flex items-start justify-between mb-4">
              <div className={`w-12 h-12 rounded-xl ${card.iconBg} flex items-center justify-center`}>
                <card.icon size={22} className={card.iconColor} />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">{card.value}</p>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ─── 3 Large Action Buttons ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* QR Scanner */}
        <button
          onClick={() => navigate('/admin/qr-scanner')}
          className="group relative overflow-hidden rounded-2xl py-5 px-6 md:py-6 md:px-8 text-left transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 shadow-xl shadow-blue-600/20 hover:shadow-blue-500/30"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-8 translate-x-8 group-hover:scale-150 transition-transform duration-500" />
          <div className="relative z-10 flex flex-col gap-3">
            <Camera size={28} className="text-blue-200" />
            <span className="text-lg md:text-xl font-bold text-white tracking-tight">QR Scanner</span>
            <span className="text-blue-200/70 text-xs font-medium">Scan for check-in / check-out</span>
          </div>
        </button>

        {/* View Reservations */}
        <button
          onClick={() => navigate('/admin/reservations')}
          className="group relative overflow-hidden rounded-2xl py-5 px-6 md:py-6 md:px-8 text-left transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] bg-gradient-to-br from-emerald-600 to-green-700 hover:from-emerald-500 hover:to-green-600 shadow-xl shadow-emerald-600/20 hover:shadow-emerald-500/30"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-8 translate-x-8 group-hover:scale-150 transition-transform duration-500" />
          <div className="relative z-10 flex flex-col gap-3">
            <ClipboardList size={28} className="text-emerald-200" />
            <span className="text-lg md:text-xl font-bold text-white tracking-tight">View Reservations</span>
            <span className="text-emerald-200/70 text-xs font-medium">Browse all user bookings</span>
          </div>
        </button>

        {/* Manage Parking Spots */}
        <button
          onClick={() => navigate('/admin/manage-spots')}
          className="group relative overflow-hidden rounded-2xl py-5 px-6 md:py-6 md:px-8 text-left transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] bg-gradient-to-br from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 shadow-xl shadow-orange-500/20 hover:shadow-orange-400/30"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-8 translate-x-8 group-hover:scale-150 transition-transform duration-500" />
          <div className="relative z-10 flex flex-col gap-3">
            <ParkingSquare size={28} className="text-orange-200" />
            <span className="text-lg md:text-xl font-bold text-white tracking-tight">Manage Parking Spots</span>
            <span className="text-orange-200/70 text-xs font-medium">Add, edit, or remove spots</span>
          </div>
        </button>
      </div>

      {/* ─── Recent Bookings Table ─── */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] overflow-hidden shadow-lg">
        <div className="px-6 py-5 border-b border-white/[0.06] flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Recent Bookings</h2>
            <p className="text-xs text-slate-500 mt-0.5">Last 5 reservations</p>
          </div>
          <button
            onClick={() => navigate('/admin/reservations')}
            className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            View All →
          </button>
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.04]">
                <th className="text-left px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-600">User</th>
                <th className="text-left px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-600">Spot</th>
                <th className="text-left px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-600">Amount</th>
                <th className="text-left px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-600">Status</th>
                <th className="text-left px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-600">Time</th>
              </tr>
            </thead>
            <tbody>
              {recentBookings.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-slate-600 text-sm">
                    No bookings found.
                  </td>
                </tr>
              ) : (
                recentBookings.map((booking) => (
                  <tr
                    key={booking._id}
                    className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center text-cyan-400 text-xs font-bold">
                          {booking.user?.name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <span className="text-sm font-semibold text-white truncate max-w-[140px]">
                          {booking.user?.name || 'Unknown User'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-slate-300">
                        {booking.parkingSpot?.spotNumber
                          ? `#${booking.parkingSpot.spotNumber}`
                          : booking.parkingSpot?.locationName || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-white">
                        Rs. {booking.totalAmount || booking.amountInfo?.totalAmount || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide border ${getStatusBadge(
                          booking.status
                        )}`}
                      >
                        {booking.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-400">
                        {new Date(booking.reservationTime || booking.createdAt).toLocaleDateString()}
                      </div>
                      <div className="text-[10px] text-slate-600">
                        {new Date(booking.reservationTime || booking.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile card list */}
        <div className="md:hidden divide-y divide-white/[0.04]">
          {recentBookings.length === 0 ? (
            <div className="px-6 py-12 text-center text-slate-600 text-sm">No bookings found.</div>
          ) : (
            recentBookings.map((booking) => (
              <div key={booking._id} className="px-5 py-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400 text-xs font-bold">
                      {booking.user?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <span className="text-sm font-semibold text-white">{booking.user?.name || 'Unknown'}</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${getStatusBadge(
                      booking.status
                    )}`}
                  >
                    {booking.status}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Spot {booking.parkingSpot?.spotNumber || 'N/A'}</span>
                  <span className="font-bold text-white">
                    Rs. {booking.totalAmount || booking.amountInfo?.totalAmount || 0}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
