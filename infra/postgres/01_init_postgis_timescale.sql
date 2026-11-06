-- ============================================================================
-- EcoRoute AI - Database Schema (PostgreSQL 16 + PostGIS + TimescaleDB)
-- Production Grade Schema with Spatial Indexing and Time-Series Optimization
-- ============================================================================

-- Enable PostGIS & TimescaleDB extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Ensure TimescaleDB is loaded if available (gracefully fallback in plain postgres testing)
DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'TimescaleDB extension not available or restricted, continuing with standard PostgreSQL partitioning...';
END $$;

-- ----------------------------------------------------------------------------
-- ENUM TYPES
-- ----------------------------------------------------------------------------
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'driver', 'inspector', 'citizen');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE bin_status AS ENUM ('active', 'maintenance', 'overflowing', 'offline', 'damaged');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE waste_category AS ENUM (
        'plastic', 'paper', 'glass', 'metal', 
        'organic', 'e_waste', 'construction_debris', 
        'hazardous', 'mixed'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE route_status AS ENUM ('planned', 'in_progress', 'completed', 'cancelled', 'rerouted');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE stop_status AS ENUM ('pending', 'arrived', 'collected', 'blocked', 'skipped');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE dumping_severity AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE dumping_status AS ENUM ('reported', 'verified', 'assigned', 'cleaning', 'resolved', 'false_alarm');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ----------------------------------------------------------------------------
-- 1. USERS & RBAC
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(50),
    role user_role NOT NULL DEFAULT 'citizen',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    assigned_zone_id UUID,
    avatar_url TEXT,
    fcm_token TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ----------------------------------------------------------------------------
-- 2. ZONES & INFRASTRUCTURE (Depots, Landfills)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS zones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(20) NOT NULL UNIQUE,
    area_type VARCHAR(50) DEFAULT 'commercial', -- residential, commercial, industrial, market
    population_density FLOAT DEFAULT 8500.0,    -- per km2
    boundary GEOMETRY(Polygon, 4326),
    center_point GEOMETRY(Point, 4326) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_zones_boundary ON zones USING GIST (boundary);
CREATE INDEX IF NOT EXISTS idx_zones_center ON zones USING GIST (center_point);

CREATE TABLE IF NOT EXISTS facilities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    facility_type VARCHAR(50) NOT NULL, -- depot, landfill, recycling_plant, transfer_station
    location GEOMETRY(Point, 4326) NOT NULL,
    address TEXT,
    capacity_tons FLOAT DEFAULT 500.0,
    operating_hours_start TIME DEFAULT '05:00:00',
    operating_hours_end TIME DEFAULT '23:00:00',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_facilities_location ON facilities USING GIST (location);

-- ----------------------------------------------------------------------------
-- 3. SMART WASTE BINS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS smart_bins (
    id VARCHAR(50) PRIMARY KEY, -- e.g. BIN-BLR-001
    zone_id UUID REFERENCES zones(id) ON DELETE SET NULL,
    location GEOMETRY(Point, 4326) NOT NULL,
    address TEXT,
    capacity_liters FLOAT NOT NULL DEFAULT 1100.0,
    bin_type waste_category NOT NULL DEFAULT 'mixed',
    status bin_status NOT NULL DEFAULT 'active',
    current_fill_level FLOAT NOT NULL DEFAULT 0.0, -- percentage 0.0 - 100.0
    current_weight_kg FLOAT NOT NULL DEFAULT 0.0,
    current_temp_celsius FLOAT DEFAULT 25.0,
    current_gas_level_ppm FLOAT DEFAULT 15.0,
    battery_percentage FLOAT DEFAULT 98.0,
    hardware_version VARCHAR(50) DEFAULT 'WasteX-Sensor-v2.1',
    firmware_version VARCHAR(50) DEFAULT '1.4.2',
    last_telemetry_at TIMESTAMPTZ,
    last_collected_at TIMESTAMPTZ,
    historical_overflow_count INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_smart_bins_location ON smart_bins USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_smart_bins_status ON smart_bins(status);
CREATE INDEX IF NOT EXISTS idx_smart_bins_zone ON smart_bins(zone_id);
CREATE INDEX IF NOT EXISTS idx_smart_bins_fill ON smart_bins(current_fill_level DESC);

-- ----------------------------------------------------------------------------
-- 4. IOT BIN TELEMETRY (TimescaleDB Hypertable)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bin_telemetry (
    recorded_at TIMESTAMPTZ NOT NULL,
    bin_id VARCHAR(50) NOT NULL,
    fill_level FLOAT NOT NULL,       -- percentage 0.0 - 100.0
    weight_kg FLOAT NOT NULL,
    temperature_c FLOAT,
    gas_methane_ppm FLOAT,
    battery_pct FLOAT,
    lid_open_events INT DEFAULT 0,
    tilt_angle_deg FLOAT DEFAULT 0.0,
    signal_strength_rssi INT DEFAULT -70,
    location GEOMETRY(Point, 4326),
    PRIMARY KEY (recorded_at, bin_id)
);

-- Convert to Hypertable partitioned by time (7-day chunks)
DO $$
BEGIN
    PERFORM create_hypertable('bin_telemetry', 'recorded_at', chunk_time_interval => INTERVAL '7 days', if_not_exists => TRUE);
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Skipping create_hypertable (standard table will be used)...';
END $$;

CREATE INDEX IF NOT EXISTS idx_bin_telemetry_bin_time ON bin_telemetry (bin_id, recorded_at DESC);

-- ----------------------------------------------------------------------------
-- 5. FLEET & TRUCKS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS trucks (
    id VARCHAR(50) PRIMARY KEY, -- e.g. TRUCK-01
    plate_number VARCHAR(50) NOT NULL UNIQUE,
    model VARCHAR(100) DEFAULT 'Volvo FE Electric / BharatBenz Eco',
    capacity_kg FLOAT NOT NULL DEFAULT 8000.0,
    capacity_volume_m3 FLOAT NOT NULL DEFAULT 16.0,
    fuel_type VARCHAR(50) NOT NULL DEFAULT 'Electric', -- Electric, CNG, Diesel
    fuel_efficiency_km_per_unit FLOAT DEFAULT 1.8, -- km/kWh or km/L
    co2_emission_factor_g_km FLOAT DEFAULT 0.0,    -- 0 for EV, 850 for diesel
    current_driver_id UUID REFERENCES users(id) ON DELETE SET NULL,
    current_location GEOMETRY(Point, 4326),
    current_speed_kmh FLOAT DEFAULT 0.0,
    current_heading_deg FLOAT DEFAULT 0.0,
    current_load_kg FLOAT DEFAULT 0.0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    battery_or_fuel_pct FLOAT DEFAULT 100.0,
    assigned_zone_id UUID REFERENCES zones(id) ON DELETE SET NULL,
    home_depot_id UUID REFERENCES facilities(id) ON DELETE SET NULL,
    last_ping_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_trucks_location ON trucks USING GIST (current_location);

-- ----------------------------------------------------------------------------
-- 6. ML WASTE FILL PREDICTIONS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS waste_predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bin_id VARCHAR(50) NOT NULL REFERENCES smart_bins(id) ON DELETE CASCADE,
    predicted_for_time TIMESTAMPTZ NOT NULL,
    predicted_fill_pct FLOAT NOT NULL,
    confidence_lower_pct FLOAT NOT NULL,
    confidence_upper_pct FLOAT NOT NULL,
    overflow_risk_level VARCHAR(20) NOT NULL DEFAULT 'medium', -- low, medium, high, critical
    model_version VARCHAR(50) NOT NULL DEFAULT 'ensemble_v1.2',
    mape_score FLOAT,
    features_snapshot JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_waste_pred_bin_time ON waste_predictions (bin_id, predicted_for_time DESC);
CREATE INDEX IF NOT EXISTS idx_waste_pred_overflow ON waste_predictions (overflow_risk_level, predicted_for_time);

-- ----------------------------------------------------------------------------
-- 7. CONGESTION-AWARE OPTIMIZED ROUTES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS routes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    route_name VARCHAR(255) NOT NULL,
    truck_id VARCHAR(50) NOT NULL REFERENCES trucks(id) ON DELETE RESTRICT,
    driver_id UUID REFERENCES users(id) ON DELETE SET NULL,
    zone_id UUID REFERENCES zones(id) ON DELETE SET NULL,
    status route_status NOT NULL DEFAULT 'planned',
    total_stops INT NOT NULL DEFAULT 0,
    completed_stops INT NOT NULL DEFAULT 0,
    total_distance_km FLOAT NOT NULL DEFAULT 0.0,
    estimated_duration_minutes FLOAT NOT NULL DEFAULT 0.0,
    actual_duration_minutes FLOAT,
    estimated_fuel_units FLOAT NOT NULL DEFAULT 0.0,
    estimated_co2_kg FLOAT NOT NULL DEFAULT 0.0,
    congestion_penalty_applied FLOAT DEFAULT 1.0,
    route_geometry GEOMETRY(LineString, 4326),
    turn_by_turn_json JSONB,
    alternate_options JSONB, -- stores Fastest vs Fuel-Optimal variants
    start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_time TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_routes_status ON routes(status);
CREATE INDEX IF NOT EXISTS idx_routes_truck ON routes(truck_id);
CREATE INDEX IF NOT EXISTS idx_routes_geom ON routes USING GIST (route_geometry);

CREATE TABLE IF NOT EXISTS route_stops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
    sequence_order INT NOT NULL,
    stop_type VARCHAR(50) NOT NULL DEFAULT 'bin', -- depot_start, bin, landfill_dump, depot_end
    bin_id VARCHAR(50) REFERENCES smart_bins(id) ON DELETE SET NULL,
    facility_id UUID REFERENCES facilities(id) ON DELETE SET NULL,
    location GEOMETRY(Point, 4326) NOT NULL,
    status stop_status NOT NULL DEFAULT 'pending',
    planned_eta TIMESTAMPTZ,
    actual_arrival TIMESTAMPTZ,
    collected_weight_kg FLOAT,
    collected_fill_level FLOAT,
    driver_notes TEXT,
    driver_photo_url TEXT,
    deviation_minutes FLOAT DEFAULT 0.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_route_stops_route_seq ON route_stops(route_id, sequence_order);

-- ----------------------------------------------------------------------------
-- 8. COMPUTER VISION: WASTE CLASSIFICATION
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS waste_classifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_type VARCHAR(50) NOT NULL, -- bin_camera, driver_mobile, citizen_upload, truck_cam
    bin_id VARCHAR(50) REFERENCES smart_bins(id) ON DELETE SET NULL,
    driver_id UUID REFERENCES users(id) ON DELETE SET NULL,
    image_url TEXT NOT NULL,
    primary_category waste_category NOT NULL,
    confidence_score FLOAT NOT NULL,
    detected_boxes JSONB, -- [{box: [x1,y1,x2,y2], label: 'plastic', conf: 0.94}]
    estimated_volume_liters FLOAT,
    recyclability_score FLOAT, -- 0.0 - 100.0
    hazard_flag BOOLEAN DEFAULT FALSE,
    pii_redacted BOOLEAN DEFAULT TRUE,
    inference_latency_ms INT DEFAULT 18,
    confirmed_by_user BOOLEAN,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_waste_class_created ON waste_classifications(created_at DESC);

-- ----------------------------------------------------------------------------
-- 9. ILLEGAL DUMPING DETECTION & TICKETING
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS illegal_dumping_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    detection_source VARCHAR(50) NOT NULL, -- dashcam_cctv, citizen_app, field_inspector, satellite_ndvi
    location GEOMETRY(Point, 4326) NOT NULL,
    address TEXT,
    image_url TEXT NOT NULL,
    severity dumping_severity NOT NULL DEFAULT 'medium',
    status dumping_status NOT NULL DEFAULT 'reported',
    estimated_waste_kg FLOAT DEFAULT 150.0,
    detected_materials JSONB,
    reporter_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_inspector_id UUID REFERENCES users(id) ON DELETE SET NULL,
    resolution_notes TEXT,
    resolution_photo_url TEXT,
    sla_due_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
    resolved_at TIMESTAMPTZ,
    dedup_hash VARCHAR(64), -- spatial-temporal hash to prevent double ticket in 50m / 24h
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dumping_location ON illegal_dumping_reports USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_dumping_status ON illegal_dumping_reports(status);
CREATE INDEX IF NOT EXISTS idx_dumping_severity ON illegal_dumping_reports(severity);

-- ----------------------------------------------------------------------------
-- 10. REAL-TIME TRAFFIC & CONGESTION LOGS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS traffic_congestion_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    road_segment_id VARCHAR(100) NOT NULL,
    zone_id UUID REFERENCES zones(id) ON DELETE CASCADE,
    segment_geometry GEOMETRY(LineString, 4326) NOT NULL,
    current_speed_kmh FLOAT NOT NULL,
    free_flow_speed_kmh FLOAT NOT NULL,
    congestion_index FLOAT NOT NULL, -- 0.0 (free) to 1.0 (gridlock)
    traffic_level VARCHAR(20) NOT NULL, -- free, moderate, heavy, gridlock
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_traffic_geom ON traffic_congestion_cache USING GIST (segment_geometry);
CREATE INDEX IF NOT EXISTS idx_traffic_recorded ON traffic_congestion_cache(recorded_at DESC);

-- ----------------------------------------------------------------------------
-- 11. AUDIT & METRICS LOG
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS system_metrics (
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metric_name VARCHAR(100) NOT NULL,
    metric_value FLOAT NOT NULL,
    tags JSONB
);
