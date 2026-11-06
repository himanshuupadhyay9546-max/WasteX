"use client";

import React, { useState, useEffect } from "react";
import { 
  Navigation, 
  CheckCircle2, 
  AlertTriangle, 
  Camera, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  MapPin, 
  Clock, 
  ShieldAlert,
  ArrowRight,
  BatteryCharging
} from "lucide-react";
import { OfflineQueueManager, type QueuedAction } from "@wastex/offline-store";
import { WasteXApiClient } from "@wastex/api-client";

const client = new WasteXApiClient({ baseUrl: "http://localhost:4000" });

export default function DriverHudPage() {
  const [isOnline, setIsOnline] = useState(true);
  const [offlineQueue, setOfflineQueue] = useState<QueuedAction[]>([]);
  const [currentStopIndex, setCurrentStopIndex] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);

  const [stops, setStops] = useState([
    { id: "BIN-BLR-001", address: "100ft Rd, 4th Block, Koramangala", fill: 94.5, type: "plastic", etaMin: 4, traffic: "heavy", status: "pending" },
    { id: "BIN-BLR-002", address: "80ft Rd, 6th Block, Koramangala", fill: 88.0, type: "organic", etaMin: 9, traffic: "moderate", status: "pending" },
    { id: "BIN-BLR-003", address: "Sony World Junction, Koramangala", fill: 78.4, type: "mixed", etaMin: 14, traffic: "free", status: "pending" },
    { id: "BIN-BLR-004", address: "Forum Mall Promenade", fill: 45.2, type: "glass", etaMin: 19, traffic: "free", status: "pending" },
    { id: "BIN-BLR-006", address: "12th Main Rd, HAL 2nd Stage", fill: 96.0, type: "mixed", etaMin: 26, traffic: "heavy", status: "pending" }
  ]);

  useEffect(() => {
    setOfflineQueue(OfflineQueueManager.getQueue());
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleCollect = async (binId: string) => {
    const updated = stops.map(s => s.id === binId ? { ...s, status: "collected" } : s);
    setStops(updated);
    setCurrentStopIndex(prev => Math.min(prev + 1, stops.length - 1));

    if (!isOnline) {
      OfflineQueueManager.enqueue({
        type: "BIN_COLLECTED",
        payload: { stopId: binId, status: "collected" }
      });
      setOfflineQueue(OfflineQueueManager.getQueue());
    } else {
      try {
        await client.updateStopStatus(binId, "collected", true);
      } catch (e) {
        OfflineQueueManager.enqueue({
          type: "BIN_COLLECTED",
          payload: { stopId: binId, status: "collected" }
        });
        setOfflineQueue(OfflineQueueManager.getQueue());
      }
    }
  };

  const handleSyncOffline = async () => {
    setIsSyncing(true);
    try {
      await client.syncOfflineQueue();
      setOfflineQueue(OfflineQueueManager.getQueue());
    } finally {
      setIsSyncing(false);
    }
  };

  const handleReportDumping = async () => {
    const payload = {
      lat: 12.9380,
      lng: 77.6255,
      imageUrl: "/media/dumping_driver_cam.jpg",
      estimatedWasteKg: 450
    };
    if (!isOnline) {
      OfflineQueueManager.enqueue({ type: "DUMPING_REPORT", payload });
      setOfflineQueue(OfflineQueueManager.getQueue());
      alert("GPS Dumping ticket queued locally. Auto-sync will dispatch when reconnected.");
    } else {
      await client.reportDumping(payload);
      alert("GPS Dumping ticket dispatched immediately to Zone 1 Supervisor queue!");
    }
  };

  const currentStop = stops[currentStopIndex];

  return (
    <div className="max-w-md mx-auto min-h-screen p-4 flex flex-col justify-between select-none">
      {/* HUD Header */}
      <header className="flex items-center justify-between py-2 border-b border-surface-border">
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-black text-xl tracking-tight text-white">WasteX <span className="text-hud-green">PILOT</span></span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">TRUCK-01</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Rajesh Kumar • Volvo FE Electric</div>
        </div>

        {/* Network & Battery Pills */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsOnline(!isOnline)}
            className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center space-x-1.5 transition-all ${
              isOnline
                ? "bg-emerald-500/10 text-hud-green border border-emerald-500/30"
                : "bg-rose-500/20 text-hud-red border border-rose-500/40"
            }`}
          >
            {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            <span>{isOnline ? "ONLINE" : "OFFLINE"}</span>
          </button>
        </div>
      </header>

      {/* Offline Sync Banner */}
      {offlineQueue.length > 0 && (
        <div className="mt-3 p-2.5 rounded-xl bg-sky-950/40 border border-sky-500/30 flex items-center justify-between text-xs">
          <div className="text-sky-300 flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse"></span>
            <span><strong>{offlineQueue.length}</strong> action(s) stored locally</span>
          </div>
          {isOnline && (
            <button
              onClick={handleSyncOffline}
              disabled={isSyncing}
              className="px-2.5 py-1 rounded-lg bg-sky-500 text-slate-950 font-bold flex items-center space-x-1 text-[11px]"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing ? "animate-spin" : ""}`} />
              <span>Sync Now</span>
            </button>
          )}
        </div>
      )}

      {/* Active Target Card */}
      <main className="my-auto py-4 space-y-4">
        <div className="p-5 rounded-2xl bg-surface border border-surface-border shadow-2xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
              NEXT TARGET ({currentStopIndex + 1}/{stops.length})
            </span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
              currentStop.traffic === "heavy"
                ? "bg-rose-500/20 text-hud-red border border-rose-500/30"
                : "bg-emerald-500/10 text-hud-green border border-emerald-500/20"
            }`}>
              {currentStop.traffic === "heavy" ? "⚠️ Heavy Congestion (+5m)" : "✓ Free Flow"}
            </span>
          </div>

          <h2 className="text-2xl font-black text-white tracking-tight">{currentStop.id}</h2>
          <p className="text-xs text-slate-300 mt-1 flex items-start space-x-1">
            <MapPin className="w-3.5 h-3.5 text-hud-green shrink-0 mt-0.5" />
            <span>{currentStop.address}</span>
          </p>

          <div className="grid grid-cols-3 gap-2 mt-4 p-3 rounded-xl bg-background border border-surface-border text-center">
            <div>
              <span className="text-[10px] text-slate-500 font-semibold uppercase">Fill Level</span>
              <div className="text-lg font-black text-hud-red">{currentStop.fill}%</div>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-semibold uppercase">Type</span>
              <div className="text-xs font-bold text-slate-200 mt-1 uppercase">{currentStop.type}</div>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-semibold uppercase">ETA</span>
              <div className="text-lg font-black text-sky-400">{currentStop.etaMin}m</div>
            </div>
          </div>

          {/* Primary Action Button */}
          <div className="mt-5 space-y-2">
            <button
              onClick={() => handleCollect(currentStop.id)}
              className="w-full py-4 rounded-xl bg-hud-green hover:bg-emerald-600 text-slate-950 font-black text-base tracking-wide flex items-center justify-center space-x-2 shadow-xl shadow-hud-green/20 active:scale-95 transition-all"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>MARK BIN COLLECTED</span>
            </button>
          </div>
        </div>

        {/* In-Cab Driver Tools */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setScanResult("Plastic (PET) - 85% Recyclable • 18ms YOLOv10 Edge Scan")}
            className="p-3.5 rounded-xl bg-surface border border-surface-border hover:border-slate-600 text-left transition-all active:scale-95"
          >
            <Camera className="w-5 h-5 text-sky-400 mb-1" />
            <div className="text-xs font-bold text-white">YOLOv10 Scan</div>
            <div className="text-[10px] text-slate-400">Classify waste edge</div>
          </button>

          <button
            onClick={handleReportDumping}
            className="p-3.5 rounded-xl bg-surface border border-rose-500/20 hover:border-rose-500/40 text-left transition-all active:scale-95"
          >
            <ShieldAlert className="w-5 h-5 text-hud-red mb-1" />
            <div className="text-xs font-bold text-hud-red">Report Dumping</div>
            <div className="text-[10px] text-slate-400">1-Tap GPS Ticket</div>
          </button>
        </div>

        {scanResult && (
          <div className="p-3 rounded-xl bg-slate-900 border border-emerald-500/40 text-xs text-hud-green font-mono">
            {scanResult}
          </div>
        )}
      </main>

      {/* Manifest Drawer / Bottom List */}
      <footer className="pt-2 border-t border-surface-border">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span>Today&apos;s Manifest Stops</span>
          <span>{stops.filter(s => s.status === "collected").length} of {stops.length} Done</span>
        </div>
        <div className="flex space-x-2 overflow-x-auto pb-1">
          {stops.map((s, idx) => (
            <div
              key={s.id}
              onClick={() => setCurrentStopIndex(idx)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 cursor-pointer border ${
                idx === currentStopIndex
                  ? "bg-slate-800 text-white border-hud-green"
                  : s.status === "collected"
                  ? "bg-slate-950 text-slate-500 border-slate-800 line-through"
                  : "bg-surface text-slate-400 border-surface-border"
              }`}
            >
              {idx + 1}. {s.id}
            </div>
          ))}
        </div>
      </footer>
    </div>
  );
}
