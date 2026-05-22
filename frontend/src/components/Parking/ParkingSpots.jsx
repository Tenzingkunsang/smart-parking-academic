import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, X, ChevronRight, Filter, Zap, LayoutGrid, Clock, List, Loader2, Navigation, Info, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';
import parkingService from '../../services/parkingService';
import BookingModal from './BookingModal';
import ParkingMap from './ParkingMap';
import SpotAmenities from './SpotAmenities';
import LotGridModal from './Lotgridmodal';
import ActiveBookingBanner from './ActiveBookingBanner';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { clusterSpotsByGrid, haversineMeters, formatDistance } from '../../utils/geo';
import { API_BASE, getSocketOrigin } from '../../config/api';

const GEOFENCE_RADIUS_M = 500;

const ParkingSpots = () => {
  const [spots, setSpots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [vehicleFilter, setVehicleFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [selectedSpotId, setSelectedSpotId] = useState(null);
  const [hoveredSpotId, setHoveredSpotId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalSpot, setModalSpot] = useState(null);
  const [userPosition, setUserPosition] = useState(null);
  const [geoConfirm, setGeoConfirm] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [lotGridSpot, setLotGridSpot] = useState(null);
  const [activeBooking, setActiveBooking] = useState(null);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [modalMode, setModalMode] = useState('book');

  const cardRefs = useRef({});
  const navigate = useNavigate();

  const fetchSpots = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/parking/spots`);
      const data = await res.json();
      if (data.success) setSpots(data.data);
    } finally { setLoading(false); }
  }, []);

  const fetchActiveBooking = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/reservations/my`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) {
        const active = (data.data || []).find(r => r.status === 'reserved' || r.status === 'checked-in');
        setActiveBooking(active || null);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchSpots();
    fetchActiveBooking();
    const socket = io(getSocketOrigin(), { auth: { token: localStorage.getItem('token') } });
    socket.on('connect', () => setSocketConnected(true));
    socket.on('spot:statusChanged', fetchSpots);
    socket.on('disconnect', () => setSocketConnected(false));
    return () => socket.disconnect();
  }, [fetchSpots, fetchActiveBooking]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setUserPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {}, { enableHighAccuracy: true }
      );
    }
  }, []);

  const filteredSpots = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return spots.filter(s => {
      if (filter !== 'all' && s.status !== filter) return false;
      if (vehicleFilter !== 'all' && s.vehicleType !== vehicleFilter) return false;
      if (q && !s.locationName.toLowerCase().includes(q)) return false;
      if (priceMax && s.price > parseInt(priceMax)) return false;
      return true;
    }).map(s => {
      let d = null;
      if (userPosition && s.location?.lat != null) d = haversineMeters(userPosition.lat, userPosition.lng, s.location.lat, s.location.lng);
      return { ...s, distanceMeters: d };
    });
  }, [spots, filter, vehicleFilter, searchQuery, priceMax, userPosition]);

  const clusters = useMemo(() => clusterSpotsByGrid(filteredSpots, 0.012), [filteredSpots]);

  const openBooking = useCallback((spot) => {
    const token = localStorage.getItem('token');
    if (!token) { navigate('/login'); return; }
    setModalSpot(spot);
    setModalMode('book');
    setShowModal(true);
  }, [navigate]);

  const openWaitlist = useCallback((spot) => {
    const token = localStorage.getItem('token');
    if (!token) { navigate('/login'); return; }
    setModalSpot(spot);
    setModalMode('waitlist');
    setShowModal(true);
  }, [navigate]);

  const handleConfirmBooking = async (spotId, duration, scheduledArrival) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/reservations/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ parkingSpotId: spotId, duration, quantity: 1, scheduledArrival }),
      });
      const data = await response.json();
      if (data.success) {
        navigate('/payment', {
          state: {
            spot: modalSpot,
            duration,
            totalAmount: data.data.totalAmount,
            pendingReservationId: data.data.reservationId,
            createdAt: new Date().toISOString(),
            scheduledArrival,
          },
        });
      } else {
        toast.error(data.message || 'Booking failed');
      }
    } catch {
      toast.error('Booking failed. Please try again.');
    } finally {
      setShowModal(false);
    }
  };

  const handleJoinWaitlist = async (spotId, duration, scheduledArrival) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/reservations/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ parkingSpotId: spotId, duration, scheduledArrival, quantity: 1 }),
      });
      const data = await response.json();
      if (data.success) toast.success('Waitlist entry confirmed');
      else toast.error(data.message || 'Waitlist failed');
    } catch {
      toast.error('Waitlist failed');
    } finally {
      setShowModal(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-cyan-400" size={48} />
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Mapping Grid Capacity...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col relative font-sans">
      
      {activeBooking && (
        <ActiveBookingBanner
          booking={activeBooking}
          onViewTicket={() => navigate('/reservations')}
        />
      )}

      {/* Map Layer */}
      <div className={`relative transition-all duration-700 ease-in-out z-10 ${mapExpanded ? 'h-[75vh]' : 'h-[40vh] md:h-[500px]'}`}>
        <ParkingMap
          clusters={clusters}
          selectedSpotId={selectedSpotId}
          onSpotClick={s => { setSelectedSpotId(s._id); setMapExpanded(false); }}
          userPosition={userPosition}
        />
        <div className="absolute bottom-6 right-6 flex flex-col gap-3 z-20">
           <button onClick={() => setMapExpanded(!mapExpanded)} className="w-12 h-12 rounded-2xl bg-[#050505]/80 backdrop-blur-xl border border-white/10 text-white flex items-center justify-center shadow-2xl hover:border-cyan-400/40 transition-all">
              {mapExpanded ? <X size={20} /> : <Navigation size={20} />}
           </button>
        </div>
      </div>

      {/* Interface Layer */}
      <section className="flex-1 bg-gradient-to-b from-[#0a0a0a] to-[#050505] border-t border-white/[0.08] rounded-t-[2.5rem] mt-[-2rem] relative z-20 shadow-[0_-20px_50px_rgba(0,0,0,0.5)] px-6 md:px-10 pb-24">
        
        <div className="w-16 h-1.5 bg-white/10 rounded-full mx-auto my-8 opacity-50" />

        <div className="max-w-7xl mx-auto space-y-12">
          
          <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="space-y-1">
               <h1 className="text-4xl font-black font-display tracking-tight text-white uppercase italic">Grid Capacity</h1>
               <div className="flex items-center gap-3 text-slate-500 font-bold text-[10px] uppercase tracking-widest">
                  <div className={`w-1.5 h-1.5 rounded-full ${socketConnected ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-amber-500 animate-pulse'}`} />
                  {socketConnected ? 'Live Connection' : 'Synchronizing'} · {filteredSpots.length} Nodes Identified
               </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
               <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-400 transition-colors" size={18} />
                  <input
                    type="text"
                    placeholder="Search Sector ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full md:w-80 h-14 bg-white/[0.03] border border-white/[0.08] rounded-2xl pl-12 pr-4 text-sm font-bold text-white focus:outline-none focus:border-cyan-400/40 transition-all"
                  />
               </div>
            </div>
          </header>

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filteredSpots.map((spot) => (
              <Card 
                key={spot._id}
                className={`group flex flex-col justify-between h-[420px] transition-all duration-500 border-white/[0.06] hover:border-cyan-400/30 ${selectedSpotId === spot._id ? 'border-cyan-400 shadow-[0_0_40px_rgba(0,242,255,0.05)]' : ''}`}
              >
                <div className="space-y-6">
                  <div className="flex justify-between items-start">
                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                      spot.status === 'available' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-white/5 border-white/5 text-slate-600'
                    }`}>
                      {spot.status}
                    </span>
                    <span className="text-[10px] font-display font-black text-cyan-400 block tracking-tighter">#{spot.spotNumber}</span>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-xl font-black font-display text-white group-hover:text-cyan-400 transition-colors leading-tight truncate">{spot.locationName}</h3>
                    <p className="text-[10px] text-slate-500 font-medium truncate flex items-center gap-1 uppercase tracking-widest">
                      <MapPin size={10} className="text-cyan-400" /> {spot.location?.address || 'KTM Grid'}
                    </p>
                  </div>

                  <div className="flex items-center gap-8">
                     <div>
                        <span className="text-[8px] font-black text-slate-700 uppercase tracking-widest block mb-1">Rate</span>
                        <span className="text-xl font-display font-black text-white italic">Rs.{spot.price}</span>
                     </div>
                     <div>
                        <span className="text-[8px] font-black text-slate-700 uppercase tracking-widest block mb-1">Range</span>
                        <span className="text-xl font-display font-black text-slate-400">{formatDistance(spot.distanceMeters)}</span>
                     </div>
                  </div>

                  <SpotAmenities features={spot.features} variant="minimal" />
                </div>

                <div className="flex gap-3 pt-6 border-t border-white/5 mt-auto">
                   <button onClick={() => setLotGridSpot(spot)} className="w-12 h-12 rounded-xl bg-white/5 border border-white/5 text-slate-500 flex items-center justify-center hover:text-white transition-all">
                      <LayoutGrid size={18} />
                   </button>
                   <Button 
                    onClick={() => spot.status === 'available' ? openBooking(spot) : openWaitlist(spot)} 
                    className="flex-1 !py-0 h-12 !text-[10px]"
                    variant={spot.status === 'available' ? 'primary' : 'secondary'}
                   >
                      {spot.status === 'available' ? 'Secure Node' : 'Waitlist Link'}
                   </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {modalSpot && (
        <BookingModal
          spot={modalSpot}
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onConfirm={handleConfirmBooking}
          onJoinWaitlist={handleJoinWaitlist}
          mode={modalMode}
        />
      )}

      {lotGridSpot && (
        <LotGridModal
          spot={lotGridSpot}
          onClose={() => setLotGridSpot(null)}
          onBook={openBooking}
        />
      )}
    </div>
  );
};

export default ParkingSpots;
