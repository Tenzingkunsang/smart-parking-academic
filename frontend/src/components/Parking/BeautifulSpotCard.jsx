import React from 'react';

const BeautifulSpotCard = ({ spot, onBook }) => {
  const getStatusBadge = (status) => {
    switch(status) {
      case 'available':
        return {
          text: 'Available Now',
          bg: 'bg-green-100',
          textColor: 'text-green-800',
          icon: '✅'
        };
      case 'reserved':
        return {
          text: 'Reserved',
          bg: 'bg-yellow-100',
          textColor: 'text-yellow-800',
          icon: '⏰'
        };
      case 'occupied':
        return {
          text: 'Occupied',
          bg: 'bg-red-100',
          textColor: 'text-red-800',
          icon: '🔴'
        };
      default:
        return {
          text: 'Available',
          bg: 'bg-green-100',
          textColor: 'text-green-800',
          icon: '✅'
        };
    }
  };

  const status = getStatusBadge(spot.status);
  
  return (
    <div className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden transform hover:-translate-y-1">
      {/* Gradient Header */}
      <div className="h-2 bg-gradient-to-r from-blue-500 to-purple-600"></div>
      
      <div className="p-6">
        {/* Header with Location and Status */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-800 mb-1">{spot.locationName}</h3>
            <p className="text-sm text-gray-500 flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {spot.location.address || 'Kathmandu'}
            </p>
          </div>
          <div className={`${status.bg} ${status.textColor} px-3 py-1 rounded-full text-xs font-semibold flex items-center`}>
            <span className="mr-1">{status.icon}</span>
            {status.text}
          </div>
        </div>
        
        {/* Spot Number Badge */}
        <div className="mb-4">
          <div className="inline-flex items-center bg-gray-100 px-3 py-1 rounded-full">
            <span className="text-gray-600 text-sm">Spot #</span>
            <span className="font-bold text-lg ml-1 text-gray-800">{spot.spotNumber}</span>
          </div>
        </div>
        
        {/* Price and Vehicle Type */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-3 text-center">
            <p className="text-xs text-blue-600 uppercase tracking-wide font-semibold">Price</p>
            <p className="text-2xl font-bold text-blue-700">NPR {spot.price}</p>
            <p className="text-xs text-blue-500">per hour</p>
          </div>
          <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl p-3 text-center">
            <p className="text-xs text-purple-600 uppercase tracking-wide font-semibold">Vehicle</p>
            <p className="text-2xl font-bold text-purple-700 capitalize">
              {spot.vehicleType === 'car' ? '🚗' : '🛵'}
            </p>
            <p className="text-xs text-purple-500 capitalize">{spot.vehicleType}</p>
          </div>
        </div>
        
        {/* Features */}
        {spot.features && spot.features.length > 0 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-2">
              {spot.features.map((feature, idx) => (
                <span key={idx} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                  {feature}
                </span>
              ))}
            </div>
          </div>
        )}
        
        {/* Book Button */}
        <button
          onClick={() => onBook(spot)}
          disabled={spot.status !== 'available'}
          className={`w-full py-3 rounded-xl font-semibold transition-all duration-300 ${
            spot.status === 'available'
              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 shadow-lg hover:shadow-xl'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          {spot.status === 'available' ? (
            <span className="flex items-center justify-center">
              Book Now
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </span>
          ) : (
            'Not Available'
          )}
        </button>
      </div>
    </div>
  );
};

export default BeautifulSpotCard;
