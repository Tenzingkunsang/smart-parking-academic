import React, { useState } from 'react';
import { LayoutGrid, Edit3, Trash2, ShieldAlert, Zap, Plus, X, Save } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';

const AdminParkingGrid = ({ spots, onEditSpot, onAddSpot }) => {
  const [activeFloor, setActiveFloor] = useState(1);
  const floors = [1, 2, 3];

  const filteredSpots = spots.filter(spot => {
    const spotFloor = spot.floor || (parseInt(spot.spotNumber) < 100 ? 1 : Math.floor(parseInt(spot.spotNumber) / 100));
    return spotFloor === activeFloor;
  });

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
         <div className="flex p-1 bg-white/5 rounded-2xl w-fit">
            {floors.map(floor => (
               <button
                  key={floor}
                  onClick={() => setActiveFloor(floor)}
                  className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                  activeFloor === floor 
                     ? 'bg-white text-black shadow-xl' 
                     : 'text-slate-500 hover:text-white'
                  }`}
               >
                  Floor {floor}
               </button>
            ))}
         </div>
         <Button onClick={() => onAddSpot(activeFloor)} className="flex items-center gap-2 !py-2 !px-4 !text-[10px]">
            <Plus size={14} /> Add Spot to Floor {activeFloor}
         </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
         {filteredSpots.map(spot => (
            <Card key={spot._id} className="group !p-6 flex flex-col justify-between h-48 hover:border-cyan-400/50 transition-all relative overflow-hidden">
               <div className="absolute top-0 right-0 w-16 h-16 bg-white/[0.02] rounded-full blur-2xl group-hover:bg-cyan-400/5 transition-all" />
               
               <div className="flex justify-between items-start relative z-10">
                  <span className="font-display font-black text-2xl tracking-tighter text-white">#{spot.spotNumber}</span>
                  <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${spot.status === 'available' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                     {spot.status}
                  </div>
               </div>

               <div className="flex gap-2 relative z-10">
                  <button 
                    onClick={() => onEditSpot(spot)}
                    className="flex-1 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 transition-all"
                  >
                     <Edit3 size={16} />
                  </button>
                  <button className="w-10 h-10 rounded-xl bg-red-500/5 border border-red-500/10 flex items-center justify-center text-red-500 hover:bg-red-500/10 transition-all">
                     <Trash2 size={16} />
                  </button>
               </div>
            </Card>
         ))}
      </div>
    </div>
  );
};

export default AdminParkingGrid;
