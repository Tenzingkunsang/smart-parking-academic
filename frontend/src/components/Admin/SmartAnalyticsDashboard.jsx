import React from 'react';
import PeakDemandHeatmap from './PeakDemandHeatmap';
import SmartInsightsPanel from './SmartInsightsPanel';
import SystemStatusWidget from './SystemStatusWidget';

/**
 * "SmartPark Console" admin analytics view. Dark mode + glassmorphism
 * + neon accents (cyan/blue/emerald).
 *
 * Drop into AdminDashboard:
 *   import SmartAnalyticsDashboard from '../../components/Admin/SmartAnalyticsDashboard';
 *   <SmartAnalyticsDashboard />
 */
export default function SmartAnalyticsDashboard() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 relative overflow-hidden">
      {/* Ambient neon glow */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <header className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-cyan-300">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#22d3ee]" />
              SmartPark Console
            </div>
            <h1 className="text-4xl font-extrabold text-white mt-2">
              Smart <span className="bg-gradient-to-r from-cyan-300 to-emerald-300 bg-clip-text text-transparent">Analytics</span>
            </h1>
            <p className="text-sm text-slate-400 mt-1">Live operational intelligence — refreshes automatically</p>
          </div>
        </header>

        {/* KPI strip */}
        <SmartInsightsPanel />

        {/* Heatmap + System Status */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <PeakDemandHeatmap days={7} />
          </div>
          <div className="lg:col-span-1">
            <SystemStatusWidget />
          </div>
        </div>
      </div>
    </div>
  );
}
