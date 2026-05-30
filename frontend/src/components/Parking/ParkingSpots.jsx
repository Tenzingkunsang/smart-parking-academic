import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, X, ChevronRight, Zap, LayoutGrid, List, Loader2, Navigation, ArrowRight, CreditCard, Wallet, Accessibility, Umbrella, Clock, BatteryCharging, ChevronDown, SlidersHorizontal, Car, Bike } from 'lucide-react';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';
import parkingService from '../../services/parkingService';
import BookingModal from './BookingModal';
import ParkingMap from './ParkingMap';
import SpotAmenities from './SpotAmenities';
import LotGridModal from './Lotgridmodal';
import ActiveBookingBanner from './ActiveBookingBanner';
import ParkingGrid from './ParkingGrid';
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
  const [socketConnected, setSocketConnected] = useState(false);
  const [lotGridSpot, setLotGridSpot] = useState(null);
  const [activeBooking, setActiveBooking] = useState(null);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [modalMode, setModalMode] = useState('book');
  const [showFilters, setShowFilters] = useState(false);
  const [featuresFilter, setFeaturesFilter] = useState([]);

  // Location list state
  const [selectedLocationName, setSelectedLocationName] = useState(null);

  // FEATURE 6: LIVE CALCULATION STATE
  const [bookingDuration, setBookingDuration] = useState(60); 
  const [paymentMethod, setPaymentMethod] = useState('khalti');
  const [selectedSpot, setSelectedSpot] = useState(null);

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
    socket.on('parkingSpotStatusChanged', fetchSpots);
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

  const handleSpotSelect = (spot) => {
    setSelectedSpot(spot);
    setSelectedSpotId(spot ? spot._id : null);
  };

  const calculateTotalPrice = () => {
    if (!selectedSpot) return 0;
    const hours = Math.ceil(bookingDuration / 60);
    return hours * selectedSpot.price;
  };

  const filteredSpots = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return spots.filter(s => {
      if (filter !== 'all' && s.status !== filter) return false;
      if (vehicleFilter !== 'all' && !(s.vehicleTypes || []).includes(vehicleFilter)) return false;
      if (!selectedLocationName && q && !s.locationName.toLowerCase().includes(q) && !s.address?.toLowerCase().includes(q)) return false;
      if (priceMax && s.price > parseInt(priceMax)) return false;
      if (featuresFilter.length > 0 && !featuresFilter.every(f => (s.features || []).includes(f))) return false;
      return true;
    }).map(s => {
      let d = null;
      if (userPosition && s.location?.lat != null) d = haversineMeters(userPosition.lat, userPosition.lng, s.location.lat, s.location.lng);
      return { ...s, distanceMeters: d };
    });
  }, [spots, filter, vehicleFilter, searchQuery, priceMax, featuresFilter, userPosition, selectedLocationName]);

  const clusters = useMemo(() => clusterSpotsByGrid(filteredSpots, 0.012), [filteredSpots]);

  // Group filtered spots by Location Name for a clean list representation
  const locations = useMemo(() => {
    const groups = {};
    filteredSpots.forEach(spot => {
      const locName = spot.locationName || 'Unknown Lot';
      if (!groups[locName]) {
        groups[locName] = {
          name: locName,
          address: spot.address || spot.location?.address || 'Kathmandu, Nepal',
          lat: spot.location?.lat,
          lng: spot.location?.lng,
          spots: [],
          price: spot.price || 50,
          vehicleTypes: new Set()
        };
      }
      groups[locName].spots.push(spot);
      if (spot.vehicleType) {
        groups[locName].vehicleTypes.add(spot.vehicleType);
      }
    });

    return Object.values(groups).map(group => {
      // Use the model's actual space counters so a lot with 50 spaces shows "24/50"
      // rather than "1/1" (which counted documents instead of spaces).
      const total = group.spots.reduce((sum, s) => sum + (s.totalSpaces || 1), 0);
      const available = group.spots.reduce((sum, s) => sum + (s.availableSpaces || 0), 0);
      return {
        ...group,
        totalSpots: total,
        availableSpots: available,
        vehicleTypesArray: Array.from(group.vehicleTypes)
      };
    });
  }, [filteredSpots]);

  const selectedLocation = useMemo(() => {
    if (!selectedLocationName) return null;
    return locations.find(loc => loc.name === selectedLocationName);
  }, [locations, selectedLocationName]);

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

  const handleConfirmBooking = async (spotId, duration, scheduledArrival, extras = {}) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/reservations/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        // Bug NEW-4: vehicle plate now travels with the create request.
        body: JSON.stringify({
          parkingSpotId: spotId,
          duration,
          quantity: 1,
          scheduledArrival,
          vehiclePlate: extras.vehiclePlate || '',
        }),
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
          onSpotClick={s => {
            setSelectedLocationName(s.locationName);
            setSelectedSpotId(null);
            setSelectedSpot(null);
            setSearchQuery('');
            setMapExpanded(false);
          }}
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
                  {socketConnected ? 'Live Connection' : 'Synchronizing'} · {selectedLocationName && selectedLocation ? selectedLocation.spots.length : filteredSpots.length} {selectedLocationName ? 'Spots' : 'Nodes'} Identified
               </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
               <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-400 transition-colors" size={18} />
                  <input
                    type="text"
                    placeholder={selectedLocationName ? "Search Spot Number (e.g. 5)..." : "Search Location or Address..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full md:w-80 h-14 bg-white/[0.03] border border-white/[0.08] rounded-2xl pl-12 pr-4 text-sm font-bold text-white focus:outline-none focus:border-cyan-400/40 transition-all"
                  />
               </div>
            </div>
          </header>

          {/* FILTER BAR */}
          {!selectedLocationName && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                {/* Filter toggle button */}
                <button
                  onClick={() => setShowFilters(v => !v)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${showFilters ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400' : 'bg-white/[0.04] border-white/[0.08] text-slate-400 hover:text-white'}`}
                >
                  <SlidersHorizontal size={14} /> Filters
                  {(filter !== 'all' || vehicleFilter !== 'all' || priceMax || featuresFilter.length > 0) && (
                    <span className="w-4 h-4 rounded-full bg-cyan-500 text-black text-[9px] font-black flex items-center justify-center">
                      {[filter !== 'all', vehicleFilter !== 'all', !!priceMax, ...featuresFilter].filter(Boolean).length}
                    </span>
                  )}
                </button>

                {/* Availability quick pills */}
                {['all', 'available', 'full'].map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border capitalize ${filter === f ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400' : 'bg-white/[0.04] border-white/[0.08] text-slate-400 hover:text-white'}`}
                  >
                    {f === 'all' ? 'All' : f === 'available' ? '✓ Available' : '✗ Full'}
                  </button>
                ))}

                {/* Clear all */}
                {(filter !== 'all' || vehicleFilter !== 'all' || priceMax || featuresFilter.length > 0) && (
                  <button
                    onClick={() => { setFilter('all'); setVehicleFilter('all'); setPriceMax(''); setFeaturesFilter([]); }}
                    className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold text-red-400 border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 transition-all"
                  >
                    <X size={12} /> Clear
                  </button>
                )}
              </div>

              {/* Expanded filters */}
              {showFilters && (
                <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5 space-y-5 animate-in slide-in-from-top-2 duration-200">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                    {/* Vehicle type */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Vehicle Type</span>
                      <div className="flex gap-2">
                        {[
                          { val: 'all', label: 'All' },
                          { val: 'car', label: 'Car', Icon: Car },
                          { val: 'motorcycle', label: 'Bike', Icon: Bike },
                        ].map(({ val, label, Icon }) => (
                          <button
                            key={val}
                            onClick={() => setVehicleFilter(val)}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${vehicleFilter === val ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400' : 'bg-white/[0.04] border-white/[0.08] text-slate-400 hover:text-white'}`}
                          >
                            {Icon && <Icon size={13} />} {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Max price */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Max Price / hr</span>
                      <div className="flex gap-2 flex-wrap">
                        {['', '20', '40', '60', '100'].map(p => (
                          <button
                            key={p}
                            onClick={() => setPriceMax(p)}
                            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${priceMax === p ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400' : 'bg-white/[0.04] border-white/[0.08] text-slate-400 hover:text-white'}`}
                          >
                            {p ? `Rs. ${p}` : 'Any'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Features */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Features</span>
                      <div className="flex gap-2 flex-wrap">
                        {[
                          { val: 'covered', Icon: Umbrella, label: 'Covered' },
                          { val: '24_hours', Icon: Clock, label: '24/7' },
                          { val: 'handicap', Icon: Accessibility, label: 'Accessible' },
                          { val: 'ev_charging', Icon: BatteryCharging, label: 'EV' },
                        ].map(({ val, Icon, label }) => {
                          const active = featuresFilter.includes(val);
                          return (
                            <button
                              key={val}
                              onClick={() => setFeaturesFilter(prev => active ? prev.filter(f => f !== val) : [...prev, val])}
                              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${active ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400' : 'bg-white/[0.04] border-white/[0.08] text-slate-400 hover:text-white'}`}
                            >
                              <Icon size={12} /> {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* VISUAL GRID / LOCATIONS LIST */}
          <div className="space-y-6">
             {selectedLocationName && selectedLocation ? (
               <div className="space-y-6 animate-in fade-in duration-500">
                 {/* Lot details panel */}
                 <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 p-6 rounded-3xl bg-white/[0.02] border border-white/[0.06] shadow-xl">
                   <div className="space-y-1">
                     <button 
                       onClick={() => { setSelectedLocationName(null); setSelectedSpot(null); setSelectedSpotId(null); setSearchQuery(''); }}
                       className="inline-flex items-center gap-2 text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors mb-2"
                     >
                       &larr; Back to Locations
                     </button>
                     <h2 className="text-2xl font-extrabold text-white tracking-tight">{selectedLocationName}</h2>
                     <p className="text-xs text-slate-400">{selectedLocation.address}</p>
                   </div>
                   <div className="flex items-center gap-4 text-xs self-stretch md:self-auto justify-between md:justify-end">
                     <div className="px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold">
                       {selectedLocation.availableSpots} / {selectedLocation.totalSpots} Available
                     </div>
                     <div className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white font-bold">
                       Rs. {selectedLocation.price}/hr
                     </div>
                   </div>
                 </div>

                 <div className="flex items-center gap-3">
                    <LayoutGrid size={18} className="text-cyan-400" />
                    <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Visual Grid Allocation</h2>
                 </div>
                 
                 <ParkingGrid
                    spots={selectedLocation.spots.filter(s => {
                      if (searchQuery) {
                        const num = s.spotNumber != null ? String(s.spotNumber) : '';
                        const name = (s.locationName || '').toLowerCase();
                        const q = searchQuery.toLowerCase();
                        return num.includes(q) || name.includes(q);
                      }
                      return true;
                    })}
                    onSpotSelect={handleSpotSelect}
                 />
               </div>
             ) : (
               <div className="space-y-6 animate-in fade-in duration-500">
                 <div className="flex items-center gap-3">
                    <List size={18} className="text-cyan-400" />
                    <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Select a Parking Location</h2>
                 </div>

                 <div className="grid grid-cols-1 gap-4">
                   {locations.length === 0 ? (
                     <div className="rounded-3xl border border-dashed border-white/10 p-12 text-center text-slate-500 text-sm font-semibold">
                       No parking locations found matching filters.
                     </div>
                   ) : (
                     locations.map((loc) => {
                       const occupancyPercentage = Math.round((loc.availableSpots / loc.totalSpots) * 100) || 0;
                       const amenities = [];
                       // Aggregate amenities from spots
                       loc.spots.forEach(spot => {
                         if (spot.features) {
                           spot.features.forEach(f => {
                             if (!amenities.includes(f)) amenities.push(f);
                           });
                         }
                       });

                       const amenityIcons = {
                         'ev_charging': { Icon: BatteryCharging, label: 'EV Charging' },
                         'handicap':    { Icon: Accessibility,   label: 'Accessible' },
                         'covered':     { Icon: Umbrella,        label: 'Covered' },
                         '24_hours':    { Icon: Clock,           label: '24/7' },
                       };

                       return (
                         <div
                           key={loc.name}
                           onClick={() => { setSelectedLocationName(loc.name); setSearchQuery(''); }}
                           className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/[0.12] hover:border-cyan-400/50 p-8 transition-all duration-500 hover:scale-[1.02] cursor-pointer shadow-2xl hover:shadow-cyan-500/20 backdrop-blur-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-8 animate-in slide-in-from-bottom-2 duration-300 hover:bg-gradient-to-br hover:from-white/[0.12] hover:to-white/[0.05]"
                         >
                           {/* Background Glow Effect */}
                           <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                             <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/5 to-cyan-500/0" />
                           </div>

                           <div className="flex items-start gap-6 flex-1 relative z-10">
                             {/* Premium Badge/Icon with Glow */}
                             <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/30 to-cyan-600/10 border border-cyan-400/40 flex items-center justify-center text-cyan-300 group-hover:from-cyan-400/50 group-hover:to-cyan-500/20 group-hover:shadow-lg group-hover:shadow-cyan-500/30 transition-all duration-500 shrink-0 backdrop-blur-sm">
                               <MapPin size={28} className="group-hover:scale-110 transition-transform duration-300 drop-shadow-lg" />
                             </div>

                             <div className="space-y-3 flex-1">
                               <div className="flex flex-wrap items-center gap-3">
                                 <h3 className="text-2xl font-extrabold text-white tracking-tight group-hover:text-cyan-100 transition-colors">{loc.name}</h3>
                                 {loc.distanceMeters !== null && (
                                   <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-400/30 backdrop-blur-sm">
                                     <Navigation size={12} />
                                     {formatDistance(loc.distanceMeters)}
                                   </span>
                                 )}
                               </div>
                               <p className="text-sm text-slate-300 font-medium max-w-md group-hover:text-slate-200 transition-colors">{loc.address}</p>
                               
                               {/* Dynamic Amenities Display */}
                               {amenities.length > 0 && (
                                 <div className="flex items-center gap-2 pt-2 flex-wrap">
                                   {amenities.slice(0, 4).map(amenity => {
                                     const info = amenityIcons[amenity] || { icon: '✓', label: amenity };
                                     return (
                                       <span key={amenity} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-white/10 to-white/5 text-slate-200 border border-white/10 hover:border-cyan-400/30 transition-all backdrop-blur-sm">
                                         {info.Icon && <info.Icon size={12} />}
                                         <span className="hidden sm:inline">{info.label}</span>
                                       </span>
                                     );
                                   })}
                                   {amenities.length > 4 && (
                                     <span className="text-xs text-slate-400 font-bold ml-2">+{amenities.length - 4} more</span>
                                   )}
                                 </div>
                               )}
                             </div>
                           </div>

                           <div className="flex items-center gap-10 w-full md:w-auto justify-between md:justify-end border-t border-white/5 md:border-t-0 pt-6 md:pt-0 shrink-0 relative z-10">
                             <div className="flex items-center gap-8">
                               <div className="text-left md:text-right">
                                 <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 block group-hover:text-slate-400 transition-colors">Price</span>
                                 <span className="text-xl font-extrabold text-white group-hover:text-cyan-100 transition-colors">Rs. {loc.price}/hr</span>
                               </div>

                               <div className="text-left md:text-right space-y-2">
                                 <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 group-hover:text-slate-400 transition-colors block">Occupancy</span>
                                 <div className="flex items-center gap-3">
                                   <span className={`text-lg font-extrabold font-display transition-colors ${
                                     loc.availableSpots > loc.totalSpots * 0.5 
                                       ? 'text-emerald-400' 
                                       : loc.availableSpots > 0 
                                         ? 'text-amber-400' 
                                         : 'text-red-400'
                                   }`}>
                                     {loc.availableSpots}/{loc.totalSpots}
                                   </span>
                                   {/* Radial/Glowing Occupancy Bar */}
                                   <div className="w-20 h-2 bg-white/5 rounded-full overflow-hidden border border-white/10 backdrop-blur-sm">
                                     <div 
                                       className={`h-full rounded-full transition-all duration-700 shadow-lg ${
                                         occupancyPercentage > 50 
                                           ? 'bg-gradient-to-r from-emerald-400 to-emerald-500 shadow-emerald-500/50' 
                                           : occupancyPercentage > 15 
                                             ? 'bg-gradient-to-r from-amber-400 to-amber-500 shadow-amber-500/50' 
                                             : 'bg-gradient-to-r from-red-400 to-red-500 shadow-red-500/50'
                                       }`}
                                       style={{ width: `${occupancyPercentage}%` }}
                                     />
                                   </div>
                                 </div>
                               </div>
                             </div>

                             <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center text-slate-400 group-hover:text-cyan-300 group-hover:from-cyan-500/20 group-hover:to-cyan-600/10 group-hover:shadow-lg group-hover:shadow-cyan-500/20 transition-all duration-300 shrink-0 backdrop-blur-sm border border-white/10 group-hover:border-cyan-400/30">
                               <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform duration-300" />
                             </div>
                           </div>
                         </div>
                       );
                     })
                   )}
                 </div>
               </div>
             )}
          </div>
        </div>
      </section>

      {/* FEATURE 6: PERSISTENT SELECTION BAR */}
      {selectedSpot && (
        <div className="fixed bottom-0 left-0 right-0 z-[100] px-6 pb-6 animate-in slide-in-from-bottom-full duration-500">
           <div className="max-w-4xl mx-auto p-6 rounded-[2.5rem] bg-[#0a0a0a]/90 border border-white/10 backdrop-blur-2xl shadow-[0_30px_60px_rgba(0,0,0,0.8)] flex flex-col md:flex-row items-center justify-between gap-8">
               <div className="flex items-center gap-6">
                  <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-400/20 flex items-center justify-center text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.15)] animate-pulse">
                     <Zap size={28} className="fill-current" />
                  </div>
                  <div>
                     <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">Unit Identified</span>
                     <h4 className="text-xl font-black font-display text-white">{selectedSpot.locationName} <span className="text-cyan-400 ml-1">#{selectedSpot.spotNumber}</span></h4>
                  </div>
               </div>

               <div className="flex flex-wrap items-center gap-6">
                  {/* Duration Selector */}
                  <div className="space-y-2">
                     <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 ml-1">Temporal Window</span>
                     <div className="relative">
                        <select
                           value={bookingDuration}
                           onChange={(e) => setBookingDuration(parseInt(e.target.value))}
                           className="h-12 w-32 appearance-none bg-white/[0.03] border border-white/10 rounded-xl pl-4 pr-10 text-xs font-black uppercase tracking-wider text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all cursor-pointer"
                        >
                           <option className="bg-[#0a0a0a] text-white" value={30}>30 Mins</option>
                           <option className="bg-[#0a0a0a] text-white" value={60}>1 Hour</option>
                           <option className="bg-[#0a0a0a] text-white" value={120}>2 Hours</option>
                           <option className="bg-[#0a0a0a] text-white" value={240}>4 Hours</option>
                           <option className="bg-[#0a0a0a] text-white" value={360}>6 Hours</option>
                           <option className="bg-[#0a0a0a] text-white" value={480}>8 Hours</option>
                           <option className="bg-[#0a0a0a] text-white" value={720}>12 Hours</option>
                           <option className="bg-[#0a0a0a] text-white" value={1440}>24 Hours</option>
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                           <ChevronDown size={14} />
                        </div>
                     </div>
                  </div>

                  {/* Payment Method */}
                  <div className="space-y-2">
                     <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 ml-1">Method</span>
                     <div className="flex gap-2">
                        {['khalti', 'cash'].map(m => (
                          <button
                            key={m}
                            onClick={() => setPaymentMethod(m)}
                            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                              paymentMethod === m
                                ? 'bg-gradient-to-r from-cyan-400 to-cyan-500 text-black shadow-lg shadow-cyan-500/20 scale-105 border-transparent'
                                : 'bg-white/[0.03] text-slate-400 border border-white/10 hover:text-white hover:bg-white/[0.06]'
                            }`}
                          >
                            {m === 'khalti' ? <CreditCard size={18} /> : <Wallet size={18} />}
                          </button>
                        ))}
                     </div>
                  </div>

                  <div className="w-px h-12 bg-white/5 hidden md:block" />

                  <div className="text-right space-y-1">
                     <span className="text-[9px] font-black uppercase tracking-widest text-cyan-400">Total Settlement</span>
                     <p className="text-2xl font-display font-black text-white">Rs.{calculateTotalPrice()}</p>
                  </div>

                  <Button 
                    onClick={() => openBooking(selectedSpot)}
                    className="h-12 px-8 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-black font-display font-black text-xs uppercase tracking-widest hover:scale-[1.02] transition-all duration-300 active:scale-95 shadow-xl shadow-cyan-500/10 flex items-center gap-2 border-transparent"
                  >
                    Start Allocation
                    <ArrowRight size={14} />
                  </Button>
               </div>
            </div>
        </div>
      )}

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
