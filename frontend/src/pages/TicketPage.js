import React, { useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Download, Home, CheckCircle2, MapPin, Calendar, Clock, Info } from 'lucide-react';

const TicketPage = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();

  // For demo purposes, we'll use today's date
  const currentDate = new Date().toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 font-sans">
      
      {/* 1. Success Header */}
      <div className="mb-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-500/10 rounded-full mb-4">
          <CheckCircle2 className="text-emerald-500" size={48} />
        </div>
        <h1 className="text-3xl font-black text-white italic tracking-tight">BOOKING SECURED</h1>
        <p className="text-slate-400 mt-2 font-medium">Your digital permit is ready for use.</p>
      </div>

      {/* 2. The Ticket Body */}
      <div className="w-full max-w-sm bg-white rounded-[3rem] overflow-hidden shadow-2xl shadow-blue-500/20">
        
        {/* Header Section (Dark) */}
        <div className="p-8 bg-slate-900 text-white">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black tracking-[0.2em] text-blue-400 uppercase">SmartPark KTM</p>
              <h2 className="text-2xl font-black mt-1 tracking-tight">Entry Pass</h2>
            </div>
            <div className="bg-white/10 p-2 rounded-xl backdrop-blur-md border border-white/10">
              <MapPin size={20} className="text-blue-400" />
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-4">
            <div>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Date</p>
              <p className="text-sm font-bold flex items-center gap-2 mt-1"><Calendar size={14} className="text-blue-500"/> {currentDate}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">ID Reference</p>
              <p className="text-sm font-bold text-blue-400">#{bookingId?.toUpperCase()}</p>
            </div>
          </div>
        </div>

        {/* The Tear-Line (Visual Separator) */}
        <div className="relative h-8 bg-white flex items-center">
            <div className="absolute left-0 -translate-x-1/2 w-8 h-8 bg-slate-950 rounded-full shadow-inner"></div>
            <div className="absolute right-0 translate-x-1/2 w-8 h-8 bg-slate-950 rounded-full shadow-inner"></div>
            <div className="w-full border-t-2 border-dashed border-slate-200 mx-6"></div>
        </div>

        {/* QR & Scanner Section (Light) */}
        <div className="px-10 pb-10 flex flex-col items-center bg-white text-slate-900">
          <div className="p-4 bg-white border-4 border-slate-50 rounded-[2.5rem] shadow-xl mb-8 -mt-2 transition-transform hover:scale-105 duration-300">
            <QRCodeSVG 
              value={`SPARK-KTM-${bookingId}`} 
              size={180}
              level={"H"}
              includeMargin={false}
              className="rounded-xl"
            />
          </div>
          
          <div className="w-full space-y-4 mb-8">
            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-[10px] text-slate-400 font-black uppercase">Status</span>
              <span className="text-xs font-black text-emerald-600 px-3 py-1 bg-emerald-50 rounded-full">ACTIVE PASS</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-[10px] text-slate-400 font-black uppercase">Gate Access</span>
              <span className="text-xs font-black text-slate-900">AUTO-SCAN ENABLED</span>
            </div>
          </div>

          {/* Interaction Row */}
          <div className="flex gap-4 w-full">
            <button className="flex-1 py-4 bg-slate-100 rounded-2xl text-slate-900 font-bold flex items-center justify-center gap-2 hover:bg-slate-200 transition-all active:scale-95">
              <Download size={18} /> Save
            </button>
            <button 
                onClick={() => navigate('/')}
                className="flex-1 py-4 bg-blue-600 rounded-2xl text-white font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/30 active:scale-95"
            >
              <Home size={18} /> Finish
            </button>
          </div>
        </div>
      </div>

      <div className="mt-8 flex items-center gap-2 text-slate-600">
        <Info size={14} />
        <p className="text-[10px] font-bold uppercase tracking-[0.2em]">Hold QR near camera at gate</p>
      </div>
    </div>
  );
};

export default TicketPage;