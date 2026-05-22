import React from 'react';  

const ParkingSpotCard = ({ spot, onBook, onViewDetails }) => {
  const getStatusColor = (status) => {
    switch(status) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'reserved': return 'bg-yellow-100 text-yellow-800';
      case 'occupied': return 'bg-red-100 text-red-800';
      case 'maintenance': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch(status) {
      case 'available': return 'Available';
      case 'reserved': return 'Reserved';
      case 'occupied': return 'Occupied';
      case 'maintenance': return 'Under Maintenance';
      default: return status;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-semibold text-gray-800">
            {spot.locationName}
          </h3>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(spot.status)}`}>
            {getStatusText(spot.status)}
          </span>
        </div>
        
        <p className="text-gray-600 text-sm mb-2">Spot #{spot.spotNumber}</p>
        
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center">
            <svg className="w-4 h-4 text-gray-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-bold text-lg">NPR {spot.price}</span>
            <span className="text-gray-500 text-sm ml-1">/hour</span>
          </div>
          <div className="flex items-center">
            <svg className="w-4 h-4 text-gray-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="text-sm capitalize">{spot.vehicleType}</span>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={() => onViewDetails(spot)}
            className="flex-1 bg-gray-100 text-gray-700 px-3 py-2 rounded hover:bg-gray-200 transition"
          >
            View Details
          </button>
          {spot.status === 'available' && (
            <button
              onClick={() => onBook(spot)}
              className="flex-1 bg-blue-500 text-white px-3 py-2 rounded hover:bg-blue-600 transition"
            >
              Book Now
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ParkingSpotCard;
