import { getStormIntensity } from './StormSystem.js';

export interface GerstnerWaveParams {
  direction: [number, number];
  steepness: number;
  wavelength: number;
  speed: number;
}

export const GERSTNER_WAVES: GerstnerWaveParams[] = [
  // Metres and seconds: hull-scale swell with deep-water dispersion.
  { direction: [1, 0.28], steepness: 0.12, wavelength: 28, speed: 6.61 },
  { direction: [0.55, 0.85], steepness: 0.10, wavelength: 17, speed: 5.15 },
  { direction: [-0.35, 0.92], steepness: 0.075, wavelength: 10, speed: 3.95 },
  { direction: [0.88, -0.47], steepness: 0.045, wavelength: 6, speed: 3.06 },
];

export const MAX_WAVE_HEIGHT = GERSTNER_WAVES.reduce((sum, w) => sum + w.steepness * w.wavelength / (2 * Math.PI), 0) * 2.8;

interface PrecomputedWave {
  kx: number;
  kz: number;
  omega: number;
  a: number;
  dxA: number;
  dzA: number;
}

const PRECOMPUTED_DEFAULT_WAVES: PrecomputedWave[] = GERSTNER_WAVES.map((w) => {
  const length = Math.hypot(...w.direction) || 1;
  w.direction = [w.direction[0] / length, w.direction[1] / length];
  const k = (2 * Math.PI) / w.wavelength;
  const a = w.steepness / k;
  return {
    kx: w.direction[0] * k,
    kz: w.direction[1] * k,
    omega: k * w.speed,
    a,
    dxA: w.direction[0] * a,
    dzA: w.direction[1] * a,
  };
});

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

  if (waves === GERSTNER_WAVES) {
    const seaScale = 1 + getStormIntensity(x, z) * 1.8;
    for (let i = 0; i < PRECOMPUTED_DEFAULT_WAVES.length; i++) {
      const pw = PRECOMPUTED_DEFAULT_WAVES[i];
      const phase = pw.kx * x + pw.kz * z - pw.omega * time;
      const cosP = Math.cos(phase);
      const sinP = Math.sin(phase);
      dispX += pw.dxA * cosP;
      dispY += pw.a * sinP;
      dispZ += pw.dzA * cosP;
    }
    return { x: dispX * seaScale, y: dispY * seaScale, z: dispZ * seaScale };
  }

  for (let i = 0; i < waves.length; i++) {
    const wave = waves[i];
    const k = (2 * Math.PI) / wave.wavelength;
    const c = wave.speed;
    const a = wave.steepness / k;
    const length = Math.hypot(...wave.direction) || 1;
    const dx = wave.direction[0] / length;
    const dz = wave.direction[1] / length;

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
 * Inverts the parametric surface so hull probes agree with displaced vertices.
 */
export function getWaveHeight(x: number, z: number, time: number): number {
  let seaScale = 1 + getStormIntensity(x, z) * 1.8;
  // Invert horizontal displacement to sample the rendered world-space surface.
  let sampleX = x;
  let sampleZ = z;
  const iterations = seaScale > 1.01 ? 8 : 4;
  for (let iteration = 0; iteration < iterations; iteration++) {
    if (iterations > 4) seaScale = 1 + getStormIntensity(sampleX, sampleZ) * 1.8;
    let dx = 0, dz = 0;
    for (let i = 0; i < PRECOMPUTED_DEFAULT_WAVES.length; i++) {
      const pw = PRECOMPUTED_DEFAULT_WAVES[i];
      const cosine = Math.cos(pw.kx * sampleX + pw.kz * sampleZ - pw.omega * time);
      dx += pw.dxA * cosine;
      dz += pw.dzA * cosine;
    }
    sampleX = x - dx * seaScale;
    sampleZ = z - dz * seaScale;
  }
  let dispY = 0;
  for (let i = 0; i < PRECOMPUTED_DEFAULT_WAVES.length; i++) {
    const pw = PRECOMPUTED_DEFAULT_WAVES[i];
    dispY += pw.a * Math.sin(pw.kx * sampleX + pw.kz * sampleZ - pw.omega * time);
  }
  if (iterations > 4) seaScale = 1 + getStormIntensity(sampleX, sampleZ) * 1.8;
  return dispY * seaScale;
}

export function getHullWaterPose(x: number, z: number, heading: number, length: number, width: number, time: number,
  out = { y: 0, pitch: 0, roll: 0 }) {
  const fx = Math.sin(heading) * length * 0.4;
  const fz = Math.cos(heading) * length * 0.4;
  const rx = Math.cos(heading) * width * 0.4;
  const rz = -Math.sin(heading) * width * 0.4;
  const bow = getWaveHeight(x + fx, z + fz, time);
  const stern = getWaveHeight(x - fx, z - fz, time);
  const port = getWaveHeight(x - rx, z - rz, time);
  const starboard = getWaveHeight(x + rx, z + rz, time);
  const center = getWaveHeight(x, z, time);
  out.y = (bow + stern + port + starboard + center * 2) / 6;
  out.pitch = -Math.atan2(bow - stern, length * 0.8);
  out.roll = Math.atan2(starboard - port, width * 0.8);
  return out;
}

/**
 * Ultra-fast wave height calculation using direct trigonometric summation (0 inversion iterations).
 * Ideal for high-density multi-ship fleet rendering and particle splash positioning.
 */
export function getFastWaveHeight(x: number, z: number, time: number): number {
  let dispY = 0;
  for (let i = 0; i < PRECOMPUTED_DEFAULT_WAVES.length; i++) {
    const pw = PRECOMPUTED_DEFAULT_WAVES[i];
    dispY += pw.a * Math.sin(pw.kx * x + pw.kz * z - pw.omega * time);
  }
  return dispY;
}

/**
 * Ultra-fast 2-point hull water pose calculation (bow & stern only).
 * Cuts wave mathematics by 95% for non-player and distant vessels while maintaining
 * realistic buoyant rocking and pitch.
 */
export function getFastHullWaterPose(
  x: number,
  z: number,
  heading: number,
  length: number,
  time: number,
  out = { y: 0, pitch: 0, roll: 0 }
): { y: number; pitch: number; roll: number } {
  const fx = Math.sin(heading) * length * 0.38;
  const fz = Math.cos(heading) * length * 0.38;
  const bow = getFastWaveHeight(x + fx, z + fz, time);
  const stern = getFastWaveHeight(x - fx, z - fz, time);
  out.y = (bow + stern) * 0.5;
  out.pitch = -Math.atan2(bow - stern, length * 0.76);
  out.roll = 0;
  return out;
}
