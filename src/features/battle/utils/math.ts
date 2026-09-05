/**
 * Shortest-arc angular interpolation.
 * Wraps differences within [-PI, PI] to prevent 360-degree spin flips.
 */
export function lerpAngle(current: number, target: number, alpha: number): number {
  let diff = (target - current) % (Math.PI * 2);
  if (diff > Math.PI) diff -= Math.PI * 2;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * alpha;
}

/**
 * Standard numeric clamping.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Frame-rate independent exponential decay interpolation.
 */
export function damp(current: number, target: number, smoothing: number, delta: number): number {
  return current + (target - current) * Math.min(1.0, smoothing * delta);
}
