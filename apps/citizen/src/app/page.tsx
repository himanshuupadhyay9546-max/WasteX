"use client";

import React, { useState } from "react";
import { 
  Trash2, 
  Camera, 
  Award, 
  MapPin, 
  CheckCircle2, 
  Flame, 
  Sparkles,
  ArrowRight,
  ShieldCheck,
  TrendingUp
} from "lucide-react";

export default function CitizenPage() {
  const [activeTab, setActiveTab] = useState<"bins" | "report" | "rewards">("bins");
  const [rewardPoints, setRewardPoints] = useState(350);
  const [reportSubmitted, setReportSubmitted] = useState(false);

  const nearbyBins = [
    { id: "BIN-BLR-001", distanceMeters: 85, fill: 94.5, type: "Plastic", status: "Full", address: "100ft Rd Corner" },
    { id: "BIN-BLR-002", distanceMeters: 240, fill: 42.0, type: "Organic", status: "Available", address: "80ft Rd Cross" },
    { id: "BIN-BLR-003", distanceMeters: 380, fill: 28.5, type: "Mixed", status: "Available", address: "Sony World Junction" }
  ];

  const handleReportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setReportSubmitted(true);
    setRewardPoints(prev => prev + 50);
  };

  return (
    <div className="max-w-md mx-auto min-h-screen p-4 flex flex-col justify-between">
      {/* Header */}
      <header className="flex items-center justify-between py-2 border-b border-surface-border">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
            🌱
          </div>
          <div>
            <h1 className="font-bold text-base text-white">WasteX Citizen</h1>
            <p className="text-[11px] text-slate-400">Clean City Initiative • Koramangala Ward</p>
          </div>
        </div>

        {/* Eco Points Badge */}
        <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
          <Award className="w-3.5 h-3.5 text-amber-400" />
          <span>{rewardPoints} pts</span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="my-auto py-4 space-y-4">
        {/* Navigation Tabs */}
        <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-surface border border-surface-border text-xs font-medium">
          <button
            onClick={() => setActiveTab("bins")}
            className={`py-2 rounded-lg transition-all ${activeTab === "bins" ? "bg-emerald-500 text-white font-bold" : "text-slate-400"}`}
          >
            Nearby Bins
          </button>
          <button
            onClick={() => setActiveTab("report")}
            className={`py-2 rounded-lg transition-all ${activeTab === "report" ? "bg-emerald-500 text-white font-bold" : "text-slate-400"}`}
          >
            Report Dump
          </button>
          <button
            onClick={() => setActiveTab("rewards")}
            className={`py-2 rounded-lg transition-all ${activeTab === "rewards" ? "bg-emerald-500 text-white font-bold" : "text-slate-400"}`}
          >
            Eco Rewards
          </button>
        </div>

        {/* TAB 1: Nearby Bins */}
        {activeTab === "bins" && (
          <div className="space-y-3">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Smart Bins Within 500 Meters
            </div>
            {nearbyBins.map((bin) => (
              <div key={bin.id} className="p-3.5 rounded-xl bg-surface border border-surface-border flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs ${
                    bin.fill > 80 ? "bg-rose-500/10 text-rose-400 border border-rose-500/30" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                  }`}>
                    <Trash2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">{bin.id} ({bin.type})</div>
                    <div className="text-[11px] text-slate-400 flex items-center mt-0.5">
                      <MapPin className="w-3 h-3 text-slate-500 mr-1" />
                      <span>{bin.address} • {bin.distanceMeters}m away</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className={`text-xs font-black ${bin.fill > 80 ? "text-rose-400" : "text-emerald-400"}`}>
                    {bin.fill}%
                  </div>
                  <span className="text-[10px] text-slate-500">{bin.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 2: Report Illegal Dumping */}
        {activeTab === "report" && (
          <div className="p-4 rounded-xl bg-surface border border-surface-border">
            {!reportSubmitted ? (
              <form onSubmit={handleReportSubmit} className="space-y-3">
                <div className="text-sm font-bold text-white">Report Illegal Garbage Dumping</div>
                <p className="text-xs text-slate-400">
                  Snap a photo of the illicit waste site. Our YOLOv10 computer vision system auto-verifies and alerts municipal cleanup teams.
                </p>

                <div className="h-32 rounded-xl border-2 border-dashed border-slate-700 bg-background flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:border-emerald-500 transition-colors">
                  <Camera className="w-8 h-8 text-emerald-400 mb-1" />
                  <span className="text-xs font-semibold text-slate-300">Tap to Capture / Upload Photo</span>
                  <span className="text-[10px] text-slate-500">Auto-GPS Geotagging enabled</span>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs tracking-wide shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center space-x-1.5"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Submit Report &amp; Claim +50 Points</span>
                </button>
              </form>
            ) : (
              <div className="text-center py-6 space-y-2">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                <h3 className="text-sm font-bold text-white">Report Verified &amp; Dispatched!</h3>
                <p className="text-xs text-slate-400">
                  Zone 1 Supervisor priority ticket created. +50 Green Eco-Points added to your balance.
                </p>
                <button
                  onClick={() => setReportSubmitted(false)}
                  className="mt-3 px-4 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Submit Another Report
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Eco Rewards & Leaderboard */}
        {activeTab === "rewards" && (
          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-950/40 via-surface to-surface border border-emerald-500/20">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-emerald-400 font-bold uppercase tracking-wider">Citizen Tier: Silver</span>
                  <div className="text-2xl font-black text-white mt-0.5">{rewardPoints} EcoPoints</div>
                </div>
                <Award className="w-8 h-8 text-amber-400" />
              </div>
              <div className="text-[10px] text-slate-400 mt-2">
                Redeem for free bus transit passes &amp; municipal tax concessions.
              </div>
            </div>

            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider pt-2">
              Ward 108 Green Champions
            </div>
            <div className="space-y-1.5">
              {[
                { name: "Ananya Verma (You)", pts: rewardPoints, rank: 1 },
                { name: "Suresh Gowda", pts: 310, rank: 2 },
                { name: "Deepa Menon", pts: 280, rank: 3 }
              ].map((c) => (
                <div key={c.rank} className="p-2.5 rounded-xl bg-surface border border-surface-border flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="w-5 font-bold text-amber-400">#{c.rank}</span>
                    <span className="text-white font-medium">{c.name}</span>
                  </div>
                  <span className="font-bold text-emerald-400">{c.pts} pts</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-2 text-center text-[10px] text-slate-500 border-t border-surface-border">
        WasteX Municipal Platform • Zero Waste Bengaluru Initiative
      </footer>
    </div>
  );
}
