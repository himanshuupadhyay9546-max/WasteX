import express from "express";
import cors from "cors";
import mqtt from "mqtt";
import { TelemetrySchema } from "./validator";
import { sendSimulatedBatch } from "./simulator";

const app = express();
const PORT = process.env.PORT || 4001;
const MQTT_BROKER = process.env.MQTT_BROKER_HOST || "localhost";
const MQTT_PORT = process.env.MQTT_BROKER_PORT || "1883";

app.use(cors());
app.use(express.json());

// In-memory cache & SSE subscribers
const latestTelemetry: Map<string, any> = new Map();
const sseClients: express.Response[] = [];

// Broadcast helper for SSE
function broadcastSSE(data: any) {
  sseClients.forEach((client) => {
    client.write(`data: ${JSON.stringify(data)}\n\n`);
  });
}

// 1. MQTT Listener
const mqttClient = mqtt.connect(`mqtt://${MQTT_BROKER}:${MQTT_PORT}`, {
  reconnectPeriod: 2000
});

mqttClient.on("connect", () => {
  console.log(`[IoT-Ingestion] MQTT Connected to ${MQTT_BROKER}:${MQTT_PORT}`);
  mqttClient.subscribe("wastex/bins/+/telemetry");
  mqttClient.subscribe("wastex/trucks/+/location");
});

mqttClient.on("message", (topic, message) => {
  try {
    const payload = JSON.parse(message.toString());
    if (topic.includes("/telemetry")) {
      const parsed = TelemetrySchema.safeParse(payload);
      if (parsed.success) {
        latestTelemetry.set(parsed.data.bin_id, parsed.data);
        broadcastSSE({ type: "BIN_TELEMETRY", data: parsed.data });
      }
    } else if (topic.includes("/location")) {
      broadcastSSE({ type: "TRUCK_LOCATION", data: payload });
    }
  } catch (err) {
    // Ignore malformed packets
  }
});

// 2. HTTP Ingestion Endpoint
app.post("/api/telemetry", (req, res) => {
  const parsed = TelemetrySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.format() });
  }

  latestTelemetry.set(parsed.data.bin_id, parsed.data);
  broadcastSSE({ type: "BIN_TELEMETRY", data: parsed.data });
  res.status(200).json({ status: "ingested", bin_id: parsed.data.bin_id });
});

// 3. SSE Real-Time Stream Endpoint
app.get("/api/telemetry/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  sseClients.push(res);

  // Send initial snapshot
  const snapshot = Array.from(latestTelemetry.values());
  res.write(`data: ${JSON.stringify({ type: "INITIAL_SNAPSHOT", data: snapshot })}\n\n`);

  req.on("close", () => {
    const index = sseClients.indexOf(res);
    if (index !== -1) sseClients.splice(index, 1);
  });
});

// 4. Health & Status
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "WasteX IoT Ingestion",
    connectedClients: sseClients.length,
    trackedBins: latestTelemetry.size
  });
});

// Run built-in periodic simulation tick
setInterval(sendSimulatedBatch, 5000);

app.listen(PORT, () => {
  console.log(`[IoT-Ingestion] Service listening on port ${PORT}`);
  console.log(`[IoT-Ingestion] SSE live stream available at http://localhost:${PORT}/api/telemetry/stream`);
});
