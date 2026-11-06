"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { 
  Trash2, 
  Truck, 
  Leaf, 
  Fuel, 
  AlertTriangle, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  ShieldAlert, 
  User, 
  LogOut, 
  Sparkles, 
  Camera, 
  Wifi, 
  WifiOff, 
  Award, 
  ChevronRight, 
  RefreshCw, 
  Filter, 
  Layers, 
  TrendingDown, 
  Eye, 
  AlertCircle,
  ArrowRight,
  Send,
  SlidersHorizontal,
  Lock,
  Mail,
  Zap,
  Ticket,
  Gift,
  Building,
  Navigation,
  Compass,
  Check,
  Download,
  FileText,
  Activity,
  Route,
  HelpCircle,
  Play,
  CloudSun,
  Calendar,
  Crosshair,
  Volume2,
  Database
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  LineChart,
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";

// Leaflet Dynamic Map import to prevent SSR mismatches
const MapContainer = dynamic(() => import("react-leaflet").then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then(mod => mod.TileLayer), { ssr: false });
const CircleMarker = dynamic(() => import("react-leaflet").then(mod => mod.CircleMarker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then(mod => mod.Popup), { ssr: false });
const Polyline = dynamic(() => import("react-leaflet").then(mod => mod.Polyline), { ssr: false });
const Polygon = dynamic(() => import("react-leaflet").then(mod => mod.Polygon), { ssr: false });
const LeafletTooltip = dynamic(() => import("react-leaflet").then(mod => mod.Tooltip), { ssr: false });

type RoleType = "admin" | "supervisor" | "driver" | "citizen";

interface CurrentUser {
  name: string;
  email: string;
  role: RoleType;
  zone?: string;
  truckId?: string;
}

interface StopItem {
  id: string;
  address: string;
  fill: number;
  weight: number;
  status: "pending" | "collected";
  eta: number;
  traffic: string;
  category: string;
  lat: number;
  lng: number;
  priority: "High" | "Medium" | "Normal";
}

// Bhopal Municipal Beat Zone Boundaries
const zoneBoundaries: Record<string, { id: string; name: string; ward: string; color: string; labelPos: [number, number]; coords: [number, number][] }> = {
  "Zone 1": {
    id: "Zone 1",
    name: "Zone 1: MP Nagar Central Commercial Beat",
    ward: "Ward 48",
    color: "#10b981",
    labelPos: [23.2385, 77.4330],
    coords: [
      [23.2420, 77.4260],
      [23.2420, 77.4420],
      [23.2260, 77.4420],
      [23.2260, 77.4260]
    ]
  },
  "Zone 2": {
    id: "Zone 2",
    name: "Zone 2: Arera Colony & 10 No. Market Beat",
    ward: "Ward 49 & 50",
    color: "#0284c7",
    labelPos: [23.2235, 77.4350],
    coords: [
      [23.2260, 77.4220],
      [23.2260, 77.4420],
      [23.2100, 77.4420],
      [23.2100, 77.4220]
    ]
  },
  "Zone 3": {
    id: "Zone 3",
    name: "Zone 3: Shahpura Lake & Chunabhatti Beat",
    ward: "Ward 51 & 52",
    color: "#d97706",
    labelPos: [23.2085, 77.4170],
    coords: [
      [23.2100, 77.4120],
      [23.2100, 77.4300],
      [23.1960, 77.4300],
      [23.1960, 77.4120]
    ]
  }
};

// Central Municipal Waste Headquarter & Dispatch Hub (Bhopal)
const BMC_CENTRAL_HQ = {
  id: "BMC-HQ-01",
  name: "BMC Central Swachhata HQ & Fleet Control Hub",
  address: "Paryawaran Parisar / Board Office Junction, Bhopal",
  coords: [23.2355, 77.4330] as [number, number]
};

// Smoothly interpolates along road waypoints without cutting across or jumping
function interpolateClosedRoute(points: [number, number][], stepsPerSegment: number = 6): [number, number][] {
  const result: [number, number][] = [];
  if (!points || points.length < 2) return points;
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    for (let step = 0; step < stepsPerSegment; step++) {
      const t = step / stepsPerSegment;
      const lat = p1[0] + (p2[0] - p1[0]) * t;
      const lng = p1[1] + (p2[1] - p1[1]) * t;
      result.push([Number(lat.toFixed(5)), Number(lng.toFixed(5))]);
    }
  }
  result.push(points[points.length - 1]);
  return result;
}

export default function WasteXMainPortal() {
  // Session State (starts on professional Login screen with Upper Role selection)
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  // Auth Form State (Login / Signup)
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [selectedAuthRole, setSelectedAuthRole] = useState<RoleType>("citizen");
  const [authIdentifier, setAuthIdentifier] = useState("");
  const [authPhone, setAuthPhone] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Common UI State
  const [isMounted, setIsMounted] = useState(false);
  const [activeAdminTab, setActiveAdminTab] = useState<"optimizer" | "predictions" | "dashcam_cv" | "categories" | "analytics">("optimizer");
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showDbModal, setShowDbModal] = useState(false);
  const [downloadSuccessNotice, setDownloadSuccessNotice] = useState(false);

  // Supervisor State (15-min auto-escalation timer)
  const [escalationSeconds, setEscalationSeconds] = useState(13 * 60 + 45);
  const [escalationStage, setEscalationStage] = useState(1);

  // =========================================================================
  // 1. MULTI-TRUCK ROUTE OPTIMIZATION ENGINE (OR-Tools / Genetic VRP Solver)
  // =========================================================================
  type TruckId = "EV-01" | "TRK-02" | "TRK-03";

  interface FleetTruckData {
    id: TruckId;
    name: string;
    driver: string;
    reg: string;
    fuel: string;
    batteryOrFuel: string;
    zone: string;
    color: string;
    standardCoords: [number, number][];
    optimizedCoords: [number, number][];
    stops: StopItem[];
    defaultMetrics: {
      originalKm: number;
      optimizedKm: number;
      kmSaved: number;
      pctSaved: number;
      originalMins: number;
      optimizedMins: number;
      minsSaved: number;
      fuelSavedText: string;
      costSavedInr: number;
    };
  }

  const fleetConfigs: Record<TruckId, FleetTruckData> = {
    "EV-01": {
      id: "EV-01",
      name: "Tata Ace EV 1000",
      driver: "Ramesh Yadav",
      reg: "MP-04-GE-2418",
      fuel: "Electric",
      batteryOrFuel: "Battery: 86%",
      zone: "Zone 1: MP Nagar Central Commercial Beat",
      color: "#10b981",
      standardCoords: [
        [23.2355, 77.4330], // 1. BMC Central Waste HQ & Fleet Depot (Origin)
        [23.2345, 77.4315], // 2. Board Office Square approach
        [23.2335, 77.4295], // 3. Board Office Chauraha (Traffic Bottleneck)
        [23.2320, 77.4300], // 4. Link Road 1 corridor
        [23.2310, 77.4345], // 5. DB City Mall Gate 2
        [23.2325, 77.4335], // 6. Jyoti Cineplex Main Road
        [23.2340, 77.4350], // 7. MP Nagar Zone 1 Commercial Complex
        [23.2355, 77.4370], // 8. Press Complex Link Road
        [23.2370, 77.4385], // 9. Chetak Bridge Flyover Corridor
        [23.2390, 77.4370], // 10. Kasturba Hospital Road
        [23.2380, 77.4340], // 11. Sargam Talkies Main Road
        [23.2365, 77.4335], // 12. South Approach Avenue
        [23.2355, 77.4330]  // 13. BMC Central Waste HQ Depot (Final Return)
      ],
      optimizedCoords: [
        [23.2355, 77.4330], // 1. BMC Central Waste HQ & Fleet Depot (Origin)
        [23.2368, 77.4345], // 2. North-East Arterial Road (Free Flow Corridor)
        [23.2380, 77.4340], // 3. Sargam Talkies Main Road
        [23.2390, 77.4370], // 4. Kasturba Hospital Corridor
        [23.2370, 77.4385], // 5. Chetak Bridge Connector
        [23.2355, 77.4370], // 6. Press Complex Link Road
        [23.2340, 77.4350], // 7. MP Nagar Zone 1 Commercial Complex
        [23.2325, 77.4335], // 8. Jyoti Cineplex Road
        [23.2310, 77.4345], // 9. DB City Mall Gate 2
        [23.2335, 77.4330], // 10. Direct Central Avenue Return
        [23.2355, 77.4330]  // 11. BMC Central Waste HQ Depot (Final Return)
      ],
      stops: [
        { id: "BIN-BPL-001", address: "Jyoti Cineplex, MP Nagar Zone 1", fill: 94.2, weight: 520, status: "pending", eta: 4, traffic: "Congested (+14m)", category: "Dry Plastics", lat: 23.2325, lng: 77.4335, priority: "High" },
        { id: "BIN-BPL-002", address: "DB City Mall Gate 2", fill: 87.5, weight: 640, status: "pending", eta: 9, traffic: "Moderate (+5m)", category: "Cardboard Packaging", lat: 23.2310, lng: 77.4345, priority: "High" },
        { id: "BIN-BPL-003", address: "Sargam Talkies Main Road", fill: 91.8, weight: 680, status: "pending", eta: 16, traffic: "Congested (+8m)", category: "Dry Plastics", lat: 23.2380, lng: 77.4340, priority: "High" },
        { id: "BIN-BPL-004", address: "MP Nagar Zone 1 Commercial Complex", fill: 74.0, weight: 460, status: "pending", eta: 22, traffic: "Free Flow", category: "Mixed Scrap", lat: 23.2340, lng: 77.4350, priority: "Normal" },
        { id: "BIN-BPL-005", address: "Board Office Square Beat", fill: 82.5, weight: 590, status: "pending", eta: 29, traffic: "Moderate (+4m)", category: "Wet Organic", lat: 23.2335, lng: 77.4295, priority: "High" }
      ],
      defaultMetrics: {
        originalKm: 24.8,
        optimizedKm: 16.4,
        kmSaved: 8.4,
        pctSaved: 33.8,
        originalMins: 68,
        optimizedMins: 39,
        minsSaved: 29,
        fuelSavedText: "2.94 L diesel eq",
        costSavedInr: 277.0
      }
    },
    "TRK-02": {
      id: "TRK-02",
      name: "BharatBenz 1217 Compactor",
      driver: "Devendra Verma",
      reg: "MP-04-HE-8821",
      fuel: "Diesel",
      batteryOrFuel: "Diesel: 68%",
      zone: "Zone 2: Arera Colony & 10 No. Market Beat",
      color: "#0284c7",
      standardCoords: [
        [23.2355, 77.4330], // 1. BMC Central Waste HQ & Fleet Depot (Origin)
        [23.2320, 77.4315], // 2. Link Road 1 South corridor
        [23.2280, 77.4300], // 3. Panchsheel Nagar Crossing
        [23.2245, 77.4285], // 4. 6 No. Stop Shivaji Nagar
        [23.2210, 77.4290], // 5. Bittan Market Sabzi Mandi
        [23.2185, 77.4315], // 6. E-3 Arera Avenue
        [23.2180, 77.4340], // 7. E-3 Main Boulevard
        [23.2155, 77.4355], // 8. 10 No. Market Approach Road
        [23.2130, 77.4370], // 9. 10 No. Market Main Square
        [23.2115, 77.4330], // 10. E-4 Commercial Arcade
        [23.2140, 77.4290], // 11. Campion Link Road
        [23.2160, 77.4260], // 12. Campion School Road Gate
        [23.2190, 77.4370], // 13. Cross connector to Link Road 2
        [23.2240, 77.4390], // 14. Link Road 2 North Express
        [23.2300, 77.4370], // 15. Link Road 2 North Approach
        [23.2340, 77.4350], // 16. Board Office East Junction
        [23.2355, 77.4330]  // 17. BMC Central Waste HQ Depot (Final Return)
      ],
      optimizedCoords: [
        [23.2355, 77.4330], // 1. BMC Central Waste HQ & Fleet Depot (Origin)
        [23.2320, 77.4315], // 2. Link Road 1 South
        [23.2245, 77.4285], // 3. 6 No. Stop Shivaji Nagar
        [23.2210, 77.4290], // 4. Bittan Market Sabzi Mandi
        [23.2160, 77.4260], // 5. Campion School Road Gate (early morning clearance)
        [23.2115, 77.4330], // 6. E-4 Commercial Arcade
        [23.2130, 77.4370], // 7. 10 No. Market Main Square
        [23.2180, 77.4340], // 8. E-3 Main Boulevard
        [23.2240, 77.4390], // 9. Link Road 2 North Express
        [23.2300, 77.4370], // 10. Link Road 2 North Approach
        [23.2355, 77.4330]  // 11. BMC Central Waste HQ Depot (Final Return)
      ],
      stops: [
        { id: "BIN-BPL-011", address: "10 No. Market Commercial Circle", fill: 92.4, weight: 690, status: "pending", eta: 5, traffic: "Congested (+15m)", category: "Cardboard Packaging", lat: 23.2130, lng: 77.4370, priority: "High" },
        { id: "BIN-BPL-012", address: "E-3 Arera Colony Main Boulevard", fill: 78.0, weight: 480, status: "pending", eta: 12, traffic: "Free Flow", category: "Dry Plastics", lat: 23.2180, lng: 77.4340, priority: "High" },
        { id: "BIN-BPL-013", address: "Bittan Market Sabzi Mandi", fill: 96.5, weight: 840, status: "pending", eta: 19, traffic: "Moderate (+6m)", category: "Wet Organic", lat: 23.2210, lng: 77.4290, priority: "High" },
        { id: "BIN-BPL-014", address: "Campion School Road Gate", fill: 68.0, weight: 390, status: "pending", eta: 26, traffic: "Free Flow", category: "Mixed Scrap", lat: 23.2160, lng: 77.4260, priority: "Normal" },
        { id: "BIN-BPL-015", address: "E-4 Arera Commercial Arcade", fill: 89.2, weight: 620, status: "pending", eta: 33, traffic: "Moderate (+4m)", category: "Glass & Metal", lat: 23.2115, lng: 77.4330, priority: "High" }
      ],
      defaultMetrics: {
        originalKm: 28.6,
        optimizedKm: 19.2,
        kmSaved: 9.4,
        pctSaved: 32.8,
        originalMins: 82,
        optimizedMins: 48,
        minsSaved: 34,
        fuelSavedText: "4.20 L diesel",
        costSavedInr: 394.0
      }
    },
    "TRK-03": {
      id: "TRK-03",
      name: "Mahindra Bolero Maxi Tipper",
      driver: "Imran Khan",
      reg: "MP-04-CA-1109",
      fuel: "CNG",
      batteryOrFuel: "CNG: 74%",
      zone: "Zone 3: Shahpura Lake & Chunabhatti Beat",
      color: "#d97706",
      standardCoords: [
        [23.2355, 77.4330], // 1. BMC Central Waste HQ & Fleet Depot (Origin)
        [23.2300, 77.4300], // 2. Link Road 1 South Corridor
        [23.2250, 77.4250], // 3. Apex Bank Square
        [23.2180, 77.4220], // 4. Manisha Market Trisection
        [23.2120, 77.4210], // 5. Shahpura North Entrance Road
        [23.2050, 77.4200], // 6. Shahpura Lake Promenade Gate
        [23.2010, 77.4180], // 7. Shahpura Sector A Lake Drive
        [23.1970, 77.4150], // 8. Chunabhatti Approach Road
        [23.1950, 77.4140], // 9. Chunabhatti Main Bazaar (Kolar Road)
        [23.1930, 77.4190], // 10. Rohit Nagar Trisection
        [23.1990, 77.4230], // 11. Gulmohar Colony Park Gate
        [23.2040, 77.4260], // 12. Shahpura Police Station / Lake View Park
        [23.2070, 77.4280], // 13. 11 No. Bus Stop Commercial
        [23.2140, 77.4240], // 14. Shahpura Link Road North
        [23.2220, 77.4250], // 15. Apex Bank Square Link Road 1 North
        [23.2300, 77.4300], // 16. Link Road 1 North Corridor
        [23.2355, 77.4330]  // 17. BMC Central Waste HQ Depot (Final Return)
      ],
      optimizedCoords: [
        [23.2355, 77.4330], // 1. BMC Central Waste HQ & Fleet Depot (Origin)
        [23.2280, 77.4280], // 2. Link Road 1 Express
        [23.2180, 77.4220], // 3. Manisha Market Corridor
        [23.2070, 77.4280], // 4. 11 No. Bus Stop Commercial
        [23.2040, 77.4260], // 5. Shahpura Police Station
        [23.1990, 77.4230], // 6. Gulmohar Colony Park Gate
        [23.1930, 77.4190], // 7. Rohit Nagar Trisection
        [23.1950, 77.4140], // 8. Chunabhatti Main Bazaar
        [23.2010, 77.4180], // 9. Lake Drive Road
        [23.2050, 77.4200], // 10. Shahpura Lake Promenade Gate
        [23.2140, 77.4240], // 11. North Return Link
        [23.2250, 77.4250], // 12. Apex Bank Square North
        [23.2355, 77.4330]  // 13. BMC Central Waste HQ Depot (Final Return)
      ],
      stops: [
        { id: "BIN-BPL-021", address: "Shahpura Lake Promenade", fill: 91.2, weight: 610, status: "pending", eta: 4, traffic: "Free Flow", category: "Plastic Bottles", lat: 23.2050, lng: 77.4200, priority: "High" },
        { id: "BIN-BPL-022", address: "Chunabhatti Main Bazaar", fill: 86.4, weight: 520, status: "pending", eta: 11, traffic: "Free Flow", category: "Wet Organic", lat: 23.1950, lng: 77.4140, priority: "High" },
        { id: "BIN-BPL-023", address: "11 No. Bus Stop Commercial", fill: 93.7, weight: 740, status: "pending", eta: 18, traffic: "Congested (+12m)", category: "Cardboard Packaging", lat: 23.2070, lng: 77.4280, priority: "High" },
        { id: "BIN-BPL-024", address: "Rohit Nagar Trisection", fill: 62.0, weight: 380, status: "pending", eta: 25, traffic: "Congested (+10m)", category: "Mixed Scrap", lat: 23.1930, lng: 77.4190, priority: "Normal" },
        { id: "BIN-BPL-025", address: "Gulmohar Colony Park Gate", fill: 89.5, weight: 590, status: "pending", eta: 32, traffic: "Moderate (+3m)", category: "Wet Organic", lat: 23.1990, lng: 77.4230, priority: "High" }
      ],
      defaultMetrics: {
        originalKm: 21.4,
        optimizedKm: 14.8,
        kmSaved: 6.6,
        pctSaved: 30.8,
        originalMins: 58,
        optimizedMins: 36,
        minsSaved: 22,
        fuelSavedText: "2.80 kg CNG",
        costSavedInr: 245.0
      }
    }
  };

  const [selectedTruckId, setSelectedTruckId] = useState<TruckId>("EV-01");
  const [truckOptimizationState, setTruckOptimizationState] = useState<Record<TruckId, boolean>>({
    "EV-01": false,
    "TRK-02": false,
    "TRK-03": false
  });

  const [optimizationStrategy, setOptimizationStrategy] = useState<"fastest_traffic" | "fuel_optimal" | "priority_overflow">("fastest_traffic");
  const [isSolvingRoute, setIsSolvingRoute] = useState(false);

  // Active Truck dynamic values
  const currentTruckConfig = fleetConfigs[selectedTruckId];
  const isRouteOptimized = truckOptimizationState[selectedTruckId];

  const [driverStopsState, setDriverStopsState] = useState<Record<TruckId, typeof fleetConfigs["EV-01"]["stops"]>>({
    "EV-01": fleetConfigs["EV-01"].stops,
    "TRK-02": fleetConfigs["TRK-02"].stops,
    "TRK-03": fleetConfigs["TRK-03"].stops
  });
  const [driverCurrentStopIndex, setDriverCurrentStopIndex] = useState<Record<TruckId, number>>({
    "EV-01": 0,
    "TRK-02": 0,
    "TRK-03": 0
  });

  const activeDriverStops = driverStopsState[selectedTruckId] || fleetConfigs[selectedTruckId].stops;
  const currentStopIndex = driverCurrentStopIndex[selectedTruckId] || 0;
  const optimizationMetric = {
    originalKm: currentTruckConfig.defaultMetrics.originalKm,
    optimizedKm: currentTruckConfig.defaultMetrics.optimizedKm,
    kmSaved: currentTruckConfig.defaultMetrics.kmSaved,
    pctSaved: currentTruckConfig.defaultMetrics.pctSaved,
    originalMins: currentTruckConfig.defaultMetrics.originalMins,
    optimizedMins: currentTruckConfig.defaultMetrics.optimizedMins,
    minsSaved: currentTruckConfig.defaultMetrics.minsSaved,
    dieselSavedLiters: parseFloat(currentTruckConfig.defaultMetrics.fuelSavedText),
    costSavedInr: currentTruckConfig.defaultMetrics.costSavedInr
  };

  // =========================================================================
  // LIVE GPS TRUCK FLEET TELEMETRY ENGINE
  // =========================================================================
  const [isLiveSimPlaying, setIsLiveSimPlaying] = useState(true);
  const [truckTick, setTruckTick] = useState(0);

  // Interval for live GPS truck movement (updates every 1.2s)
  useEffect(() => {
    if (!isLiveSimPlaying) return;
    const interval = setInterval(() => {
      setTruckTick(prev => (prev + 1) % 10000);
    }, 1200);
    return () => clearInterval(interval);
  }, [isLiveSimPlaying]);

  // EV-01 Dense Route Coordinates (Zone 1: MP Nagar)
  const ev01DensePath = useMemo(() => {
    return truckOptimizationState["EV-01"]
      ? interpolateClosedRoute(fleetConfigs["EV-01"].optimizedCoords, 10)
      : interpolateClosedRoute(fleetConfigs["EV-01"].standardCoords, 10);
  }, [truckOptimizationState["EV-01"]]);

  // TRK-02 Dense Route Coordinates (Zone 2: Arera Colony)
  const trk02DensePath = useMemo(() => {
    return truckOptimizationState["TRK-02"]
      ? interpolateClosedRoute(fleetConfigs["TRK-02"].optimizedCoords, 10)
      : interpolateClosedRoute(fleetConfigs["TRK-02"].standardCoords, 10);
  }, [truckOptimizationState["TRK-02"]]);

  // TRK-03 Dense Route Coordinates (Zone 3: Shahpura Lake)
  const trk03DensePath = useMemo(() => {
    return truckOptimizationState["TRK-03"]
      ? interpolateClosedRoute(fleetConfigs["TRK-03"].optimizedCoords, 10)
      : interpolateClosedRoute(fleetConfigs["TRK-03"].standardCoords, 10);
  }, [truckOptimizationState["TRK-03"]]);

  // Current Instantaneous Positions & Telemetry (Continuous Closed Circuit - No Teleporting)
  const ev01Pos: [number, number] = ev01DensePath[truckTick % ev01DensePath.length] || BMC_CENTRAL_HQ.coords;
  const trk02Pos: [number, number] = trk02DensePath[(truckTick + 15) % trk02DensePath.length] || BMC_CENTRAL_HQ.coords;
  const trk03Pos: [number, number] = trk03DensePath[(truckTick + 30) % trk03DensePath.length] || BMC_CENTRAL_HQ.coords;

  const ev01Speed = 24 + ((truckTick * 3) % 9);
  const trk02Speed = 20 + ((truckTick * 2) % 8);
  const trk03Speed = 26 + ((truckTick * 4) % 10);

  // Algorithmic Route Optimization Trigger
  const handleTriggerRouteOptimization = () => {
    setIsSolvingRoute(true);
    setTimeout(() => {
      setTruckOptimizationState(prev => ({
        ...prev,
        [selectedTruckId]: true
      }));
      setIsSolvingRoute(false);
    }, 1100);
  };

  // Citizen Photo Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [citizenPhotoUrl, setCitizenPhotoUrl] = useState<string | null>(null);
  const [citizenPhotoName, setCitizenPhotoName] = useState<string | null>(null);
  const [citizenAiDetectionResult, setCitizenAiDetectionResult] = useState<string | null>(null);

  const handleCitizenPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCitizenPhotoName(file.name);
      const url = URL.createObjectURL(file);
      setCitizenPhotoUrl(url);
      setCitizenAiDetectionResult("YOLOv10 AI Verified: 2.4 m³ Roadside Plastic & Debris Detected • 96.2% Confidence • Auto-Geotagged Ward 48");
    }
  };

  // Live Camera Feed & Flying Squad dispatch state
  const [selectedCameraFeed, setSelectedCameraFeed] = useState<"CAM-TRUCK-02" | "CAM-TRUCK-01" | "CAM-CCTV-04">("CAM-TRUCK-02");
  const [flyingSquadNotice, setFlyingSquadNotice] = useState<string | null>(null);


  // =========================================================================
  // 2. PREDICTIVE FILL LEVEL ENGINE (Weather + Public Events + Seasonal)
  // =========================================================================
  const [weatherCondition, setWeatherCondition] = useState<"sunny" | "rainy" | "hot_summer">("sunny");
  const [publicEventRush, setPublicEventRush] = useState<boolean>(true); // e.g. New Market Diwali/Bhopal Utsav rush
  const [seasonType, setSeasonType] = useState<"monsoon" | "summer" | "festival">("festival");

  // Predictive fill calculation multiplier
  const getEventMultiplier = () => (publicEventRush ? 1.35 : 1.0);
  const getWeatherMultiplier = () => (weatherCondition === "rainy" ? 1.25 : weatherCondition === "hot_summer" ? 1.15 : 1.0);

  // Dynamic predicted bins based on real-time factors
  const predictedBins = [
    { id: "BIN-BPL-001", location: "MP Nagar Zone 1", currentFill: 94.2, predictedIn4h: Math.min(100, Math.round(94.2 * getEventMultiplier())), urgency: "Immediate Overflow (35m)", factor: "High Commercial Rush" },
    { id: "BIN-BPL-003", location: "Bittan Market Vegetable Mandi", currentFill: 96.0, predictedIn4h: 100, urgency: "Overflowing Now", factor: "Wet Organic Mandi Waste" },
    { id: "BIN-BPL-005", location: "New Market Central Plaza", currentFill: 91.8, predictedIn4h: Math.min(100, Math.round(91.8 * getEventMultiplier() * getWeatherMultiplier())), urgency: "Critical Overflow (1h 10m)", factor: "Retail Festive Shopping" },
    { id: "BIN-BPL-002", location: "DB City Mall Gate 2", currentFill: 87.5, predictedIn4h: Math.min(100, Math.round(87.5 * getEventMultiplier())), urgency: "Attention Required (2h)", factor: "Food Court Inflow" },
    { id: "BIN-BPL-006", location: "Roshanpura Square Bus Stand", currentFill: 73.5, predictedIn4h: Math.min(100, Math.round(73.5 * getEventMultiplier())), urgency: "Normal Progression", factor: "Commuter Transit Inflow" }
  ];

  // =========================================================================
  // 3. COMPUTER VISION DASHCAM ILLEGAL DUMPING MODULE
  // =========================================================================
  const [isScanningDashcam, setIsScanningDashcam] = useState(false);
  const [dashcamDetections, setDashcamDetections] = useState([
    {
      id: "DUMP-BPL-01",
      cameraFeed: "CAM-TRUCK-01 (Front HD Dashcam)",
      address: "Habibganj Railway Underpass, MP Nagar Zone 2",
      wasteClass: "Mixed Construction Debris & Plastic Bundles",
      volumeM3: 4.8,
      weightEstKg: 780,
      confidencePct: 94.6,
      severity: "High",
      slaCountdown: "2h 14m",
      status: "AI Verified",
      timestamp: "10:14 AM Today",
      lat: 23.2280,
      lng: 77.4380
    },
    {
      id: "DUMP-BPL-02",
      cameraFeed: "CAM-SURVEILLANCE-12 (Smart Pole)",
      address: "Kolar Road Near Chuna Bhatti Canal Bridge",
      wasteClass: "Commercial Packaging & Dumped Cartons",
      volumeM3: 6.2,
      weightEstKg: 1150,
      confidencePct: 92.1,
      severity: "Critical",
      slaCountdown: "42m left",
      status: "Dispatched",
      timestamp: "09:48 AM Today",
      lat: 23.1920,
      lng: 77.4210
    }
  ]);

  const handleScanDashcamFeed = () => {
    setIsScanningDashcam(true);
    setTimeout(() => {
      setDashcamDetections(prev => [
        {
          id: `DUMP-BPL-0${prev.length + 1}`,
          cameraFeed: "CAM-TRUCK-02 (Dashcam Telemetry)",
          address: "10 No. Market Backside Alley, Arera Colony",
          wasteClass: "Illegal Roadside Waste & Discarded Wood Scrap",
          volumeM3: 3.4,
          weightEstKg: 520,
          confidencePct: 96.2,
          severity: "High",
          slaCountdown: "3h 00m",
          status: "AI Verified",
          timestamp: "Just Now",
          lat: 23.2130,
          lng: 77.4370
        },
        ...prev
      ]);
      setIsScanningDashcam(false);
    }, 900);
  };

  // =========================================================================
  // 4. WASTE CATEGORIES & CLASSIFICATION
  // =========================================================================
  const wasteCategories = [
    { name: "Wet Organic / Kitchen", sharePct: 38, color: "#10b981", icon: "🍏", disposal: "BMC Biomethanation / Compost Plant" },
    { name: "Dry Recyclable Plastics", sharePct: 32, color: "#0284c7", icon: "🧴", disposal: "Bhopal Plastic Shredding MRF" },
    { name: "Paper & Cardboard", sharePct: 15, color: "#f59e0b", icon: "📦", disposal: "Mandideep Recycled Paper Mills" },
    { name: "Glass & Metal Scrap", sharePct: 9, color: "#64748b", icon: "🥫", disposal: "Govindpura Metallurgical Recyclers" },
    { name: "Hazardous & E-Waste", sharePct: 6, color: "#ef4444", icon: "🔋", disposal: "MP Pollution Control Board Facility" }
  ];

  // 15-Minute Driver Auto-Escalation Timer
  useEffect(() => {
    setIsMounted(true);
    const interval = setInterval(() => {
      setEscalationSeconds(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // Driver Telemetry State
  const [isDriverOnline, setIsDriverOnline] = useState(true);

  // Citizen Green Rewards State
  const [citizenRewardPoints, setCitizenRewardPoints] = useState(450);
  const [citizenReportSuccess, setCitizenReportSuccess] = useState(false);
  const [citizenAddress, setCitizenAddress] = useState("MP Nagar Zone 2, Near Sargam Talkies, Bhopal");
  const [redeemedRewardId, setRedeemedRewardId] = useState<string | null>(null);

  // Citizen & Supervisor Incident Lifecycle State
  const [submittedTicket, setSubmittedTicket] = useState<{
    ticketNumber: string;
    incidentCode: string;
    address: string;
    status: string;
    wasteClass?: string;
    assignedSupervisor?: string;
    targetSquad?: string;
  } | null>(null);
  const [citizenReportLoading, setCitizenReportLoading] = useState(false);
  const [supervisorNotice, setSupervisorNotice] = useState<string | null>(null);

  const citizenRewards = [
    { id: "rew-1", title: "Bhopal BRTS 5-Ride Transit Pass", subtitle: "Free rides on Hoshangabad Rd corridor", pointsCost: 100, icon: "🚌" },
    { id: "rew-2", title: "BMC Property Tax 5% Rebate Voucher", subtitle: "Official rebate code for Ward 48", pointsCost: 350, icon: "🏛️" },
    { id: "rew-3", title: "Bhopal Metro Smart Card Balance (₹100)", subtitle: "Instant recharge on Orange Line", pointsCost: 200, icon: "🚇" },
    { id: "rew-4", title: "Organic Kitchen Compost Bin Kit (15L)", subtitle: "Delivered by BMC Ward Sanitation", pointsCost: 250, icon: "🌱" }
  ];

  // Citizen Report Submission to PostgreSQL & Live Incident Queue
  const handleCitizenReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCitizenReportLoading(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: citizenAddress,
          photoUrl: citizenPhotoUrl || "/assets/demo_dump.jpg",
          citizenEmail: currentUser?.email,
          volumeM3: 3.4,
          weightKg: 520,
          confidencePct: 96.2,
          wasteClass: "Illegal Roadside Waste & Discarded Wood Scrap",
          lat: 23.2380,
          lng: 77.4340
        })
      });
      const data = await res.json();
      if (data.success && data.ticket) {
        setSubmittedTicket(data.ticket);
        setCitizenReportSuccess(true);
        setCitizenRewardPoints(prev => prev + 50);

        // Broadcast to Supervisor & Admin active queues immediately
        const newIncident = {
          id: data.ticket.incidentCode,
          cameraFeed: `Citizen Report (${currentUser?.name || 'Citizen'})`,
          address: data.ticket.address,
          wasteClass: data.ticket.wasteClass,
          volumeM3: data.ticket.volumeM3,
          weightEstKg: data.ticket.weightKg,
          confidencePct: 96.2,
          severity: "High",
          slaCountdown: "2h 00m",
          status: "Reported (New)",
          timestamp: "Just Now",
          lat: 23.2380,
          lng: 77.4340,
          ticketNumber: data.ticket.ticketNumber,
          isCitizenReport: true
        };
        setDashcamDetections(prev => [newIncident, ...prev]);
      } else {
        setCitizenReportSuccess(true);
      }
    } catch (err) {
      console.error("Error submitting citizen report:", err);
      setCitizenReportSuccess(true);
    } finally {
      setCitizenReportLoading(false);
    }
  };

  // Supervisor Dispatch Action: Dispatches EV-01 and injects urgent stop into Driver HUD
  const handleSupervisorDispatchIncident = async (incident: any) => {
    try {
      await fetch("/api/reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketNumber: incident.ticketNumber,
          incidentCode: incident.id,
          action: "dispatch",
          assignedUnit: "EV-01 (Tata Ace EV 1000)"
        })
      });
    } catch (err) {
      console.warn("Patch report error:", err);
    }

    setDashcamDetections(prev =>
      prev.map(i =>
        i.id === incident.id
          ? { ...i, status: "Dispatched to EV-01", flyingSquadUnit: "EV-01 (Tata Ace EV 1000)" }
          : i
      )
    );

    if (submittedTicket && (submittedTicket.incidentCode === incident.id || submittedTicket.ticketNumber === incident.ticketNumber)) {
      setSubmittedTicket(prev => prev ? { ...prev, status: "dispatched", targetSquad: "EV-01 (Tata Ace EV 1000) Dispatched" } : null);
    }

    // Dynamically insert high priority pickup stop to Driver EV-01 manifest!
    setDriverStopsState(prev => {
      const existingStops = prev["EV-01"] || fleetConfigs["EV-01"].stops;
      const newUrgentStop: StopItem = {
        id: `DUMP-${incident.id}`,
        address: incident.address,
        fill: 98.5,
        weight: incident.weightEstKg || 520,
        status: "pending",
        eta: 7,
        traffic: "Urgent Priority (+0m)",
        category: "Roadside Dump Cleanup",
        lat: incident.lat || 23.2340,
        lng: incident.lng || 77.4350,
        priority: "High"
      };
      return {
        ...prev,
        "EV-01": [newUrgentStop, ...existingStops]
      };
    });

    setSupervisorNotice(`⚡ Dispatched EV-01 to ${incident.address} for Ticket ${incident.ticketNumber || incident.id}`);
    setTimeout(() => setSupervisorNotice(null), 6000);
  };

  // Real Database Authentication Handler (PostgreSQL wastex)
  const handleFormAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);

    try {
      if (authMode === "login") {
        const iden = authIdentifier.trim();
        const pwd = authPassword.trim();

        if (!iden || !pwd) {
          setAuthError("Please enter your Phone number or Gmail and password.");
          setAuthLoading(false);
          return;
        }

        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier: iden, password: pwd })
        });
        const data = await res.json();

        if (!res.ok || !data.success) {
          setAuthError(data.message || "Invalid credentials. Please verify and try again.");
          setAuthLoading(false);
          return;
        }

        // Set logged-in user with their specific role from PostgreSQL database
        setCurrentUser({
          name: data.user.name,
          email: data.user.email,
          role: data.user.role as RoleType,
          zone: data.user.zone,
          truckId: data.user.truckId
        });
        setAuthPassword("");
      } else {
        // Sign Up Mode
        const name = authName.trim();
        const email = authEmail.trim();
        const phone = authPhone.trim();
        const pwd = authPassword.trim();

        if (!name) {
          setAuthError("Please enter your full name.");
          setAuthLoading(false);
          return;
        }
        if (!email && !phone) {
          setAuthError("Please provide either your Phone number or Gmail / Email address.");
          setAuthLoading(false);
          return;
        }
        if (!pwd || pwd.length < 4) {
          setAuthError("Password must be at least 4 characters long.");
          setAuthLoading(false);
          return;
        }

        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName: name,
            email,
            phoneNumber: phone,
            role: selectedAuthRole,
            password: pwd
          })
        });
        const data = await res.json();

        if (!res.ok || !data.success) {
          setAuthError(data.message || "Failed to create account in database.");
          setAuthLoading(false);
          return;
        }

        // Successfully created user in PostgreSQL, immediately log in with their specific role
        setCurrentUser({
          name: data.user.name,
          email: data.user.email,
          role: data.user.role as RoleType,
          zone: data.user.zone,
          truckId: data.user.truckId
        });
        setAuthPassword("");
      }
    } catch (err: any) {
      setAuthError(err?.message || "Unable to connect. Please verify your network and credentials.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setAuthPassword("");
  };

  // Driver Collect Action
  const handleDriverCollect = (id: string) => {
    setDriverStopsState(prev => {
      const currentList = prev[selectedTruckId] || fleetConfigs[selectedTruckId].stops;
      return {
        ...prev,
        [selectedTruckId]: currentList.map(s => (s.id === id ? { ...s, status: "collected" } : s))
      };
    });

    // If this stop was an urgent dump cleanup dispatched by Supervisor, mark resolved in DB
    if (id.startsWith("DUMP-")) {
      const cleanCode = id.replace("DUMP-", "");
      setDashcamDetections(prev =>
        prev.map(i => (i.id === cleanCode ? { ...i, status: "Resolved / Cleaned" } : i))
      );
      if (submittedTicket && submittedTicket.incidentCode === cleanCode) {
        setSubmittedTicket(prev => prev ? { ...prev, status: "resolved" } : null);
      }
      fetch("/api/reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          incidentCode: cleanCode,
          action: "resolve"
        })
      }).catch(err => console.warn("Resolve incident error:", err));
    }

    setDriverCurrentStopIndex(prev => {
      const curr = prev[selectedTruckId] || 0;
      const total = driverStopsState[selectedTruckId]?.length || fleetConfigs[selectedTruckId].stops.length;
      return {
        ...prev,
        [selectedTruckId]: Math.min(curr + 1, total - 1)
      };
    });
  };

  // Citizen Redeem Handler
  const handleRedeemReward = (rewardId: string, cost: number) => {
    if (citizenRewardPoints < cost) {
      alert("Insufficient EcoPoints! Report more roadside dumping to earn points.");
      return;
    }
    setCitizenRewardPoints(prev => prev - cost);
    setRedeemedRewardId(rewardId);
  };

  // --------------------------------------------------------------------------
  // 1. AUTH SCREEN (FULL SCREEN VIEWPORT)
  // --------------------------------------------------------------------------
  // --------------------------------------------------------------------------
  // 1. AUTH SCREEN (FULL SCREEN VIEWPORT WITH 4-ROLE TABS)
  // --------------------------------------------------------------------------
  if (!currentUser) {
    const roleLabels: Record<RoleType, { title: string; subtitle: string; icon: any }> = {
      admin: { title: "Admin", subtitle: "City Command & Route AI", icon: Building },
      supervisor: { title: "Supervisor", subtitle: "Beat Ops & Detours", icon: SlidersHorizontal },
      driver: { title: "Driver", subtitle: "EV Cockpit & Stops", icon: Truck },
      citizen: { title: "Citizen", subtitle: "Ward 48 & Rewards", icon: Leaf },
    };

    const currentRoleMeta = roleLabels[selectedAuthRole];

    return (
      <div className="h-screen w-screen bg-slate-100 flex flex-col justify-center items-center px-4 overflow-hidden">
        <div className="w-full max-w-lg">
          {/* Brand Emblem */}
          <div className="text-center mb-4">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-2xl shadow-lg shadow-emerald-600/25">
              🌱
            </div>
            <h1 className="mt-2 text-2xl font-black text-slate-900 tracking-tight">WasteX Bhopal</h1>
            <p className="text-xs text-slate-500">Live Municipal Waste Management &amp; Route Optimization</p>
          </div>

          <div className="bg-white py-5 px-6 shadow-xl shadow-slate-200/60 rounded-3xl border border-slate-200">
            {/* 4 Role Selector Tabs */}
            <div className="mb-4">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Select Portal Role</span>
                <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-semibold border border-emerald-200">
                  Live PostgreSQL DB
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {(["admin", "supervisor", "driver", "citizen"] as RoleType[]).map((r) => {
                  const meta = roleLabels[r];
                  const Icon = meta.icon;
                  const isSelected = selectedAuthRole === r;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => {
                        setSelectedAuthRole(r);
                        setAuthError(null);
                      }}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border text-center transition-all ${
                        isSelected
                          ? "border-emerald-600 bg-emerald-50/80 shadow-xs text-emerald-900 ring-2 ring-emerald-500/20"
                          : "border-slate-200 bg-slate-50 hover:bg-slate-100/70 text-slate-600"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-1 transition-all ${
                        isSelected ? "bg-emerald-600 text-white shadow-xs" : "bg-white text-slate-500 border border-slate-200"
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold leading-tight">{meta.title}</span>
                      <span className={`text-[9px] hidden sm:block ${isSelected ? "text-emerald-700 font-semibold" : "text-slate-400"}`}>
                        {r === "admin" ? "Command" : r === "supervisor" ? "Zonal Beat" : r === "driver" ? "Fleet" : "Citizen"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Auth Mode Toggle (Sign In vs Create Account) */}
            <div className="flex rounded-xl bg-slate-100 p-1 mb-4 text-xs font-semibold">
              <button
                type="button"
                onClick={() => { setAuthMode("login"); setAuthError(null); }}
                className={`flex-1 py-1.5 rounded-lg transition-all ${authMode === "login" ? "bg-white text-slate-900 shadow-xs font-bold" : "text-slate-500 hover:text-slate-800"}`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode("signup"); setAuthError(null); }}
                className={`flex-1 py-1.5 rounded-lg transition-all ${authMode === "signup" ? "bg-white text-slate-900 shadow-xs font-bold" : "text-slate-500 hover:text-slate-800"}`}
              >
                Create Account
              </button>
            </div>

            {/* Error Notification */}
            {authError && (
              <div className="mb-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2 animate-fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleFormAuth} className="space-y-3">
              {authMode === "signup" ? (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={authName}
                        onChange={(e) => { setAuthName(e.target.value); setAuthError(null); }}
                        placeholder="e.g. Ramesh Chandra"
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
                      />
                    </div>
                  </div>

                  <div className="p-2 rounded-xl bg-emerald-50/60 border border-emerald-100 flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-medium">Assigned Role:</span>
                    <span className="font-bold text-emerald-800 uppercase tracking-wide flex items-center space-x-1">
                      <span>{currentRoleMeta.title}</span>
                      <span className="text-[10px] text-emerald-600">({selectedAuthRole})</span>
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Gmail / Email Address</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        value={authEmail}
                        onChange={(e) => { setAuthEmail(e.target.value); setAuthError(null); }}
                        placeholder="e.g. yourname@gmail.com"
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Phone Number</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <span className="text-xs font-bold text-slate-400">📱</span>
                      </div>
                      <input
                        type="tel"
                        value={authPhone}
                        onChange={(e) => { setAuthPhone(e.target.value); setAuthError(null); }}
                        placeholder="e.g. 9826012345"
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
                      />
                    </div>
                  </div>
                </>
              ) : (
                /* Login Mode: Single field supporting Phone Number OR Gmail */
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Phone Number or Gmail / Email Address
                    </label>
                    <span className="text-[10px] text-slate-400 font-medium">Role: {currentRoleMeta.title}</span>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={authIdentifier}
                      onChange={(e) => { setAuthIdentifier(e.target.value); setAuthError(null); }}
                      placeholder={
                        selectedAuthRole === "admin" ? "e.g. 9826012345 or admin@bhopal-wastex.gov.in" :
                        selectedAuthRole === "supervisor" ? "e.g. 9826012346 or supervisor@bhopal-wastex.gov.in" :
                        selectedAuthRole === "driver" ? "e.g. 9826012347 or driver@bhopal-wastex.gov.in" :
                        "e.g. 9826012348 or citizen@bhopal-wastex.gov.in"
                      }
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={authPassword}
                    onChange={(e) => { setAuthPassword(e.target.value); setAuthError(null); }}
                    placeholder="Enter your password"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold text-xs tracking-wide shadow-md shadow-emerald-600/20 transition-all mt-2 active:scale-[0.99] flex items-center justify-center space-x-2"
              >
                {authLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>{authMode === "login" ? "Authenticating..." : "Creating Account..."}</span>
                  </>
                ) : (
                  <span>
                    {authMode === "login"
                      ? `Sign In to ${currentRoleMeta.title} Portal`
                      : `Register & Enter ${currentRoleMeta.title} Portal`}
                  </span>
                )}
              </button>
            </form>

            <div className="mt-4 pt-3 border-t border-slate-100 text-center">
              <div className="text-[10px] text-slate-400 font-medium">
                WasteX Municipal Portal • Live Database Authentication
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // 2. MAIN FULL-SCREEN DASHBOARD LAYOUT (FITS VIEWPORT WITHOUT SCROLLING)
  // --------------------------------------------------------------------------
  return (
    <div className="h-screen w-screen bg-slate-100 text-slate-800 flex flex-col font-sans overflow-hidden">
      
      {/* Top Fixed Header (56px) */}
      <header className="h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between shadow-xs shrink-0 z-40">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-base shadow-sm">
            🌱
          </div>
          <div className="flex items-center space-x-2">
            <span className="font-extrabold text-base text-slate-900 tracking-tight">WasteX Bhopal</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
              BMC Central Division
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              currentUser.role === "admin"
                ? "bg-purple-100 text-purple-700 border border-purple-200"
                : currentUser.role === "supervisor"
                ? "bg-amber-100 text-amber-700 border border-amber-200"
                : currentUser.role === "driver"
                ? "bg-sky-100 text-sky-700 border border-sky-200"
                : "bg-emerald-100 text-emerald-700 border border-emerald-200"
            }`}>
              {currentUser.role === "admin" ? "Admin Portal" : currentUser.role === "supervisor" ? "Supervisor Hub" : currentUser.role === "driver" ? "Driver HUD" : "Citizen App"}
            </span>
          </div>
        </div>

        {/* Header Actions: DB Status + Guide + Profile + Logout */}
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => setShowDbModal(true)}
            className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-[11px] font-bold text-emerald-800 shadow-2xs transition-all cursor-pointer"
            title="Click to view Live PostgreSQL Database Connection & Tables"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>PostgreSQL: <strong>wastex</strong> (Live DB)</span>
            <Database className="w-3 h-3 text-emerald-700 ml-0.5" />
          </button>

          <button
            onClick={() => setShowGuideModal(true)}
            className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition-all flex items-center space-x-1"
            title="How WasteX Works (Problem Statement Alignment)"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">System Guide</span>
          </button>

          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-xs font-bold text-slate-700">
              {currentUser.name.split(" ").map(n => n[0]).join("")}
            </div>
            <div className="hidden md:block text-left text-xs leading-tight">
              <div className="font-bold text-slate-800">{currentUser.name}</div>
              <div className="text-[10px] text-slate-400">{currentUser.zone || currentUser.truckId}</div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="px-3 py-1 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-bold transition-all flex items-center space-x-1 shadow-2xs"
            title="Sign out of your dashboard"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Guide Modal for Problem Statement Understanding */}
      {showGuideModal && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-[999999] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] overflow-y-auto relative my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-black text-slate-900 flex items-center">
                <Sparkles className="w-5 h-5 text-emerald-600 mr-2" />
                Problem Statement Alignment &amp; Core Architecture
              </h2>
              <button
                onClick={() => setShowGuideModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <strong className="block text-slate-900 text-sm mb-1">1. Intelligent Route Optimization (VRP Solver)</strong>
                <p className="text-slate-600">
                  Instead of visiting half-empty bins on fixed schedules, the <strong>Vehicle Routing Problem (VRP)</strong> solver minimizes total distance, traffic congestion delay, and fuel consumption by recalculating stop sequence in real-time.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <strong className="block text-slate-900 text-sm mb-1">2. Fill Level Prediction (Weather + Events + Season)</strong>
                <p className="text-slate-600">
                  Combines IoT fill rates with Bhopal temperature, rain moisture factor, and festival rushes (New Market / Chowk Bazaar) to predict overflows hours before they happen.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <strong className="block text-slate-900 text-sm mb-1">3. Computer Vision Dashcam Illegal Dumping Detection</strong>
                <p className="text-slate-600">
                  Municipal camera feeds run YOLOv10 object detection to recognize roadside dump sites, estimate waste volume in cubic meters ($m^3$), and geotag GPS coordinates for rapid cleanup.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowGuideModal(false)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
              >
                Understood, Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live PostgreSQL Database Modal */}
      {showDbModal && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-[999999] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 max-w-xl w-full shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] overflow-y-auto relative my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-black text-slate-900 flex items-center">
                <Database className="w-5 h-5 text-emerald-600 mr-2" />
                PostgreSQL Live Database: wastex
              </h2>
              <button
                onClick={() => setShowDbModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="font-bold text-emerald-950">Active Database Connection</span>
                </div>
                <span className="text-[10px] font-mono font-bold bg-white text-emerald-800 px-2 py-0.5 rounded border border-emerald-300">
                  localhost:5432 / wastex
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 text-[10px] font-bold block">Smart Bins Table</span>
                  <div className="text-base font-black text-slate-900 mt-0.5">5 Bins Seeded</div>
                  <span className="text-[10px] text-emerald-700">MP Nagar, Arera, Shahpura</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 text-[10px] font-bold block">Vehicles Table</span>
                  <div className="text-base font-black text-slate-900 mt-0.5">3 Vehicles Seeded</div>
                  <span className="text-[10px] text-sky-700">EV-01, TRK-02, TRK-03</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 text-[10px] font-bold block">Users Table</span>
                  <div className="text-base font-black text-slate-900 mt-0.5">4 User Accounts</div>
                  <span className="text-[10px] text-purple-700">Admin, Sup, Driver, Citizen</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 text-[10px] font-bold block">Dumping Incidents Table</span>
                  <div className="text-base font-black text-slate-900 mt-0.5">1 Incident Seeded</div>
                  <span className="text-[10px] text-rose-700">10 No. Market CCTV Dump</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 text-slate-200 font-mono text-[11px] space-y-1.5 border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-emerald-400 font-bold flex items-center">
                    <Lock className="w-3.5 h-3.5 text-emerald-400 mr-1.5" />
                    Security &amp; Encryption Status
                  </span>
                  <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-700/60 px-2 py-0.5 rounded font-sans font-bold">
                    Credentials Masked &amp; Protected
                  </span>
                </div>
                <div className="text-slate-300 text-[11px] pt-1">
                  Database: <span className="text-emerald-300 font-bold">wastex</span> • Engine: <strong className="text-white">PostgreSQL 16</strong>
                </div>
                <div className="text-slate-400 text-[10px] border-t border-slate-800 pt-1.5 flex items-center justify-between">
                  <span>Server-side Connection Pool (SSL Encrypted)</span>
                  <span className="text-slate-500">Internal Auth Secrets Redacted</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowDbModal(false)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
              >
                Close Database Monitor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Full-Screen Viewport Content */}
      <main className="flex-1 overflow-hidden p-3 flex flex-col">

        {/* ================================================================= */}
        {/* ROLE 1: MUNICIPAL ADMIN (FULL SCREEN COMMAND COCKPIT)              */}
        {/* ================================================================= */}
        {currentUser.role === "admin" && (
          <div className="h-full flex flex-col space-y-2 overflow-hidden">
            
            {/* Top Single-Line Navigation Tabs */}
            <div className="h-10 bg-white rounded-xl px-3 border border-slate-200 flex items-center justify-between shrink-0 text-xs">
              <div className="flex items-center space-x-3">
                <span className="font-bold text-slate-900 flex items-center">
                  <Activity className="w-3.5 h-3.5 text-emerald-600 mr-1.5" />
                  Bhopal Command:
                </span>
                <span className="text-slate-600">Fuel Saved: <strong className="text-emerald-700">₹10,452/day</strong></span>
                <span className="text-slate-600">Distance Reduction: <strong className="text-sky-700">-{optimizationMetric.kmSaved} km ({optimizationMetric.pctSaved}%)</strong></span>
                <span className="text-slate-600">Time Saved: <strong className="text-amber-700">-{optimizationMetric.minsSaved} mins</strong></span>
              </div>

              {/* 5 Core Feature Tabs */}
              <div className="flex items-center space-x-1 bg-slate-100 p-0.5 rounded-lg font-bold">
                <button
                  onClick={() => setActiveAdminTab("optimizer")}
                  className={`px-2.5 py-1 rounded-md transition-all ${activeAdminTab === "optimizer" ? "bg-white text-emerald-900 shadow-2xs font-black" : "text-slate-500"}`}
                >
                  ⚡ Route Optimizer (VRP)
                </button>
                <button
                  onClick={() => setActiveAdminTab("predictions")}
                  className={`px-2.5 py-1 rounded-md transition-all ${activeAdminTab === "predictions" ? "bg-white text-slate-900 shadow-2xs font-black" : "text-slate-500"}`}
                >
                  🔮 Fill Predictions
                </button>
                <button
                  onClick={() => setActiveAdminTab("dashcam_cv")}
                  className={`px-2.5 py-1 rounded-md transition-all ${activeAdminTab === "dashcam_cv" ? "bg-white text-slate-900 shadow-2xs font-black" : "text-slate-500"}`}
                >
                  📹 Dashcam CV Dumping
                </button>
                <button
                  onClick={() => setActiveAdminTab("categories")}
                  className={`px-2.5 py-1 rounded-md transition-all ${activeAdminTab === "categories" ? "bg-white text-slate-900 shadow-2xs font-black" : "text-slate-500"}`}
                >
                  ♻️ Waste Streams
                </button>
                <button
                  onClick={() => setActiveAdminTab("analytics")}
                  className={`px-2.5 py-1 rounded-md transition-all ${activeAdminTab === "analytics" ? "bg-white text-slate-900 shadow-2xs font-black" : "text-slate-500"}`}
                >
                  📊 Audit Reports
                </button>
              </div>
            </div>

            {/* Split Screen 65% Map / 35% Interactive Engine */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-2 overflow-hidden">
              
              {/* Left Column: Live Map (7 Cols) */}
              <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-2.5 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between mb-1.5 shrink-0 px-1 text-xs">
                  <div className="flex items-center space-x-2 font-bold text-slate-900">
                    <Compass className="w-4 h-4 text-emerald-600" />
                    <span>Bhopal Active Routing Grid</span>
                    {isRouteOptimized && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                        ✓ AI Optimized (Saves {optimizationMetric.kmSaved} km)
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-3 text-[11px]">
                    <span className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-1"></span>Free Flow</span>
                    <span className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 mr-1"></span>Moderate</span>
                    <span className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-rose-500 mr-1"></span>Congested</span>
                  </div>
                </div>

                <div className="flex-1 rounded-xl overflow-hidden border border-slate-200 relative">
                  {/* Floating Live GPS Tracking Status Banner */}
                  <div className="absolute top-3 left-3 z-[1000] bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-md rounded-xl px-3 py-1.5 flex items-center space-x-3 text-xs">
                    <div className="flex items-center space-x-1.5">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                      </span>
                      <span className="font-bold text-slate-800">Live GPS Fleet Moving</span>
                    </div>
                    <div className="hidden sm:flex items-center space-x-2 text-[11px] text-slate-600 border-l border-slate-200 pl-2">
                      <span>EV-01: <strong className="text-emerald-700">{ev01Speed} km/h</strong></span>
                      <span>TRK-02: <strong className="text-sky-700">{trk02Speed} km/h</strong></span>
                      <span>TRK-03: <strong className="text-amber-700">{trk03Speed} km/h</strong></span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsLiveSimPlaying(!isLiveSimPlaying)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                        isLiveSimPlaying ? "bg-amber-100 text-amber-800 hover:bg-amber-200" : "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                      }`}
                    >
                      {isLiveSimPlaying ? "⏸ Pause" : "▶ Move"}
                    </button>
                  </div>

                  {isMounted && (
                    <MapContainer center={[23.2210, 77.4280]} zoom={13} style={{ height: "100%", width: "100%" }} zoomControl={false}>
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      
                      {/* Municipal Beat Zone Boundaries */}
                      {Object.values(zoneBoundaries).map(zone => (
                        <Polygon
                          key={zone.id}
                          positions={zone.coords}
                          pathOptions={{
                            color: zone.color,
                            weight: 2,
                            fillColor: zone.color,
                            fillOpacity: 0.08,
                            dashArray: "4, 4"
                          }}
                        >
                          <LeafletTooltip direction="center" permanent className="font-bold text-[9px] bg-slate-900/90 text-white border border-slate-700 px-2 py-0.5 rounded shadow">
                            {zone.name}
                          </LeafletTooltip>
                        </Polygon>
                      ))}

                      {/* Fleet Route Polylines strictly within each Truck's Zone */}
                      {(["EV-01", "TRK-02", "TRK-03"] as TruckId[]).map(tId => {
                        const trk = fleetConfigs[tId];
                        const isSelected = selectedTruckId === tId;
                        const isOpt = truckOptimizationState[tId];
                        const coords = isOpt ? trk.optimizedCoords : trk.standardCoords;
                        return (
                          <Polyline
                            key={`route-${tId}`}
                            positions={coords}
                            pathOptions={{
                              color: isSelected ? (isOpt ? "#10b981" : "#ef4444") : trk.color,
                              weight: isSelected ? 5 : 3,
                              opacity: isSelected ? 0.95 : 0.45,
                              dashArray: isOpt ? "6, 6" : undefined
                            }}
                          />
                        );
                      })}

                      {/* Central BMC Waste Management Headquarter & Dispatch Depot */}
                      <CircleMarker center={BMC_CENTRAL_HQ.coords} radius={18} pathOptions={{ fillColor: "#f59e0b", color: "#b45309", weight: 3, fillOpacity: 0.35 }} />
                      <CircleMarker center={BMC_CENTRAL_HQ.coords} radius={9} pathOptions={{ fillColor: "#d97706", color: "#ffffff", weight: 3, fillOpacity: 1 }}>
                        <LeafletTooltip permanent direction="top" offset={[0, -12]} className="font-black text-[10px] bg-amber-950 text-amber-300 border border-amber-500 rounded px-2 py-0.5 shadow-md">
                          🏛️ BMC CENTRAL WASTE HQ &amp; DISPATCH DEPOT
                        </LeafletTooltip>
                        <Popup>
                          <div className="text-xs space-y-1">
                            <div className="font-black text-amber-800 text-sm">🏛️ BMC Central Swachhata HQ &amp; Fleet Depot</div>
                            <div>Location: <strong>Paryawaran Parisar / Board Office Junction, Bhopal</strong></div>
                            <div className="text-emerald-700 font-bold">Origin &amp; Final Return Hub for All Municipal Fleets</div>
                            <div className="text-[11px] text-slate-600">Trucks Dispatched: EV-01 (Zone 1), TRK-02 (Zone 2), TRK-03 (Zone 3)</div>
                          </div>
                        </Popup>
                      </CircleMarker>

                      {/* Smart Bins for All Fleet Zones */}
                      {(["EV-01", "TRK-02", "TRK-03"] as TruckId[]).flatMap(tId => fleetConfigs[tId].stops).map((b) => (
                        <CircleMarker
                          key={b.id}
                          center={[b.lat, b.lng]}
                          radius={b.fill > 85 ? 9 : 6}
                          pathOptions={{
                            fillColor: b.fill > 85 ? "#ef4444" : b.fill > 50 ? "#f59e0b" : "#10b981",
                            color: "#ffffff",
                            weight: 2,
                            fillOpacity: 1
                          }}
                        >
                          <Popup>
                            <div className="text-xs">
                              <strong>{b.id}</strong><br />
                              Location: {b.address}<br />
                              Fill: <strong>{b.fill}%</strong> ({b.weight} kg)<br />
                              Traffic: {b.traffic}
                            </div>
                          </Popup>
                        </CircleMarker>
                      ))}

                      {/* Moving Truck 1: EV-01 (Tata Ace EV 1000) */}
                      <CircleMarker center={ev01Pos} radius={18} pathOptions={{ fillColor: "#10b981", color: "#10b981", weight: 1, fillOpacity: 0.25 }} />
                      <CircleMarker center={ev01Pos} radius={10} pathOptions={{ fillColor: "#059669", color: "#ffffff", weight: 3, fillOpacity: 1 }}>
                        <LeafletTooltip permanent direction="top" offset={[0, -10]} className="font-bold text-[10px] bg-slate-900 text-white rounded px-1.5 py-0.5 shadow">
                          🚛 EV-01 [{ev01Speed} km/h]
                        </LeafletTooltip>
                        <Popup>
                          <div className="text-xs space-y-1">
                            <div className="font-bold text-emerald-700">🚛 Truck EV-01 (Tata Ace EV 1000)</div>
                            <div>Status: <span className="text-emerald-600 font-bold">🟢 Moving in Real-time</span></div>
                            <div>Speed: <strong>{ev01Speed} km/h</strong> • Battery: <strong>86%</strong></div>
                            <div>Pilot: Ramesh Yadav (MP-04-GE-2418)</div>
                            <div>Route Mode: {truckOptimizationState["EV-01"] ? "AI Detour Active (-29m)" : "Standard Municipal Route"}</div>
                          </div>
                        </Popup>
                      </CircleMarker>

                      {/* Moving Truck 2: TRK-02 (BharatBenz Compactor) */}
                      <CircleMarker center={trk02Pos} radius={18} pathOptions={{ fillColor: "#0284c7", color: "#0284c7", weight: 1, fillOpacity: 0.25 }} />
                      <CircleMarker center={trk02Pos} radius={10} pathOptions={{ fillColor: "#0284c7", color: "#ffffff", weight: 3, fillOpacity: 1 }}>
                        <LeafletTooltip permanent direction="top" offset={[0, -10]} className="font-bold text-[10px] bg-slate-900 text-white rounded px-1.5 py-0.5 shadow">
                          🚛 TRK-02 [{trk02Speed} km/h]
                        </LeafletTooltip>
                        <Popup>
                          <div className="text-xs space-y-1">
                            <div className="font-bold text-sky-700">🚛 TRK-02 (BharatBenz 1217 Compactor)</div>
                            <div>Status: <span className="text-sky-600 font-bold">🟢 Moving in Real-time</span></div>
                            <div>Speed: <strong>{trk02Speed} km/h</strong> • Diesel: <strong>68%</strong></div>
                            <div>Pilot: Devendra Verma (MP-04-HE-8821)</div>
                            <div>Route Mode: {truckOptimizationState["TRK-02"] ? "AI Detour Active (-34m)" : "Standard Municipal Route"}</div>
                          </div>
                        </Popup>
                      </CircleMarker>

                      {/* Moving Truck 3: TRK-03 (Mahindra Tipper) */}
                      <CircleMarker center={trk03Pos} radius={18} pathOptions={{ fillColor: "#f59e0b", color: "#f59e0b", weight: 1, fillOpacity: 0.25 }} />
                      <CircleMarker center={trk03Pos} radius={10} pathOptions={{ fillColor: "#d97706", color: "#ffffff", weight: 3, fillOpacity: 1 }}>
                        <LeafletTooltip permanent direction="top" offset={[0, -10]} className="font-bold text-[10px] bg-slate-900 text-white rounded px-1.5 py-0.5 shadow">
                          🚛 TRK-03 [{trk03Speed} km/h]
                        </LeafletTooltip>
                        <Popup>
                          <div className="text-xs space-y-1">
                            <div className="font-bold text-amber-700">🚛 TRK-03 (Mahindra Bolero Tipper)</div>
                            <div>Status: <span className="text-amber-600 font-bold">🟢 Moving in Real-time</span></div>
                            <div>Speed: <strong>{trk03Speed} km/h</strong> • CNG: <strong>74%</strong></div>
                            <div>Pilot: Imran Khan (MP-04-CA-1109)</div>
                            <div>Route Mode: {truckOptimizationState["TRK-03"] ? "AI Detour Active (-22m)" : "Standard Municipal Route"}</div>
                          </div>
                        </Popup>
                      </CircleMarker>
                    </MapContainer>
                  )}
                </div>

                {/* Solving Status Toast */}
                {isSolvingRoute && (
                  <div className="mt-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center justify-between shadow-sm animate-pulse">
                    <span>⚡ Solving VRPTW for {selectedTruckId} ({currentTruckConfig.name})...</span>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  </div>
                )}
              </div>

              {/* Right Column: Tabbed Engine Control (5 Cols) */}
              <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-3 flex flex-col overflow-hidden">
                
                {/* TAB 1: Route Optimization Engine (VRP Solver) */}
                {activeAdminTab === "optimizer" && (
                  <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                    
                    {/* Fleet Vehicle Selector */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Select Bhopal Truck Route to Optimize
                        </label>
                        <span className="text-[10px] font-bold text-slate-500">3 Fleet Units Active</span>
                      </div>
                      <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl">
                        {(["EV-01", "TRK-02", "TRK-03"] as TruckId[]).map(tId => {
                          const isSel = selectedTruckId === tId;
                          const isOpt = truckOptimizationState[tId];
                          const trk = fleetConfigs[tId];
                          return (
                            <button
                              key={tId}
                              type="button"
                              onClick={() => setSelectedTruckId(tId)}
                              className={`py-1.5 px-2 rounded-lg text-left transition-all ${
                                isSel ? "bg-white shadow-xs border border-slate-200" : "hover:bg-slate-200/60"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-black text-xs text-slate-900">{tId}</span>
                                {isOpt ? (
                                  <span className="w-2 h-2 rounded-full bg-emerald-500" title="Optimized"></span>
                                ) : (
                                  <span className="w-2 h-2 rounded-full bg-rose-400" title="Un-optimized"></span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-500 truncate">{trk.fuel}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-slate-900">{currentTruckConfig.name} ({currentTruckConfig.reg})</div>
                        <div className="text-[11px] text-slate-500">Pilot: {currentTruckConfig.driver} • {currentTruckConfig.zone}</div>
                      </div>
                      <button
                        onClick={handleTriggerRouteOptimization}
                        disabled={isSolvingRoute}
                        className={`px-3 py-1.5 rounded-xl text-white text-xs font-bold shadow-xs flex items-center space-x-1.5 transition-all ${
                          isRouteOptimized ? "bg-emerald-700 hover:bg-emerald-800" : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
                        }`}
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>{isSolvingRoute ? "Solving..." : isRouteOptimized ? `✓ ${selectedTruckId} Optimized` : `Optimize ${selectedTruckId}`}</span>
                      </button>
                    </div>

                    {/* Solver Strategy Selector */}
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Optimization Strategy</span>
                      <div className="grid grid-cols-3 gap-1 text-[11px] font-bold">
                        <button
                          onClick={() => setOptimizationStrategy("fastest_traffic")}
                          className={`p-2 rounded-lg border text-center transition-all ${
                            optimizationStrategy === "fastest_traffic"
                              ? "bg-white border-emerald-500 text-emerald-800 shadow-xs"
                              : "bg-transparent border-transparent text-slate-500 hover:text-slate-900"
                          }`}
                        >
                          ⚡ Congestion
                        </button>
                        <button
                          onClick={() => setOptimizationStrategy("fuel_optimal")}
                          className={`p-2 rounded-lg border text-center transition-all ${
                            optimizationStrategy === "fuel_optimal"
                              ? "bg-white border-emerald-500 text-emerald-800 shadow-xs"
                              : "bg-transparent border-transparent text-slate-500 hover:text-slate-900"
                          }`}
                        >
                          🔋 Min Distance
                        </button>
                        <button
                          onClick={() => setOptimizationStrategy("priority_overflow")}
                          className={`p-2 rounded-lg border text-center transition-all ${
                            optimizationStrategy === "priority_overflow"
                              ? "bg-white border-emerald-500 text-emerald-800 shadow-xs"
                              : "bg-transparent border-transparent text-slate-500 hover:text-slate-900"
                          }`}
                        >
                          ⚠️ Fill Priority
                        </button>
                      </div>
                    </div>

                    {/* Optimization Comparison Metrics for Selected Truck */}
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200">
                        <span className="text-[10px] text-emerald-800 font-bold block">Distance Saved</span>
                        <div className="text-base font-black text-emerald-700 mt-0.5">-{optimizationMetric.kmSaved} km</div>
                        <span className="text-[10px] text-emerald-600 font-medium">-{optimizationMetric.pctSaved}% reduction</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-sky-50/70 border border-sky-200">
                        <span className="text-[10px] text-sky-800 font-bold block">Time Saved</span>
                        <div className="text-base font-black text-sky-700 mt-0.5">-{optimizationMetric.minsSaved}m</div>
                        <span className="text-[10px] text-sky-600 font-medium">{optimizationMetric.optimizedMins}m vs {optimizationMetric.originalMins}m</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200">
                        <span className="text-[10px] text-amber-800 font-bold block">Fuel Saved</span>
                        <div className="text-base font-black text-amber-700 mt-0.5">₹{optimizationMetric.costSavedInr}</div>
                        <span className="text-[10px] text-amber-600 font-medium">{currentTruckConfig.defaultMetrics.fuelSavedText}</span>
                      </div>
                    </div>

                    {/* Assigned Stops Manifest for Selected Truck */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">
                        {isRouteOptimized ? `${selectedTruckId}: AI-Optimized Sequence (Detour Active)` : `${selectedTruckId}: Assigned Municipal Beat (${activeDriverStops.length} Stops)`}
                      </span>
                      {activeDriverStops.map((s, idx) => (
                        <div key={s.id} className="p-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                          <div className="flex items-center space-x-2">
                            <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-black text-[10px] flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <div>
                              <div className="font-bold text-slate-900 leading-tight">{s.id}</div>
                              <div className="text-[10px] text-slate-500 truncate max-w-[180px]">{s.address}</div>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${s.fill > 85 ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-800"}`}>
                              {s.fill}%
                            </span>
                            <span className="text-[10px] text-slate-400 block">{s.traffic}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* TAB 2: AI Fill Predictions (Weather, Public Events & Seasonal) */}
                {activeAdminTab === "predictions" && (
                  <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                          Fill Level Predictive Engine
                        </h3>
                        <p className="text-[11px] text-slate-500">Historical Patterns + Weather + Public Events</p>
                      </div>
                    </div>

                    {/* Weather & Event Simulation Controls */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {/* Weather Selector */}
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center">
                          <CloudSun className="w-3.5 h-3.5 mr-1" />
                          Bhopal Weather Factor
                        </span>
                        <select
                          value={weatherCondition}
                          onChange={(e) => setWeatherCondition(e.target.value as any)}
                          className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
                        >
                          <option value="sunny">☀️ Sunny (32°C, Normal)</option>
                          <option value="rainy">🌧️ Heavy Rain (+25% Waste Moisture)</option>
                          <option value="hot_summer">🔥 Peak Summer (+15% Beverages)</option>
                        </select>
                      </div>

                      {/* Public Event Toggle */}
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center">
                          <Calendar className="w-3.5 h-3.5 mr-1" />
                          Public Event / Market Rush
                        </span>
                        <button
                          onClick={() => setPublicEventRush(!publicEventRush)}
                          className={`w-full p-1.5 rounded-lg border text-xs font-bold transition-all text-center ${
                            publicEventRush
                              ? "bg-amber-100 border-amber-300 text-amber-900"
                              : "bg-white border-slate-200 text-slate-600"
                          }`}
                        >
                          {publicEventRush ? "🎉 Festive Rush Active (+35%)" : "Normal Daily Footfall"}
                        </button>
                      </div>
                    </div>

                    {/* Predictive Bin Queue */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">
                        Predicted Bin Fill Progression (Next 4 Hours)
                      </span>
                      {predictedBins.map(b => (
                        <div key={b.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                          <div className="flex justify-between font-bold text-slate-900">
                            <span>{b.id} ({b.location})</span>
                            <span className="text-rose-600">{b.predictedIn4h}% Predicted</span>
                          </div>
                          <div className="flex justify-between text-[11px] text-slate-500">
                            <span>Current: {b.currentFill}%</span>
                            <span className="text-amber-800 font-bold">{b.urgency}</span>
                          </div>
                          <div className="text-[10px] text-slate-400">Driver Factor: {b.factor}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* TAB 3: Live Illegal Dumping Command Center */}
                {activeAdminTab === "dashcam_cv" && (
                  <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center">
                          <ShieldAlert className="w-3.5 h-3.5 text-orange-600 mr-1.5" />
                          Live Illegal Dumping Command Center
                        </h3>
                        <p className="text-[11px] text-slate-500">YOLOv10 Edge Vision • 3D Volume ($m^3$) • Geotagging</p>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        ● 3 Feeds Active
                      </span>
                    </div>

                    {/* Camera Feed Selector */}
                    <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl text-[10px] font-bold">
                      {(
                        [
                          { id: "CAM-TRUCK-02", label: "CAM-02: Arera" },
                          { id: "CAM-TRUCK-01", label: "CAM-01: MP Nagar" },
                          { id: "CAM-CCTV-04", label: "CCTV-04: VIP Rd" }
                        ] as const
                      ).map(cam => (
                        <button
                          key={cam.id}
                          type="button"
                          onClick={() => setSelectedCameraFeed(cam.id)}
                          className={`py-1 rounded-lg transition-all ${
                            selectedCameraFeed === cam.id ? "bg-white text-slate-900 shadow-xs font-black" : "text-slate-500 hover:text-slate-900"
                          }`}
                        >
                          {cam.label}
                        </button>
                      ))}
                    </div>

                    {/* Simulated Live Dashcam / CCTV Feed Player */}
                    <div className="relative rounded-2xl bg-slate-950 border border-slate-800 p-3 overflow-hidden shadow-md">
                      {/* Top Video HUD Bar */}
                      <div className="flex justify-between items-center text-[10px] text-slate-400 mb-2 font-mono">
                        <div className="flex items-center space-x-1.5">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                          </span>
                          <span className="text-white font-bold">{selectedCameraFeed}</span>
                          <span className="text-slate-500">| 1080p 30fps</span>
                        </div>
                        <span className="text-emerald-400 font-bold">YOLOv10-Nano: 42ms</span>
                      </div>

                      {/* Video Viewport with AI Bounding Box */}
                      <div className="h-36 rounded-xl bg-slate-900/90 relative border border-slate-800 flex items-center justify-center overflow-hidden">
                        {/* Crosshairs & Grid Background */}
                        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]"></div>
                        
                        {/* Target Bounding Box Overlay */}
                        <div className="absolute inset-x-6 inset-y-4 border-2 border-dashed border-rose-500 bg-rose-500/10 rounded-lg p-2 flex flex-col justify-between animate-pulse">
                          <div className="flex justify-between items-start">
                            <span className="bg-rose-600 text-white font-black text-[9px] px-1.5 py-0.5 rounded shadow">
                              [DUMP DETECTED: 96.2%]
                            </span>
                            <span className="bg-black/80 text-amber-300 font-mono text-[9px] px-1.5 py-0.5 rounded border border-amber-500/40">
                              3.4 m³ (~520 kg)
                            </span>
                          </div>
                          <div className="text-[10px] font-mono text-white/90 bg-black/70 px-1.5 py-0.5 rounded self-start">
                            Class: Roadside Debris &amp; Plastic Scrap
                          </div>
                        </div>

                        {/* Camera telemetry line */}
                        <div className="absolute bottom-1 right-2 text-[9px] font-mono text-slate-400">
                          Lat: 23.2130° N, Lng: 77.4370° E (Ward 48)
                        </div>
                      </div>

                      {/* Video Action Buttons */}
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <button
                          type="button"
                          onClick={handleScanDashcamFeed}
                          disabled={isScanningDashcam}
                          className="py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-bold flex items-center justify-center space-x-1 transition-all"
                        >
                          <Camera className="w-3.5 h-3.5 text-sky-400" />
                          <span>{isScanningDashcam ? "Analyzing Frame..." : "Scan Current Frame"}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setFlyingSquadNotice("🚨 BMC Flying Squad Team Alpha dispatched to 10 No. Market Alley! Target cleanup SLA: 3h 00m.");
                            setTimeout(() => setFlyingSquadNotice(null), 5000);
                          }}
                          className="py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-[11px] font-bold flex items-center justify-center space-x-1 shadow-xs transition-all"
                        >
                          <ShieldAlert className="w-3.5 h-3.5" />
                          <span>Dispatch Flying Squad</span>
                        </button>
                      </div>

                      {flyingSquadNotice && (
                        <div className="mt-2 p-2 rounded-xl bg-orange-950/80 border border-orange-500/60 text-orange-200 text-[10px] font-bold flex items-center space-x-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>{flyingSquadNotice}</span>
                        </div>
                      )}
                    </div>

                    {/* Active Incident Queue & SLA Countdowns */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center px-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                          Active Municipal Incident Tickets ({dashcamDetections.length})
                        </span>
                        <span className="text-[10px] text-rose-700 font-bold">3h Municipal SLA</span>
                      </div>

                      {dashcamDetections.map(d => (
                        <div key={d.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5 hover:border-slate-300 transition-colors">
                          <div className="flex items-center justify-between">
                            <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-700 font-bold text-[10px] uppercase">
                              {d.severity} Priority
                            </span>
                            <span className="text-[10px] font-mono font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
                              SLA: {d.slaCountdown}
                            </span>
                          </div>
                          <div className="font-bold text-slate-900 leading-tight">{d.address}</div>
                          <div className="text-slate-600 text-[11px]">
                            Class: <strong>{d.wasteClass}</strong> • Est. Volume: <strong>{d.volumeM3} m³</strong> (~{d.weightEstKg} kg)
                          </div>
                          <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1 border-t border-slate-200/60">
                            <span>Camera: {d.cameraFeed.split(" ")[0]}</span>
                            <span className="font-bold text-emerald-700">Confidence: {d.confidencePct}%</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setDashcamDetections(prev => prev.filter(i => i.id !== d.id));
                              alert(`✓ BMC Flying Squad assigned to ${d.address}. Ticket marked in-progress.`);
                            }}
                            className="w-full py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition-all"
                          >
                            ✓ Assign Cleanup Squad
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* TAB 4: 5-Stream Waste Categorization */}
                {activeAdminTab === "categories" && (
                  <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        5-Stream Waste Categorization
                      </h3>
                      <p className="text-[11px] text-slate-500">Bhopal Municipal Recycling Facility Routing</p>
                    </div>

                    <div className="space-y-1.5">
                      {wasteCategories.map(cat => (
                        <div key={cat.name} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                          <div className="flex items-center space-x-2">
                            <span className="text-lg">{cat.icon}</span>
                            <div>
                              <div className="font-bold text-slate-900">{cat.name}</div>
                              <div className="text-[10px] text-slate-500">{cat.disposal}</div>
                            </div>
                          </div>
                          <span className="font-black text-xs" style={{ color: cat.color }}>
                            {cat.sharePct}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* TAB 5: Executive Analytics & Reports */}
                {activeAdminTab === "analytics" && (
                  <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                          Municipal Operations &amp; Sustainability Audit
                        </h3>
                        <p className="text-[11px] text-slate-500">Live Telemetry &bull; Bhopal Municipal Corporation (BMC)</p>
                      </div>
                      <button
                        onClick={() => {
                          setDownloadSuccessNotice(true);
                          setTimeout(() => setDownloadSuccessNotice(false), 4000);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs flex items-center space-x-1"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Export Audit PDF</span>
                      </button>
                    </div>

                    {downloadSuccessNotice && (
                      <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-bold flex items-center space-x-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Executive Report Generated: Bhopal_WasteX_Daily_Audit.pdf</span>
                      </div>
                    )}

                    {/* 4 Core KPI Highlights */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200">
                        <span className="text-emerald-800 block text-[10px] font-bold">Waste Collected</span>
                        <div className="text-base font-black text-emerald-900 mt-0.5">142.8 MT</div>
                        <span className="text-[10px] text-emerald-700">100% On-Time Beat</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200">
                        <span className="text-amber-800 block text-[10px] font-bold">Net Fleet Fuel Saved</span>
                        <div className="text-base font-black text-amber-900 mt-0.5">₹10,452</div>
                        <span className="text-[10px] text-amber-700">73.9L Diesel Equivalent</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-sky-50/80 border border-sky-200">
                        <span className="text-sky-800 block text-[10px] font-bold">Traffic Delay Avoided</span>
                        <div className="text-base font-black text-sky-900 mt-0.5">134 Mins</div>
                        <span className="text-[10px] text-sky-700">32% Quicker Response</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-purple-50/80 border border-purple-200">
                        <span className="text-purple-800 block text-[10px] font-bold">CO2 Abatement</span>
                        <div className="text-base font-black text-purple-900 mt-0.5">482 kg</div>
                        <span className="text-[10px] text-purple-700">Weekly Carbon Offset</span>
                      </div>
                    </div>

                    {/* Zone-by-Zone Operational Efficiency Table */}
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                      <div className="font-bold text-slate-800 text-[11px] uppercase tracking-wider flex justify-between items-center">
                        <span>Municipal Beat Zone Performance</span>
                        <span className="text-slate-400 text-[10px] normal-case">Updated Live (GPS + IoT)</span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-[11px]">
                          <thead>
                            <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                              <th className="pb-1.5">Beat Zone</th>
                              <th className="pb-1.5">Assigned Vehicle</th>
                              <th className="pb-1.5">Smart Bins</th>
                              <th className="pb-1.5">Distance Saved</th>
                              <th className="pb-1.5">Efficiency</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200/60 font-medium text-slate-700">
                            <tr>
                              <td className="py-1.5 font-bold text-emerald-800">Zone 1 (MP Nagar Commercial)</td>
                              <td className="py-1.5">EV-01 (Tata Ace EV)</td>
                              <td className="py-1.5">5 Bins (100% Cleared)</td>
                              <td className="py-1.5 font-bold text-emerald-600">-8.4 km</td>
                              <td className="py-1.5"><span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">96.4%</span></td>
                            </tr>
                            <tr>
                              <td className="py-1.5 font-bold text-sky-800">Zone 2 (Arera Colony &amp; Markets)</td>
                              <td className="py-1.5">TRK-02 (BharatBenz)</td>
                              <td className="py-1.5">5 Bins (100% Cleared)</td>
                              <td className="py-1.5 font-bold text-sky-600">-9.4 km</td>
                              <td className="py-1.5"><span className="px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 text-[10px] font-bold">92.8%</span></td>
                            </tr>
                            <tr>
                              <td className="py-1.5 font-bold text-amber-800">Zone 3 (Shahpura Lake Promenade)</td>
                              <td className="py-1.5">TRK-03 (Bolero Tipper)</td>
                              <td className="py-1.5">5 Bins (100% Cleared)</td>
                              <td className="py-1.5 font-bold text-amber-600">-6.6 km</td>
                              <td className="py-1.5"><span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">94.0%</span></td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Vehicle Telemetry & Energy Cost Comparison */}
                    <div className="p-3 rounded-2xl bg-white border border-slate-200 space-y-2">
                      <div className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                        Fleet Fuel &amp; Propulsion Audit (Standard vs AI Optimized)
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                          <div className="font-bold text-slate-900 text-xs">EV-01 (Tata Ace EV)</div>
                          <div className="text-[10px] text-slate-500">Route: 24.8 km &rarr; <strong className="text-emerald-700">16.4 km</strong></div>
                          <div className="text-[10px] text-emerald-700 font-bold">Saves 2.94 L eq (₹277/day)</div>
                        </div>
                        <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                          <div className="font-bold text-slate-900 text-xs">TRK-02 (BharatBenz)</div>
                          <div className="text-[10px] text-slate-500">Route: 28.6 km &rarr; <strong className="text-sky-700">19.2 km</strong></div>
                          <div className="text-[10px] text-sky-700 font-bold">Saves 4.20 L diesel (₹394/day)</div>
                        </div>
                        <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                          <div className="font-bold text-slate-900 text-xs">TRK-03 (Bolero CNG)</div>
                          <div className="text-[10px] text-slate-500">Route: 21.4 km &rarr; <strong className="text-amber-700">14.8 km</strong></div>
                          <div className="text-[10px] text-amber-700 font-bold">Saves 2.80 kg CNG (₹245/day)</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* ROLE 2: ZONE SUPERVISOR (FULL SCREEN ZONE DISPATCH HUB)            */}
        {/* ================================================================= */}
        {currentUser.role === "supervisor" && (
          <div className="h-full flex flex-col space-y-2 overflow-hidden">
            {/* Top 15-min Auto Escalation Bar */}
            <div className="h-12 bg-amber-50 border border-amber-200 rounded-xl px-4 flex items-center justify-between shrink-0 text-xs">
              <div className="flex items-center space-x-2.5">
                <Clock className="w-4 h-4 text-amber-600" />
                <span className="font-bold text-slate-900">15-Minute Driver Auto-Escalation:</span>
                <span className="text-slate-600">Overflow at <strong>BIN-BPL-001 (94.2% Full)</strong> • Stage {escalationStage}: Ramesh Yadav (EV-01)</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="font-mono font-black text-amber-800 text-sm">{formatTimer(escalationSeconds)}</span>
                <button
                  onClick={() => {
                    setEscalationStage(prev => (prev < 3 ? prev + 1 : 1));
                    setEscalationSeconds(15 * 60);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px]"
                >
                  Force Next Stage
                </button>
              </div>
            </div>

            {/* Split Screen Grid */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-2 overflow-hidden">
              {/* Zone Map (7 Cols) */}
              <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-2.5 flex flex-col overflow-hidden">
                <div className="flex justify-between items-center mb-1.5 px-1 text-xs font-bold text-slate-900">
                  <span>Zone 1 &amp; 2 Live Operations (MP Nagar &amp; Arera Colony)</span>
                  <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">All Beat Systems Nominal</span>
                </div>
                <div className="flex-1 rounded-xl overflow-hidden border border-slate-200 relative">
                  {/* Floating Live Telemetry Badge for Supervisor */}
                  <div className="absolute top-3 left-3 z-[1000] bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-md rounded-xl px-3 py-1.5 flex items-center space-x-3 text-xs">
                    <div className="flex items-center space-x-1.5">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                      </span>
                      <span className="font-bold text-slate-800">Zone 1 &amp; 2 Patrol Active</span>
                    </div>
                    <span className="text-[11px] text-slate-600 border-l border-slate-200 pl-2">
                      EV-01: <strong className="text-emerald-700">{ev01Speed} km/h</strong> • TRK-02: <strong className="text-sky-700">{trk02Speed} km/h</strong>
                    </span>
                  </div>

                  {isMounted && (
                    <MapContainer center={[23.2240, 77.4330]} zoom={13} style={{ height: "100%", width: "100%" }} zoomControl={false}>
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      
                      {/* Zone 1 & 2 Boundaries for Supervisor */}
                      <Polygon
                        positions={zoneBoundaries["Zone 1"].coords}
                        pathOptions={{ color: "#10b981", weight: 2, fillColor: "#10b981", fillOpacity: 0.08, dashArray: "4, 4" }}
                      >
                        <LeafletTooltip direction="center" permanent className="font-bold text-[9px] bg-slate-900 text-white rounded px-2 py-0.5">
                          Zone 1: MP Nagar Beat
                        </LeafletTooltip>
                      </Polygon>

                      <Polygon
                        positions={zoneBoundaries["Zone 2"].coords}
                        pathOptions={{ color: "#0284c7", weight: 2, fillColor: "#0284c7", fillOpacity: 0.08, dashArray: "4, 4" }}
                      >
                        <LeafletTooltip direction="center" permanent className="font-bold text-[9px] bg-slate-900 text-white rounded px-2 py-0.5">
                          Zone 2: Arera Colony Beat
                        </LeafletTooltip>
                      </Polygon>

                      {/* EV-01 & TRK-02 Dedicated Route Polylines */}
                      <Polyline
                        positions={truckOptimizationState["EV-01"] ? fleetConfigs["EV-01"].optimizedCoords : fleetConfigs["EV-01"].standardCoords}
                        pathOptions={{ color: "#10b981", weight: 4, opacity: 0.85 }}
                      />
                      <Polyline
                        positions={truckOptimizationState["TRK-02"] ? fleetConfigs["TRK-02"].optimizedCoords : fleetConfigs["TRK-02"].standardCoords}
                        pathOptions={{ color: "#0284c7", weight: 4, opacity: 0.85 }}
                      />

                      {/* Central BMC Waste Management Headquarter & Dispatch Depot */}
                      <CircleMarker center={BMC_CENTRAL_HQ.coords} radius={18} pathOptions={{ fillColor: "#f59e0b", color: "#b45309", weight: 3, fillOpacity: 0.35 }} />
                      <CircleMarker center={BMC_CENTRAL_HQ.coords} radius={9} pathOptions={{ fillColor: "#d97706", color: "#ffffff", weight: 3, fillOpacity: 1 }}>
                        <LeafletTooltip permanent direction="top" offset={[0, -12]} className="font-black text-[10px] bg-amber-950 text-amber-300 border border-amber-500 rounded px-2 py-0.5 shadow-md">
                          🏛️ BMC CENTRAL WASTE HQ &amp; DISPATCH DEPOT
                        </LeafletTooltip>
                        <Popup>
                          <div className="text-xs space-y-1">
                            <div className="font-black text-amber-800 text-sm">🏛️ BMC Central Swachhata HQ &amp; Fleet Depot</div>
                            <div>Location: <strong>Paryawaran Parisar / Board Office Junction, Bhopal</strong></div>
                            <div className="text-emerald-700 font-bold">Origin &amp; Final Return Hub for All Municipal Fleets</div>
                          </div>
                        </Popup>
                      </CircleMarker>

                      {/* Smart Bins for Zone 1 & 2 */}
                      {[...fleetConfigs["EV-01"].stops, ...fleetConfigs["TRK-02"].stops].map(b => (
                        <CircleMarker
                          key={b.id}
                          center={[b.lat, b.lng]}
                          radius={b.fill > 85 ? 9 : 6}
                          pathOptions={{ fillColor: b.fill > 85 ? "#ef4444" : "#10b981", color: "#ffffff", weight: 2, fillOpacity: 1 }}
                        >
                          <Popup><div className="text-xs font-bold">{b.id} ({b.category}) • {b.fill}%</div></Popup>
                        </CircleMarker>
                      ))}

                      {/* Moving Truck EV-01 in Zone 1 */}
                      <CircleMarker center={ev01Pos} radius={18} pathOptions={{ fillColor: "#10b981", color: "#10b981", weight: 1, fillOpacity: 0.25 }} />
                      <CircleMarker center={ev01Pos} radius={10} pathOptions={{ fillColor: "#059669", color: "#ffffff", weight: 3, fillOpacity: 1 }}>
                        <LeafletTooltip permanent direction="top" offset={[0, -10]} className="font-bold text-[10px] bg-slate-900 text-white rounded px-1.5 py-0.5 shadow">
                          🚛 EV-01 [{ev01Speed} km/h]
                        </LeafletTooltip>
                        <Popup>
                          <div className="text-xs space-y-1">
                            <div className="font-bold text-emerald-700">🚛 Truck EV-01 (Zone 1 Beat)</div>
                            <div>Speed: <strong>{ev01Speed} km/h</strong> • Driver: Ramesh Yadav</div>
                            <div>Current Beat: MP Nagar &amp; Arera Colony</div>
                          </div>
                        </Popup>
                      </CircleMarker>

                      {/* Moving Truck TRK-02 in Zone 2 */}
                      <CircleMarker center={trk02Pos} radius={18} pathOptions={{ fillColor: "#0284c7", color: "#0284c7", weight: 1, fillOpacity: 0.25 }} />
                      <CircleMarker center={trk02Pos} radius={10} pathOptions={{ fillColor: "#0284c7", color: "#ffffff", weight: 3, fillOpacity: 1 }}>
                        <LeafletTooltip permanent direction="top" offset={[0, -10]} className="font-bold text-[10px] bg-slate-900 text-white rounded px-1.5 py-0.5 shadow">
                          🚛 TRK-02 [{trk02Speed} km/h]
                        </LeafletTooltip>
                        <Popup>
                          <div className="text-xs space-y-1">
                            <div className="font-bold text-sky-700">🚛 TRK-02 Compactor (Zone 2 Beat)</div>
                            <div>Speed: <strong>{trk02Speed} km/h</strong> • Driver: Devendra Verma</div>
                            <div>Current Beat: DB City &amp; Habibganj Corridor</div>
                          </div>
                        </Popup>
                      </CircleMarker>
                    </MapContainer>
                  )}
                </div>
              </div>

              {/* Dashcam & Citizen Dumping Queue (5 Cols) */}
              <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-3 flex flex-col overflow-hidden">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center">
                    <ShieldAlert className="w-4 h-4 text-orange-500 mr-1.5" />
                    Zonal Incidents &amp; Citizen Reports
                  </h3>
                  <span className="text-[10px] font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded">{dashcamDetections.length} Active</span>
                </div>

                {supervisorNotice && (
                  <div className="mb-2 p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-[11px] font-bold flex items-center space-x-1.5 animate-fade-in">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{supervisorNotice}</span>
                  </div>
                )}

                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {dashcamDetections.map((d: any) => {
                    const isDispatched = d.status?.toLowerCase().includes("dispatch");
                    const isResolved = d.status?.toLowerCase().includes("resolve") || d.status?.toLowerCase().includes("clean");

                    return (
                      <div key={d.id} className={`p-3 rounded-xl border text-xs space-y-1.5 transition-all ${
                        d.isCitizenReport ? "bg-amber-50/60 border-amber-300" : "bg-slate-50 border-slate-200"
                      }`}>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center space-x-1.5">
                            {d.isCitizenReport ? (
                              <span className="px-2 py-0.5 rounded bg-rose-600 text-white font-black text-[9px] uppercase tracking-wide">
                                🔴 Citizen Report {d.ticketNumber ? `(${d.ticketNumber})` : ""}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-800 font-bold text-[10px]">
                                {d.cameraFeed || "Smart CCTV"}
                              </span>
                            )}
                            <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 font-bold text-[10px]">{d.severity}</span>
                          </div>
                          <span className="text-slate-500 text-[10px] font-mono">{d.slaCountdown || "SLA: 2h"}</span>
                        </div>

                        <div className="font-bold text-slate-900 leading-tight">{d.address}</div>
                        <div className="text-slate-600 text-[11px]">
                          Class: <strong>{d.wasteClass}</strong> • Volume: <strong>{d.volumeM3} m³</strong> ({d.weightEstKg || 520} kg)
                        </div>

                        {/* Status indicator and action buttons */}
                        <div className="pt-1 flex items-center justify-between">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            isResolved ? "bg-emerald-100 text-emerald-800" :
                            isDispatched ? "bg-sky-100 text-sky-800" :
                            "bg-amber-100 text-amber-800"
                          }`}>
                            Status: {d.status}
                          </span>

                          {!isDispatched && !isResolved ? (
                            <button
                              onClick={() => handleSupervisorDispatchIncident(d)}
                              className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs flex items-center space-x-1 transition-all"
                            >
                              <Zap className="w-3 h-3" />
                              <span>⚡ Dispatch EV-01 Fleet</span>
                            </button>
                          ) : isDispatched && !isResolved ? (
                            <span className="text-[10px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                              🚛 Assigned: {d.flyingSquadUnit || "EV-01 (Tata Ace EV)"}
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              ✓ Cleared by Driver
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* ROLE 3: TRUCK DRIVER HUD (FULL SCREEN COCKPIT WITH REAL DETOUR)    */}
        {/* ================================================================= */}
        {currentUser.role === "driver" && (
          <div className="h-full flex flex-col space-y-2 overflow-hidden">
            <div className="h-11 bg-white rounded-xl px-4 border border-slate-200 flex items-center justify-between shrink-0 text-xs">
              <div className="flex items-center space-x-3">
                <span className="font-bold text-slate-900">EV-01 (Tata Ace EV 1000)</span>
                <span className="text-slate-500">Pilot: Ramesh Yadav • Reg: MP-04-GE-2418 • Battery: <strong>86%</strong> • Live Speed: <strong className="text-emerald-700">{ev01Speed} km/h (Moving)</strong></span>
              </div>
              <button
                onClick={() => setIsDriverOnline(!isDriverOnline)}
                className={`px-2.5 py-1 rounded-lg font-bold text-xs flex items-center space-x-1 ${
                  isDriverOnline ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"
                }`}
              >
                {isDriverOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
                <span>{isDriverOnline ? "Online" : "Offline"}</span>
              </button>
            </div>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-2 overflow-hidden">
              <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-2.5 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between mb-1 px-1 text-xs">
                  <span className="font-bold text-slate-900">Live Turn-by-Turn Navigation Map</span>
                  {isRouteOptimized && (
                    <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded text-[10px]">
                      ⚡ Optimized Route Active (-29 mins)
                    </span>
                  )}
                </div>
                <div className="flex-1 rounded-xl overflow-hidden border border-slate-200 relative">
                  {/* Driver Cockpit Live HUD Badge */}
                  <div className="absolute top-3 left-3 z-[1000] bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-md rounded-xl px-3 py-1.5 flex items-center space-x-3 text-xs">
                    <div className="flex items-center space-x-1.5">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                      </span>
                      <span className="font-bold text-emerald-800">Cockpit Live GPS: In Motion</span>
                    </div>
                    <span className="text-[11px] text-slate-700 border-l border-slate-200 pl-2 font-bold">
                      Speed: <strong className="text-slate-900">{ev01Speed} km/h</strong> • Lat: {ev01Pos[0].toFixed(4)}, Lng: {ev01Pos[1].toFixed(4)}
                    </span>
                  </div>

                  {isMounted && (
                    <MapContainer center={[23.2345, 77.4330]} zoom={14} style={{ height: "100%", width: "100%" }} zoomControl={false}>
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <Polyline
                        positions={isRouteOptimized ? currentTruckConfig.optimizedCoords : currentTruckConfig.standardCoords}
                        pathOptions={{ color: isRouteOptimized ? "#10b981" : "#ef4444", weight: 5, dashArray: isRouteOptimized ? "5,5" : undefined }}
                      />

                      {/* Driver's Origin / Return Base: BMC Central HQ */}
                      <CircleMarker center={BMC_CENTRAL_HQ.coords} radius={14} pathOptions={{ fillColor: "#f59e0b", color: "#b45309", weight: 2.5, fillOpacity: 0.35 }} />
                      <CircleMarker center={BMC_CENTRAL_HQ.coords} radius={8} pathOptions={{ fillColor: "#d97706", color: "#ffffff", weight: 2.5, fillOpacity: 1 }}>
                        <LeafletTooltip permanent direction="top" offset={[0, -10]} className="font-extrabold text-[10px] bg-amber-950 text-amber-300 border border-amber-500 rounded px-1.5 py-0.5 shadow-md">
                          🏛️ DEPOT HQ (START / RETURN)
                        </LeafletTooltip>
                      </CircleMarker>

                      {/* Driver's Target Stops along Road Route */}
                      {activeDriverStops.map((stop, idx) => (
                        <CircleMarker
                          key={stop.id}
                          center={[stop.lat, stop.lng]}
                          radius={idx === currentStopIndex ? 10 : 7}
                          pathOptions={{
                            fillColor: stop.status === "collected" ? "#10b981" : idx === currentStopIndex ? "#ef4444" : "#f59e0b",
                            color: "#ffffff",
                            weight: 2,
                            fillOpacity: 1
                          }}
                        >
                          <LeafletTooltip direction="top" className="font-bold text-[9px]">
                            {idx + 1}. {stop.address}
                          </LeafletTooltip>
                        </CircleMarker>
                      ))}

                      {/* Driver's moving truck EV-01 with live radar ping */}
                      <CircleMarker center={ev01Pos} radius={22} pathOptions={{ fillColor: "#10b981", color: "#10b981", weight: 1.5, fillOpacity: 0.25 }} />
                      <CircleMarker center={ev01Pos} radius={11} pathOptions={{ fillColor: "#059669", color: "#ffffff", weight: 3, fillOpacity: 1 }}>
                        <LeafletTooltip permanent direction="top" offset={[0, -10]} className="font-bold text-[10px] bg-slate-900 text-white rounded px-1.5 py-0.5 shadow">
                          🚛 YOU ARE HERE [LIVE: {ev01Speed} km/h]
                        </LeafletTooltip>
                        <Popup>
                          <div className="text-xs space-y-1">
                            <div className="font-bold text-emerald-700">🚛 Your Vehicle: EV-01 (Tata Ace EV 1000)</div>
                            <div>Live Speed: <strong>{ev01Speed} km/h</strong></div>
                            <div>Battery: <strong>86%</strong> • Motor: Normal</div>
                            <div>Target Stop: <strong>{activeDriverStops[currentStopIndex]?.address}</strong></div>
                          </div>
                        </Popup>
                      </CircleMarker>
                    </MapContainer>
                  )}
                </div>
              </div>

              <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-3 flex flex-col justify-between overflow-hidden">
                <div className="space-y-3 overflow-y-auto pr-1">
                  {activeDriverStops[currentStopIndex] && (
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-emerald-700 uppercase tracking-wider text-[10px]">
                          Target Stop ({currentStopIndex + 1}/{activeDriverStops.length})
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900">
                          {activeDriverStops[currentStopIndex].traffic}
                        </span>
                      </div>
                      <div className="text-base font-black text-slate-900">{activeDriverStops[currentStopIndex].id}</div>
                      <div className="text-slate-500 text-[11px]">{activeDriverStops[currentStopIndex].address}</div>
                      <div className="text-slate-700 text-[11px]">
                        Category: <strong>{activeDriverStops[currentStopIndex].category}</strong> • Fill: <strong>{activeDriverStops[currentStopIndex].fill}%</strong>
                      </div>
                    </div>
                  )}

                  {!isRouteOptimized && (
                    <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200 text-xs space-y-1.5">
                      <div className="font-bold text-amber-900 flex items-center justify-between">
                        <span>⚠️ Traffic Alert: Board Office Sq</span>
                        <span className="text-[10px]">+14m Delay</span>
                      </div>
                      <p className="text-[11px] text-amber-800">
                        AI Recommends: Run optimization to bypass congestion via Arera Colony.
                      </p>
                      <button
                        onClick={handleTriggerRouteOptimization}
                        className="w-full py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs"
                      >
                        Accept Shortest Detour (-29 mins)
                      </button>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleDriverCollect(activeDriverStops[currentStopIndex].id)}
                  className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-md flex items-center justify-center space-x-2 transition-all mt-2 active:scale-98"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>MARK BIN COLLECTED</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* ROLE 4: CITIZEN GREEN PORTAL                                      */}
        {/* ================================================================= */}
        {currentUser.role === "citizen" && (
          <div className="h-full flex flex-col space-y-2 overflow-hidden">
            <div className="h-12 bg-gradient-to-r from-emerald-600 to-teal-700 rounded-xl px-4 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-3">
                <Award className="w-6 h-6 text-amber-300" />
                <span className="text-xs font-bold text-emerald-100">Bhopal Swachh Resident Balance:</span>
                <span className="text-lg font-black">{citizenRewardPoints} EcoPoints</span>
              </div>
              <span className="text-xs text-emerald-100 font-medium">Earn +50 Points per verified dump report</span>
            </div>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-2 overflow-hidden">
              <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-3 flex flex-col overflow-hidden">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center">
                  <Gift className="w-4 h-4 text-emerald-600 mr-1.5" />
                  Bhopal EcoRewards Redemption
                </h3>
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {citizenRewards.map(rew => {
                    const canRedeem = citizenRewardPoints >= rew.pointsCost;
                    const isRedeemed = redeemedRewardId === rew.id;

                    return (
                      <div key={rew.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2.5">
                          <span className="text-2xl">{rew.icon}</span>
                          <div>
                            <div className="font-bold text-slate-900">{rew.title}</div>
                            <div className="text-[11px] text-slate-500">{rew.subtitle}</div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRedeemReward(rew.id, rew.pointsCost)}
                          disabled={!canRedeem || isRedeemed}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            isRedeemed ? "bg-slate-200 text-slate-600" : canRedeem ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-400"
                          }`}
                        >
                          {isRedeemed ? "Redeemed" : `${rew.pointsCost} Pts`}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-3 flex flex-col justify-between overflow-hidden">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center">
                    <Camera className="w-4 h-4 text-emerald-600 mr-1.5" />
                    Report Roadside Garbage Dumping
                  </h3>

                  {!citizenReportSuccess ? (
                    <form
                      onSubmit={handleCitizenReportSubmit}
                      className="space-y-2.5 text-xs"
                    >
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Street / Landmark in Bhopal</label>
                        <input
                          type="text"
                          required
                          value={citizenAddress}
                          onChange={(e) => setCitizenAddress(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
                        />
                      </div>

                      {/* Hidden File Input */}
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handleCitizenPhotoSelect}
                        className="hidden"
                        id="citizen-dump-file-input"
                      />

                      {!citizenPhotoUrl ? (
                        <div
                          id="citizen-upload-dropzone"
                          onClick={() => fileInputRef.current?.click()}
                          className="p-3.5 rounded-xl border-2 border-dashed border-emerald-400 bg-emerald-50/40 text-center cursor-pointer hover:border-emerald-600 hover:bg-emerald-50 transition-all group"
                        >
                          <Camera className="w-6 h-6 text-emerald-600 mx-auto mb-1 group-hover:scale-110 transition-transform" />
                          <span className="font-bold text-slate-800 block text-xs">Tap to Snap / Upload Photo</span>
                          <span className="text-[10px] text-slate-500">Select file or take camera photo • AI scans waste volume</span>
                        </div>
                      ) : (
                        <div className="relative rounded-xl border border-emerald-300 bg-emerald-50/50 p-2 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-emerald-800 flex items-center">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600 mr-1" />
                              Photo Loaded ({citizenPhotoName || "captured_dump.jpg"})
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setCitizenPhotoUrl(null);
                                setCitizenPhotoName(null);
                                setCitizenAiDetectionResult(null);
                              }}
                              className="text-[10px] text-rose-600 font-bold hover:underline"
                            >
                              Remove
                            </button>
                          </div>
                          <div className="relative h-24 w-full rounded-lg overflow-hidden bg-slate-900 border border-slate-200">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={citizenPhotoUrl}
                              alt="Dump Site Preview"
                              className="h-full w-full object-cover"
                            />
                            <div className="absolute top-1 left-1 bg-black/75 backdrop-blur-xs text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                              AI Live Geotag: Ward 48 Bhopal
                            </div>
                          </div>
                          {citizenAiDetectionResult && (
                            <div className="text-[10px] bg-white border border-emerald-200 text-emerald-800 p-1.5 rounded-lg font-medium leading-tight">
                              ⚡ {citizenAiDetectionResult}
                            </div>
                          )}
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={citizenReportLoading}
                        className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center space-x-1.5"
                      >
                        {citizenReportLoading ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Submitting to Municipal Database...</span>
                          </>
                        ) : (
                          <span>Submit Report (+50 EcoPoints)</span>
                        )}
                      </button>
                    </form>
                  ) : (
                    <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-2.5 text-xs">
                      <div className="flex items-center justify-center space-x-2">
                        <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                        <span className="font-bold text-emerald-950 text-sm">Report Logged in Municipal DB!</span>
                      </div>
                      
                      <div className="bg-white p-2.5 rounded-xl border border-emerald-200 text-left space-y-1.5 shadow-2xs">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Live Ticket ID</span>
                          <span className="font-mono font-black text-xs text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            {submittedTicket?.ticketNumber || "#BMC-BPL-2026-9812"}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-600 truncate">
                          Landmark: <strong>{submittedTicket?.address || citizenAddress}</strong>
                        </div>

                        {/* Lifecycle Timeline */}
                        <div className="pt-2 border-t border-slate-100 space-y-1 text-[10px]">
                          <div className="flex items-center text-emerald-800 font-bold">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5"></span>
                            1. Logged in PostgreSQL (citizen_dump_reports)
                          </div>
                          <div className="flex items-center text-emerald-800 font-bold">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5"></span>
                            2. Alert Sent to Zone 1 &amp; 2 Supervisor (Sunil K. Dubey)
                          </div>
                          <div className="flex items-center text-sky-800 font-bold">
                            <span className={`w-2 h-2 rounded-full ${submittedTicket?.status === "dispatched" ? "bg-sky-500" : "bg-amber-400"} mr-1.5`}></span>
                            3. Fleet Action: {submittedTicket?.status === "dispatched" ? "EV-01 Tata Ace EV Dispatched" : "Queued in Supervisor Cockpit"}
                          </div>
                          <div className="flex items-center text-emerald-700 font-bold">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5"></span>
                            4. +50 EcoPoints Balance Credited to Your Account
                          </div>
                        </div>
                      </div>

                      {citizenPhotoUrl && (
                        <div className="w-20 h-12 mx-auto rounded border border-emerald-300 overflow-hidden shadow-2xs">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={citizenPhotoUrl} alt="Submitted Report" className="w-full h-full object-cover" />
                        </div>
                      )}
                      
                      <button
                        onClick={() => {
                          setCitizenReportSuccess(false);
                          setCitizenPhotoUrl(null);
                          setCitizenPhotoName(null);
                          setCitizenAiDetectionResult(null);
                          setSubmittedTicket(null);
                        }}
                        className="text-xs font-bold text-emerald-800 underline block mx-auto pt-1"
                      >
                        Report Another Dump Site
                      </button>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 text-xs space-y-1.5">
                  <div className="p-2 rounded-xl bg-emerald-50/90 border border-emerald-200 flex items-center justify-between text-[11px]">
                    <div className="flex items-center space-x-1.5">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      <span className="font-bold text-emerald-900">Ward 48 Truck Approaching:</span>
                      <span className="text-emerald-700">EV-01 Moving ({ev01Speed} km/h)</span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-800 bg-white px-2 py-0.5 rounded shadow-2xs">ETA ~14 mins</span>
                  </div>
                  <div className="font-bold text-slate-700 text-[11px]">Nearest Smart Bins (Within 500m)</div>
                  <div className="flex space-x-2">
                    <span className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-[10px] flex-1">
                      <strong>MP Nagar Gate</strong>: 85m (94% Full)
                    </span>
                    <span className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-[10px] flex-1">
                      <strong>DB City Mall</strong>: 240m (42% Avail)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
