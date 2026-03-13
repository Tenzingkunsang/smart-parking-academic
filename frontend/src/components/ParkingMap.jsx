import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './ParkingMap.css'

import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const ParkingMap = ({ spots }) => {
  const mapRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    if (!mapRef.current) {
      mapRef.current = L.map(containerRef.current).setView([27.7172, 85.3240], 14);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png').addTo(mapRef.current);
    }

    const DefaultIcon = L.icon({
      iconUrl: markerIcon,
      shadowUrl: markerShadow,
      iconSize: [25, 41],
      iconAnchor: [12, 41]
    });

    // Clear and Redraw
    mapRef.current.eachLayer((layer) => { if (layer instanceof L.Marker) mapRef.current.removeLayer(layer); });

    spots.forEach(spot => {
      const lat = spot.location?.lat || spot.lat;
      const lng = spot.location?.lng || spot.lng;
      const name = spot.locationName || `Parking Area ${spot.spotNumber}`;

      if (lat && lng) {
        L.marker([lat, lng], { icon: DefaultIcon })
          .addTo(mapRef.current)
          .bindPopup(`
            <div style="font-family: sans-serif; padding: 5px;">
              <h4 style="margin: 0 0 5px 0; color: #1d4ed8;">${name}</h4>
              <p style="margin: 0; font-size: 12px; color: #666;">Status: 
                <b style="color: ${spot.isOccupied ? '#ef4444' : '#22c55e'}">
                  ${spot.isOccupied ? 'Full' : 'Available'}
                </b>
              </p>
              <button style="margin-top: 10px; width: 100%; padding: 5px; background: #1d4ed8; color: white; border: none; border-radius: 4px; cursor: pointer;">
                Get Directions
              </button>
            </div>
          `);
      }
    });
  }, [spots]);

  return <div ref={containerRef} style={{ height: '600px', width: '100%' }} />;
};

export default ParkingMap;