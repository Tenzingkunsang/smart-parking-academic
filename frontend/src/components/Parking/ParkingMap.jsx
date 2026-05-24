import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation, ArrowRight } from 'lucide-react';
import Button from '../ui/Button';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const COLORS = {
  available: '#00F2FF',
  reserved: '#f59e0b',
  occupied: '#64748b',
  cluster: '#7c3aed',
};

const makeIcon = (color, label, size = 32, ring = false) =>
  L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div class="relative flex items-center justify-center transition-all duration-300 transform ${ring ? 'scale-110' : ''}" style="width:${size}px; height:${size}px;">
        <div class="absolute inset-0 rounded-full blur-[8px] opacity-40 animate-pulse" style="background-color:${color};"></div>
        <div class="relative w-full h-full rounded-full border-2 border-white flex items-center justify-center font-display font-black text-[10px] text-white shadow-2xl transition-all" style="background-color:${color}; ${ring ? 'box-shadow: 0 0 15px ' + color + ';' : ''}">
          ${label}
        </div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });

function MapFocus({ position, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (position?.[0] != null) {
      map.flyTo(position, zoom ?? map.getZoom(), { duration: 0.8 });
    }
  }, [position, zoom, map]);
  return null;
}

function GpsButton({ userPosition }) {
  const map = useMap();
  const center = () => {
    if (userPosition) {
      map.flyTo([userPosition.lat, userPosition.lng], 16, { duration: 0.8 });
    }
  };
  if (!userPosition) return null;
  return (
    <div className="leaflet-top leaflet-right" style={{ top: '10px', right: '10px' }}>
      <button
        onClick={center}
        className="w-10 h-10 rounded-xl bg-[#050505]/80 backdrop-blur-xl border border-white/20 text-cyan-400 flex items-center justify-center shadow-lg hover:border-cyan-400/40 transition-all"
        title="Center on my location"
      >
        <Navigation size={16} />
      </button>
    </div>
  );
}

const ParkingMap = ({ clusters, selectedSpotId, onSpotClick, userPosition, expanded }) => {
  const center = [27.7172, 85.324];

  return (
    <div className={`w-full h-full relative group/map overflow-hidden ${expanded ? 'rounded-none' : 'rounded-b-[2rem]'}`}>
      <MapContainer
        center={center}
        zoom={13}
        className="w-full h-full z-10"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; CARTO'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        
        {userPosition && (
          <>
            <Marker position={[userPosition.lat, userPosition.lng]} icon={makeIcon('#22c55e', '●', 24, true)} />
            <GpsButton userPosition={userPosition} />
          </>
        )}

        {clusters?.map((cluster) => {
          const [lat, lng] = cluster.position;
          if (cluster.isCluster) {
             return (
               <Marker key={cluster.key} position={[lat, lng]} icon={makeIcon(COLORS.cluster, cluster.spots.length, 40)} />
             );
          }

          const spot = cluster.spots[0];
          const color = spot.status === 'available' ? COLORS.available : COLORS.occupied;
          
          return (
            <Marker
              key={spot._id}
              position={[lat, lng]}
              icon={makeIcon(color, spot.status === 'available' ? 'P' : '•', 36, spot._id === selectedSpotId)}
              eventHandlers={{ click: () => onSpotClick(spot) }}
            >
              <Popup className="custom-leaflet-popup">
                <div className="p-5 bg-[#0a0a0a] text-white rounded-[1.5rem] border border-white/10 min-w-[200px] space-y-4">
                  <div className="flex justify-between items-start">
                     <div className="space-y-1">
                        <h4 className="text-xs font-black uppercase tracking-tight">{spot.locationName}</h4>
                        <p className="text-[10px] text-slate-500">Node #{spot.spotNumber}</p>
                     </div>
                     <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${spot.status === 'available' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-slate-500'}`}>
                        {spot.status}
                     </span>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-white/5">
                     <div>
                        <span className="text-[8px] font-black text-slate-700 uppercase block">Rate</span>
                        <span className="text-sm font-black font-display text-cyan-400">Rs.{spot.price}/hr</span>
                     </div>
                     <Button onClick={() => onSpotClick(spot)} className="!py-1.5 !px-3 !text-[9px] flex items-center gap-1 group/btn">
                        Details <ArrowRight size={10} className="group-hover/btn:translate-x-0.5 transition-transform" />
                     </Button>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Map Legend */}
      <div className="absolute left-6 bottom-6 z-20 flex gap-4 p-4 rounded-2xl bg-[#050505]/60 backdrop-blur-xl border border-white/10 opacity-0 group-hover/map:opacity-100 transition-opacity">
        {[
          { label: 'Live', color: COLORS.available },
          { label: 'Held', color: COLORS.reserved },
          { label: 'Full', color: COLORS.occupied }
        ].map(i => (
           <div key={i.label} className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full shadow-[0_0_8px_currentColor]" style={{ background: i.color, color: i.color }} />
              <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">{i.label}</span>
           </div>
        ))}
      </div>

      <style>{`
        .custom-leaflet-popup .leaflet-popup-content-wrapper { background: transparent !important; box-shadow: none !important; padding: 0 !important; }
        .custom-leaflet-popup .leaflet-popup-content { margin: 0 !important; }
        .custom-leaflet-popup .leaflet-popup-tip-container { display: none !important; }
      `}</style>
    </div>
  );
};

export default ParkingMap;
