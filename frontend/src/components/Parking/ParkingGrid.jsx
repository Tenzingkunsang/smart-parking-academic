import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, AlertCircle, Info } from 'lucide-react';

/**
 * Expand lot-level ParkingSpot documents into individual virtual spot cards.
 *
 * Each lot document has totalSpaces/availableSpaces/reservedSpaces/occupiedSpaces.
 * We generate N cards (one per space) and derive each card's status from the
 * aggregate counts: first `available` cards are green, next `reserved` are amber,
 * remainder are red (occupied).
 */
const expandToVirtualSpots = (lots) => {
  const virtual = [];
  lots.forEach((lot) => {
    const total    = Math.max(1, lot.totalSpaces    || 1);
    const avail    = Math.min(lot.availableSpaces   || 0, total);
    const reserved = Math.min(lot.reservedSpaces    || 0, total - avail);
    // occupied fills the rest

    for (let i = 1; i <= total; i++) {
      let status;
      if (i <= avail)              status = 'available';
      else if (i <= avail + reserved) status = 'reserved';
      else                          status = 'occupied';

      virtual.push({
        // Use a composite key — never passed to the backend for booking
        _id:           `${lot._id}-v${i}`,
        _lotId:        lot._id,        // real MongoDB ID used when booking
        _parentLot:    lot,
        spotNumber:    i,              // display number within this lot
        status,
        price:         lot.price,
        locationName:  lot.locationName,
        features:      lot.features,
        vehicleTypes:  lot.vehicleTypes,
      });
    }
  });
  return virtual;
};

const ParkingGrid = ({ spots, onSpotSelect }) => {
  const [activeFloor, setActiveFloor] = useState(1);
  const [selectedSpotId, setSelectedSpotId] = useState(null);

  // Expand lot documents into individual virtual spot cards
  const virtualSpots = useMemo(() => expandToVirtualSpots(spots), [spots]);

  // Distribute virtual spots across floors (up to 50 per floor)
  const FLOOR_SIZE = 50;
  const floors = useMemo(() => {
    const count = Math.max(1, Math.ceil(virtualSpots.length / FLOOR_SIZE));
    return Array.from({ length: count }, (_, i) => i + 1);
  }, [virtualSpots]);

  const filteredSpots = useMemo(() => {
    const start = (activeFloor - 1) * FLOOR_SIZE;
    return virtualSpots.slice(start, start + FLOOR_SIZE);
  }, [virtualSpots, activeFloor]);

  const handleSpotClick = (spot) => {
    if (spot.status === 'maintenance' || spot.status === 'occupied' || spot.status === 'reserved') return;

    if (selectedSpotId === spot._id) {
      setSelectedSpotId(null);
      onSpotSelect(null);
    } else {
      setSelectedSpotId(spot._id);
      // Pass the parent lot as the bookable entity but with display metadata
      onSpotSelect({
        ...spot._parentLot,
        _virtualSpotNumber: spot.spotNumber,
        _displayLabel: `Space #${spot.spotNumber}`,
      });
    }
  };

  const stats = {
    total:     filteredSpots.length,
    available: filteredSpots.filter(s => s.status === 'available').length,
    occupied:  filteredSpots.filter(s => s.status === 'occupied').length,
    reserved:  filteredSpots.filter(s => s.status === 'reserved').length,
  };

  return (
    <div className="w-full space-y-8">

      {/* Floor selector — only show if more than one floor */}
      {floors.length > 1 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 bg-gradient-to-b from-cyan-400 to-cyan-600 rounded-full" />
            <h3 className="text-xs font-black uppercase tracking-[0.25em] text-slate-300">Floor Navigation</h3>
          </div>
          <div className="flex gap-3 p-1 bg-gradient-to-r from-black/40 to-white/[0.02] rounded-2xl border border-white/[0.08] backdrop-blur-xl overflow-x-auto">
            {floors.map((floor) => (
              <button
                key={floor}
                onClick={() => { setActiveFloor(floor); setSelectedSpotId(null); onSpotSelect(null); }}
                className={`flex-shrink-0 relative px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-500 ${
                  activeFloor === floor
                    ? 'bg-gradient-to-r from-cyan-400 to-cyan-500 text-black shadow-lg shadow-cyan-500/30 scale-105'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]'
                }`}
              >
                Level {floor}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-2 md:gap-3">
        {[
          { label: 'Total',     value: stats.total,     color: 'from-slate-500 to-slate-600' },
          { label: 'Available', value: stats.available, color: 'from-emerald-400 to-emerald-500' },
          { label: 'Reserved',  value: stats.reserved,  color: 'from-amber-400 to-amber-500' },
          { label: 'Occupied',  value: stats.occupied,  color: 'from-red-400 to-red-500' },
        ].map((s) => (
          <div key={s.label} className="p-4 rounded-2xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/[0.08] backdrop-blur-xl">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 block mb-1">{s.label}</span>
            <span className={`text-xl font-display font-black bg-gradient-to-r ${s.color} bg-clip-text text-transparent`}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="p-1 bg-gradient-to-r from-white/[0.04] to-white/[0.01] rounded-3xl border border-white/[0.08] backdrop-blur-sm overflow-hidden">
        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2 md:gap-3 p-4 md:p-6">
          {filteredSpots.length === 0 ? (
            <div className="col-span-full py-12 flex flex-col items-center gap-3 text-center">
              <AlertCircle size={32} className="text-slate-500" />
              <p className="text-sm font-bold text-slate-500">No spaces on this level</p>
            </div>
          ) : (
            filteredSpots.map((spot) => {
              const isSelected    = selectedSpotId === spot._id;
              const isOccupied    = spot.status === 'occupied';
              const isReserved    = spot.status === 'reserved';
              const isMaintenance = spot.status === 'maintenance';
              const isAvailable   = spot.status === 'available';
              const isBlocked     = isOccupied || isReserved || isMaintenance;

              return (
                <div
                  key={spot._id}
                  onClick={() => handleSpotClick(spot)}
                  title={isBlocked ? `Space ${spot.spotNumber} — ${spot.status}` : `Space ${spot.spotNumber} — Rs.${spot.price}/hr`}
                  className={`relative group transform transition-all duration-300 active:scale-95 ${
                    isBlocked ? 'cursor-not-allowed' : 'cursor-pointer hover:scale-110'
                  }`}
                >
                  <div className={`p-3 rounded-xl border-2 transition-all duration-300 h-20 flex flex-col justify-between relative overflow-hidden ${
                    isMaintenance
                      ? 'bg-slate-900/40 border-white/[0.06] opacity-50 grayscale'
                      : isOccupied
                      ? 'bg-gradient-to-br from-red-500/15 to-red-600/10 border-red-400/40'
                      : isSelected
                      ? 'bg-gradient-to-br from-yellow-400/30 to-yellow-500/20 border-yellow-400/60 scale-105 shadow-2xl shadow-yellow-400/30'
                      : isReserved
                      ? 'bg-gradient-to-br from-amber-500/15 to-amber-600/10 border-amber-400/40'
                      : 'bg-gradient-to-br from-emerald-500/15 to-emerald-600/10 border-emerald-400/40 group-hover:border-emerald-400/60 group-hover:shadow-lg group-hover:shadow-emerald-500/20'
                  }`}>
                    {isSelected && (
                      <div className="absolute inset-0 bg-yellow-400 blur-2xl opacity-20 -z-10 animate-pulse" />
                    )}

                    <span className={`font-display font-black text-lg md:text-xl tracking-tighter ${
                      isOccupied ? 'text-red-300' : isReserved ? 'text-amber-300' : isSelected ? 'text-yellow-600' : 'text-emerald-300'
                    }`}>
                      {spot.spotNumber}
                    </span>

                    <span className={`text-[8px] font-black uppercase tracking-[0.1em] block ${
                      isOccupied ? 'text-red-400/70' : isReserved ? 'text-amber-400/70' : isSelected ? 'text-yellow-700/80' : 'text-emerald-400/70'
                    }`}>
                      {isMaintenance ? 'Maint.' : isOccupied ? 'Taken' : isReserved ? 'Held' : isSelected ? 'Selected' : 'Free'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
        <div className="flex flex-wrap items-center gap-5">
          <span className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-600 w-full md:w-auto">Legend</span>
          {[
            { bg: 'bg-emerald-500/20 border-emerald-500/40',  label: 'Available' },
            { bg: 'bg-amber-500/20 border-amber-500/40',      label: 'Reserved' },
            { bg: 'bg-red-500/20 border-red-500/40',          label: 'Occupied' },
            { bg: 'bg-slate-600/20 border-slate-600/40',      label: 'Maintenance' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded border ${item.bg}`} />
              <span className="text-xs font-bold text-slate-400">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Entry/Exit guide */}
      <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-cyan-500/[0.04] border border-cyan-400/20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-300">
            <ChevronLeft size={16} />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Entry</p>
            <p className="text-xs font-bold text-cyan-100">Level {activeFloor} Entrance</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-300">
            <ChevronRight size={16} />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Exit</p>
            <p className="text-xs font-bold text-cyan-100">Level {activeFloor} Exit</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParkingGrid;
