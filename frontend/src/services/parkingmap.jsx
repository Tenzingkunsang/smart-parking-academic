import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const getMarkerIcon = (status) => {
  const colors = {
    available: '#22c55e',
    reserved: '#eab308',
    occupied: '#ef4444',
    maintenance: '#6b7280'
  };
  
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="background-color: ${colors[status] || '#3b82f6'}; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; color: white;">P</div>`,
    iconSize: [24, 24],
    popupAnchor: [0, -12]
  });
};

const ParkingMap = ({ spots, onSpotClick, userLocation }) => {
  return (
    <MapContainer
      center={[27.7172, 85.3240]}
      zoom={13}
      style={{ height: '500px', width: '100%', borderRadius: '8px' }}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      
      {spots?.map((spot) => (
        <Marker
          key={spot._id}
          position={[spot.location.lat, spot.location.lng]}
          icon={getMarkerIcon(spot.status)}
          eventHandlers={{ click: () => onSpotClick(spot) }}
        >
          <Popup>
            <div className="p-2">
              <h3 className="font-bold">{spot.locationName}</h3>
              <p>Spot #{spot.spotNumber}</p>
              <p>NPR {spot.price}/hour</p>
              <button
                onClick={() => onSpotClick(spot)}
                className="mt-2 bg-blue-500 text-white px-3 py-1 rounded text-sm"
              >
                Book Now
              </button>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default ParkingMap;