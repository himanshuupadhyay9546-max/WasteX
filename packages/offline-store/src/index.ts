export interface QueuedAction {
  id: string;
  type: "BIN_COLLECTED" | "BIN_BLOCKED" | "DUMPING_REPORT";
  payload: Record<string, any>;
  timestamp: string;
  retryCount: number;
}

const STORAGE_KEY = "wastex_driver_offline_queue";

export class OfflineQueueManager {
  static getQueue(): QueuedAction[] {
    if (typeof window === "undefined" || !window.localStorage) return [];
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  static enqueue(action: Omit<QueuedAction, "id" | "timestamp" | "retryCount">): QueuedAction {
    const queue = this.getQueue();
    const newAction: QueuedAction = {
      ...action,
      id: "act_" + Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      retryCount: 0
    };
    queue.push(newAction);
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    }
    return newAction;
  }

  static dequeue(id: string): void {
    const queue = this.getQueue().filter((item) => item.id !== id);
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    }
  }

  static clear(): void {
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.removeItem(STORAGE_KEY);
    }
  }
}
