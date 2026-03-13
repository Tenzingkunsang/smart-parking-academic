import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LayoutGrid, Map as MapIcon, MapPin, Car, Info, ChevronRight } from 'lucide-react';
import ParkingMap from './ParkingMap';
import './Parkingspots.css'; 
const ParkingSpots = () => {
  const [spots, setSpots] = useState([]);
  const [viewMode, setViewMode] = useState('grid');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('http://localhost:5001/api/parking/nearby')
      .then(res => {
        setSpots(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      <p className="mt-4 text-slate-500 font-medium">Scanning Kathmandu for spots...</p>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Available Locations</h2>
          <p className="text-slate-500 flex items-center gap-1 mt-1">
            <MapPin size={14} className="text-blue-500" /> Nearby parking areas in Kathmandu
          </p>
        </div>

        <div className="inline-flex p-1 bg-slate-100 rounded-2xl border border-slate-200">
          <button 
            onClick={() => setViewMode('grid')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${viewMode === 'grid' ? 'bg-white text-blue-600 shadow-md scale-105' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <LayoutGrid size={18} /> List
          </button>
          <button 
            onClick={() => setViewMode('map')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${viewMode === 'map' ? 'bg-white text-blue-600 shadow-md scale-105' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <MapIcon size={18} /> Map View
          </button>
        </div>
      </div>

      {/* Content View */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {spots.map((spot) => (
            <div 
              key={spot._id} 
              className="group bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 overflow-hidden"
            >
              {/* Card Image/Header Placeholder */}
              <div className="h-32 bg-gradient-to-br from-blue-500 to-indigo-600 p-6 flex justify-between items-start">
                <div className="bg-white/20 backdrop-blur-md p-2 rounded-xl border border-white/30 text-white">
                  <Car size={24} />
                </div>
                <div className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase shadow-lg ${spot.isOccupied ? 'bg-white text-red-500' : 'bg-white text-emerald-500'}`}>
                   {spot.isOccupied ? '● Full' : '● Available'}
                </div>
              </div>

              {/* Content */}
              <div className="p-8 -mt-8 bg-white rounded-t-[2.5rem] relative z-10">
                <h3 className="text-xl font-black text-slate-800 mb-1 group-hover:text-blue-600 transition-colors">
                  {spot.locationName || `Premier Area ${spot.spotNumber}`}
                </h3>
                <p className="text-slate-400 text-sm mb-6 flex items-center gap-1">
                  <MapPin size={14} /> Kathmandu, Nepal
                </p>

                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <p className="text-[10px] uppercase text-slate-400 font-bold mb-1">Rate</p>
                    <p className="font-bold text-slate-900">Rs. {spot.price || '50'}/hr</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <p className="text-[10px] uppercase text-slate-400 font-bold mb-1">Security</p>
                    <p className="font-bold text-slate-900">24/7 CCTV</p>
                  </div>
                </div>

                <button className="w-full flex items-center justify-center gap-2 py-4 bg-slate-900 hover:bg-blue-600 text-white rounded-2xl font-bold transition-all shadow-lg hover:shadow-blue-200">
                  Book Spot <ChevronRight size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-[3rem] overflow-hidden border-8 border-white shadow-2xl h-[600px] bg-slate-200 relative">
          <ParkingMap spots={spots} />
        </div>
      )}
    </div>
  );
};

export default ParkingSpots;