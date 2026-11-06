"use client";

import React, { useState } from "react";
import { 
  Navigation, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Fuel, 
  Leaf, 
  Sparkles,
  Zap,
  Layers,
  ArrowRight
} from "lucide-react";

interface RouteOptimizerViewProps {
  activeRoute: any;
  onTriggerOptimization: (strategy: string) => void;
  onUpdateStop: (stopId: string, status: string) => void;
  isOptimizing: boolean;
}

export const RouteOptimizerView: React.FC<RouteOptimizerViewProps> = ({
  activeRoute,
  onTriggerOptimization,
  onUpdateStop,
  isOptimizing
}) => {
  const [strategy, setStrategy] = useState<"fastest" | "fuel_optimal">("fastest");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Left Column: Route Strategy & Solver Controls */}
      <div className="space-y-4">
        {/* Solver Card */}
        <div className="glass-panel p-4 rounded-2xl border border-surface-border">
          <div className="flex items-center space-x-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <Sparkles className="w-4 h-4" />
            <span>Google OR-Tools VRPTW Solver</span>
          </div>
          <h3 className="text-base font-bold text-white mb-1">
            Dynamic Congestion Optimizer
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Re-computes time-dependent graph weights using live traffic penalties every 15 minutes.
          </p>

          {/* Strategy Selection */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <button
              onClick={() => setStrategy("fastest")}
              className={`p-3 rounded-xl border text-left transition-all ${
                strategy === "fastest"
                  ? "bg-emerald-500/10 border-emerald-500 text-white shadow-lg shadow-emerald-500/10"
                  : "bg-surface border-surface-border text-slate-400 hover:text-slate-200"
              }`}
            >
              <div className="text-xs font-bold flex items-center justify-between">
                <span>Fastest Route</span>
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                Avoids gridlock corridors
              </div>
            </button>

            <button
              onClick={() => setStrategy("fuel_optimal")}
              className={`p-3 rounded-xl border text-left transition-all ${
                strategy === "fuel_optimal"
                  ? "bg-emerald-500/10 border-emerald-500 text-white shadow-lg shadow-emerald-500/10"
                  : "bg-surface border-surface-border text-slate-400 hover:text-slate-200"
              }`}
            >
              <div className="text-xs font-bold flex items-center justify-between">
                <span>Fuel-Optimal</span>
                <Fuel className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                Minimizes kWh / Stop
              </div>
            </button>
          </div>

          {/* Re-Optimize Button */}
          <button
            onClick={() => onTriggerOptimization(strategy)}
            disabled={isOptimizing}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-xs font-bold tracking-wide shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center space-x-2"
          >
            <Navigation className={`w-4 h-4 ${isOptimizing ? "animate-spin" : ""}`} />
            <span>{isOptimizing ? "Solving VRPTW Matrix..." : "Re-Optimize Active Shift"}</span>
          </button>
        </div>

        {/* Route Summary KPI Panel */}
        <div className="glass-panel p-4 rounded-2xl border border-surface-border space-y-3">
          <div className="text-xs font-bold text-white uppercase tracking-wider">
            Shift Performance vs Baseline
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-surface-border">
              <span className="text-slate-400 text-[10px]">Total Distance</span>
              <div className="text-sm font-bold text-white mt-0.5">
                {activeRoute?.total_distance_km || 18.4} km
              </div>
              <span className="text-[10px] text-emerald-400 font-semibold">-26% vs static</span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-surface-border">
              <span className="text-slate-400 text-[10px]">Est. Shift Duration</span>
              <div className="text-sm font-bold text-white mt-0.5">
                {activeRoute?.estimated_duration_minutes || 58.2} min
              </div>
              <span className="text-[10px] text-emerald-400 font-semibold">-18 min traffic save</span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-surface-border">
              <span className="text-slate-400 text-[10px]">CO₂ Avoided</span>
              <div className="text-sm font-bold text-teal-400 mt-0.5">
                {activeRoute?.estimated_co2_kg || 12.8} kg
              </div>
              <span className="text-[10px] text-slate-400">EV Zero tailpipe</span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-surface-border">
              <span className="text-slate-400 text-[10px]">Stops Completed</span>
              <div className="text-sm font-bold text-sky-400 mt-0.5">
                {activeRoute?.completed_stops || 0} / {activeRoute?.total_stops || 10}
              </div>
              <span className="text-[10px] text-slate-400">On-schedule</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column (2 spans): Turn-by-Turn Sequence & Stop Actions */}
      <div className="lg:col-span-2 glass-panel p-4 rounded-2xl border border-surface-border">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold text-white">Active Turn-by-Turn Collection Manifest</h3>
            <p className="text-xs text-slate-400">Assigned: TRUCK-01 (Volvo FE Electric) • Driver: Rajesh Kumar</p>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            {activeRoute?.status || "In Progress"}
          </span>
        </div>

        {/* Stops List */}
        <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
          {activeRoute?.stops && activeRoute.stops.length > 0 ? (
            activeRoute.stops.map((stop: any, idx: number) => {
              const isCollected = stop.status === "collected";
              const isArrived = stop.status === "arrived";
              const isBlocked = stop.status === "blocked";
              
              return (
                <div
                  key={stop.id || idx}
                  className={`p-3 rounded-xl border transition-all flex items-center justify-between ${
                    isCollected
                      ? "bg-slate-900/40 border-slate-800 opacity-60"
                      : isArrived
                      ? "bg-emerald-950/30 border-emerald-500/40 shadow-md shadow-emerald-500/5"
                      : "bg-surface border-surface-border hover:border-slate-600"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    {/* Sequence Badge */}
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                      isCollected
                        ? "bg-emerald-500 text-white"
                        : isArrived
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                        : "bg-slate-800 text-slate-300"
                    }`}>
                      {idx + 1}
                    </div>

                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-xs text-white">
                          {stop.bin_id || (stop.stop_type === "depot_start" ? "Central Fleet Depot" : "Mandur Landfill")}
                        </span>
                        <span className={`px-1.5 py-0.2 text-[9px] font-bold uppercase rounded ${
                          isCollected
                            ? "bg-emerald-500/20 text-emerald-400"
                            : isBlocked
                            ? "bg-rose-500/20 text-rose-400"
                            : "bg-slate-800 text-slate-400"
                        }`}>
                          {stop.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {stop.address || "100ft Inner Ring Rd Corridor"} • Est. ETA: +{(idx + 1) * 4} min
                      </div>
                    </div>
                  </div>

                  {/* Driver Action Buttons */}
                  <div className="flex items-center space-x-2">
                    {!isCollected && (
                      <>
                        <button
                          onClick={() => onUpdateStop(stop.id, "collected")}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold shadow-sm transition-all flex items-center space-x-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Collect</span>
                        </button>
                        <button
                          onClick={() => onUpdateStop(stop.id, "blocked")}
                          className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/40 hover:text-rose-400 text-slate-400 text-xs border border-slate-700 transition-all"
                          title="Report Bin Blocked by Traffic/Vehicle"
                        >
                          Blocked
                        </button>
                      </>
                    )}
                    {isCollected && (
                      <span className="text-xs text-emerald-400 font-medium flex items-center space-x-1">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Done</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 text-slate-400 text-xs">
              No active route sequence available. Click &quot;Re-Optimize Active Shift&quot; to compute.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
