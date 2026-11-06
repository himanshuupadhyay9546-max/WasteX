"use client";

import React, { useState } from "react";
import { 
  Camera, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  ThumbsUp, 
  ThumbsDown,
  Cpu,
  Layers
} from "lucide-react";

export const CVTestingModal: React.FC = () => {
  const [selectedSample, setSelectedSample] = useState<string>("plastic");
  const [inferenceResult, setInferenceResult] = useState<any>({
    primary_category: "plastic",
    confidence_score: 0.942,
    estimated_volume_liters: 110.0,
    recyclability_score: 85.0,
    hazard_flag: false,
    pii_redacted: true,
    inference_latency_ms: 18
  });
  const [feedbackSent, setFeedbackSent] = useState(false);

  const sampleImages: Record<string, { label: string; cat: string; conf: number; rec: number; haz: boolean; vol: number }> = {
    plastic: {
      label: "PET Plastic Bottles & Containers",
      cat: "plastic",
      conf: 0.942,
      rec: 85.0,
      haz: false,
      vol: 110.0
    },
    organic: {
      label: "Food Scraps & Market Organic Waste",
      cat: "organic",
      conf: 0.961,
      rec: 70.0,
      haz: false,
      vol: 180.0
    },
    ewaste: {
      label: "Lithium Batteries & PCB Circuit",
      cat: "e_waste",
      conf: 0.895,
      rec: 60.0,
      haz: true,
      vol: 45.0
    },
    paper: {
      label: "Corrugated Cardboard & Packaging",
      cat: "paper",
      conf: 0.978,
      rec: 95.0,
      haz: false,
      vol: 130.0
    }
  };

  const handleSelect = (key: string) => {
    setSelectedSample(key);
    setFeedbackSent(false);
    const item = sampleImages[key];
    setInferenceResult({
      primary_category: item.cat,
      confidence_score: item.conf,
      estimated_volume_liters: item.vol,
      recyclability_score: item.rec,
      hazard_flag: item.haz,
      pii_redacted: true,
      inference_latency_ms: Math.floor(Math.random() * 15) + 14
    });
  };

  return (
    <div className="glass-panel p-5 rounded-2xl border border-surface-border">
      <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
        <Sparkles className="w-4 h-4" />
        <span>Module 3: Edge Computer Vision Waste Classifier</span>
      </div>
      <h2 className="text-base font-bold text-white mb-1">
        YOLOv8-nano INT8 Quantized Inference Sandbox
      </h2>
      <p className="text-xs text-slate-400 mb-4">
        6.18 MB model running zero cloud cost inference on driver Android / Raspberry Pi devices with active learning feedback loop.
      </p>

      {/* Interactive Sample Selector */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        {Object.entries(sampleImages).map(([key, item]) => (
          <button
            key={key}
            onClick={() => handleSelect(key)}
            className={`p-3 rounded-xl border text-left transition-all ${
              selectedSample === key
                ? "bg-emerald-500/10 border-emerald-500 text-white shadow-md shadow-emerald-500/10"
                : "bg-surface border-surface-border text-slate-400 hover:text-slate-200"
            }`}
          >
            <div className="text-xs font-bold capitalize text-white">{item.cat.replace("_", " ")}</div>
            <div className="text-[10px] text-slate-400 mt-1 line-clamp-1">{item.label}</div>
          </button>
        ))}
      </div>

      {/* Inference Output Card */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-surface-border grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        {/* Visual Box */}
        <div className="h-40 rounded-lg bg-slate-950 border border-slate-800 flex flex-col items-center justify-center relative overflow-hidden">
          <Camera className="w-8 h-8 text-slate-600 mb-1" />
          <span className="text-xs font-semibold text-slate-300 capitalize">{sampleImages[selectedSample].label}</span>
          <span className="text-[10px] text-emerald-400 font-mono mt-1">
            Bounding Box: [{inferenceResult.primary_category}] ({Math.round(inferenceResult.confidence_score * 100)}%)
          </span>
          <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/70 text-[9px] text-emerald-400 font-semibold border border-emerald-500/20">
            INT8 ONNX {inferenceResult.inference_latency_ms}ms
          </div>
        </div>

        {/* Results Details */}
        <div className="space-y-2 text-xs md:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-slate-400">Classified Category:</span>
            <span className="font-bold text-emerald-400 text-sm uppercase tracking-wide">
              {inferenceResult.primary_category}
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div>
              <span className="text-slate-400 text-[10px]">Model Confidence</span>
              <div className="text-white font-bold">{Math.round(inferenceResult.confidence_score * 100)}%</div>
            </div>
            <div>
              <span className="text-slate-400 text-[10px]">Recyclability Score</span>
              <div className="text-teal-400 font-bold">{inferenceResult.recyclability_score}%</div>
            </div>
            <div>
              <span className="text-slate-400 text-[10px]">Hazardous Material Flag</span>
              <div className={`font-bold ${inferenceResult.hazard_flag ? "text-rose-400" : "text-emerald-400"}`}>
                {inferenceResult.hazard_flag ? "⚠️ HAZARD DETECTED" : "Safe Material"}
              </div>
            </div>
            <div>
              <span className="text-slate-400 text-[10px]">PII Redaction</span>
              <div className="text-white font-bold">✓ Active (GDPR Safe)</div>
            </div>
          </div>

          {/* Active Learning Feedback Buttons */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">Human-In-The-Loop Validation:</span>
            {feedbackSent ? (
              <span className="text-xs text-emerald-400 font-semibold flex items-center space-x-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>Feedback Synced to Retraining Queue</span>
              </span>
            ) : (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setFeedbackSent(true)}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-white text-xs font-medium border border-emerald-500/30 transition-all flex items-center space-x-1"
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span>Accurate</span>
                </button>
                <button
                  onClick={() => setFeedbackSent(true)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-all flex items-center space-x-1"
                >
                  <ThumbsDown className="w-3.5 h-3.5" />
                  <span>Correct Label</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
