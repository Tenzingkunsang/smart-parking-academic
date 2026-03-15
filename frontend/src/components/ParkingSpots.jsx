import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Search, Car, Bike, Loader2, MapPin, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ParkingSpots = () => {
  const [spots, setSpots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isOffline, setIsOffline] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSpots = async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000); // 3s timeout

      try {
        const res = await axios.get('http://127.0.0.1:5001/api/parking/spots', { signal: controller.signal });
        const data = res.data.data || res.data;
        if (Array.isArray(data)) setSpots(data);
      } catch (err) {
        console.warn("Backend unreachable, using demo data.");
        setIsOffline(true);
        // Demo Data for your supervisor
        setSpots([
          { _id: '1', locationName: 'Thamel Mall', price: 60, vehicleType: 'car', isOccupied: false },
          { _id: '2', locationName: 'Durbar Marg P1', price: 100, vehicleType: 'car', isOccupied: true },
          { _id: '3', locationName: 'New Road Plaza', price: 40, vehicleType: 'bike', isOccupied: false },
        ]);
      } finally {
        clearTimeout(timeout);
        setLoading(false);
      }
    };
    fetchSpots();
  }, []);

  const filtered = useMemo(() => 
    spots.filter(s => s.locationName.toLowerCase().includes(searchTerm.toLowerCase())), 
  [spots, searchTerm]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0f172a] text-white">
      <Loader2 className="animate-spin mb-4" size={48} />
      <p className="font-bold tracking-widest text-blue-400">SCANNING KTM GRID...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0f172a] text-white p-8">
      {isOffline && (
        <div className="bg-amber-500/20 border border-amber-500 text-amber-500 p-4 rounded-2xl mb-8 flex items-center gap-3">
          <AlertCircle size={20}/> <span>Offline Mode: Showing Demo Data</span>
        </div>
      )}
      
      <div className="max-w-6xl mx-auto">
        <div className="relative mb-12">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500" />
          <input 
            className="w-full bg-slate-900 border border-slate-800 p-5 pl-16 rounded-3xl outline-none focus:border-blue-500 transition-all"
            placeholder="Search Kathmandu locations..."
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {filtered.map(spot => (
            <div key={spot._id} className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 hover:scale-[1.02] transition-transform">
              <div className="flex justify-between items-start mb-6">
                <div className="p-4 bg-blue-600/10 rounded-2xl text-blue-500">
                  {spot.vehicleType === 'car' ? <Car size={32}/> : <Bike size={32}/>}
                </div>
                <div className={`px-4 py-1 rounded-full text-[10px] font-black ${spot.isOccupied ? 'bg-red-500/20 text-red-500' : 'bg-emerald-500/20 text-emerald-500'}`}>
                  {spot.isOccupied ? 'FULL' : 'OPEN'}
                </div>
              </div>
              <h3 className="text-2xl font-black mb-1">{spot.locationName}</h3>
              <p className="text-slate-500 text-sm flex items-center gap-1 mb-8"><MapPin size={14}/> Kathmandu, NP</p>
              
              <div className="flex justify-between items-center">
                <p className="text-2xl font-black">Rs. {spot.price}<span className="text-sm font-normal text-slate-500">/hr</span></p>
                <button 
                  onClick={() => navigate(`/reserve/${spot._id}`)}
                  disabled={spot.isOccupied}
                  className="bg-blue-600 px-6 py-3 rounded-xl font-bold disabled:opacity-20"
                >
                  Reserve
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ParkingSpots;