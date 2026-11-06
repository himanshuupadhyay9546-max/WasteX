import mqtt from "mqtt";
import http from "http";

const MQTT_HOST = process.env.MQTT_BROKER_HOST || "localhost";
const MQTT_PORT = process.env.MQTT_BROKER_PORT || "1883";
const HTTP_INGEST_URL = "http://localhost:4001/api/telemetry";

console.log("🚀 Starting WasteX 500-Bin IoT Telemetry Simulator...");

interface SimBin {
  id: string;
  lat: number;
  lng: number;
  fill: number;
  weight: number;
  temp: number;
  methane: number;
  battery: number;
}

const BINS: SimBin[] = [];
const ZONES = [
  { lat: 12.9352, lng: 77.6245 }, // Koramangala
  { lat: 12.9784, lng: 77.6412 }, // Indiranagar
  { lat: 12.9698, lng: 77.7499 }, // Whitefield
  { lat: 12.9756, lng: 77.6094 }  // MG Road
];

for (let i = 1; i <= 500; i++) {
  const zone = ZONES[i % ZONES.length];
  BINS.push({
    id: `BIN-BLR-${String(i).padStart(3, "0")}`,
    lat: Number((zone.lat + (Math.random() - 0.5) * 0.03).toFixed(6)),
    lng: Number((zone.lng + (Math.random() - 0.5) * 0.03).toFixed(6)),
    fill: Number((20 + Math.random() * 65).toFixed(1)),
    weight: Number((50 + Math.random() * 400).toFixed(1)),
    temp: Number((24 + Math.random() * 7).toFixed(1)),
    methane: Number((5 + Math.random() * 25).toFixed(1)),
    battery: Number((85 + Math.random() * 14).toFixed(1))
  });
}

const client = mqtt.connect(`mqtt://${MQTT_HOST}:${MQTT_PORT}`, {
  reconnectPeriod: 2000
});

client.on("connect", () => {
  console.log(`✓ Connected to Mosquitto broker at ${MQTT_HOST}:${MQTT_PORT}`);
});

client.on("error", (err) => {
  // Silent fallback to HTTP receiver
});

export function sendSimulatedBatch() {
  // Pick 20 random bins each tick
  const sample = [...BINS].sort(() => 0.5 - Math.random()).slice(0, 20);

  sample.forEach((bin) => {
    // Fill accumulation
    bin.fill = Math.min(100, Number((bin.fill + 0.2 + Math.random() * 1.5).toFixed(1)));
    bin.weight = Number((bin.fill * 4.8).toFixed(1));
    bin.temp = Number((26 + Math.random() * 4).toFixed(1));
    bin.methane = Number((bin.fill > 80 ? 35 + Math.random() * 30 : 12).toFixed(1));

    const payload = {
      bin_id: bin.id,
      fill_level: bin.fill,
      weight_kg: bin.weight,
      temperature_c: bin.temp,
      methane_ppm: bin.methane,
      battery_pct: bin.battery,
      lat: bin.lat,
      lng: bin.lng,
      timestamp: new Date().toISOString()
    };

    if (client.connected) {
      client.publish(`wastex/bins/${bin.id}/telemetry`, JSON.stringify(payload));
    }
  });
}

// Start interval
if (require.main === module) {
  setInterval(sendSimulatedBatch, 4000);
}
