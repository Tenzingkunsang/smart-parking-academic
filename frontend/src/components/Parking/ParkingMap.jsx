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

/* Parking Blue (available) vs neutral grey (occupied) — instant contrast */
const COLORS = {
  available: '#0ea5e9',
  reserved: '#f59e0b',
  occupied: '#64748b',
  cluster: '#7c3aed',
  maintenance: '#475569',
};

const DEFAULT_MAP_CENTER = [27.7172, 85.324];

const makeIcon = (color, label, size = 30, ring = false) =>
  L.divIcon({
    className: 'parking-map-marker',
    html: `<div class="parking-pin-inner${ring ? ' parking-pin-ring' : ''}" style="--pin-color:${color};width:${size}px;height:${size}px"><span>${label}</span></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });

function MapFocus({ position, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (position?.[0] != null && position?.[1] != null) {
      map.flyTo(position, zoom ?? map.getZoom(), { duration: 0.55 });
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
      case 'available':
        return COLORS.available;
      case 'reserved':
        return COLORS.reserved;
      case 'occupied':
        return COLORS.occupied;
      default:
        return COLORS.maintenance;
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
      <div className="parking-map-empty" role="status">
        <p>No parking spots to show on the map.</p>
      </div>
    );
  }

  return (
    <div className={`parking-map-wrap ${expanded ? 'is-expanded' : ''}`} aria-label="Parking map">
      <MapContainer
        center={center}
        zoom={defaultZoom}
        className="parking-map-container"
        scrollWheelZoom
        doubleClickZoom
        touchZoom
        zoomControl
        preferCanvas
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>, &copy; OpenStreetMap'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={20}
        />
        {focusPosition && <MapFocus position={focusPosition} zoom={16} />}

        {userPosition && (
          <Marker
            position={[userPosition.lat, userPosition.lng]}
            icon={makeIcon('#22c55e', '●', 22)}
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
                icon={makeIcon(COLORS.cluster, cluster.spots.length, 36, ring)}
                eventHandlers={{
                  click: () => onClusterClick(cluster.spots),
                  mouseover: () => onSpotHover?.(null),
                  mouseout: () => onSpotHover?.(null),
                }}
              >
                <Popup>
                  <div className="parking-map-popup">
                    <strong>{cluster.spots.length} spots in this area</strong>
                    <p className="parking-map-popup-hint">Tap to see Best value &amp; Closest</p>
                    <button
                      type="button"
                      className="parking-map-popup-btn"
                      onClick={() => onClusterClick(cluster.spots)}
                    >
                      Choose a spot
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
              icon={makeIcon(color, spot.status === 'available' ? 'P' : '•', 32, ring)}
              eventHandlers={{
                click: () => onSpotClick(spot),
                mouseover: () => onSpotHover?.(spot._id),
                mouseout: () => onSpotHover?.(null),
              }}
            >
              <Popup>
                <div className="parking-map-popup">
                  <strong>{spot.locationName}</strong>
                  <p className="parking-map-popup-meta">
                    Spot #{spot.spotNumber} ·{' '}
                    <span style={{ color }}>{spot.status}</span>
                  </p>
                  <p className="parking-map-popup-price">NPR {spot.price}/hr</p>
                  {spot.status === 'available' && (
                    <button
                      type="button"
                      className="parking-map-popup-btn"
                      onClick={() => onSpotClick(spot)}
                    >
                      Book now
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      <div className="parking-map-legend" aria-hidden="true">
        <span>
          <i style={{ background: COLORS.available }} /> Available
        </span>
        <span>
          <i style={{ background: COLORS.reserved }} /> Reserved
        </span>
        <span>
          <i style={{ background: COLORS.occupied }} /> Occupied
        </span>
        <span>
          <i style={{ background: COLORS.cluster }} /> Cluster
        </span>
      </div>
    </div>
  );
};

export default ParkingMap;
