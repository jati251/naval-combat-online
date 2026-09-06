export interface FireEventItem {
  id: string;
  ownerId: string;
  side: 'left' | 'right';
  timestamp: number;
}

/**
 * Ultra-High-Performance Non-Reactive Fire Event Ring Queue.
 * Completely bypasses React / Zustand component re-renders during high-intensity 16-bot broadside volleys.
 * Drained directly inside CannonFX2D useFrame loop at 60-144 FPS.
 */
class FireEventQueue {
  private queue: FireEventItem[] = [];

  public push(item: FireEventItem): void {
    if (this.queue.length >= 60) {
      this.queue.shift();
    }
    this.queue.push(item);
  }

  public drain(): FireEventItem[] {
    if (this.queue.length === 0) return [];
    const items = this.queue;
    this.queue = [];
    return items;
  }
}

export const fireEventQueue = new FireEventQueue();
