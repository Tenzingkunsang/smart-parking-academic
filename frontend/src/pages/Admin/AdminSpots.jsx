import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { MapPin, Plus, Trash2, Edit3, Loader2, ArrowLeft, ShieldCheck, Zap, Car, Settings, X } from 'lucide-react';
import parkingService from '../../services/parkingService';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

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
         <div className="flex gap-4">
            <Button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 !px-6">
               <Plus size={18} /> {showForm ? 'Abort Registry' : 'Expand Grid'}
            </Button>
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
         <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {spots.map((spot) => (
              <Card key={spot._id} className="group hover:border-white/20 !p-8 flex flex-col justify-between h-[340px] transition-all relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-400/[0.02] rounded-full blur-3xl pointer-events-none transition-all group-hover:bg-cyan-400/10" />
                 
                 <div className="space-y-6 relative z-10">
                    <div className="flex justify-between items-start">
                       <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-cyan-400/10 flex items-center justify-center text-cyan-400">
                             <Car size={20} />
                          </div>
                          <div className="space-y-0.5">
                             <h4 className="font-bold text-white truncate max-w-[120px]">{spot.locationName}</h4>
                             <span className="text-[9px] font-black uppercase text-slate-700 tracking-widest">ID #{spot.spotNumber}</span>
                          </div>
                       </div>
                       <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${spot.status === 'available' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-white/5 text-slate-600'}`}>{spot.status}</span>
                    </div>

                    <div className="space-y-4">
                       <p className="text-[10px] text-slate-500 font-medium flex items-center gap-2 truncate">
                          <MapPin size={12} className="text-slate-700" /> {spot.address || 'Standard KTM Node'}
                       </p>
                       <div className="flex gap-10">
                          <div className="space-y-1">
                             <span className="text-[8px] font-black uppercase tracking-widest text-slate-700 block">Unit Capacity</span>
                             <span className="text-xl font-display font-black text-white">{spot.availableSpaces} / {spot.totalSpaces}</span>
                          </div>
                          <div className="space-y-1">
                             <span className="text-[8px] font-black uppercase tracking-widest text-slate-700 block">Rate Matrix</span>
                             <span className="text-xl font-display font-black text-cyan-400">Rs.{spot.price}</span>
                          </div>
                       </div>
                    </div>
                 </div>

                 <div className="flex gap-3 pt-6 border-t border-white/5 relative z-10">
                    <Button variant="secondary" onClick={() => { setEditingId(spot._id); setFormData({ locationName: spot.locationName, address: spot.address || spot.location?.address || '', lat: spot.location?.lat, lng: spot.location?.lng, price: spot.price, totalSpaces: spot.totalSpaces, vehicleType: spot.vehicleType }); setShowForm(true); }} className="flex-1 !py-0 h-10 !text-[9px]">Modify</Button>
                    <button onClick={async () => { if(window.confirm('Terminate Node Link?')) { await parkingService.deleteSpot(spot._id); fetchSpots(); } }} className="w-10 h-10 rounded-xl bg-red-500/5 text-red-500 border border-red-500/10 flex items-center justify-center hover:bg-red-500/10 transition-all">
                       <Trash2 size={16} />
                    </button>
                 </div>
              </Card>
            ))}
         </div>
      )}
    </div>
  );
};

export default AdminSpots;
