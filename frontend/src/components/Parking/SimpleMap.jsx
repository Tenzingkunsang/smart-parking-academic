import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const SimpleMap = ({ spots }) => {
  const center = [27.7172, 85.3240];

  if (!spots || spots.length === 0) {
    return <div>No spots to display</div>;
  }

  return (
    <MapContainer center={center} zoom={13} style={{ height: '500px', width: '100%' }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {spots.map(spot => (
        <Marker key={spot._id} position={[spot.location.lat, spot.location.lng]}>
          <Popup>
            <b>{spot.locationName}</b><br />
            Spot #{spot.spotNumber}<br />
            NPR {spot.price}/hour
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default SimpleMap;
