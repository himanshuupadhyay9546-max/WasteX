-- ============================================================================
-- WasteX - Master PostgreSQL 16 + PostGIS Spatial Schema
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Ensure TimescaleDB is loaded if available
DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'TimescaleDB not available or restricted, continuing with PostgreSQL standard partition...';
END $$;

-- ----------------------------------------------------------------------------
-- 1. ROLES & USERS
-- ----------------------------------------------------------------------------
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM (
        'principal_admin',
        'municipal_admin',
        'zone_supervisor',
        'truck_driver',
        'citizen'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'citizen',
    phone_number VARCHAR(50),
    assigned_zone_id UUID,
    fcm_token TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ----------------------------------------------------------------------------
-- 2. ZONES & INFRASTRUCTURE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS zones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(20) NOT NULL UNIQUE,
    area_type VARCHAR(50) DEFAULT 'commercial',
    boundary GEOMETRY(Polygon, 4326),
    center_point GEOMETRY(Point, 4326) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_zones_geom ON zones USING GIST (center_point);

CREATE TABLE IF NOT EXISTS facilities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    facility_type VARCHAR(50) NOT NULL, -- depot, landfill, recycling_plant
    location GEOMETRY(Point, 4326) NOT NULL,
    address TEXT,
    capacity_tons FLOAT DEFAULT 500.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_facilities_geom ON facilities USING GIST (location);

-- ----------------------------------------------------------------------------
-- 3. SMART BINS & TELEMETRY
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bins (
    id VARCHAR(50) PRIMARY KEY,
    zone_id UUID REFERENCES zones(id) ON DELETE SET NULL,
    location GEOMETRY(Point, 4326) NOT NULL,
    address TEXT,
    capacity_liters FLOAT NOT NULL DEFAULT 1100.0,
    bin_type VARCHAR(50) NOT NULL DEFAULT 'mixed',
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, overflowing, maintenance, blocked
    current_fill_pct FLOAT NOT NULL DEFAULT 0.0,
    current_weight_kg FLOAT NOT NULL DEFAULT 0.0,
    current_temp_c FLOAT DEFAULT 25.0,
    current_methane_ppm FLOAT DEFAULT 10.0,
    battery_pct FLOAT DEFAULT 95.0,
    last_telemetry_at TIMESTAMPTZ,
    last_collected_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bins_location ON bins USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_bins_fill ON bins(current_fill_pct DESC);

CREATE TABLE IF NOT EXISTS bin_sensors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bin_id VARCHAR(50) REFERENCES bins(id) ON DELETE CASCADE,
    sensor_type VARCHAR(50) NOT NULL, -- ultrasonic_depth, weight_cell, nDIR_gas, tilt_switch
    hardware_version VARCHAR(50) DEFAULT 'v2.4',
    battery_health FLOAT DEFAULT 98.0,
    last_calibrated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS edge_gateways (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    zone_id UUID REFERENCES zones(id) ON DELETE SET NULL,
    mac_address VARCHAR(50) UNIQUE NOT NULL,
    ip_address VARCHAR(50),
    status VARCHAR(20) DEFAULT 'online',
    last_heartbeat TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bin_telemetry (
    recorded_at TIMESTAMPTZ NOT NULL,
    bin_id VARCHAR(50) NOT NULL,
    fill_level FLOAT NOT NULL,
    weight_kg FLOAT NOT NULL,
    temperature_c FLOAT,
    methane_ppm FLOAT,
    tilt_angle FLOAT DEFAULT 0.0,
    battery_pct FLOAT DEFAULT 95.0,
    PRIMARY KEY (recorded_at, bin_id)
);

DO $$
BEGIN
    PERFORM create_hypertable('bin_telemetry', 'recorded_at', chunk_time_interval => INTERVAL '7 days', if_not_exists => TRUE);
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Skipping create_hypertable on bin_telemetry...';
END $$;
CREATE INDEX IF NOT EXISTS idx_telemetry_bin_time ON bin_telemetry(bin_id, recorded_at DESC);

-- ----------------------------------------------------------------------------
-- 4. EXTERNAL DATA ENRICHMENT & FEATURE STORE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS weather_data (
    recorded_at TIMESTAMPTZ NOT NULL,
    zone_id UUID REFERENCES zones(id) ON DELETE CASCADE,
    temperature_c FLOAT NOT NULL,
    rainfall_mm FLOAT NOT NULL DEFAULT 0.0,
    humidity_pct FLOAT NOT NULL,
    weather_condition VARCHAR(50) DEFAULT 'Clear',
    PRIMARY KEY (recorded_at, zone_id)
);

CREATE TABLE IF NOT EXISTS public_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    zone_id UUID REFERENCES zones(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    event_type VARCHAR(50) NOT NULL, -- festival, market, concert, political_rally
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    crowd_factor FLOAT DEFAULT 1.5,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS seasonal_features (
    calendar_date DATE PRIMARY KEY,
    month_int INT NOT NULL,
    season_name VARCHAR(50) NOT NULL,
    is_holiday BOOLEAN DEFAULT FALSE,
    cyclical_day_sin FLOAT NOT NULL,
    cyclical_day_cos FLOAT NOT NULL
);

-- Materialized Feature Store View
CREATE OR REPLACE VIEW feature_store AS
SELECT 
    b.id AS bin_id,
    b.zone_id,
    b.bin_type,
    b.current_fill_pct,
    b.current_weight_kg,
    COALESCE(w.temperature_c, 26.5) AS weather_temp,
    COALESCE(w.rainfall_mm, 0.0) AS weather_rain,
    COALESCE(e.crowd_factor, 1.0) AS event_crowd_boost,
    sf.cyclical_day_sin,
    sf.cyclical_day_cos
FROM bins b
LEFT JOIN LATERAL (
    SELECT temperature_c, rainfall_mm FROM weather_data 
    WHERE zone_id = b.zone_id ORDER BY recorded_at DESC LIMIT 1
) w ON TRUE
LEFT JOIN public_events e ON e.zone_id = b.zone_id AND CURRENT_DATE BETWEEN e.start_date AND e.end_date
LEFT JOIN seasonal_features sf ON sf.calendar_date = CURRENT_DATE;

-- ----------------------------------------------------------------------------
-- 5. AI FILL PREDICTION & SHAP EXPLAINABILITY
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fill_predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bin_id VARCHAR(50) REFERENCES bins(id) ON DELETE CASCADE,
    predicted_for_time TIMESTAMPTZ NOT NULL,
    predicted_fill_pct FLOAT NOT NULL,
    overflow_risk_score FLOAT NOT NULL, -- 0.0 to 1.0
    model_name VARCHAR(100) DEFAULT 'Ensemble-XGBoost-Prophet-v2',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fill_pred_bin_time ON fill_predictions(bin_id, predicted_for_time DESC);

CREATE TABLE IF NOT EXISTS shap_explanations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prediction_id UUID REFERENCES fill_predictions(id) ON DELETE CASCADE,
    feature_name VARCHAR(100) NOT NULL,
    shap_value FLOAT NOT NULL,
    base_value FLOAT NOT NULL
);

-- ----------------------------------------------------------------------------
-- 6. DASHCAM ILLEGAL DUMPING COMPUTER VISION
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dashcam_videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    truck_id VARCHAR(50) NOT NULL,
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    video_url TEXT NOT NULL,
    duration_seconds INT NOT NULL DEFAULT 60,
    processing_status VARCHAR(50) DEFAULT 'completed',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dashcam_frames (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    video_id UUID REFERENCES dashcam_videos(id) ON DELETE CASCADE,
    frame_index INT NOT NULL,
    timestamp_sec FLOAT NOT NULL,
    frame_image_url TEXT NOT NULL,
    gps_location GEOMETRY(Point, 4326) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dashcam_frame_gps ON dashcam_frames USING GIST (gps_location);

CREATE TABLE IF NOT EXISTS illegal_dumps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location GEOMETRY(Point, 4326) NOT NULL,
    address TEXT,
    severity VARCHAR(20) NOT NULL DEFAULT 'medium', -- low, medium, high, critical
    status VARCHAR(50) NOT NULL DEFAULT 'reported',  -- reported, verified, assigned, cleaned, resolved
    estimated_waste_kg FLOAT DEFAULT 150.0,
    image_url TEXT NOT NULL,
    sla_due_at TIMESTAMPTZ NOT NULL,
    resolved_at TIMESTAMPTZ,
    dedup_hash VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dumps_location ON illegal_dumps USING GIST (location);

CREATE TABLE IF NOT EXISTS dump_detections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dump_id UUID REFERENCES illegal_dumps(id) ON DELETE CASCADE,
    material_category VARCHAR(50) NOT NULL, -- plastic, organic, debris, hazardous
    confidence FLOAT NOT NULL,
    bbox_json JSONB
);

-- ----------------------------------------------------------------------------
-- 7. FLEET & GENETIC VRP ROUTE OPTIMIZATION
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS trucks (
    id VARCHAR(50) PRIMARY KEY,
    plate_number VARCHAR(50) UNIQUE NOT NULL,
    model VARCHAR(100) DEFAULT 'Volvo FE Electric / Tata Ultra',
    capacity_kg FLOAT NOT NULL DEFAULT 8000.0,
    fuel_type VARCHAR(50) NOT NULL DEFAULT 'Electric',
    current_location GEOMETRY(Point, 4326),
    current_speed_kmh FLOAT DEFAULT 0.0,
    battery_or_fuel_pct FLOAT DEFAULT 100.0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    assigned_zone_id UUID REFERENCES zones(id) ON DELETE SET NULL,
    last_ping_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_trucks_geom ON trucks USING GIST (current_location);

CREATE TABLE IF NOT EXISTS routes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    route_name VARCHAR(255) NOT NULL,
    truck_id VARCHAR(50) NOT NULL REFERENCES trucks(id) ON DELETE RESTRICT,
    driver_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'in_progress',
    total_distance_km FLOAT NOT NULL DEFAULT 0.0,
    estimated_minutes FLOAT NOT NULL DEFAULT 0.0,
    fuel_liters FLOAT NOT NULL DEFAULT 0.0,
    co2_kg FLOAT NOT NULL DEFAULT 0.0,
    algorithm VARCHAR(50) DEFAULT 'Genetic-VRP-TrafficPenalty',
    route_geometry GEOMETRY(LineString, 4326),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS route_stops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
    sequence_order INT NOT NULL,
    stop_type VARCHAR(50) NOT NULL DEFAULT 'bin', -- depot_start, bin, landfill_dump, depot_end
    bin_id VARCHAR(50) REFERENCES bins(id) ON DELETE SET NULL,
    location GEOMETRY(Point, 4326) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, arrived, collected, blocked, skipped
    arrival_time TIMESTAMPTZ,
    driver_notes TEXT,
    driver_photo_url TEXT
);
CREATE INDEX IF NOT EXISTS idx_route_stops_geom ON route_stops USING GIST (location);

CREATE TABLE IF NOT EXISTS route_optimizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    zone_id UUID REFERENCES zones(id) ON DELETE SET NULL,
    baseline_distance_km FLOAT NOT NULL,
    optimized_distance_km FLOAT NOT NULL,
    savings_pct FLOAT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fuel_savings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    route_id UUID REFERENCES routes(id) ON DELETE CASCADE,
    fuel_saved_liters FLOAT NOT NULL,
    cost_saved_inr FLOAT NOT NULL,
    co2_saved_kg FLOAT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 8. ALERTS, 15-MIN DRIVER AUTO-ESCALATION & AUDIT LOGS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_type VARCHAR(50) NOT NULL, -- overflow_predicted, illegal_dump_detected, route_deviation, missed_pickup
    severity VARCHAR(20) NOT NULL DEFAULT 'medium',
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, acknowledged, escalated, resolved
    target_bin_id VARCHAR(50) REFERENCES bins(id) ON DELETE SET NULL,
    target_dump_id UUID REFERENCES illegal_dumps(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);

CREATE TABLE IF NOT EXISTS escalations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_id UUID NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
    stage INT NOT NULL DEFAULT 1, -- 1=Driver 1, 2=Driver 2, 3=Zone Supervisor
    assigned_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    deadline_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '15 minutes'),
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, accepted, rejected, expired_escalated
    responded_at TIMESTAMPTZ,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id VARCHAR(100),
    metadata_json JSONB,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 9. CITIZEN REPORTS & REWARDS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS citizen_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    citizen_id UUID REFERENCES users(id) ON DELETE CASCADE,
    location GEOMETRY(Point, 4326) NOT NULL,
    image_url TEXT NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'submitted', -- submitted, verified, resolved
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    citizen_id UUID REFERENCES users(id) ON DELETE CASCADE,
    points_earned INT NOT NULL DEFAULT 50,
    reason VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
