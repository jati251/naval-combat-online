export interface GerstnerWaveParams {
  direction: [number, number];
  steepness: number;
  wavelength: number;
  speed: number;
}

export const GERSTNER_WAVES: GerstnerWaveParams[] = [
  // 1. Dominant gentle Caribbean swell (long rolling crest, ~1.3m amplitude)
  { direction: [1.0, 0.25], steepness: 0.10, wavelength: 85.0, speed: 2.8 },
  // 2. Secondary diagonal swell (~0.55m amplitude)
  { direction: [0.55, 0.85], steepness: 0.08, wavelength: 44.0, speed: 2.2 },
  // 3. Surface chop wave (~0.2m amplitude)
  { direction: [-0.35, 0.92], steepness: 0.06, wavelength: 22.0, speed: 1.7 },
  // 4. Fine capillary ripple (~0.07m amplitude)
  { direction: [-0.75, -0.65], steepness: 0.04, wavelength: 11.0, speed: 1.3 },
];

/**
 * Calculates wave displacement at world coordinate (x, z) at a specific time in seconds.
 * Pure math without DOM or Three.js dependencies, fully deterministic.
 */
export function getWaveDisplacement(
  x: number,
  z: number,
  time: number,
  waves: GerstnerWaveParams[] = GERSTNER_WAVES
): { x: number; y: number; z: number } {
  let dispX = 0;
  let dispY = 0;
  let dispZ = 0;

  for (let i = 0; i < waves.length; i++) {
    const wave = waves[i];
    const k = (2 * Math.PI) / wave.wavelength;
    const c = wave.speed;
    const a = wave.steepness / k;
    const dx = wave.direction[0];
    const dz = wave.direction[1];

    const dot = dx * x + dz * z;
    const phase = k * (dot - c * time);

    const cosP = Math.cos(phase);
    const sinP = Math.sin(phase);

    dispX += dx * (a * cosP);
    dispY += a * sinP;
    dispZ += dz * (a * cosP);
  }

  return { x: dispX, y: dispY, z: dispZ };
}

/**
 * Calculates water surface height Y at world coordinate (x, z) at time t.
 */
export function getWaveHeight(x: number, z: number, time: number): number {
  return getWaveDisplacement(x, z, time).y;
}
