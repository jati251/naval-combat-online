export interface LocalShipTelemetryData {
  x: number;
  y: number;
  z: number;
  heading: number;
  speed: number;
  timestamp: number;
}

/**
 * Ultra-High-Performance Non-Reactive Telemetry Service for the local player's vessel.
 * Stores immediate client-predicted 3D transform (updated at 60-144 FPS inside ShipEntity useFrame).
 * Read directly by CompassMinimap and Chase Camera with ZERO React re-renders or GC allocations.
 */
class LocalShipTelemetryService {
  private data: LocalShipTelemetryData = {
    x: 0,
    y: 0,
    z: 0,
    heading: 0,
    speed: 0,
    timestamp: 0,
  };

  private initialized = false;

  public update(x: number, y: number, z: number, heading: number, speed: number): void {
    this.data.x = x;
    this.data.y = y;
    this.data.z = z;
    this.data.heading = heading;
    this.data.speed = speed;
    this.data.timestamp = performance.now();
    this.initialized = true;
  }

  public get(): LocalShipTelemetryData {
    return this.data;
  }

  public hasData(): boolean {
    return this.initialized && performance.now() - this.data.timestamp < 1000;
  }

  public reset(): void {
    this.initialized = false;
  }
}

export const localShipTelemetry = new LocalShipTelemetryService();
