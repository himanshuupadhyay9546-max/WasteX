import { z } from "zod";

export const TelemetrySchema = z.object({
  bin_id: z.string().min(1),
  fill_level: z.number().min(0).max(100),
  weight_kg: z.number().min(0),
  temperature_c: z.number().min(-20).max(80).default(25),
  methane_ppm: z.number().min(0).default(10),
  battery_pct: z.number().min(0).max(100).default(95),
  tilt_angle: z.number().default(0),
  lat: z.number().optional(),
  lng: z.number().optional(),
  timestamp: z.string().optional()
});

export type TelemetryPayload = z.infer<typeof TelemetrySchema>;
