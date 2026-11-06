import express from "express";
import cors from "cors";
import { authenticate, requireRole, requirePermission } from "./middleware/auth";
import { solveGeneticVRP } from "./services/vrpOptimizer";
import { activeEscalations, createEscalation, advanceEscalation } from "./services/escalationWorker";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// In-memory data store for quick responsive MVP & DB bridge
const BINS_DATA = [
  { id: "BIN-BLR-001", lat: 12.9340, lng: 77.6210, fill: 94.5, weight: 412.0, type: "plastic", status: "overflowing", temp: 29.4, methane: 28.5, address: "100ft Rd, Koramangala 4th Block" },
  { id: "BIN-BLR-002", lat: 12.9380, lng: 77.6255, fill: 88.0, weight: 520.0, type: "organic", status: "active", temp: 31.2, methane: 42.1, address: "80ft Rd, 6th Block, Koramangala" },
  { id: "BIN-BLR-003", lat: 12.9315, lng: 77.6290, fill: 78.4, weight: 610.0, type: "mixed", status: "active", temp: 27.8, methane: 14.2, address: "Sony World Junction, Koramangala" },
  { id: "BIN-BLR-004", lat: 12.9410, lng: 77.6180, fill: 45.2, weight: 280.0, type: "glass", status: "active", temp: 26.1, methane: 8.0, address: "Forum Mall Promenade, Hosur Rd" },
  { id: "BIN-BLR-005", lat: 12.9390, lng: 77.6320, fill: 82.1, weight: 210.0, type: "paper", status: "active", temp: 25.5, methane: 6.4, address: "Wipro Park Corner, 1st Block" },
  { id: "BIN-BLR-006", lat: 12.9790, lng: 77.6405, fill: 96.0, weight: 720.0, type: "mixed", status: "overflowing", temp: 32.0, methane: 55.0, address: "12th Main Rd, HAL 2nd Stage, Indiranagar" },
  { id: "BIN-BLR-007", lat: 12.9720, lng: 77.6445, fill: 84.6, weight: 390.0, type: "plastic", status: "active", temp: 28.2, methane: 19.8, address: "CMH Road Metro Station Gate 2" },
  { id: "BIN-BLR-011", lat: 12.9740, lng: 77.6080, fill: 98.2, weight: 850.0, type: "mixed", status: "overflowing", temp: 33.5, methane: 62.0, address: "MG Road Metro Station Walkway" }
];

const DUMPING_REPORTS = [
  { id: "d1", address: "Backside of St. John Flyover, Koramangala", lat: 12.9420, lng: 77.6280, severity: "high", status: "verified", estimated_waste_kg: 650, materials: ["plastic", "debris"], sla: "12h" },
  { id: "d2", address: "Old Airport Road, Near Wind Tunnel Corner", lat: 12.9680, lng: 77.6490, severity: "critical", status: "assigned", estimated_waste_kg: 1200, materials: ["hazardous", "e_waste"], sla: "4h" },
  { id: "d3", address: "Kundalahalli Lake Buffer Zone", lat: 12.9590, lng: 77.7420, severity: "medium", status: "reported", estimated_waste_kg: 320, materials: ["organic", "debris"], sla: "24h" }
];

let activeDriverRoute = solveGeneticVRP(
  { lat: 12.9520, lng: 77.6101 },
  BINS_DATA.map(b => ({ id: b.id, lat: b.lat, lng: b.lng, fillPct: b.fill, weightKg: b.weight, address: b.address }))
);

// 1. Smart Bins API
app.get("/api/v1/bins", (req, res) => {
  const minFill = Number(req.query.min_fill) || 0;
  const filtered = BINS_DATA.filter(b => b.fill >= minFill);
  res.json(filtered.map(b => ({
    id: b.id,
    lat: b.lat,
    lng: b.lng,
    current_fill_level: b.fill,
    current_weight_kg: b.weight,
    bin_type: b.type,
    status: b.status,
    current_temp_celsius: b.temp,
    current_gas_level_ppm: b.methane,
    address: b.address
  })));
});

app.get("/api/v1/bins/:id", (req, res) => {
  const bin = BINS_DATA.find(b => b.id === req.params.id);
  if (!bin) return res.status(404).json({ error: "Bin not found" });
  res.json(bin);
});

// 2. Route Optimization (Genetic VRP)
app.post("/api/v1/routes/optimize", (req, res) => {
  const depot = { lat: 12.9520, lng: 77.6101 };
  const targetBins = BINS_DATA.map(b => ({
    id: b.id,
    lat: b.lat,
    lng: b.lng,
    fillPct: b.fill,
    weightKg: b.weight,
    address: b.address
  }));

  const solution = solveGeneticVRP(depot, targetBins, req.body.truckIds?.[0] || "TRUCK-01");
  activeDriverRoute = solution;

  res.json({
    id: solution.routeId,
    truck_id: solution.truckId,
    status: "in_progress",
    total_stops: solution.stops.length,
    completed_stops: 0,
    total_distance_km: solution.totalDistanceKm,
    static_baseline_km: solution.baselineDistanceKm,
    distance_reduction_pct: solution.distanceReductionPct,
    estimated_duration_minutes: solution.estimatedMinutes,
    estimated_fuel_units: solution.fuelSavedLiters,
    estimated_co2_kg: solution.co2SavedKg,
    stops: solution.stops.map(s => ({
      id: s.binId,
      bin_id: s.binId,
      sequence_order: s.sequence,
      address: s.address,
      lat: s.lat,
      lng: s.lng,
      status: s.status,
      eta_minutes: s.etaMinutes
    }))
  });
});

app.get("/api/v1/routes/driver/active", (req, res) => {
  res.json({
    id: activeDriverRoute.routeId,
    truck_id: activeDriverRoute.truckId,
    status: "in_progress",
    total_stops: activeDriverRoute.stops.length,
    completed_stops: activeDriverRoute.stops.filter(s => s.status === "collected").length,
    total_distance_km: activeDriverRoute.totalDistanceKm,
    estimated_duration_minutes: activeDriverRoute.estimatedMinutes,
    estimated_fuel_units: activeDriverRoute.fuelSavedLiters,
    estimated_co2_kg: activeDriverRoute.co2SavedKg,
    stops: activeDriverRoute.stops.map(s => ({
      id: s.binId,
      bin_id: s.binId,
      sequence_order: s.sequence,
      address: s.address,
      lat: s.lat,
      lng: s.lng,
      status: s.status,
      eta_minutes: s.etaMinutes
    }))
  });
});

app.patch("/api/v1/routes/stops/:id", (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const stop = activeDriverRoute.stops.find(s => s.binId === id);
  if (stop) {
    stop.status = status;
    // Empty bin if collected
    if (status === "collected") {
      const bin = BINS_DATA.find(b => b.id === id);
      if (bin) {
        bin.fill = 0.0;
        bin.status = "active";
      }
    }
  }
  res.json({ status: "updated", id, currentStatus: status });
});

// 3. Illegal Dumping
app.get("/api/v1/dumping", (req, res) => {
  res.json(DUMPING_REPORTS);
});

app.post("/api/v1/dumping/report", (req, res) => {
  const newReport = {
    id: "d_" + Math.random().toString(36).substr(2, 6),
    address: req.body.address || `GPS (${req.body.lat}, ${req.body.lng})`,
    lat: req.body.lat,
    lng: req.body.lng,
    severity: req.body.severity || "high",
    status: "reported",
    estimated_waste_kg: req.body.estimatedWasteKg || 250,
    materials: ["plastic", "organic"],
    sla: "12h"
  };
  DUMPING_REPORTS.unshift(newReport);

  // Auto create alert and start 15-minute driver escalation
  createEscalation(newReport.id, `Illegal Dump at ${newReport.address}`);

  res.status(201).json(newReport);
});

app.patch("/api/v1/dumping/:id/resolve", (req, res) => {
  const report = DUMPING_REPORTS.find(d => d.id === req.params.id);
  if (report) report.status = "resolved";
  res.json({ status: "resolved", id: req.params.id });
});

// 4. Alerts & 15-Min Auto-Escalation Engine
app.get("/api/v1/alerts", (req, res) => {
  const escalationsList = Array.from(activeEscalations.values());
  res.json({
    activeAlerts: [
      {
        id: "alert-001",
        title: "Critical Overflow at BIN-BLR-001",
        severity: "critical",
        created_at: new Date().toISOString(),
        escalation: escalationsList[0] || null
      }
    ]
  });
});

app.post("/api/v1/alerts/:id/advance", (req, res) => {
  const nextStage = advanceEscalation(req.params.id, "Supervisor Manual Escalation");
  res.json({ status: "escalated", stage: nextStage?.stage });
});

// 5. City Analytics Overview (Principal & Municipal Admin)
app.get("/api/v1/analytics/city-overview", (req, res) => {
  res.json({
    total_bins: BINS_DATA.length * 60, // 500 equivalent
    overflowing_bins_count: BINS_DATA.filter(b => b.fill >= 85).length,
    active_trucks_count: 4,
    open_dumping_alerts: DUMPING_REPORTS.filter(d => d.status !== "resolved").length,
    today_waste_collected_tons: 28.4,
    co2_saved_kg: 384.2,
    fuel_saved_liters: 142.8,
    fleet_efficiency_pct: 88.5,
    distance_reduction_pct: 28.4,
    category_breakdown: {
      Plastic: 32.4,
      Organic: 28.6,
      Paper: 16.2,
      Glass: 8.5,
      Metal: 6.8,
      EWaste: 4.5,
      Hazardous: 3.0
    }
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "WasteX API Gateway",
    rbacRoles: ["principal_admin", "municipal_admin", "zone_supervisor", "truck_driver", "citizen"],
    vrpEngine: "Genetic-TimeDependent-VRP",
    escalationEngine: "15-Min-Driver-Auto-Escalation"
  });
});

app.listen(PORT, () => {
  console.log(`[WasteX API Gateway] Running on port ${PORT}`);
});
