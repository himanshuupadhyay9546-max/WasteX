"""
EcoRoute AI - IoT Smart Bin & Truck GPS Telemetry Simulator
Publishes realistic sensor data for 500 bins via MQTT and REST fallback.
"""

import time
import json
import random
import os
import requests
import paho.mqtt.client as mqtt

MQTT_HOST = os.getenv("MQTT_BROKER_HOST", "localhost")
MQTT_PORT = int(os.getenv("MQTT_BROKER_PORT", "1883"))
API_URL = os.getenv("API_BASE_URL", "http://localhost:8000")
NUM_BINS = int(os.getenv("SIMULATOR_NUM_BINS", "500"))
INTERVAL = int(os.getenv("SIMULATOR_INTERVAL_SECONDS", "5"))

print(f"Starting EcoRoute IoT Simulator for {NUM_BINS} smart bins...")

# Generate 500 realistic bin positions clustered across city zones
random.seed(42)
BIN_DATA = []
CITY_CENTER_LAT, CITY_CENTER_LNG = 12.9716, 77.5946

for i in range(1, NUM_BINS + 1):
    # Cluster around 4 zones
    cluster = random.choice([
        (12.9352, 77.6245), # Koramangala
        (12.9784, 77.6412), # Indiranagar
        (12.9698, 77.7499), # Whitefield
        (12.9756, 77.6094)  # MG Road
    ])
    lat = cluster[0] + random.uniform(-0.02, 0.02)
    lng = cluster[1] + random.uniform(-0.02, 0.02)
    
    BIN_DATA.append({
        "bin_id": f"BIN-BLR-{str(i).zfill(3)}",
        "lat": round(lat, 6),
        "lng": round(lng, 6),
        "fill_level": round(random.uniform(20.0, 92.0), 1),
        "weight_kg": round(random.uniform(50.0, 600.0), 1),
        "temp_celsius": round(random.uniform(23.0, 32.0), 1),
        "gas_methane_ppm": round(random.uniform(5.0, 35.0), 1),
        "battery_pct": round(random.uniform(75.0, 99.0), 1)
    })

# Initialize MQTT Client
client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id="ecoroute-iot-simulator")

try:
    client.connect(MQTT_HOST, MQTT_PORT, 60)
    client.loop_start()
    print(f"Connected to Mosquitto MQTT Broker at {MQTT_HOST}:{MQTT_PORT}")
except Exception as e:
    print(f"MQTT broker connection pending or unavailable, will use REST fallback: {e}")

def run_simulation_loop():
    tick = 0
    while True:
        tick += 1
        # Pick 25 bins per tick to publish updates
        active_sample = random.sample(BIN_DATA, min(25, NUM_BINS))
        
        for b in active_sample:
            # Simulate waste accumulation
            b["fill_level"] = round(min(100.0, b["fill_level"] + random.uniform(0.1, 1.5)), 1)
            b["weight_kg"] = round(b["fill_level"] * random.uniform(3.5, 6.0), 1)
            b["temp_celsius"] = round(25.0 + random.uniform(-2, 5), 1)
            b["gas_methane_ppm"] = round(random.uniform(8.0, 45.0), 1)
            
            payload = {
                "bin_id": b["bin_id"],
                "fill_level": b["fill_level"],
                "weight_kg": b["weight_kg"],
                "temp_celsius": b["temp_celsius"],
                "gas_methane_ppm": b["gas_methane_ppm"],
                "battery_pct": b["battery_pct"],
                "lat": b["lat"],
                "lng": b["lng"],
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            }
            
            topic = f"ecoroute/bins/{b['bin_id']}/telemetry"
            try:
                client.publish(topic, json.dumps(payload), qos=1)
            except Exception:
                pass
                
            # REST Fallback post to backend API
            if tick % 4 == 0:
                try:
                    requests.post(f"{API_URL}/api/v1/telemetry/ingest", json=payload, timeout=1.5)
                except Exception:
                    pass

        # Simulate Smart Truck GPS Movement
        if tick % 2 == 0:
            truck_gps = {
                "truck_id": "TRUCK-01",
                "lat": round(12.9480 + random.uniform(-0.005, 0.005), 6),
                "lng": round(77.6120 + random.uniform(-0.005, 0.005), 6),
                "speed_kmh": round(random.uniform(22.0, 45.0), 1),
                "heading_deg": round(random.uniform(0, 360), 1),
                "current_load_kg": 3600.0,
                "battery_or_fuel_pct": 82.5
            }
            try:
                client.publish("ecoroute/trucks/TRUCK-01/location", json.dumps(truck_gps))
                requests.post(f"{API_URL}/api/v1/fleet/ping-location", json=truck_gps, timeout=1.5)
            except Exception:
                pass

        time.sleep(INTERVAL)

if __name__ == "__main__":
    run_simulation_loop()
