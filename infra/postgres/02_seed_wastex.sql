-- ============================================================================
-- WasteX - Master Seed Data (Realistic City Infrastructure)
-- ============================================================================

-- 1. Users with 5 Roles (password for all: 'WasteX2026!')
INSERT INTO users (id, email, hashed_password, name, role, is_active)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'principal@wastex.ai', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'Dr. Vikramaditya Rao (Principal City Director)', 'principal_admin', true),
    ('22222222-2222-2222-2222-222222222222', 'admin@wastex.ai', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'Aarav Sharma (Municipal Waste Director)', 'municipal_admin', true),
    ('33333333-3333-3333-3333-333333333333', 'supervisor@wastex.ai', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'Priya Sundaram (Zone 1 Supervisor)', 'zone_supervisor', true),
    ('44444444-4444-4444-4444-444444444444', 'driver@wastex.ai', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'Rajesh Kumar (Lead EV Pilot)', 'truck_driver', true),
    ('55555555-5555-5555-5555-555555555555', 'driver2@wastex.ai', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'Anil Verma (Secondary On-Call Driver)', 'truck_driver', true),
    ('66666666-6666-6666-6666-666666666666', 'citizen@wastex.ai', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'Ananya Verma (Eco Citizen Champion)', 'citizen', true)
ON CONFLICT (email) DO NOTHING;

-- 2. Zones
INSERT INTO zones (id, name, code, area_type, center_point)
VALUES
    ('a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Koramangala Tech Hub', 'ZONE-BLR-01', 'commercial', ST_SetSRID(ST_MakePoint(77.6245, 12.9352), 4326)),
    ('a2222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Indiranagar Central', 'ZONE-BLR-02', 'commercial', ST_SetSRID(ST_MakePoint(77.6412, 12.9784), 4326)),
    ('a3333333-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Whitefield IT Corridor', 'ZONE-BLR-03', 'industrial', ST_SetSRID(ST_MakePoint(77.7499, 12.9698), 4326)),
    ('a4444444-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'MG Road Downtown', 'ZONE-BLR-04', 'market', ST_SetSRID(ST_MakePoint(77.6094, 12.9756), 4326))
ON CONFLICT (code) DO NOTHING;

-- 3. Facilities
INSERT INTO facilities (id, name, facility_type, location, address, capacity_tons)
VALUES
    ('f1111111-ffff-ffff-ffff-ffffffffffff', 'Central Fleet Depot & EV Supercharging Hub', 'depot', ST_SetSRID(ST_MakePoint(77.6101, 12.9520), 4326), 'Victoria Road Central Yard', 1200.0),
    ('f2222222-ffff-ffff-ffff-ffffffffffff', 'Mandur Scientific Landfill & Bio-methanation Facility', 'landfill', ST_SetSRID(ST_MakePoint(77.7200, 12.8900), 4326), 'Mandur Green Energy Hub', 50000.0)
ON CONFLICT (id) DO NOTHING;

-- 4. Trucks
INSERT INTO trucks (id, plate_number, model, capacity_kg, fuel_type, current_location, current_speed_kmh, battery_or_fuel_pct, is_active, assigned_zone_id)
VALUES
    ('TRUCK-01', 'KA-01-EQ-9001', 'Volvo FE 300kW Pure Electric', 9000, 'Electric', ST_SetSRID(ST_MakePoint(77.6120, 12.9480), 4326), 32.5, 84.0, true, 'a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
    ('TRUCK-02', 'KA-01-EQ-9002', 'BharatBenz eCanter Compactor', 7500, 'Electric', ST_SetSRID(ST_MakePoint(77.6380, 12.9720), 4326), 0.0, 92.0, true, 'a2222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
    ('TRUCK-03', 'KA-01-CG-4412', 'Tata Ultra T.7 CNG Hybrid', 8000, 'CNG', ST_SetSRID(ST_MakePoint(77.7400, 12.9650), 4326), 41.0, 68.0, true, 'a3333333-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
ON CONFLICT (id) DO NOTHING;

-- 5. Smart Bins
INSERT INTO bins (id, zone_id, location, address, capacity_liters, bin_type, status, current_fill_pct, current_weight_kg, current_temp_c, current_methane_ppm, battery_pct, last_telemetry_at)
VALUES
    ('BIN-BLR-001', 'a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', ST_SetSRID(ST_MakePoint(77.6210, 12.9340), 4326), '100ft Rd, 4th Block, Koramangala', 1100, 'plastic', 'overflowing', 94.5, 412.0, 29.4, 28.5, 94.0, NOW()),
    ('BIN-BLR-002', 'a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', ST_SetSRID(ST_MakePoint(77.6255, 12.9380), 4326), '80ft Rd, 6th Block, Koramangala', 1100, 'organic', 'active', 88.0, 520.0, 31.2, 42.1, 91.0, NOW()),
    ('BIN-BLR-003', 'a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', ST_SetSRID(ST_MakePoint(77.6290, 12.9315), 4326), 'Sony World Junction, Koramangala', 1500, 'mixed', 'active', 78.4, 610.0, 27.8, 14.2, 88.0, NOW()),
    ('BIN-BLR-004', 'a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', ST_SetSRID(ST_MakePoint(77.6180, 12.9410), 4326), 'Forum Mall Promenade', 1100, 'glass', 'active', 45.2, 280.0, 26.1, 8.0, 96.0, NOW()),
    ('BIN-BLR-005', 'a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', ST_SetSRID(ST_MakePoint(77.6320, 12.9390), 4326), 'Wipro Park Corner', 1100, 'paper', 'active', 82.1, 210.0, 25.5, 6.4, 89.0, NOW()),
    ('BIN-BLR-006', 'a2222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa', ST_SetSRID(ST_MakePoint(77.6405, 12.9790), 4326), '12th Main Rd, HAL 2nd Stage, Indiranagar', 1100, 'mixed', 'overflowing', 96.0, 720.0, 32.0, 55.0, 92.0, NOW()),
    ('BIN-BLR-007', 'a2222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa', ST_SetSRID(ST_MakePoint(77.6445, 12.9720), 4326), 'CMH Road Metro Station Gate 2', 1500, 'plastic', 'active', 84.6, 390.0, 28.2, 19.8, 95.0, NOW()),
    ('BIN-BLR-011', 'a4444444-aaaa-aaaa-aaaa-aaaaaaaaaaaa', ST_SetSRID(ST_MakePoint(77.6080, 12.9740), 4326), 'MG Road Metro Walkway', 1100, 'mixed', 'overflowing', 98.2, 850.0, 33.5, 62.0, 93.0, NOW())
ON CONFLICT (id) DO NOTHING;

-- 6. Seasonal Features & Weather
INSERT INTO seasonal_features (calendar_date, month_int, season_name, is_holiday, cyclical_day_sin, cyclical_day_cos)
VALUES (CURRENT_DATE, EXTRACT(MONTH FROM CURRENT_DATE), 'Monsoon/Autumn', false, 0.4338, -0.9010)
ON CONFLICT (calendar_date) DO NOTHING;

INSERT INTO weather_data (recorded_at, zone_id, temperature_c, rainfall_mm, humidity_pct, weather_condition)
VALUES (NOW(), 'a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 27.2, 1.4, 68.0, 'Scattered Showers')
ON CONFLICT (recorded_at, zone_id) DO NOTHING;

-- 7. Public Events
INSERT INTO public_events (id, zone_id, title, event_type, start_date, end_date, crowd_factor)
VALUES ('e1111111-eeee-eeee-eeee-eeeeeeeeeeee', 'a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Koramangala Sunday Organic Farmers Market', 'market', CURRENT_DATE - 1, CURRENT_DATE + 1, 1.8)
ON CONFLICT (id) DO NOTHING;

-- 8. Illegal Dumps
INSERT INTO illegal_dumps (id, location, address, severity, status, estimated_waste_kg, image_url, sla_due_at)
VALUES
    ('d1111111-dddd-dddd-dddd-dddddddddddd', ST_SetSRID(ST_MakePoint(77.6280, 12.9420), 4326), 'Backside of St. John Flyover, Koramangala', 'high', 'verified', 650.0, '/media/dumping_flyover_01.jpg', NOW() + INTERVAL '12 hours'),
    ('d2222222-dddd-dddd-dddd-dddddddddddd', ST_SetSRID(ST_MakePoint(77.6490, 12.9680), 4326), 'Old Airport Road, Near Wind Tunnel Corner', 'critical', 'assigned', 1200.0, '/media/dumping_canal_02.jpg', NOW() + INTERVAL '4 hours')
ON CONFLICT (id) DO NOTHING;

-- 9. Active Alert with 15-Minute Driver Escalation
INSERT INTO alerts (id, alert_type, severity, title, message, status, target_bin_id)
VALUES 
    ('c1111111-cccc-cccc-cccc-cccccccccccc', 'overflow_predicted', 'high', 'Critical Overflow Warning: BIN-BLR-001', 'Bin fill level reached 94.5% with high methane concentration. Auto-escalating dispatch.', 'active', 'BIN-BLR-001')
ON CONFLICT (id) DO NOTHING;

INSERT INTO escalations (id, alert_id, stage, assigned_user_id, deadline_at, status)
VALUES
    ('c2222222-cccc-cccc-cccc-cccccccccccc', 'c1111111-cccc-cccc-cccc-cccccccccccc', 1, '44444444-4444-4444-4444-444444444444', NOW() + INTERVAL '15 minutes', 'pending')
ON CONFLICT (id) DO NOTHING;
