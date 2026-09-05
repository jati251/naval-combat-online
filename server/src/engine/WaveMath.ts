export interface GerstnerWaveParams {
  direction: [number, number];
  steepness: number;
  wavelength: number;
  speed: number;
}

export const GERSTNER_WAVES: GerstnerWaveParams[] = [
  { direction: [1.0, 0.3], steepness: 0.32, wavelength: 52.0, speed: 3.4 },
  { direction: [0.6, 0.8], steepness: 0.22, wavelength: 28.0, speed: 2.6 },
  { direction: [-0.3, 0.95], steepness: 0.18, wavelength: 16.0, speed: 2.0 },
  { direction: [-0.7, -0.7], steepness: 0.12, wavelength: 8.0, speed: 1.4 },
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
