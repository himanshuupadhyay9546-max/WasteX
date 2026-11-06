from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from uuid import UUID

# --- Auth Schemas ---
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone_number: Optional[str] = None
    role: str = "citizen"
    assigned_zone_id: Optional[UUID] = None

class UserOut(BaseModel):
    id: UUID
    email: EmailStr
    full_name: str
    phone_number: Optional[str] = None
    role: str
    is_active: bool
    assigned_zone_id: Optional[UUID] = None
    avatar_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# --- Bin & Telemetry Schemas ---
class SmartBinBase(BaseModel):
    id: str
    zone_id: Optional[UUID] = None
    address: Optional[str] = None
    capacity_liters: float = 1100.0
    bin_type: str = "mixed"
    status: str = "active"
    current_fill_level: float = 0.0
    current_weight_kg: float = 0.0
    current_temp_celsius: float = 25.0
    current_gas_level_ppm: float = 15.0
    battery_percentage: float = 98.0
    lat: float
    lng: float

class SmartBinOut(SmartBinBase):
    last_telemetry_at: Optional[datetime] = None
    last_collected_at: Optional[datetime] = None
    historical_overflow_count: int = 0
    created_at: datetime

    class Config:
        from_attributes = True

class TelemetryIngest(BaseModel):
    bin_id: str
    fill_level: float = Field(..., ge=0.0, le=100.0)
    weight_kg: float = Field(..., ge=0.0)
    temp_celsius: Optional[float] = 25.0
    gas_methane_ppm: Optional[float] = 10.0
    battery_pct: Optional[float] = 95.0
    lat: Optional[float] = None
    lng: Optional[float] = None
    timestamp: Optional[datetime] = None

class TelemetryBatchIngest(BaseModel):
    readings: List[TelemetryIngest]

# --- Route & Stops Schemas ---
class RouteOptimizeRequest(BaseModel):
    zone_id: Optional[UUID] = None
    truck_ids: Optional[List[str]] = None
    fill_threshold_pct: float = 70.0
    include_traffic_congestion: bool = True
    optimization_strategy: str = "fastest" # "fastest" or "fuel_optimal"

class RouteStopOut(BaseModel):
    id: UUID
    sequence_order: int
    stop_type: str
    bin_id: Optional[str] = None
    facility_id: Optional[UUID] = None
    address: Optional[str] = None
    lat: float
    lng: float
    status: str
    planned_eta: Optional[datetime] = None
    actual_arrival: Optional[datetime] = None
    collected_weight_kg: Optional[float] = None
    collected_fill_level: Optional[float] = None
    deviation_minutes: float = 0.0

class RouteOut(BaseModel):
    id: UUID
    route_name: str
    truck_id: str
    driver_id: Optional[UUID] = None
    zone_id: Optional[UUID] = None
    status: str
    total_stops: int
    completed_stops: int
    total_distance_km: float
    estimated_duration_minutes: float
    estimated_fuel_units: float
    estimated_co2_kg: float
    congestion_penalty_applied: float
    stops: List[RouteStopOut] = []
    alternate_options: Optional[Dict[str, Any]] = None
    start_time: datetime

    class Config:
        from_attributes = True

class StopActionUpdate(BaseModel):
    status: str # "collected", "blocked", "skipped"
    collected_weight_kg: Optional[float] = None
    collected_fill_level: Optional[float] = None
    driver_notes: Optional[str] = None
    driver_photo_url: Optional[str] = None

# --- CV Schemas ---
class CVInferenceResponse(BaseModel):
    primary_category: str
    confidence_score: float
    detected_boxes: List[Dict[str, Any]] = []
    estimated_volume_liters: float
    recyclability_score: float
    hazard_flag: bool
    pii_redacted: bool
    inference_latency_ms: int

class CVActiveFeedback(BaseModel):
    classification_id: UUID
    confirmed_category: str
    is_accurate: bool
    driver_notes: Optional[str] = None

# --- Illegal Dumping Schemas ---
class DumpingReportCreate(BaseModel):
    detection_source: str = "citizen_app" # "dashcam_cctv", "citizen_app", "field_inspector"
    lat: float
    lng: float
    address: Optional[str] = None
    image_url: str
    estimated_waste_kg: Optional[float] = 100.0
    detected_materials: Optional[List[str]] = None

class DumpingReportOut(BaseModel):
    id: UUID
    detection_source: str
    lat: float
    lng: float
    address: Optional[str] = None
    image_url: str
    severity: str
    status: str
    estimated_waste_kg: float
    detected_materials: Optional[List[str]] = None
    sla_due_at: datetime
    resolved_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

# --- Prediction Schemas ---
class WastePredictionOut(BaseModel):
    id: UUID
    bin_id: str
    predicted_for_time: datetime
    predicted_fill_pct: float
    confidence_lower_pct: float
    confidence_upper_pct: float
    overflow_risk_level: str
    model_version: str
    mape_score: Optional[float] = None

# --- Fleet Schemas ---
class TruckLocationUpdate(BaseModel):
    truck_id: str
    lat: float
    lng: float
    speed_kmh: float = 0.0
    heading_deg: float = 0.0
    current_load_kg: Optional[float] = None
    battery_or_fuel_pct: Optional[float] = None

class TruckOut(BaseModel):
    id: str
    plate_number: str
    model: str
    capacity_kg: float
    capacity_volume_m3: float
    fuel_type: str
    current_driver_id: Optional[UUID] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    current_speed_kmh: float
    current_load_kg: float
    battery_or_fuel_pct: float
    is_active: bool
    last_ping_at: datetime

    class Config:
        from_attributes = True

# --- Analytics Schemas ---
class OverviewAnalytics(BaseModel):
    total_bins: int
    overflowing_bins_count: int
    active_trucks_count: int
    open_dumping_alerts: int
    today_waste_collected_tons: float
    co2_saved_kg: float
    fuel_saved_liters: float
    fleet_efficiency_pct: float
    avg_bin_fill_pct: float
    category_breakdown: Dict[str, float]
    recent_trend: List[Dict[str, Any]]
