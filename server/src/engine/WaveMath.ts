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
  const length = Math.hypot(w.direction[0], w.direction[1]) || 1;
  w.direction[0] /= length;
  w.direction[1] /= length;
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

const W0 = PRECOMPUTED_DEFAULT_WAVES[0];
const W1 = PRECOMPUTED_DEFAULT_WAVES[1];
const W2 = PRECOMPUTED_DEFAULT_WAVES[2];
const W3 = PRECOMPUTED_DEFAULT_WAVES[3];

const W0_KX = W0.kx, W0_KZ = W0.kz, W0_OMEGA = W0.omega, W0_A = W0.a, W0_DXA = W0.dxA, W0_DZA = W0.dzA;
const W1_KX = W1.kx, W1_KZ = W1.kz, W1_OMEGA = W1.omega, W1_A = W1.a, W1_DXA = W1.dxA, W1_DZA = W1.dzA;
const W2_KX = W2.kx, W2_KZ = W2.kz, W2_OMEGA = W2.omega, W2_A = W2.a, W2_DXA = W2.dxA, W2_DZA = W2.dzA;
const W3_KX = W3.kx, W3_KZ = W3.kz, W3_OMEGA = W3.omega, W3_A = W3.a, W3_DXA = W3.dxA, W3_DZA = W3.dzA;

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
  if (waves === GERSTNER_WAVES) {
    const seaScale = 1 + getStormIntensity(x, z) * 1.8;
    const p0 = W0_KX * x + W0_KZ * z - W0_OMEGA * time;
    const p1 = W1_KX * x + W1_KZ * z - W1_OMEGA * time;
    const p2 = W2_KX * x + W2_KZ * z - W2_OMEGA * time;
    const p3 = W3_KX * x + W3_KZ * z - W3_OMEGA * time;

    const c0 = Math.cos(p0), s0 = Math.sin(p0);
    const c1 = Math.cos(p1), s1 = Math.sin(p1);
    const c2 = Math.cos(p2), s2 = Math.sin(p2);
    const c3 = Math.cos(p3), s3 = Math.sin(p3);

    const dispX = W0_DXA * c0 + W1_DXA * c1 + W2_DXA * c2 + W3_DXA * c3;
    const dispY = W0_A * s0 + W1_A * s1 + W2_A * s2 + W3_A * s3;
    const dispZ = W0_DZA * c0 + W1_DZA * c1 + W2_DZA * c2 + W3_DZA * c3;

    return { x: dispX * seaScale, y: dispY * seaScale, z: dispZ * seaScale };
  }

  let dispX = 0;
  let dispY = 0;
  let dispZ = 0;

  for (let i = 0; i < waves.length; i++) {
    const wave = waves[i];
    const k = (2 * Math.PI) / wave.wavelength;
    const c = wave.speed;
    const a = wave.steepness / k;
    const length = Math.hypot(wave.direction[0], wave.direction[1]) || 1;
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
  const wt0 = W0_OMEGA * time;
  const wt1 = W1_OMEGA * time;
  const wt2 = W2_OMEGA * time;
  const wt3 = W3_OMEGA * time;

  if (seaScale > 1.01) {
    for (let iteration = 0; iteration < 8; iteration++) {
      seaScale = 1 + getStormIntensity(sampleX, sampleZ) * 1.8;
      const c0 = Math.cos(W0_KX * sampleX + W0_KZ * sampleZ - wt0);
      const c1 = Math.cos(W1_KX * sampleX + W1_KZ * sampleZ - wt1);
      const c2 = Math.cos(W2_KX * sampleX + W2_KZ * sampleZ - wt2);
      const c3 = Math.cos(W3_KX * sampleX + W3_KZ * sampleZ - wt3);
      const nextX = x - (W0_DXA * c0 + W1_DXA * c1 + W2_DXA * c2 + W3_DXA * c3) * seaScale;
      const nextZ = z - (W0_DZA * c0 + W1_DZA * c1 + W2_DZA * c2 + W3_DZA * c3) * seaScale;
      const err = Math.abs(nextX - sampleX) + Math.abs(nextZ - sampleZ);
      sampleX = nextX;
      sampleZ = nextZ;
      if (err < 0.0015) break;
    }
    seaScale = 1 + getStormIntensity(sampleX, sampleZ) * 1.8;
  } else {
    for (let iteration = 0; iteration < 4; iteration++) {
      const c0 = Math.cos(W0_KX * sampleX + W0_KZ * sampleZ - wt0);
      const c1 = Math.cos(W1_KX * sampleX + W1_KZ * sampleZ - wt1);
      const c2 = Math.cos(W2_KX * sampleX + W2_KZ * sampleZ - wt2);
      const c3 = Math.cos(W3_KX * sampleX + W3_KZ * sampleZ - wt3);
      const nextX = x - (W0_DXA * c0 + W1_DXA * c1 + W2_DXA * c2 + W3_DXA * c3);
      const nextZ = z - (W0_DZA * c0 + W1_DZA * c1 + W2_DZA * c2 + W3_DZA * c3);
      const err = Math.abs(nextX - sampleX) + Math.abs(nextZ - sampleZ);
      sampleX = nextX;
      sampleZ = nextZ;
      if (err < 0.0008) break;
    }
  }

  const dispY =
    W0_A * Math.sin(W0_KX * sampleX + W0_KZ * sampleZ - wt0) +
    W1_A * Math.sin(W1_KX * sampleX + W1_KZ * sampleZ - wt1) +
    W2_A * Math.sin(W2_KX * sampleX + W2_KZ * sampleZ - wt2) +
    W3_A * Math.sin(W3_KX * sampleX + W3_KZ * sampleZ - wt3);

  return dispY * seaScale;
}

export function getHullWaterPose(x: number, z: number, heading: number, length: number, width: number, time: number,
  out = { y: 0, pitch: 0, roll: 0 }) {
  const sinH = Math.sin(heading);
  const cosH = Math.cos(heading);
  const halfLen = length * 0.4;
  const halfWid = width * 0.4;
  const fx = sinH * halfLen;
  const fz = cosH * halfLen;
  const rx = cosH * halfWid;
  const rz = -sinH * halfWid;
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
  const seaScale = 1 + getStormIntensity(x, z) * 1.8;
  const dispY =
    W0_A * Math.sin(W0_KX * x + W0_KZ * z - W0_OMEGA * time) +
    W1_A * Math.sin(W1_KX * x + W1_KZ * z - W1_OMEGA * time) +
    W2_A * Math.sin(W2_KX * x + W2_KZ * z - W2_OMEGA * time) +
    W3_A * Math.sin(W3_KX * x + W3_KZ * z - W3_OMEGA * time);
  return dispY * seaScale;
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
): { y: number; pitch: 0; roll: 0 } | { y: number; pitch: number; roll: number } {
  const fx = Math.sin(heading) * length * 0.38;
  const fz = Math.cos(heading) * length * 0.38;
  const bow = getFastWaveHeight(x + fx, z + fz, time);
  const stern = getFastWaveHeight(x - fx, z - fz, time);
  out.y = (bow + stern) * 0.5;
  out.pitch = -Math.atan2(bow - stern, length * 0.76);
  out.roll = 0;
  return out;
}
