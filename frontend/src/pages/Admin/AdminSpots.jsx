import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { MapPin, Plus, Trash2, Edit3, Loader2, ArrowLeft, ShieldCheck, Zap, Car, Settings, X } from 'lucide-react';
import parkingService from '../../services/parkingService';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import AdminParkingGrid from '../../components/Parking/AdminParkingGrid';

const AdminSpots = () => {
  const [spots, setSpots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    locationName: '', address: '', lat: '', lng: '', price: 50, totalSpaces: 10, vehicleType: 'car'
  });
  const navigate = useNavigate();

  const fetchSpots = async () => {
    setLoading(true);
    try {
      const data = await parkingService.getAllSpots();
      if (data.success) setSpots(data.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchSpots(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        locationName: formData.locationName.trim(),
        address: formData.address.trim(),
        price: Number(formData.price),
        totalSpaces: Number(formData.totalSpaces),
        vehicleType: formData.vehicleType,
        location: { lat: parseFloat(formData.lat), lng: parseFloat(formData.lng) }
      };
      const data = editingId ? await parkingService.updateSpot(editingId, payload) : await parkingService.createSpot(payload);
      if (data.success) {
        toast.success(editingId ? 'Node link updated.' : 'Grid capacity expanded.');
        fetchSpots();
        setShowForm(false);
        setEditingId(null);
      }
    } catch { toast.error('Link operation failed.'); }
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      
      <section className="flex justify-between items-end border-b border-white/5 pb-10">
         <div className="space-y-1">
            <div className="flex items-center gap-2 text-cyan-400">
               <ShieldCheck size={14} className="fill-current" />
               <span className="text-[10px] font-black uppercase tracking-[0.2em]">Node Registry</span>
            </div>
            <h1 className="text-4xl font-black font-display text-white uppercase italic">Grid Capacity</h1>
         </div>
      </section>

      {showForm && (
        <Card className="!p-10 animate-in slide-in-from-top-4 duration-500">
           <form onSubmit={handleSubmit} className="space-y-10">
              <div className="flex justify-between items-center">
                 <h3 className="text-xl font-black font-display text-white uppercase">{editingId ? 'Modify Cluster Hash' : 'Registry Initializer'}</h3>
                 <button onClick={() => setShowForm(false)} className="text-slate-500 hover:text-white"><X size={20} /></button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                 <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-600">Location Alias</label>
                    <input type="text" value={formData.locationName} onChange={e => setFormData({...formData, locationName: e.target.value})} className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-sm font-bold text-white focus:border-cyan-400 focus:outline-none" required />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-600">Spatial Address</label>
                    <input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-sm font-bold text-white focus:border-cyan-400 focus:outline-none" required />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-600">Link Type</label>
                    <select value={formData.vehicleType} onChange={e => setFormData({...formData, vehicleType: e.target.value})} className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-sm font-bold text-white focus:border-cyan-400 focus:outline-none appearance-none">
                       <option value="car">Grid-Car</option>
                       <option value="motorcycle">Grid-Bike</option>
                    </select>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-600">Lat-Coordinate</label>
                    <input type="number" step="any" value={formData.lat} onChange={e => setFormData({...formData, lat: e.target.value})} className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-sm font-bold text-white focus:border-cyan-400 focus:outline-none" required />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-600">Lng-Coordinate</label>
                    <input type="number" step="any" value={formData.lng} onChange={e => setFormData({...formData, lng: e.target.value})} className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-sm font-bold text-white focus:border-cyan-400 focus:outline-none" required />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-600">Surcharge Link</label>
                    <input type="number" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-sm font-bold text-white focus:border-cyan-400 focus:outline-none" required />
                 </div>
              </div>

              <div className="flex gap-4 pt-6 border-t border-white/5">
                 <Button type="submit" className="flex-1">{editingId ? 'Commit Update' : 'Initialize Expand'}</Button>
                 <Button variant="secondary" type="button" onClick={() => setShowForm(false)} className="flex-1">Abort</Button>
              </div>
           </form>
        </Card>
      )}

      {loading ? (
         <div className="py-24 flex flex-col items-center gap-4 text-slate-700">
            <Loader2 className="animate-spin text-cyan-400" size={40} />
            <span className="text-[10px] font-black uppercase tracking-widest">Scanning Grid Segments...</span>
         </div>
      ) : (
         <AdminParkingGrid 
            spots={spots} 
            onEditSpot={(spot) => { setEditingId(spot._id); setFormData({ locationName: spot.locationName, address: spot.address || spot.location?.address || '', lat: spot.location?.lat, lng: spot.location?.lng, price: spot.price, totalSpaces: spot.totalSpaces, vehicleType: spot.vehicleType }); setShowForm(true); }}
            onAddSpot={(floor) => { setEditingId(null); setFormData({ ...formData, floor }); setShowForm(true); }}
         />
      )}
    </div>
  );
};

export default AdminSpots;
