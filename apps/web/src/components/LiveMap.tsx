"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { 
  Layers, 
  Eye, 
  EyeOff, 
  MapPin, 
  Truck, 
  AlertOctagon, 
  Zap,
  Filter
} from "lucide-react";

// Dynamic import for Leaflet components to avoid SSR window errors
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
);
const CircleMarker = dynamic(
  () => import("react-leaflet").then((mod) => mod.CircleMarker),
  { ssr: false }
);
const Polyline = dynamic(
  () => import("react-leaflet").then((mod) => mod.Polyline),
  { ssr: false }
);

interface LiveMapProps {
  bins: any[];
  trucks: any[];
  dumpingReports: any[];
  activeRoute: any;
  onSelectBin?: (bin: any) => void;
}

export const LiveMap: React.FC<LiveMapProps> = ({
  bins,
  trucks,
  dumpingReports,
  activeRoute,
  onSelectBin
}) => {
  const [isMounted, setIsMounted] = useState(false);
  const [showTraffic, setShowTraffic] = useState(true);
  const [showBins, setShowBins] = useState(true);
  const [showTrucks, setShowTrucks] = useState(true);
  const [showDumping, setShowDumping] = useState(true);
  const [minFillFilter, setMinFillFilter] = useState(0);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="w-full h-[540px] glass-panel rounded-2xl flex items-center justify-center border border-surface-border">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs text-slate-400">Loading MapLibre OSM Geospatial Engine...</span>
        </div>
      </div>
    );
  }

  // Filter bins
  const filteredBins = bins.filter((b) => b.current_fill_level >= minFillFilter);

  // Sample route path coordinates
  const routePositions: [number, number][] = activeRoute?.stops?.map((s: any) => [s.lat, s.lng]) || [
    [12.9520, 77.6101],
    [12.9340, 77.6210],
    [12.9380, 77.6255],
    [12.9315, 77.6290],
    [12.9410, 77.6180],
    [12.9790, 77.6405],
    [12.9740, 77.6080],
    [12.8900, 77.7200]
  ];

  // Congestion segments
  const congestionSegments: { coords: [number, number][]; color: string; label: string }[] = [
    {
      coords: [[12.9340, 77.6210], [12.9380, 77.6255], [12.9420, 77.6290]],
      color: "#ef4444", // Heavy / Gridlock (Red)
      label: "Heavy Congestion (+8 min delay)"
    },
    {
      coords: [[12.9790, 77.6405], [12.9720, 77.6445]],
      color: "#f59e0b", // Moderate (Amber)
      label: "Moderate Traffic"
    },
    {
      coords: [[12.9650, 77.7400], [12.9710, 77.7480]],
      color: "#10b981", // Free Flow (Green)
      label: "Free Flow Expressway"
    }
  ];

  return (
    <div className="relative w-full h-[580px] rounded-2xl overflow-hidden glass-panel border border-surface-border shadow-2xl">
      {/* Map Control Overlay */}
      <div className="absolute top-4 left-4 z-[500] glass-card p-2.5 rounded-xl border border-surface-border flex flex-wrap items-center gap-2 text-xs">
        <span className="font-semibold text-white mr-1 flex items-center">
          <Layers className="w-3.5 h-3.5 text-emerald-400 mr-1.5" />
          Map Layers
        </span>

        {/* Traffic Congestion Toggle */}
        <button
          onClick={() => setShowTraffic(!showTraffic)}
          className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-all flex items-center space-x-1 ${
            showTraffic
              ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
              : "bg-slate-800 text-slate-400 border-slate-700"
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
          <span>Traffic Heatmap</span>
        </button>

        {/* Bins Toggle */}
        <button
          onClick={() => setShowBins(!showBins)}
          className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-all flex items-center space-x-1 ${
            showBins
              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
              : "bg-slate-800 text-slate-400 border-slate-700"
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          <span>Smart Bins ({filteredBins.length})</span>
        </button>

        {/* Trucks Toggle */}
        <button
          onClick={() => setShowTrucks(!showTrucks)}
          className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-all flex items-center space-x-1 ${
            showTrucks
              ? "bg-sky-500/20 text-sky-300 border-sky-500/40"
              : "bg-slate-800 text-slate-400 border-slate-700"
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
          <span>Fleet Trucks ({trucks.length})</span>
        </button>

        {/* Dumping Toggle */}
        <button
          onClick={() => setShowDumping(!showDumping)}
          className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-all flex items-center space-x-1 ${
            showDumping
              ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
              : "bg-slate-800 text-slate-400 border-slate-700"
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
          <span>Dumping Alerts ({dumpingReports.length})</span>
        </button>

        {/* Fill Filter */}
        <div className="flex items-center space-x-1.5 pl-2 border-l border-surface-border">
          <Filter className="w-3 h-3 text-slate-400" />
          <select
            value={minFillFilter}
            onChange={(e) => setMinFillFilter(Number(e.target.value))}
            className="bg-slate-900 text-slate-200 border border-slate-700 rounded-md px-2 py-0.5 text-[11px] focus:outline-none"
          >
            <option value={0}>All Fill Levels</option>
            <option value={75}>&gt; 75% High Risk</option>
            <option value={90}>&gt; 90% Overflowing</option>
          </select>
        </div>
      </div>

      {/* Map Legend (Bottom Right) */}
      <div className="absolute bottom-4 right-4 z-[500] glass-card p-3 rounded-xl border border-surface-border text-[11px] space-y-1.5 pointer-events-none">
        <div className="font-semibold text-white text-xs mb-1">Live Ops Legend</div>
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-full bg-rose-500 border border-white/40"></span>
          <span className="text-slate-300">Overflowing Bin (&gt; 85%)</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-full bg-amber-500"></span>
          <span className="text-slate-300">Medium Fill (50-85%)</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
          <span className="text-slate-300">Low Fill (&lt; 50%)</span>
        </div>
        <div className="flex items-center space-x-2 pt-1 border-t border-slate-800">
          <span className="w-4 h-1 bg-emerald-400 rounded-full"></span>
          <span className="text-slate-300">Active Dynamic EV Route</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-4 h-1 bg-rose-500 rounded-full"></span>
          <span className="text-slate-300">Heavy Traffic Penalty Zone</span>
        </div>
      </div>

      {/* Leaflet Map Canvas */}
      <MapContainer
        center={[12.9520, 77.6200]}
        zoom={12}
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {/* 1. Congestion Road Overlay Lines */}
        {showTraffic &&
          congestionSegments.map((seg, idx) => (
            <Polyline
              key={`traffic-${idx}`}
              positions={seg.coords}
              pathOptions={{ color: seg.color, weight: 6, opacity: 0.8, lineCap: "round" }}
            >
              <Popup>
                <div className="text-xs font-semibold">{seg.label}</div>
              </Popup>
            </Polyline>
          ))}

        {/* 2. Active Optimized Route Line */}
        {routePositions.length > 1 && (
          <Polyline
            positions={routePositions}
            pathOptions={{
              color: "#10b981",
              weight: 4,
              opacity: 0.95,
              dashArray: "6, 8"
            }}
          />
        )}

        {/* 3. Smart Bins Markers */}
        {showBins &&
          filteredBins.map((bin) => {
            const fill = bin.current_fill_level;
            const color = fill >= 85 ? "#f43f5e" : fill >= 50 ? "#f59e0b" : "#10b981";
            return (
              <CircleMarker
                key={bin.id}
                center={[bin.lat, bin.lng]}
                radius={fill >= 85 ? 9 : 6}
                pathOptions={{
                  fillColor: color,
                  fillOpacity: 0.9,
                  color: "#ffffff",
                  weight: fill >= 85 ? 2 : 1
                }}
              >
                <Popup>
                  <div className="p-1 space-y-1 min-w-[180px]">
                    <div className="flex items-center justify-between border-b border-slate-700 pb-1">
                      <span className="font-bold text-xs text-white">{bin.id}</span>
                      <span
                        className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase"
                        style={{ backgroundColor: `${color}20`, color: color }}
                      >
                        {bin.status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-300 font-medium">
                      Fill Level: <span className="font-bold text-white">{bin.current_fill_level}%</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Type: <span className="capitalize text-slate-200">{bin.bin_type}</span> • Weight: {bin.current_weight_kg}kg
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Temp: {bin.current_temp_celsius}°C • Methane: {bin.current_gas_level_ppm} ppm
                    </div>
                    <div className="text-[10px] text-slate-400 pt-1">
                      {bin.address}
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}

        {/* 4. Fleet Trucks */}
        {showTrucks &&
          trucks.map((t) => (
            <CircleMarker
              key={t.id}
              center={[t.lat || 12.948, t.lng || 77.612]}
              radius={11}
              pathOptions={{
                fillColor: "#0284c7",
                fillOpacity: 1,
                color: "#38bdf8",
                weight: 3
              }}
            >
              <Popup>
                <div className="p-1 space-y-1">
                  <div className="flex items-center justify-between border-b border-slate-700 pb-1">
                    <span className="font-bold text-xs text-white">{t.id}</span>
                    <span className="text-[10px] text-sky-400 font-medium">{t.plate_number}</span>
                  </div>
                  <div className="text-xs text-slate-300">
                    Model: <span className="text-white">{t.model}</span>
                  </div>
                  <div className="text-[11px] text-slate-300">
                    Speed: {t.current_speed_kmh} km/h • Battery: {t.battery_or_fuel_pct}%
                  </div>
                  <div className="text-[11px] text-emerald-400 font-medium">
                    Load: {t.current_load_kg} / {t.capacity_kg} kg
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          ))}

        {/* 5. Dumping Reports */}
        {showDumping &&
          dumpingReports.map((d) => (
            <CircleMarker
              key={d.id}
              center={[d.lat, d.lng]}
              radius={10}
              pathOptions={{
                fillColor: "#ea580c",
                fillOpacity: 0.95,
                color: "#ffedd5",
                weight: 2
              }}
            >
              <Popup>
                <div className="p-1 space-y-1">
                  <div className="flex items-center justify-between border-b border-slate-700 pb-1">
                    <span className="font-bold text-xs text-orange-400">Illegal Dumping</span>
                    <span className="text-[10px] font-bold uppercase text-rose-400">{d.severity}</span>
                  </div>
                  <div className="text-xs text-slate-200">
                    Source: <span className="capitalize">{d.detection_source}</span>
                  </div>
                  <div className="text-[11px] text-slate-300">
                    Estimated: ~{d.estimated_waste_kg} kg
                  </div>
                  <div className="text-[10px] text-slate-400">{d.address}</div>
                </div>
              </Popup>
            </CircleMarker>
          ))}
      </MapContainer>
    </div>
  );
};
