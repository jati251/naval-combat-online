export interface DeadReckoningBuffer {
  snapX: number;
  snapY: number;
  snapZ: number;
  snapHeading: number;
  vx: number;
  vz: number;
  turnRate: number;
  packetTime: number;
  targetResult: { x: number; y: number; z: number; heading: number };
}

export function createDeadReckoningBuffer(
  x: number = 0,
  y: number = 0,
  z: number = 0,
  heading: number = 0
): DeadReckoningBuffer {
  return {
    snapX: x,
    snapY: y,
    snapZ: z,
    snapHeading: heading,
    vx: 0,
    vz: 0,
    turnRate: 0,
    packetTime: performance.now(),
    targetResult: { x, y, z, heading },
  };
}

/**
 * Updates dead reckoning buffer when a fresh server snapshot arrives.
 * Fast numeric change detection (zero string allocation churn).
 */
export function pushSnapshot(
  buffer: DeadReckoningBuffer,
  newX: number,
  newY: number,
  newZ: number,
  newHeading: number,
  vx: number = 0,
  vz: number = 0
): void {
  // Fast numeric guard: ignore duplicate or un-updated snapshots without string allocations
  if (
    newX === buffer.snapX &&
    newZ === buffer.snapZ &&
    newHeading === buffer.snapHeading &&
    vx === buffer.vx &&
    vz === buffer.vz
  ) {
    return;
  }

  const now = performance.now();
  const dt = Math.max(0.015, (now - buffer.packetTime) / 1000);

  // Smooth angular velocity tracking from heading delta (shortest arc)
  if (buffer.packetTime > 0 && dt < 0.25) {
    const twoPi = Math.PI * 2;
    const diff = ((newHeading - buffer.snapHeading) % twoPi + twoPi + Math.PI) % twoPi - Math.PI;
    buffer.turnRate = Math.max(-2.5, Math.min(2.5, diff / dt));
  } else {
    buffer.turnRate = 0;
  }

  buffer.packetTime = now;
  buffer.snapX = newX;
  buffer.snapY = newY;
  buffer.snapZ = newZ;
  buffer.snapHeading = newHeading;
  buffer.vx = vx;
  buffer.vz = vz;
}

/**
 * Computes smoothly extrapolated target position for high-framerate rendering (60-144 FPS).
 * Reuses internal object to ensure 0 GC heap allocations in the render loop.
 */
export function extrapolatePosition(
  buffer: DeadReckoningBuffer,
  isSunk: boolean = false
): { x: number; y: number; z: number; heading: number } {
  const now = performance.now();
  // Tightly bound extrapolation to 45ms to smoothly bridge 33ms server ticks without overshoot snapback
  const elapsed = Math.min(0.045, (now - buffer.packetTime) / 1000);

  const targetX = buffer.snapX + buffer.vx * elapsed;
  const targetZ = buffer.snapZ + buffer.vz * elapsed;
  const targetY = isSunk ? buffer.snapY : buffer.snapY + 0.85;
  const targetHeading = buffer.snapHeading + buffer.turnRate * elapsed;

  const res = buffer.targetResult;
  res.x = targetX;
  res.y = targetY;
  res.z = targetZ;
  res.heading = targetHeading;

  return res;
}
