import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Info, CheckCircle, Car, Bike } from 'lucide-react';

const ReservationPage = () => {
  const { spotId } = useParams();
  const navigate = useNavigate();
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [vType, setVType] = useState('car');
  const [hours, setHours] = useState(1);

  const price = vType === 'car' ? 100 : 50;

  return (
    <div className="min-h-screen bg-[#0f172a] text-white font-sans">
      <div className="p-6 flex items-center justify-between border-b border-slate-800">
        <button onClick={() => navigate(-1)}><ChevronLeft size={32}/></button>
        <h1 className="font-black tracking-tighter">SELECT SLOT</h1>
        <Info size={24} className="text-slate-600"/>
      </div>

      {/* Vehicle Toggle */}
      <div className="flex justify-center mt-8 gap-4">
        <button onClick={() => setVType('car')} className={`p-4 rounded-3xl border-2 transition-all ${vType === 'car' ? 'border-blue-500 bg-blue-500/10' : 'border-slate-800'}`}><Car/></button>
        <button onClick={() => setVType('bike')} className={`p-4 rounded-3xl border-2 transition-all ${vType === 'bike' ? 'border-blue-500 bg-blue-500/10' : 'border-slate-800'}`}><Bike/></button>
      </div>

      <div className="mt-12 flex flex-col items-center">
        <div className="w-2/3 h-1 bg-blue-500 shadow-[0_0_20px_blue] rounded-full mb-2"></div>
        <p className="text-[10px] font-bold text-blue-400 tracking-[0.5em] mb-12 uppercase">Entry Gate</p>

        <div className="grid grid-cols-4 gap-4 px-6">
          {['A1','A2','A3','A4','B1','B2','B3','B4','C1','C2','C3','C4'].map(slot => (
            <button 
              key={slot}
              onClick={() => setSelectedSlot(slot)}
              className={`w-16 h-16 rounded-2xl font-black transition-all border-2 
                ${selectedSlot === slot ? 'bg-blue-600 border-blue-400 scale-110' : 'bg-slate-900 border-slate-800'}`}
            >
              {slot}
            </button>
          ))}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 w-full p-8 bg-slate-900/80 backdrop-blur-2xl border-t border-slate-800 rounded-t-[3rem]">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4 bg-slate-950 p-2 rounded-2xl">
            <button onClick={() => setHours(Math.max(1, hours-1))} className="w-10 h-10 font-bold">-</button>
            <span className="font-black">{hours}h</span>
            <button onClick={() => setHours(hours+1)} className="w-10 h-10 font-bold">+</button>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500 font-bold">ESTIMATED PRICE</p>
            <p className="text-3xl font-black">Rs. {hours * price}</p>
          </div>
        </div>
        <button 
          onClick={() => navigate(`/ticket/BK-${Math.floor(Math.random()*90000)}`)}
          className="w-full bg-blue-600 py-5 rounded-[2rem] font-black text-xl flex items-center justify-center gap-2"
        >
          Book Slot {selectedSlot} <CheckCircle/>
        </button>
      </div>
    </div>
  );
};

export default ReservationPage;