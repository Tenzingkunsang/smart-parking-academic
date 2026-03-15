import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for Leaflet default marker icons in React
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const ParkingMap = ({ spots }) => {
  const mapRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    // 1. Initialize Map
    if (containerRef.current && !mapRef.current) {
      mapRef.current = L.map(containerRef.current, {
        zoomControl: false // Cleaner designer look
      }).setView([27.7172, 85.3240], 14);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '©OpenStreetMap'
      }).addTo(mapRef.current);

      L.control.zoom({ position: 'bottomright' }).addTo(mapRef.current);
    }

    // 2. Setup Icon
    const DefaultIcon = L.icon({
      iconUrl: markerIcon,
      shadowUrl: markerShadow,
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34]
    });

    // 3. Clear existing markers
    const map = mapRef.current;
    if (map) {
      map.eachLayer((layer) => {
        if (layer instanceof L.Marker) {
          map.removeLayer(layer);
        }
      });

      // 4. Add markers for each spot
      spots.forEach(spot => {
        const lat = spot.location?.lat;
        const lng = spot.location?.lng;

        if (lat && lng) {
          const marker = L.marker([lat, lng], { icon: DefaultIcon }).addTo(map);
          
          const popupContent = `
            <div style="font-family: 'Plus Jakarta Sans', sans-serif; padding: 10px; min-width: 150px;">
              <p style="margin: 0; font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase;">Location</p>
              <h4 style="margin: 0 0 10px 0; font-size: 14px; color: #0f172a;">${spot.locationName || 'Smart Spot'}</h4>
              <div style="display: flex; justify-between; align-items: center; border-top: 1px solid #f1f5f9; pt-10;">
                <span style="font-size: 12px; font-weight: 700; color: #2563eb;">Rs. ${spot.price || 50}/hr</span>
                <span style="margin-left: auto; font-size: 10px; padding: 2px 8px; border-radius: 10px; background: ${spot.isOccupied ? '#fee2e2' : '#dcfce7'}; color: ${spot.isOccupied ? '#ef4444' : '#10b981'}; font-weight: 900;">
                  ${spot.isOccupied ? 'FULL' : 'OPEN'}
                </span>
              </div>
            </div>
          `;
          marker.bindPopup(popupContent);
        }
      });
    }

    // Cleanup function
    return () => {
      // We don't necessarily want to destroy the map on every spots update
      // but we could map.remove() on unmount.
    };
  }, [spots]);

  return (
    <div 
      ref={containerRef} 
      style={{ height: '100%', width: '100%', zIndex: 1 }} 
      className="leaflet-container-rounded"
    />
  );
};

export default ParkingMap;