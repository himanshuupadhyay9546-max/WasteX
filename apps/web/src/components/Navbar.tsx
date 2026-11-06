"use client";

import React from "react";
import { 
  Sparkles, 
  Activity, 
  Bell, 
  RefreshCw, 
  ShieldCheck, 
  Truck,
  MapPin
} from "lucide-react";

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onRefresh,
  isRefreshing
}) => {
  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-surface-border px-4 lg:px-6 py-3">
      <div className="flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-primary-600 via-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-primary-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg tracking-tight text-white">EcoRoute <span className="text-emerald-400">AI</span></span>
              <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                v1.2 Production
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">Dynamic Congestion-Aware Waste Collection Platform</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center space-x-1 glass-card p-1 rounded-xl border border-surface-border">
          {[
            { id: "live-ops", label: "Live Ops Map" },
            { id: "routes", label: "Route Optimizer" },
            { id: "dumping", label: "Dumping Alerts" },
            { id: "analytics", label: "Waste Analytics" },
            { id: "cv-tester", label: "Edge CV Test" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/25"
                  : "text-slate-300 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center space-x-3">
          {/* Live Status Pill */}
          <div className="hidden sm:flex items-center space-x-2 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/40 text-emerald-400 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>IoT MQTT Active</span>
          </div>

          {/* Quick Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-lg bg-surface hover:bg-slate-800 text-slate-300 hover:text-white transition-colors border border-surface-border"
            title="Refresh Real-time Telemetry"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-emerald-400" : ""}`} />
          </button>

          {/* User Profile Pill */}
          <div className="flex items-center space-x-2 pl-2 border-l border-surface-border">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-emerald-400">
              AS
            </div>
            <div className="hidden lg:block text-left">
              <div className="text-xs font-medium text-white">Aarav Sharma</div>
              <div className="text-[10px] text-slate-400">Municipal Admin</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
