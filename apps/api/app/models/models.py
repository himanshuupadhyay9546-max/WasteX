import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.dialects.postgresql import UUID, JSONB
from geoalchemy2 import Geometry
from app.core.database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    phone_number = Column(String(50))
    role = Column(String(50), default="citizen", index=True)
    is_active = Column(Boolean, default=True)
    assigned_zone_id = Column(UUID(as_uuid=True), nullable=True)
    avatar_url = Column(Text, nullable=True)
    fcm_token = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

class Zone(Base):
    __tablename__ = "zones"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), unique=True, nullable=False)
    code = Column(String(20), unique=True, nullable=False)
    area_type = Column(String(50), default="commercial")
    population_density = Column(Float, default=8500.0)
    boundary = Column(Geometry(geometry_type="POLYGON", srid=4326), nullable=True)
    center_point = Column(Geometry(geometry_type="POINT", srid=4326), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class Facility(Base):
    __tablename__ = "facilities"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    facility_type = Column(String(50), nullable=False) # depot, landfill, recycling_plant
    location = Column(Geometry(geometry_type="POINT", srid=4326), nullable=False)
    address = Column(Text)
    capacity_tons = Column(Float, default=500.0)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class SmartBin(Base):
    __tablename__ = "smart_bins"
    id = Column(String(50), primary_key=True)
    zone_id = Column(UUID(as_uuid=True), ForeignKey("zones.id", ondelete="SET NULL"), nullable=True)
    location = Column(Geometry(geometry_type="POINT", srid=4326), nullable=False)
    address = Column(Text)
    capacity_liters = Column(Float, default=1100.0)
    bin_type = Column(String(50), default="mixed")
    status = Column(String(50), default="active") # active, maintenance, overflowing, offline, damaged
    current_fill_level = Column(Float, default=0.0)
    current_weight_kg = Column(Float, default=0.0)
    current_temp_celsius = Column(Float, default=25.0)
    current_gas_level_ppm = Column(Float, default=15.0)
    battery_percentage = Column(Float, default=98.0)
    hardware_version = Column(String(50), default="WasteX-Sensor-v2.1")
    firmware_version = Column(String(50), default="1.4.2")
    last_telemetry_at = Column(DateTime(timezone=True), nullable=True)
    last_collected_at = Column(DateTime(timezone=True), nullable=True)
    historical_overflow_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

class BinTelemetry(Base):
    __tablename__ = "bin_telemetry"
    recorded_at = Column(DateTime(timezone=True), primary_key=True, default=lambda: datetime.now(timezone.utc))
    bin_id = Column(String(50), primary_key=True)
    fill_level = Column(Float, nullable=False)
    weight_kg = Column(Float, nullable=False)
    temperature_c = Column(Float, default=25.0)
    gas_methane_ppm = Column(Float, default=10.0)
    battery_pct = Column(Float, default=95.0)
    lid_open_events = Column(Integer, default=0)
    tilt_angle_deg = Column(Float, default=0.0)
    signal_strength_rssi = Column(Integer, default=-70)
    location = Column(Geometry(geometry_type="POINT", srid=4326), nullable=True)

class Truck(Base):
    __tablename__ = "trucks"
    id = Column(String(50), primary_key=True)
    plate_number = Column(String(50), unique=True, nullable=False)
    model = Column(String(100), default="Volvo FE Electric")
    capacity_kg = Column(Float, default=8000.0)
    capacity_volume_m3 = Column(Float, default=16.0)
    fuel_type = Column(String(50), default="Electric")
    fuel_efficiency_km_per_unit = Column(Float, default=1.8)
    co2_emission_factor_g_km = Column(Float, default=0.0)
    current_driver_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    current_location = Column(Geometry(geometry_type="POINT", srid=4326), nullable=True)
    current_speed_kmh = Column(Float, default=0.0)
    current_heading_deg = Column(Float, default=0.0)
    current_load_kg = Column(Float, default=0.0)
    is_active = Column(Boolean, default=True)
    battery_or_fuel_pct = Column(Float, default=100.0)
    assigned_zone_id = Column(UUID(as_uuid=True), ForeignKey("zones.id", ondelete="SET NULL"), nullable=True)
    home_depot_id = Column(UUID(as_uuid=True), ForeignKey("facilities.id", ondelete="SET NULL"), nullable=True)
    last_ping_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class WastePrediction(Base):
    __tablename__ = "waste_predictions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    bin_id = Column(String(50), ForeignKey("smart_bins.id", ondelete="CASCADE"), nullable=False)
    predicted_for_time = Column(DateTime(timezone=True), nullable=False)
    predicted_fill_pct = Column(Float, nullable=False)
    confidence_lower_pct = Column(Float, nullable=False)
    confidence_upper_pct = Column(Float, nullable=False)
    overflow_risk_level = Column(String(20), default="medium")
    model_version = Column(String(50), default="ensemble_v1.2")
    mape_score = Column(Float, nullable=True)
    features_snapshot = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class Route(Base):
    __tablename__ = "routes"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    route_name = Column(String(255), nullable=False)
    truck_id = Column(String(50), ForeignKey("trucks.id", ondelete="RESTRICT"), nullable=False)
    driver_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    zone_id = Column(UUID(as_uuid=True), ForeignKey("zones.id", ondelete="SET NULL"), nullable=True)
    status = Column(String(50), default="planned")
    total_stops = Column(Integer, default=0)
    completed_stops = Column(Integer, default=0)
    total_distance_km = Column(Float, default=0.0)
    estimated_duration_minutes = Column(Float, default=0.0)
    actual_duration_minutes = Column(Float, nullable=True)
    estimated_fuel_units = Column(Float, default=0.0)
    estimated_co2_kg = Column(Float, default=0.0)
    congestion_penalty_applied = Column(Float, default=1.0)
    route_geometry = Column(Geometry(geometry_type="LINESTRING", srid=4326), nullable=True)
    turn_by_turn_json = Column(JSONB, nullable=True)
    alternate_options = Column(JSONB, nullable=True)
    start_time = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    end_time = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

class RouteStop(Base):
    __tablename__ = "route_stops"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    route_id = Column(UUID(as_uuid=True), ForeignKey("routes.id", ondelete="CASCADE"), nullable=False)
    sequence_order = Column(Integer, nullable=False)
    stop_type = Column(String(50), default="bin")
    bin_id = Column(String(50), ForeignKey("smart_bins.id", ondelete="SET NULL"), nullable=True)
    facility_id = Column(UUID(as_uuid=True), ForeignKey("facilities.id", ondelete="SET NULL"), nullable=True)
    location = Column(Geometry(geometry_type="POINT", srid=4326), nullable=False)
    status = Column(String(50), default="pending")
    planned_eta = Column(DateTime(timezone=True), nullable=True)
    actual_arrival = Column(DateTime(timezone=True), nullable=True)
    collected_weight_kg = Column(Float, nullable=True)
    collected_fill_level = Column(Float, nullable=True)
    driver_notes = Column(Text, nullable=True)
    driver_photo_url = Column(Text, nullable=True)
    deviation_minutes = Column(Float, default=0.0)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

class WasteClassification(Base):
    __tablename__ = "waste_classifications"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_type = Column(String(50), nullable=False)
    bin_id = Column(String(50), ForeignKey("smart_bins.id", ondelete="SET NULL"), nullable=True)
    driver_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    image_url = Column(Text, nullable=False)
    primary_category = Column(String(50), nullable=False)
    confidence_score = Column(Float, nullable=False)
    detected_boxes = Column(JSONB, nullable=True)
    estimated_volume_liters = Column(Float, nullable=True)
    recyclability_score = Column(Float, nullable=True)
    hazard_flag = Column(Boolean, default=False)
    pii_redacted = Column(Boolean, default=True)
    inference_latency_ms = Column(Integer, default=18)
    confirmed_by_user = Column(Boolean, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class IllegalDumpingReport(Base):
    __tablename__ = "illegal_dumping_reports"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    detection_source = Column(String(50), nullable=False)
    location = Column(Geometry(geometry_type="POINT", srid=4326), nullable=False)
    address = Column(Text, nullable=True)
    image_url = Column(Text, nullable=False)
    severity = Column(String(20), default="medium")
    status = Column(String(20), default="reported")
    estimated_waste_kg = Column(Float, default=150.0)
    detected_materials = Column(JSONB, nullable=True)
    reporter_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    assigned_inspector_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    resolution_notes = Column(Text, nullable=True)
    resolution_photo_url = Column(Text, nullable=True)
    sla_due_at = Column(DateTime(timezone=True), nullable=False)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    dedup_hash = Column(String(64), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

class TrafficCongestionCache(Base):
    __tablename__ = "traffic_congestion_cache"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    road_segment_id = Column(String(100), nullable=False)
    zone_id = Column(UUID(as_uuid=True), ForeignKey("zones.id", ondelete="CASCADE"), nullable=True)
    segment_geometry = Column(Geometry(geometry_type="LINESTRING", srid=4326), nullable=False)
    current_speed_kmh = Column(Float, nullable=False)
    free_flow_speed_kmh = Column(Float, nullable=False)
    congestion_index = Column(Float, nullable=False) # 0.0 (free) to 1.0 (gridlock)
    traffic_level = Column(String(20), nullable=False) # free, moderate, heavy, gridlock
    recorded_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
