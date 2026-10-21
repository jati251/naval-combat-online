export interface SinkingEventItem {
  shipId: string;
  x: number;
  y: number;
  z: number;
  rotationY: number;
  shipLength: number;
  shipWidth: number;
  isSelf?: boolean;
  timestamp: number;
}

export interface ActiveSinkingShip {
  shipId: string;
  x: number;
  y: number;
  z: number;
  rotationY: number;
  shipLength: number;
  shipWidth: number;
  progress: number; // 0.0 to 6.0 seconds
  isSelf?: boolean;
  lastUpdate: number;
}

class SinkingEventQueue {
  private queue: SinkingEventItem[] = [];

  public push(item: SinkingEventItem): void {
    if (this.queue.length >= 32) {
      this.queue.shift();
    }
    this.queue.push(item);
  }

  public drain(): SinkingEventItem[] {
    if (this.queue.length === 0) return [];
    const items = this.queue;
    this.queue = [];
    return items;
  }
}

class SinkingShipTracker {
  private activeShips = new Map<string, ActiveSinkingShip>();

  public update(
    shipId: string,
    x: number,
    y: number,
    z: number,
    rotationY: number,
    shipLength: number,
    shipWidth: number,
    progress: number,
    isSelf: boolean = false
  ): void {
    const existing = this.activeShips.get(shipId);
    if (existing) {
      existing.x = x;
      existing.y = y;
      existing.z = z;
      existing.rotationY = rotationY;
      existing.progress = progress;
      existing.lastUpdate = performance.now();
    } else {
      this.activeShips.set(shipId, {
        shipId,
        x,
        y,
        z,
        rotationY,
        shipLength,
        shipWidth,
        progress,
        isSelf,
        lastUpdate: performance.now(),
      });
    }
  }

  public remove(shipId: string): void {
    this.activeShips.delete(shipId);
  }

  public getActiveShips(): ActiveSinkingShip[] {
    const now = performance.now();
    const result: ActiveSinkingShip[] = [];
    for (const [id, ship] of this.activeShips.entries()) {
      // Auto-cleanup stale tracking entries after 8 seconds
      if (now - ship.lastUpdate > 8000 || ship.progress >= 6.0) {
        this.activeShips.delete(id);
      } else {
        result.push(ship);
      }
    }
    return result;
  }
}

export const sinkingEventQueue = new SinkingEventQueue();
export const sinkingShipTracker = new SinkingShipTracker();
