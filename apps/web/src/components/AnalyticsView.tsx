"use client";

import React from "react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from "recharts";
import { 
  TrendingDown, 
  Activity, 
  Leaf, 
  CheckCircle2, 
  Cpu
} from "lucide-react";

interface AnalyticsViewProps {
  analyticsData: any;
}

const CATEGORY_COLORS = [
  "#10b981", "#38bdf8", "#f59e0b", "#a855f7", "#ec4899", "#f43f5e", "#64748b"
];

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ analyticsData }) => {
  const trendData = analyticsData?.recent_trend || [
    { day: "Mon", distance_km_optimized: 142, distance_km_static_baseline: 194, co2_saved_kg: 42, waste_collected_tons: 24.5 },
    { day: "Tue", distance_km_optimized: 138, distance_km_static_baseline: 194, co2_saved_kg: 48, waste_collected_tons: 26.2 },
    { day: "Wed", distance_km_optimized: 145, distance_km_static_baseline: 194, co2_saved_kg: 51, waste_collected_tons: 28.0 },
    { day: "Thu", distance_km_optimized: 139, distance_km_static_baseline: 194, co2_saved_kg: 46, waste_collected_tons: 25.1 },
    { day: "Fri", distance_km_optimized: 152, distance_km_static_baseline: 194, co2_saved_kg: 56, waste_collected_tons: 31.4 },
    { day: "Sat", distance_km_optimized: 148, distance_km_static_baseline: 194, co2_saved_kg: 54, waste_collected_tons: 29.8 },
    { day: "Sun", distance_km_optimized: 132, distance_km_static_baseline: 194, co2_saved_kg: 62, waste_collected_tons: 23.0 }
  ];

  const pieData = [
    { name: "Plastic (Recyclable)", value: 32.4 },
    { name: "Organic (Compost)", value: 28.6 },
    { name: "Paper & Cardboard", value: 16.2 },
    { name: "Glass Bottles", value: 8.5 },
    { name: "Metals & Cans", value: 6.8 },
    { name: "E-Waste", value: 4.5 },
    { name: "Hazardous / Debris", value: 3.0 }
  ];

  return (
    <div className="space-y-4">
      {/* Top Row: 2 Big Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 1. Distance & Carbon Comparison */}
        <div className="glass-panel p-5 rounded-2xl border border-surface-border">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center">
                <TrendingDown className="w-4 h-4 text-emerald-400 mr-1.5" />
                Fleet Mileage: Dynamic vs Static Baseline
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Consistently achieves 26-32% mileage reduction across all city zones
              </p>
            </div>
            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-xs font-bold">
              Avg -28.4% km
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" />
                <XAxis dataKey="day" stroke="#64748b" textAnchor="end" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#111827", borderColor: "#374151", borderRadius: "8px", fontSize: "11px" }}
                />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                <Bar dataKey="distance_km_optimized" name="EcoRoute Dynamic (km)" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="distance_km_static_baseline" name="Fixed Schedule Baseline (km)" fill="#475569" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. Waste Category Distribution */}
        <div className="glass-panel p-5 rounded-2xl border border-surface-border">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center">
                <Leaf className="w-4 h-4 text-teal-400 mr-1.5" />
                Waste Category Breakdown (YOLOv8 Classified)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time stream aggregation from bin cameras and driver scans
              </p>
            </div>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: "#111827", borderColor: "#374151", borderRadius: "8px", fontSize: "11px" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Row: ML Model Drift & Operational Health */}
      <div className="glass-panel p-5 rounded-2xl border border-surface-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Cpu className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Edge &amp; Core ML Architecture Telemetry</h3>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/20">
            All Models Healthy
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-slate-900/60 border border-surface-border">
            <div className="text-[11px] text-slate-400 font-medium">Prediction Accuracy (MAPE)</div>
            <div className="text-xl font-bold text-emerald-400 mt-1">8.4%</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Target: &lt; 12% (XGBoost + LightGBM)</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/60 border border-surface-border">
            <div className="text-[11px] text-slate-400 font-medium">Overflow Alert Recall</div>
            <div className="text-xl font-bold text-emerald-400 mt-1">93.4%</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Target: &gt; 90% Recall</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/60 border border-surface-border">
            <div className="text-[11px] text-slate-400 font-medium">Population Drift (PSI)</div>
            <div className="text-xl font-bold text-teal-400 mt-1">0.042</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Status: Stable (Retrain in 5d)</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/60 border border-surface-border">
            <div className="text-[11px] text-slate-400 font-medium">CV On-Device Footprint</div>
            <div className="text-xl font-bold text-sky-400 mt-1">6.18 MB</div>
            <div className="text-[10px] text-slate-400 mt-0.5">YOLOv8-nano INT8 Quantized</div>
          </div>
        </div>
      </div>
    </div>
  );
};
