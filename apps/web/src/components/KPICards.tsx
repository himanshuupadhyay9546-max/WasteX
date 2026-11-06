"use client";

import React from "react";
import { 
  Trash2, 
  Truck, 
  AlertTriangle, 
  Leaf, 
  Fuel, 
  TrendingDown,
  Gauge
} from "lucide-react";

interface KPICardsProps {
  stats: {
    totalBins: number;
    overflowingBins: number;
    activeTrucks: number;
    openDumpingAlerts: number;
    co2SavedKg: number;
    fuelSavedLiters: number;
    avgFillPct: number;
    distanceReductionPct: number;
  };
}

export const KPICards: React.FC<KPICardsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
      {/* 1. Overflowing Bins */}
      <div className="glass-card p-3.5 rounded-xl border border-rose-500/20 bg-gradient-to-br from-rose-950/20 to-surface">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">Overflowing Bins</span>
          <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400">
            <Trash2 className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-2xl font-bold text-white tracking-tight">{stats.overflowingBins}</span>
          <span className="text-[11px] font-semibold text-rose-400">
            of {stats.totalBins} bins
          </span>
        </div>
        <div className="mt-1 flex items-center text-[10px] text-slate-400">
          <span className="text-rose-400 font-medium mr-1">High Priority</span> for EV Dispatch
        </div>
      </div>

      {/* 2. Active Fleet */}
      <div className="glass-card p-3.5 rounded-xl border border-surface-border">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">Active Trucks</span>
          <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400">
            <Truck className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-2xl font-bold text-white tracking-tight">{stats.activeTrucks}</span>
          <span className="text-[11px] font-semibold text-emerald-400">100% Online</span>
        </div>
        <div className="mt-1 text-[10px] text-slate-400">
          3 EV • 1 CNG Hybrid
        </div>
      </div>

      {/* 3. Distance Reduced (OR-Tools) */}
      <div className="glass-card p-3.5 rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/20 to-surface">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">Distance Saved</span>
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
            <TrendingDown className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-2xl font-bold text-emerald-400 tracking-tight">
            -{stats.distanceReductionPct}%
          </span>
          <span className="text-[11px] text-slate-400">vs static</span>
        </div>
        <div className="mt-1 text-[10px] text-slate-400">
          OR-Tools VRPTW Algorithm
        </div>
      </div>

      {/* 4. CO2 Emissions Saved */}
      <div className="glass-card p-3.5 rounded-xl border border-surface-border">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">CO₂ Reduced</span>
          <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-400">
            <Leaf className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-2xl font-bold text-white tracking-tight">{stats.co2SavedKg}</span>
          <span className="text-[11px] font-medium text-teal-400">kg today</span>
        </div>
        <div className="mt-1 text-[10px] text-slate-400">
          Net negative city footprint
        </div>
      </div>

      {/* 5. Fuel Saved */}
      <div className="glass-card p-3.5 rounded-xl border border-surface-border">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">Fuel Saved</span>
          <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
            <Fuel className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-2xl font-bold text-white tracking-tight">{stats.fuelSavedLiters}</span>
          <span className="text-[11px] font-medium text-amber-400">Liters</span>
        </div>
        <div className="mt-1 text-[10px] text-slate-400">
          Save ~$180 / vehicle / week
        </div>
      </div>

      {/* 6. Illegal Dumping Alerts */}
      <div className="glass-card p-3.5 rounded-xl border border-surface-border">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">Dumping Alerts</span>
          <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-400">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-2xl font-bold text-orange-400 tracking-tight">{stats.openDumpingAlerts}</span>
          <span className="text-[11px] text-slate-400">Open Tickets</span>
        </div>
        <div className="mt-1 text-[10px] text-slate-400">
          Dashcam & Citizen feeds
        </div>
      </div>
    </div>
  );
};
