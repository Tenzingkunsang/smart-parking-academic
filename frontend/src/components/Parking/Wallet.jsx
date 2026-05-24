import React, { useState, useEffect } from 'react';
import { Wallet, ArrowUpRight, ArrowDownRight, Clock, ShieldCheck, Zap } from 'lucide-react';
import Card from '../ui/Card';
import { API_BASE } from '../../config/api';

const WalletComponent = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchWalletData = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/user/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.data);
        localStorage.setItem('user', JSON.stringify(data.data));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWalletData();
  }, []);

  if (loading) return (
    <Card className="animate-pulse bg-white/5 border-white/10 h-64 flex items-center justify-center">
       <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">Syncing Wallet...</span>
    </Card>
  );

  return (
    <div className="space-y-6">
       <Card className="!p-8 border-cyan-500/20 bg-gradient-to-br from-cyan-500/[0.03] to-transparent relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-400/[0.05] rounded-full blur-3xl group-hover:bg-cyan-400/10 transition-colors" />
          
          <div className="flex justify-between items-start relative z-10">
             <div className="space-y-2">
                <div className="flex items-center gap-2 text-cyan-400">
                   <ShieldCheck size={16} />
                   <span className="text-[10px] font-black uppercase tracking-widest leading-none text-white">Secure Balance</span>
                </div>
                <h3 className="text-4xl font-display font-black text-white italic tracking-tighter leading-none pt-2">
                   Rs.{user?.walletBalance || 0}
                </h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Available Grid Credit</p>
             </div>
             <div className="w-12 h-12 rounded-2xl bg-cyan-500 flex items-center justify-center text-black shadow-xl shadow-cyan-500/20">
                <Wallet size={24} />
             </div>
          </div>
       </Card>

       <Card className="!p-0 overflow-hidden">
          <div className="p-6 border-b border-white/5 flex items-center gap-3">
             <Clock size={16} className="text-slate-700" />
             <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Transaction History</span>
          </div>
          <div className="max-h-64 overflow-y-auto custom-scrollbar">
             {user?.walletTransactions?.length > 0 ? (
               <div className="divide-y divide-white/5">
                  {user.walletTransactions.slice().reverse().map((tx, idx) => (
                    <div key={idx} className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition-all">
                       <div className="flex items-center gap-4">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tx.type === 'credit' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                             {tx.type === 'credit' ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
                          </div>
                          <div>
                             <p className="text-xs font-bold text-white truncate max-w-[150px]">{tx.description}</p>
                             <span className="text-[9px] text-slate-600">{new Date(tx.date).toLocaleDateString()}</span>
                          </div>
                       </div>
                       <span className={`text-xs font-black font-display ${tx.type === 'credit' ? 'text-emerald-400' : 'text-slate-400'}`}>
                          {tx.type === 'credit' ? '+' : '-'}Rs.{tx.amount}
                       </span>
                    </div>
                  ))}
               </div>
             ) : (
               <div className="py-12 text-center space-y-2 opacity-30 grayscale">
                  <Zap size={24} className="mx-auto text-slate-700" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-700">Zero Ledger Records</p>
               </div>
             )}
          </div>
       </Card>
    </div>
  );
};

export default WalletComponent;
