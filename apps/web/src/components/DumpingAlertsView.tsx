"use client";

import React from "react";
import { 
  AlertOctagon, 
  Clock, 
  MapPin, 
  CheckCircle, 
  UserCheck, 
  Camera, 
  ShieldAlert,
  ArrowUpRight
} from "lucide-react";

interface DumpingAlertsViewProps {
  reports: any[];
  onResolveReport: (reportId: string) => void;
}

export const DumpingAlertsView: React.FC<DumpingAlertsViewProps> = ({
  reports,
  onResolveReport
}) => {
  return (
    <div className="glass-panel p-5 rounded-2xl border border-surface-border">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-base font-bold text-white">Illegal Dumping Incident Command</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
              {reports.filter(r => r.status !== 'resolved').length} Active
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Multi-modal AI detection (Dashcams + Citizen 1-tap reports + CCTV feeds with PII redaction)
          </p>
        </div>

        {/* SLA Summary Filter */}
        <div className="flex items-center space-x-2 text-xs">
          <span className="text-slate-400 text-[11px]">SLA Target:</span>
          <span className="px-2 py-1 rounded-lg bg-slate-900 border border-surface-border text-emerald-400 font-semibold text-[11px]">
            &lt; 4h for Critical
          </span>
        </div>
      </div>

      {/* Grid of Incidents */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map((r) => {
          const isResolved = r.status === "resolved";
          const severityColors = {
            critical: "bg-rose-500/20 text-rose-400 border-rose-500/30",
            high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
            medium: "bg-amber-500/20 text-amber-400 border-amber-500/30",
            low: "bg-slate-700 text-slate-300 border-slate-600"
          };

          return (
            <div
              key={r.id}
              className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                isResolved
                  ? "bg-slate-900/40 border-slate-800 opacity-60"
                  : "glass-card border-surface-border hover:border-slate-600"
              }`}
            >
              <div>
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${
                    severityColors[r.severity as keyof typeof severityColors] || severityColors.medium
                  }`}>
                    {r.severity} Severity
                  </span>
                  <span className="text-[10px] text-slate-400 flex items-center">
                    <Clock className="w-3 h-3 mr-1 text-slate-400" />
                    SLA: 2h 45m left
                  </span>
                </div>

                {/* Simulated Photo Thumbnail */}
                <div className="w-full h-32 rounded-lg bg-slate-950 border border-slate-800 relative overflow-hidden mb-3 flex items-center justify-center">
                  <div className="text-center p-3">
                    <Camera className="w-6 h-6 text-slate-600 mx-auto mb-1" />
                    <span className="text-[10px] text-slate-400 font-mono block">AI Verified CCTV Frame</span>
                    <span className="text-[9px] text-emerald-400 font-semibold uppercase">✓ PII Faces &amp; Plates Redacted</span>
                  </div>
                  <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/70 text-[9px] text-slate-300 backdrop-blur-sm">
                    ~{r.estimated_waste_kg || 450} kg
                  </div>
                </div>

                {/* Incident Details */}
                <div className="space-y-1 text-xs">
                  <div className="font-semibold text-white flex items-start space-x-1.5">
                    <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-1">{r.address || "Geotagged Location"}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 pl-5">
                    Source: <span className="capitalize text-slate-300 font-medium">{r.detection_source}</span>
                  </div>
                  <div className="pl-5 pt-1 flex flex-wrap gap-1">
                    {(r.detected_materials || ["Plastics", "Debris"]).map((m: string, i: number) => (
                      <span key={i} className="px-1.5 py-0.5 rounded bg-slate-800 text-[9px] text-slate-300 border border-slate-700 capitalize">
                        {m.replace("_", " ")}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                <span className="text-[10px] text-slate-400">
                  Status: <strong className="text-white capitalize">{r.status}</strong>
                </span>

                {!isResolved ? (
                  <button
                    onClick={() => onResolveReport(r.id)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/30 text-xs font-semibold transition-all flex items-center space-x-1"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Resolve SLA</span>
                  </button>
                ) : (
                  <span className="text-xs text-emerald-400 font-semibold flex items-center space-x-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Resolved</span>
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
