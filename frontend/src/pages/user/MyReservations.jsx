import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import toast from 'react-hot-toast';
import { Search, MapPin, Calendar, Clock, CreditCard, ChevronRight, AlertTriangle, ShieldCheck, Ticket, XCircle, CheckCircle2, Loader2, Info, ArrowRight, History } from 'lucide-react';
import { API_BASE } from '../../config/api';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Skeleton from '../../components/ui/Skeleton';

const MyReservations = () => {
  const [reservations, setReservations] = useState([]);
  const [waitlistEntries, setWaitlistEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancellingId, setCancellingId] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.success) {
      toast.success(location.state.message || 'Booking confirmed!');
    }
    fetchReservations();
  }, [location.state?.success, location.state?.message]);

  const fetchReservations = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/reservations/my`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setReservations(data.data);
      } else {
        setError(data.message || 'Failed to fetch reservations');
      }

      const waitlistRes = await fetch(`${API_BASE}/reservations/waitlist/my`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const waitlistData = await waitlistRes.json();
      if (waitlistData.success) setWaitlistEntries(waitlistData.data || []);
    } catch (error) {
      console.error('Error fetching reservations:', error);
      setError('Failed to load reservations');
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveWaitlist = async (entryId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/reservations/waitlist/${entryId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Removed from waitlist');
        fetchReservations();
      } else {
        toast.error(data.message || 'Failed to remove waitlist entry');
      }
    } catch {
      toast.error('Failed to remove waitlist entry');
    }
  };

  const getStatusConfig = (status) => {
    const configs = {
      'reserved': { 
        text: 'Confirmed', 
        colorClass: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20 shadow-[0_0_15px_rgba(0,242,255,0.1)]',
        bullet: 'bg-cyan-400'
      },
      'checked-in': { 
        text: 'Active', 
        colorClass: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20 shadow-[0_0_15px_rgba(16,185,129,0.1)] animate-pulse',
        bullet: 'bg-emerald-400'
      },
      'completed': { 
        text: 'Completed', 
        colorClass: 'text-slate-500 bg-white/[0.02] border-white/[0.05]',
        bullet: 'bg-slate-500'
      },
      'cancelled': { 
        text: 'Cancelled', 
        colorClass: 'text-red-400 bg-red-400/10 border-red-400/20',
        bullet: 'bg-red-400'
      },
      'expired': { 
        text: 'Expired', 
        colorClass: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
        bullet: 'bg-amber-400'
      }
    };
    return configs[status] || configs['reserved'];
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit'
    });
  };

  const handleViewTicket = (reservation) => {
    navigate('/ticket', {
      state: {
        spot: reservation.parkingSpot,
        duration: reservation.duration,
        totalAmount: reservation.finalAmount || reservation.totalAmount,
        paymentMethod: reservation.paymentMethod || 'khalti',
        bookingId: reservation._id,
        createdAt: reservation.createdAt,
        scheduledArrival: reservation.scheduledArrival,
        paymentStatus: reservation.paymentStatus || 'pending',
        status: reservation.status
      }
    });
  };

  const handleCancelReservation = async (reservationId) => {
    const result = await Swal.fire({
      title: 'Cancel reservation?',
      html: '<p style="text-align:left;margin:0;font-size:14px;line-height:1.6;color:#94a3b8;font-family:Inter,sans-serif;">This action will release your spot back to the system. This cannot be undone.</p>',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, cancel it',
      cancelButtonText: 'Keep booking',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: 'rgba(255,255,255,0.05)',
      background: '#0a0a0a',
      color: '#ffffff',
      customClass: {
        popup: 'rounded-[2rem] border border-white/10 backdrop-blur-xl shadow-2xl',
        title: 'font-display font-black text-2xl pt-6',
        confirmButton: 'rounded-xl px-6 py-3 font-bold uppercase tracking-widest text-xs',
        cancelButton: 'rounded-xl px-6 py-3 font-bold uppercase tracking-widest text-xs'
      }
    });

    if (!result.isConfirmed) return;

    setCancellingId(reservationId);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/reservations/${reservationId}/cancel`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      
      if (data.success) {
        toast.success('Booking cancelled.');
        fetchReservations();
      } else {
        toast.error(data.message || 'Failed to cancel reservation');
      }
    } catch (error) {
      console.error('Error cancelling reservation:', error);
      toast.error('Failed to cancel reservation.');
    } finally {
      setCancellingId(null);
    }
  };

  const handleCheckOut = (reservation) => {
    Swal.fire({
       title: 'Check-out sequence?',
       text: 'Validate final departure protocol.',
       icon: 'info',
       showCancelButton: true,
       confirmButtonText: 'Confirm Exit',
       background: '#0a0a0a',
       color: '#ffffff',
       confirmButtonColor: '#00F2FF',
       customClass: { popup: 'rounded-[2rem] border border-white/10' }
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-8 pt-32 space-y-8">
        <div className="w-full max-w-4xl space-y-6">
          <div className="h-12 w-48 bg-white/5 rounded-xl animate-pulse" />
          <div className="grid md:grid-cols-2 gap-8">
            <div className="h-64 bg-white/5 rounded-3xl animate-pulse" />
            <div className="h-64 bg-white/5 rounded-3xl animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 pt-32 text-center space-y-8">
        <div className="w-20 h-20 rounded-[2.5rem] bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mx-auto">
          <AlertTriangle size={40} />
        </div>
        <div className="space-y-2">
          <h3 className="text-3xl font-black font-display tracking-tight text-white uppercase">Sync Failed</h3>
          <p className="text-slate-500 font-medium max-w-xs mx-auto leading-relaxed">{error}</p>
        </div>
        <Button onClick={fetchReservations}>Retry Connection</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-32 pb-24 px-6 max-w-7xl mx-auto space-y-12 animate-in fade-in duration-700">
      
      <div className="fixed top-0 right-0 w-[400px] h-[400px] bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none -z-10" />

      {/* Page Header */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-10 border-b border-white/[0.06]">
        <div className="space-y-2">
           <div className="flex items-center gap-2 text-cyan-400 mb-1">
              <History size={14} className="fill-current" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Telemetry Logs</span>
           </div>
           <h1 className="text-5xl md:text-6xl font-black font-display tracking-tight text-white uppercase">My Bookings</h1>
           <p className="text-slate-500 font-medium italic">Monitoring active permits and historical temporal records.</p>
        </div>
        <Button 
          onClick={() => navigate('/parking')}
          className="group flex items-center gap-3 !px-8 !py-4"
        >
          Locate Capacity <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
        </Button>
      </section>

      {/* Info Banner */}
      <Card className="!p-6 border-cyan-500/20 bg-cyan-500/[0.02] flex items-start gap-6">
        <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center shrink-0 text-cyan-400 shadow-[0_0_20px_rgba(0,242,255,0.1)]">
          <Info size={24} />
        </div>
        <div className="space-y-1">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Validation Protocol</span>
          <p className="text-sm text-slate-400 font-medium leading-relaxed">
            Arrival verification must occur within <span className="text-cyan-400 font-bold">15 minutes</span> of scheduled epoch. 
            Scanning the temporal QR at the gate is mandatory to activate grid allocation.
          </p>
        </div>
      </Card>

      {/* Waitlist */}
      {waitlistEntries.length > 0 && (
        <section className="space-y-6">
           <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Active Waitlists</h2>
           </div>
           <div className="grid gap-4">
              {waitlistEntries.map((entry) => (
                <Card key={entry._id} className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 !p-6 hover:bg-white/[0.03]">
                   <div className="grid grid-cols-2 md:grid-cols-4 gap-8 flex-1">
                      <div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 block mb-1">Zone</span>
                        <span className="text-sm font-bold text-white block">{entry.parkingSpot?.locationName}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 block mb-1">Node</span>
                        <span className="text-sm font-black text-cyan-400 block font-display">#{entry.parkingSpot?.spotNumber}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 block mb-1">Scheduled</span>
                        <span className="text-sm font-bold text-white block">{new Date(entry.scheduledArrival).toLocaleDateString()}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 block mb-1">Link</span>
                        <span className="text-sm font-bold text-slate-400 block">{entry.duration}m Parking</span>
                      </div>
                   </div>
                   <Button variant="danger" onClick={() => handleLeaveWaitlist(entry._id)} className="!py-2 !px-5 !text-[10px]">Leave List</Button>
                </Card>
              ))}
           </div>
        </section>
      )}

      {/* Reservations Grid */}
      <section className="space-y-8">
        {reservations.length === 0 ? (
          <Card className="py-24 text-center space-y-6 border-dashed bg-transparent">
            <div className="w-20 h-20 rounded-[2rem] bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-slate-800">
              <Search size={32} />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black font-display text-white uppercase tracking-tight">Zero Permits Found</h3>
              <p className="text-slate-500 font-medium max-w-xs mx-auto">Your allocation database is currently empty. Initialize a search to begin.</p>
            </div>
            <Button variant="secondary" onClick={() => navigate('/parking')}>Browse Grid</Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {reservations.map((reservation) => {
              const config = getStatusConfig(reservation.status);
              return (
                <Card key={reservation._id} className="!p-10 flex flex-col justify-between gap-10 group relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/[0.02] rounded-full blur-3xl group-hover:bg-cyan-500/[0.05] transition-colors" />
                   
                   <div className="flex justify-between items-start relative z-10">
                      <div className="space-y-2">
                         <div className="flex items-center gap-2 text-cyan-400">
                            <MapPin size={16} />
                            <span className="text-[10px] font-black uppercase tracking-widest leading-none">Identified Node</span>
                         </div>
                         <h3 className="text-3xl font-black font-display text-white group-hover:text-cyan-400 transition-colors leading-tight">
                            {reservation.parkingSpot?.locationName}
                         </h3>
                         <p className="text-sm text-slate-500 font-medium truncate max-w-[280px]">
                            {reservation.parkingSpot?.location?.address || 'Standard Sector'}
                         </p>
                      </div>
                      
                      <div className={`px-4 py-2 rounded-2xl border text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${config.colorClass}`}>
                         <div className={`w-2 h-2 rounded-full ${config.bullet}`} />
                         {config.text}
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-8 border-t border-white/5 pt-8 relative z-10">
                      <div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 block mb-1">Unit ID</span>
                        <span className="text-2xl font-display font-black text-white tracking-tighter">#{reservation.parkingSpot?.spotNumber}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 block mb-1">Fee Structure</span>
                        <span className="text-2xl font-display font-black text-cyan-400 tracking-tighter">Rs. {reservation.totalAmount}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 block mb-1">Epoch window</span>
                        <div className="text-xs font-bold text-slate-300 leading-tight">
                           <span className="block mb-1">{formatDate(reservation.scheduledArrival || reservation.reservationTime)}</span>
                           <span className="text-cyan-400">{formatTime(reservation.scheduledArrival || reservation.reservationTime)}</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 block mb-1">Method / Status</span>
                        <div className="flex flex-col gap-1.5">
                           <span className="text-[10px] font-bold text-white uppercase tracking-widest">{reservation.paymentMethod === 'cash' ? 'Offline' : 'Online'}</span>
                           <span className={`inline-block w-fit px-2 py-0.5 rounded text-[8px] font-black uppercase ${reservation.paymentStatus === 'completed' || reservation.paymentStatus === 'paid' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                              {reservation.paymentStatus || 'pending'}
                           </span>
                        </div>
                      </div>
                   </div>

                   <div className="flex gap-4 pt-4 relative z-10">
                      {reservation.status === 'reserved' && (
                        <>
                           <Button onClick={() => handleViewTicket(reservation)} className="flex-1">View Ticket</Button>
                           <button 
                             onClick={() => handleCancelReservation(reservation._id)}
                             disabled={cancellingId === reservation._id}
                             className="w-14 h-14 rounded-2xl bg-red-500/5 text-red-500 border border-red-500/10 flex items-center justify-center hover:bg-red-500/10 transition-all"
                           >
                              {cancellingId === reservation._id ? <Loader2 className="animate-spin" size={20} /> : <XCircle size={22} />}
                           </button>
                        </>
                      )}
                      
                      {reservation.status === 'checked-in' && (
                        <>
                           <Button variant="secondary" onClick={() => handleViewTicket(reservation)} className="flex-1">Active Ticket</Button>
                           <Button onClick={() => handleCheckOut(reservation)} className="flex-[2] !bg-emerald-500 hover:!bg-emerald-600 shadow-emerald-500/20 animate-pulse">Terminate Session</Button>
                        </>
                      )}
                      
                      {reservation.status === 'completed' && (
                        <Button variant="secondary" onClick={() => handleViewTicket(reservation)} className="w-full flex items-center justify-center gap-3 group">
                           View Receipt <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                        </Button>
                      )}

                      {(reservation.status === 'cancelled' || reservation.status === 'expired') && (
                        <div className="w-full h-14 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-slate-700">
                           <XCircle size={16} /> {reservation.status === 'cancelled' ? 'Permit Revoked' : 'Window Expired'}
                        </div>
                      )}
                   </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default MyReservations;
