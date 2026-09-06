/**
 * Shortest-arc angular interpolation.
 * Wraps differences within [-PI, PI] to prevent 360-degree spin flips.
 */
export function lerpAngle(current: number, target: number, alpha: number): number {
  const twoPi = Math.PI * 2;
  const diff = ((target - current) % twoPi + twoPi + Math.PI) % twoPi - Math.PI;
  return current + diff * Math.min(1.0, Math.max(0.0, alpha));
}

/**
 * Standard numeric clamping.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Frame-rate independent exponential decay interpolation (Three.js MathUtils.damp formula).
 * Resolves micro-stutter on high-refresh-rate displays (144Hz - 240Hz+).
 */
export function damp(current: number, target: number, smoothing: number, delta: number): number {
  return target + (current - target) * Math.exp(-smoothing * delta);
}

/**
 * Shortest-arc angular interpolation with frame-rate independent exponential decay.
 * Guarantees identical angular dampening response across 60Hz, 120Hz, 144Hz, and 240Hz.
 */
export function dampAngle(current: number, target: number, smoothing: number, delta: number): number {
  const twoPi = Math.PI * 2;
  const diff = ((target - current) % twoPi + twoPi + Math.PI) % twoPi - Math.PI;
  return current + diff * (1.0 - Math.exp(-smoothing * delta));
}

