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

  // Smooth angular velocity tracking from heading delta (shortest arc) with EMA filter to absorb packet arrival jitter
  if (buffer.packetTime > 0 && dt < 0.55) {
    const twoPi = Math.PI * 2;
    const diff = ((newHeading - buffer.snapHeading) % twoPi + twoPi + Math.PI) % twoPi - Math.PI;
    const instantTurnRate = Math.max(-2.5, Math.min(2.5, diff / dt));
    // Exponential Moving Average filter: absorbs packet arrival jitter so turning is buttery smooth
    buffer.turnRate = buffer.turnRate === 0
      ? instantTurnRate
      : buffer.turnRate * 0.45 + instantTurnRate * 0.55;
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
 * Computes smoothly extrapolated target position for high-framerate rendering (60-240+ FPS).
 * Reuses internal object to ensure 0 GC heap allocations in the render loop.
 *
 * Utilizes a two-phase continuous kinematic model:
 * 1. Nominal Phase (0 to ~68ms): Linear extrapolation matching server 15Hz snapshot period.
 * 2. Momentum Bleed Phase (~68ms to 520ms): Smooth exponential velocity falloff prevents hard-stops
 *    during network jitter or packet stalls without overshooting or rubber-banding.
 */
export function extrapolatePosition(
  buffer: DeadReckoningBuffer,
  isSunk: boolean = false
): { x: number; y: number; z: number; heading: number } {
  const now = performance.now();
  const elapsed = Math.max(0, (now - buffer.packetTime) / 1000);

  // 30Hz nominal snapshot interval (~33.3ms) with 7ms network jitter padding
  const NOMINAL_TICK_SEC = 0.040;
  let effectiveTime = elapsed;

  if (elapsed > NOMINAL_TICK_SEC) {
    // Bleed off excess momentum smoothly over the next ~450ms (up to ~518ms total jitter buffer)
    // Integral of v0 * exp(-3.5 * t) dt = (1 - exp(-3.5 * t)) / 3.5
    const extraTime = Math.min(0.450, elapsed - NOMINAL_TICK_SEC);
    const decayedDistance = (1.0 - Math.exp(-3.5 * extraTime)) / 3.5;
    effectiveTime = NOMINAL_TICK_SEC + decayedDistance;
  }

  let effectiveTurnTime = elapsed;
  if (elapsed > NOMINAL_TICK_SEC) {
    const extraTime = Math.min(0.450, elapsed - NOMINAL_TICK_SEC);
    const decayedTurnDistance = (1.0 - Math.exp(-4.5 * extraTime)) / 4.5;
    effectiveTurnTime = NOMINAL_TICK_SEC + decayedTurnDistance;
  }

  // Arc velocity rotation: when ship is turning, rotate velocity vector along the chord of the turning circle
  // to prevent straight-line tangent overshoot and snap-back on snapshot arrival
  let effVx = buffer.vx;
  let effVz = buffer.vz;
  if (Math.abs(buffer.turnRate) > 0.015) {
    const halfTurn = buffer.turnRate * effectiveTurnTime * 0.5;
    const cosHalf = Math.cos(halfTurn);
    const sinHalf = Math.sin(halfTurn);
    effVx = buffer.vx * cosHalf - buffer.vz * sinHalf;
    effVz = buffer.vx * sinHalf + buffer.vz * cosHalf;
  }

  const targetX = buffer.snapX + effVx * effectiveTime;
  const targetZ = buffer.snapZ + effVz * effectiveTime;
  const targetY = isSunk ? buffer.snapY : buffer.snapY + 0.85;
  const targetHeading = buffer.snapHeading + buffer.turnRate * effectiveTurnTime;

  const res = buffer.targetResult;
  res.x = targetX;
  res.y = targetY;
  res.z = targetZ;
  res.heading = targetHeading;

  return res;
}

