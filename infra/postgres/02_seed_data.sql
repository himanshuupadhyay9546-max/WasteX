-- ============================================================================
-- EcoRoute AI - Seed Data (Realistic City Infrastructure)
-- ============================================================================

-- 1. Insert Default Users (password: 'EcoRoute2026!')
-- bcrypt hash for 'EcoRoute2026!': $2b$12$e8F0l2Q0W89j28B0b6Jg9OPZq.4fA2Zf4R32aZk1xQ89j28B0b6Jg
-- For convenience in MVP, we also support plain password check in auth service or bcrypt
INSERT INTO users (id, email, hashed_password, full_name, phone_number, role, is_active)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'admin@ecoroute.ai', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'Aarav Sharma (Municipal Director)', '+919876543210', 'admin', true),
    ('22222222-2222-2222-2222-222222222222', 'driver@ecoroute.ai', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'Rajesh Kumar (Lead EV Pilot)', '+919876543211', 'driver', true),
    ('33333333-3333-3333-3333-333333333333', 'inspector@ecoroute.ai', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'Priya Sundaram (Sanitation Inspector)', '+919876543212', 'inspector', true),
    ('44444444-4444-4444-4444-444444444444', 'citizen@ecoroute.ai', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'Ananya Verma (Eco Citizen)', '+919876543213', 'citizen', true)
ON CONFLICT (email) DO NOTHING;

-- 2. Insert City Zones
INSERT INTO zones (id, name, code, area_type, population_density, center_point)
VALUES
    ('a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Koramangala Tech Hub', 'ZONE-BLR-01', 'commercial', 12500, ST_SetSRID(ST_MakePoint(77.6245, 12.9352), 4326)),
    ('a2222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Indiranagar Central', 'ZONE-BLR-02', 'commercial', 11200, ST_SetSRID(ST_MakePoint(77.6412, 12.9784), 4326)),
    ('a3333333-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Whitefield IT Corridor', 'ZONE-BLR-03', 'industrial', 9400, ST_SetSRID(ST_MakePoint(77.7499, 12.9698), 4326)),
    ('a4444444-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'MG Road Downtown', 'ZONE-BLR-04', 'market', 15800, ST_SetSRID(ST_MakePoint(77.6094, 12.9756), 4326))
ON CONFLICT (code) DO NOTHING;

-- 3. Insert Facilities (Depot & Landfill)
INSERT INTO facilities (id, name, facility_type, location, address, capacity_tons)
VALUES
    ('f1111111-ffff-ffff-ffff-ffffffffffff', 'Central Fleet Depot & Supercharging Station', 'depot', ST_SetSRID(ST_MakePoint(77.6101, 12.9520), 4326), 'Victoria Road Central Yard, Bangalore', 1200.0),
    ('f2222222-ffff-ffff-ffff-ffffffffffff', 'South Mandur Scientific Landfill & Bio-methanation Plant', 'landfill', ST_SetSRID(ST_MakePoint(77.7200, 12.8900), 4326), 'Mandur Green Energy Hub, Bangalore Outskirts', 50000.0)
ON CONFLICT (id) DO NOTHING;

-- 4. Insert Fleet Trucks
INSERT INTO trucks (id, plate_number, model, capacity_kg, capacity_volume_m3, fuel_type, fuel_efficiency_km_per_unit, co2_emission_factor_g_km, current_driver_id, current_location, current_speed_kmh, current_load_kg, battery_or_fuel_pct, assigned_zone_id, home_depot_id)
VALUES
    ('TRUCK-01', 'KA-01-EQ-9001', 'Volvo FE 300kW Pure Electric', 9000, 18.0, 'Electric', 1.6, 0.0, '22222222-2222-2222-2222-222222222222', ST_SetSRID(ST_MakePoint(77.6120, 12.9480), 4326), 32.5, 3450, 84.0, 'a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'f1111111-ffff-ffff-ffff-ffffffffffff'),
    ('TRUCK-02', 'KA-01-EQ-9002', 'BharatBenz eCanter Compactor', 7500, 14.0, 'Electric', 1.9, 0.0, NULL, ST_SetSRID(ST_MakePoint(77.6380, 12.9720), 4326), 0.0, 1200, 92.0, 'a2222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'f1111111-ffff-ffff-ffff-ffffffffffff'),
    ('TRUCK-03', 'KA-01-CG-4412', 'Tata Ultra T.7 CNG Hybrid', 8000, 16.0, 'CNG', 4.2, 420.0, NULL, ST_SetSRID(ST_MakePoint(77.7400, 12.9650), 4326), 41.0, 6800, 68.0, 'a3333333-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'f1111111-ffff-ffff-ffff-ffffffffffff'),
    ('TRUCK-04', 'KA-01-EQ-9004', 'Volvo FE 300kW Pure Electric', 9000, 18.0, 'Electric', 1.6, 0.0, NULL, ST_SetSRID(ST_MakePoint(77.6050, 12.9780), 4326), 18.0, 4100, 76.0, 'a4444444-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'f1111111-ffff-ffff-ffff-ffffffffffff')
ON CONFLICT (id) DO NOTHING;

-- 5. Insert Smart Bins across City
INSERT INTO smart_bins (id, zone_id, location, address, capacity_liters, bin_type, status, current_fill_level, current_weight_kg, current_temp_celsius, current_gas_level_ppm, battery_percentage, last_telemetry_at)
VALUES
    ('BIN-BLR-001', 'a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', ST_SetSRID(ST_MakePoint(77.6210, 12.9340), 4326), '100ft Rd, 4th Block, Koramangala', 1100, 'plastic', 'overflowing', 94.5, 412.0, 29.4, 28.5, 94.0, NOW()),
    ('BIN-BLR-002', 'a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', ST_SetSRID(ST_MakePoint(77.6255, 12.9380), 4326), '80ft Rd, 6th Block, Koramangala', 1100, 'organic', 'active', 88.0, 520.0, 31.2, 42.1, 91.0, NOW()),
    ('BIN-BLR-003', 'a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', ST_SetSRID(ST_MakePoint(77.6290, 12.9315), 4326), 'Sony World Junction, Koramangala', 1500, 'mixed', 'active', 78.4, 610.0, 27.8, 14.2, 88.0, NOW()),
    ('BIN-BLR-004', 'a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', ST_SetSRID(ST_MakePoint(77.6180, 12.9410), 4326), 'Forum Mall Promenade, Hosur Rd', 1100, 'glass', 'active', 45.2, 280.0, 26.1, 8.0, 96.0, NOW()),
    ('BIN-BLR-005', 'a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', ST_SetSRID(ST_MakePoint(77.6320, 12.9390), 4326), 'Wipro Park Corner, 1st Block', 1100, 'paper', 'active', 82.1, 210.0, 25.5, 6.4, 89.0, NOW()),
    
    ('BIN-BLR-006', 'a2222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa', ST_SetSRID(ST_MakePoint(77.6405, 12.9790), 4326), '12th Main Rd, HAL 2nd Stage, Indiranagar', 1100, 'mixed', 'overflowing', 96.0, 720.0, 32.0, 55.0, 92.0, NOW()),
    ('BIN-BLR-007', 'a2222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa', ST_SetSRID(ST_MakePoint(77.6445, 12.9720), 4326), 'CMH Road Metro Station Gate 2', 1500, 'plastic', 'active', 84.6, 390.0, 28.2, 19.8, 95.0, NOW()),
    ('BIN-BLR-008', 'a2222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa', ST_SetSRID(ST_MakePoint(77.6370, 12.9830), 4326), 'Defense Colony Main Circle', 1100, 'organic', 'active', 62.0, 340.0, 26.7, 18.2, 87.0, NOW()),
    
    ('BIN-BLR-009', 'a3333333-aaaa-aaaa-aaaa-aaaaaaaaaaaa', ST_SetSRID(ST_MakePoint(77.7480, 12.9710), 4326), 'ITPL Main Gate, Whitefield', 2000, 'e_waste', 'active', 76.5, 480.0, 24.8, 4.1, 99.0, NOW()),
    ('BIN-BLR-010', 'a3333333-aaaa-aaaa-aaaa-aaaaaaaaaaaa', ST_SetSRID(ST_MakePoint(77.7550, 12.9660), 4326), 'KTPO Trade Center, EPIP Zone', 1500, 'construction_debris', 'active', 91.0, 1420.0, 26.5, 5.0, 84.0, NOW()),
    
    ('BIN-BLR-011', 'a4444444-aaaa-aaaa-aaaa-aaaaaaaaaaaa', ST_SetSRID(ST_MakePoint(77.6080, 12.9740), 4326), 'MG Road Metro Station Walkway', 1100, 'mixed', 'overflowing', 98.2, 850.0, 33.5, 62.0, 93.0, NOW()),
    ('BIN-BLR-012', 'a4444444-aaaa-aaaa-aaaa-aaaaaaaaaaaa', ST_SetSRID(ST_MakePoint(77.6130, 12.9770), 4326), 'Brigade Road Junction, CBD', 1100, 'plastic', 'active', 89.4, 430.0, 30.1, 24.3, 90.0, NOW())
ON CONFLICT (id) DO NOTHING;

-- 6. Insert Sample Illegal Dumping Reports
INSERT INTO illegal_dumping_reports (id, detection_source, location, address, image_url, severity, status, estimated_waste_kg, detected_materials, sla_due_at)
VALUES
    ('d1111111-dddd-dddd-dddd-dddddddddddd', 'dashcam_cctv', ST_SetSRID(ST_MakePoint(77.6280, 12.9420), 4326), 'Backside of St. John Flyover, Koramangala', '/media/dumping_flyover_01.jpg', 'high', 'verified', 650.0, '["construction_debris", "mixed_plastics", "tires"]'::jsonb, NOW() + INTERVAL '12 hours'),
    ('d2222222-dddd-dddd-dddd-dddddddddddd', 'citizen_app', ST_SetSRID(ST_MakePoint(77.6490, 12.9680), 4326), 'Old Airport Road, Near Wind Tunnel Corner', '/media/dumping_canal_02.jpg', 'critical', 'assigned', 1200.0, '["hazardous_chemical_cans", "electronic_waste"]'::jsonb, NOW() + INTERVAL '4 hours'),
    ('d3333333-dddd-dddd-dddd-dddddddddddd', 'field_inspector', ST_SetSRID(ST_MakePoint(77.7420, 12.9590), 4326), 'Kundalahalli Lake Buffer Zone', '/media/dumping_lake_03.jpg', 'medium', 'reported', 320.0, '["organic_market_waste", "polythene_sacks"]'::jsonb, NOW() + INTERVAL '24 hours')
ON CONFLICT (id) DO NOTHING;
