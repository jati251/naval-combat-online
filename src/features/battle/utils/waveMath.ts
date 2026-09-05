import { GERSTNER_WAVES, type GerstnerWaveParams } from '@/types/game';

/**
 * Calculates wave displacement (x, y, z) at coordinates (x, z) at time t.
 * Matches the server-side formula 1:1.
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

export function getWaveHeight(x: number, z: number, time: number): number {
  return getWaveDisplacement(x, z, time).y;
}
