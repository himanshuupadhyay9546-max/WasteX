import { OfflineQueueManager, type QueuedAction } from "@wastex/offline-store";

export interface WasteXClientConfig {
  baseUrl: string;
  token?: string;
}

export class WasteXApiClient {
  private baseUrl: string;
  private token?: string;

  constructor(config: WasteXClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.token = config.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>)
    };
    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: "Request failed" }));
      throw new Error(err.detail || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // --- Smart Bins ---
  async getBins(params?: { minFill?: number; zoneId?: string }) {
    const query = new URLSearchParams();
    if (params?.minFill !== undefined) query.set("min_fill", String(params.minFill));
    if (params?.zoneId) query.set("zone_id", params.zoneId);
    return this.request<any[]>(`/api/v1/bins?${query.toString()}`);
  }

  async getBin(id: string) {
    return this.request<any>(`/api/v1/bins/${id}`);
  }

  // --- Route Optimization ---
  async optimizeRoutes(payload: {
    truckIds?: string[];
    zoneId?: string;
    fillThresholdPct?: number;
    includeTraffic?: boolean;
    strategy?: "fastest" | "fuel_optimal";
  }) {
    return this.request<any>(`/api/v1/routes/optimize`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  }

  async getActiveDriverRoute(truckId: string = "TRUCK-01") {
    return this.request<any>(`/api/v1/routes/driver/active?truck_id=${truckId}`);
  }

  async updateStopStatus(stopId: string, status: "collected" | "blocked" | "skipped", isOnline = true) {
    if (!isOnline) {
      OfflineQueueManager.enqueue({
        type: "BIN_COLLECTED",
        payload: { stopId, status }
      });
      return { status: "queued_offline" };
    }
    return this.request<any>(`/api/v1/routes/stops/${stopId}`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });
  }

  // --- Illegal Dumping ---
  async getDumpingReports(status?: string) {
    const query = status ? `?status=${status}` : "";
    return this.request<any[]>(`/api/v1/dumping${query}`);
  }

  async reportDumping(payload: {
    lat: number;
    lng: number;
    imageUrl: string;
    detectionSource?: string;
    estimatedWasteKg?: number;
  }, isOnline = true) {
    if (!isOnline) {
      OfflineQueueManager.enqueue({
        type: "DUMPING_REPORT",
        payload
      });
      return { status: "queued_offline" };
    }
    return this.request<any>(`/api/v1/dumping/report`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  }

  // --- Sync offline queue ---
  async syncOfflineQueue(): Promise<{ synced: number; failed: number }> {
    const queue = OfflineQueueManager.getQueue();
    let synced = 0;
    let failed = 0;

    for (const item of queue) {
      try {
        if (item.type === "BIN_COLLECTED") {
          await this.request(`/api/v1/routes/stops/${item.payload.stopId}`, {
            method: "PATCH",
            body: JSON.stringify({ status: item.payload.status })
          });
        } else if (item.type === "DUMPING_REPORT") {
          await this.request(`/api/v1/dumping/report`, {
            method: "POST",
            body: JSON.stringify(item.payload)
          });
        }
        OfflineQueueManager.dequeue(item.id);
        synced++;
      } catch {
        failed++;
      }
    }

    return { synced, failed };
  }

  // --- Server-Sent Events (SSE) Stream ---
  subscribeTelemetrySSE(onMessage: (event: any) => void): EventSource | null {
    if (typeof window === "undefined" || !window.EventSource) return null;
    const es = new EventSource(`${this.baseUrl}/api/v1/telemetry/stream`);
    es.onmessage = (event) => {
      try {
        onMessage(JSON.parse(event.data));
      } catch {
        onMessage(event.data);
      }
    };
    return es;
  }
}
