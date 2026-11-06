import { pool } from "../config/db";

export interface ActiveEscalation {
  alertId: string;
  stage: 1 | 2 | 3;
  assignedDriver: string;
  driverName: string;
  startedAt: Date;
  expiresAt: Date;
  status: "pending" | "accepted" | "escalated" | "resolved";
}

// In-memory escalation tracker
export const activeEscalations: Map<string, ActiveEscalation> = new Map();

export function createEscalation(alertId: string, alertTitle: string): ActiveEscalation {
  const started = new Date();
  const expires = new Date(started.getTime() + 15 * 60 * 1000); // 15 min countdown

  const escalation: ActiveEscalation = {
    alertId,
    stage: 1,
    assignedDriver: "44444444-4444-4444-4444-444444444444",
    driverName: "Rajesh Kumar (Lead EV Pilot)",
    startedAt: started,
    expiresAt: expires,
    status: "pending"
  };

  activeEscalations.set(alertId, escalation);
  console.log(`[Escalation] Alert '${alertTitle}' assigned to Stage 1 (${escalation.driverName}). 15-min countdown started.`);

  return escalation;
}

export function advanceEscalation(alertId: string, reason: string = "15-minute timeout expired without driver acceptance"): ActiveEscalation | null {
  const current = activeEscalations.get(alertId);
  if (!current) return null;

  if (current.stage === 1) {
    current.stage = 2;
    current.assignedDriver = "55555555-5555-5555-5555-555555555555";
    current.driverName = "Anil Verma (Secondary On-Call Driver)";
    current.startedAt = new Date();
    current.expiresAt = new Date(current.startedAt.getTime() + 15 * 60 * 1000);
    console.log(`[Escalation] Escalated to Stage 2: ${current.driverName}. Reason: ${reason}`);
  } else if (current.stage === 2) {
    current.stage = 3;
    current.assignedDriver = "33333333-3333-3333-3333-333333333333";
    current.driverName = "Priya Sundaram (Zone 1 Supervisor)";
    current.startedAt = new Date();
    current.expiresAt = new Date(current.startedAt.getTime() + 30 * 60 * 1000);
    console.log(`[Escalation] Escalated to Stage 3: Supervisor Alert triggered!`);
  }

  return current;
}

// Background ticker checking for expired 15-min timers
setInterval(() => {
  const now = new Date();
  activeEscalations.forEach((esc, alertId) => {
    if (esc.status === "pending" && now >= esc.expiresAt) {
      advanceEscalation(alertId, "15-minute SLA timer expired");
    }
  });
}, 10000);
