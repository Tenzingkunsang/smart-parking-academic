import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const COLORS = {
  available: '#00F2FF', // Cyan
  reserved: '#f59e0b', // Amber
  occupied: '#64748b', // Slate
  cluster: '#7c3aed', // Violet
  maintenance: '#475569',
};

const DEFAULT_MAP_CENTER = [27.7172, 85.324];

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
    if (position?.[0] != null && position?.[1] != null) {
      map.flyTo(position, zoom ?? map.getZoom(), { duration: 0.8, easeLinearity: 0.25 });
    }
  }, [position, zoom, map]);
  return null;
}

const ParkingMap = ({
  clusters,
  selectedSpotId,
  hoveredSpotId,
  onSpotClick,
  onClusterClick,
  onSpotHover,
  userPosition,
  defaultCenter,
  defaultZoom = 13,
  expanded = false,
}) => {
  const center = useMemo(() => defaultCenter ?? DEFAULT_MAP_CENTER, [defaultCenter]);

  const statusColor = (status) => {
    switch (status) {
      case 'available': return COLORS.available;
      case 'reserved': return COLORS.reserved;
      case 'occupied': return COLORS.occupied;
      default: return COLORS.maintenance;
    }
  };

  const focusPosition = useMemo(() => {
    if (!selectedSpotId || !clusters?.length) return null;
    for (const c of clusters) {
      const hit = c.spots.find((s) => s._id === selectedSpotId);
      if (hit) return [hit.location.lat, hit.location.lng];
    }
    return null;
  }, [clusters, selectedSpotId]);

  if (!clusters || clusters.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-slate-500 gap-4" role="status">
        <div className="w-12 h-12 rounded-full border-2 border-dashed border-slate-800 animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-widest">Awaiting Grid Data...</p>
      </div>
    );
  }

  return (
    <div className={`w-full h-full relative group/map overflow-hidden ${expanded ? 'rounded-none' : 'rounded-b-[2rem]'}`} aria-label="Parking map">
      <MapContainer
        center={center}
        zoom={defaultZoom}
        className="w-full h-full z-10"
        scrollWheelZoom
        doubleClickZoom
        touchZoom
        zoomControl={false}
        preferCanvas
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={20}
        />
        
        {focusPosition && <MapFocus position={focusPosition} zoom={17} />}

        {userPosition && (
          <Marker
            position={[userPosition.lat, userPosition.lng]}
            icon={makeIcon('#22c55e', '●', 24, true)}
            interactive={false}
          />
        )}

        {clusters.map((cluster) => {
          const [lat, lng] = cluster.position;
          if (cluster.isCluster) {
            const ring = cluster.spots.some((s) => s._id === selectedSpotId || s._id === hoveredSpotId);
            return (
              <Marker
                key={cluster.key}
                position={[lat, lng]}
                icon={makeIcon(COLORS.cluster, cluster.spots.length, 40, ring)}
                eventHandlers={{
                  click: () => onClusterClick(cluster.spots),
                }}
              >
                <Popup className="custom-leaflet-popup">
                   <div className="p-4 bg-[#0a0a0a] text-white rounded-2xl border border-white/10 min-w-[140px]">
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 block mb-1">Grid Cluster</span>
                      <p className="text-sm font-bold">{cluster.spots.length} Nodes in Sector</p>
                      <button 
                        onClick={() => onClusterClick(cluster.spots)}
                        className="mt-3 w-full h-8 bg-white text-black rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-cyan-400 transition-all"
                      >
                         Expand Sector
                      </button>
                   </div>
                </Popup>
              </Marker>
            );
          }

          const spot = cluster.spots[0];
          const ring = spot._id === selectedSpotId || spot._id === hoveredSpotId;
          const color = statusColor(spot.status);
          return (
            <Marker
              key={spot._id}
              position={[lat, lng]}
              icon={makeIcon(color, spot.status === 'available' ? 'P' : '•', 36, ring)}
              eventHandlers={{
                click: () => onSpotClick(spot),
                mouseover: () => onSpotHover?.(spot._id),
                mouseout: () => onSpotHover?.(null),
              }}
            >
              <Popup className="custom-leaflet-popup">
                <div className="p-4 bg-[#0a0a0a] text-white rounded-2xl border border-white/10 min-w-[180px]">
                  <div className="flex justify-between items-start gap-4 mb-2">
                     <div className="space-y-0.5">
                        <h4 className="text-xs font-black uppercase tracking-tight leading-none">{spot.locationName}</h4>
                        <span className="text-[8px] font-medium text-slate-500">#{spot.spotNumber}</span>
                     </div>
                     <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${spot.status === 'available' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                        {spot.status}
                     </span>
                  </div>
                  <div className="flex justify-between items-end border-t border-white/5 pt-3">
                     <div>
                        <span className="text-[8px] font-black text-slate-600 uppercase block mb-0.5">Temporal Rate</span>
                        <span className="text-sm font-black font-display text-cyan-400">Rs.{spot.price}/hr</span>
                     </div>
                     {spot.status === 'available' && (
                        <button
                          type="button"
                          className="px-3 h-7 bg-white text-black font-black text-[9px] uppercase tracking-widest rounded-lg hover:bg-cyan-400 transition-all"
                          onClick={() => onSpotClick(spot)}
                        >
                          Secure
                        </button>
                     )}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Legend Map UI */}
      <div className="absolute left-6 bottom-6 z-20 flex gap-4 p-4 rounded-2xl bg-[#050505]/60 backdrop-blur-xl border border-white/10 group-hover/map:opacity-100 transition-opacity" aria-hidden="true">
        {[
          { label: 'Live', color: COLORS.available },
          { label: 'Held', color: COLORS.reserved },
          { label: 'Full', color: COLORS.occupied },
          { label: 'Grid', color: COLORS.cluster }
        ].map((i) => (
           <div key={i.label} className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: i.color, boxShadow: `0 0 8px ${i.color}` }} />
              <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400">{i.label}</span>
           </div>
        ))}
      </div>

      {/* Global CSS for Leaflet Popups */}
      <style>{`
        .custom-leaflet-popup .leaflet-popup-content-wrapper {
          background: transparent !important;
          box-shadow: none !important;
          padding: 0 !important;
        }
        .custom-leaflet-popup .leaflet-popup-content {
          margin: 0 !important;
        }
        .custom-leaflet-popup .leaflet-popup-tip-container {
          display: none !important;
        }
      `}</style>
    </div>
  );
};

export default ParkingMap;
