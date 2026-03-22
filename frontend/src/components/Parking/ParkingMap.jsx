import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const getMarkerIcon = (status) => {
  const colors = {
    available: '#22c55e',
    reserved: '#eab308',
    occupied: '#ef4444',
    maintenance: '#6b7280'
  };
  const color = colors[status] || '#3b82f6';
  
  return L.divIcon({
    className: 'custom-marker',
    html: '<div style="background-color: ' + color + '; width: 28px; height: 28px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; color: white;">P</div>',
    iconSize: [28, 28],
    popupAnchor: [0, -14]
  });
};

const ParkingMap = ({ spots, onSpotClick }) => {
  const mapRef = useRef(null);
  const center = [27.7172, 85.3240];

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current = null;
      }
    };
  }, []);

  if (!spots || spots.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-8 text-center border border-gray-700">
        <p className="text-gray-400">No parking spots available to display on map</p>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', height: '500px', width: '100%' }}>
      <MapContainer
        key={JSON.stringify(spots.map(s => s._id))}
        center={center}
        zoom={13}
        style={{ height: '100%', width: '100%', borderRadius: '12px' }}
        whenCreated={(map) => { mapRef.current = map; }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        {spots.map((spot) => (
          <Marker
            key={spot._id}
            position={[spot.location.lat, spot.location.lng]}
            icon={getMarkerIcon(spot.status)}
            eventHandlers={{
              click: () => onSpotClick(spot)
            }}
          >
            <Popup>
              <div style={{ minWidth: '180px' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 'bold' }}>
                  {spot.locationName}
                </h4>
                <p style={{ margin: '4px 0', fontSize: '13px' }}>
                  <strong>Spot #{spot.spotNumber}</strong>
                </p>
                <p style={{ margin: '4px 0', fontSize: '13px' }}>
                  <span style={{ 
                    color: spot.status === 'available' ? '#22c55e' : 
                           spot.status === 'reserved' ? '#eab308' : '#ef4444'
                  }}>
                    {spot.status === 'available' ? '✓ Available' :
                     spot.status === 'reserved' ? '⏰ Reserved' : '🔴 Occupied'}
                  </span>
                </p>
                <p style={{ margin: '4px 0', fontSize: '13px', fontWeight: 'bold' }}>
                  💰 NPR {spot.price}/hour
                </p>
                {spot.status === 'available' && (
                  <button
                    onClick={() => onSpotClick(spot)}
                    style={{
                      marginTop: '10px',
                      width: '100%',
                      padding: '6px 12px',
                      backgroundColor: '#22c55e',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 'bold'
                    }}
                  >
                    Book Now
                  </button>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      
      {/* Map Legend */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        right: '20px',
        background: 'rgba(0,0,0,0.85)',
        padding: '8px 12px',
        borderRadius: '8px',
        fontSize: '11px',
        zIndex: 1000,
        backdropFilter: 'blur(5px)',
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ display: 'inline-block', width: '10px', height: '10px', background: '#22c55e', borderRadius: '50%' }}></span>
            <span style={{ color: '#fff' }}>Available</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ display: 'inline-block', width: '10px', height: '10px', background: '#eab308', borderRadius: '50%' }}></span>
            <span style={{ color: '#fff' }}>Reserved</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ display: 'inline-block', width: '10px', height: '10px', background: '#ef4444', borderRadius: '50%' }}></span>
            <span style={{ color: '#fff' }}>Occupied</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParkingMap;
