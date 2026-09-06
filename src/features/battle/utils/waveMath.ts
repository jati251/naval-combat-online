import { GERSTNER_WAVES, type GerstnerWaveParams } from '@/types/game';

interface PrecomputedWave {
  kx: number;
  kz: number;
  omega: number;
  a: number;
  dxA: number;
  dzA: number;
}

const PRECOMPUTED_DEFAULT_WAVES: PrecomputedWave[] = GERSTNER_WAVES.map((w) => {
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

  if (waves === GERSTNER_WAVES) {
    for (let i = 0; i < PRECOMPUTED_DEFAULT_WAVES.length; i++) {
      const pw = PRECOMPUTED_DEFAULT_WAVES[i];
      const phase = pw.kx * x + pw.kz * z - pw.omega * time;
      const cosP = Math.cos(phase);
      const sinP = Math.sin(phase);
      dispX += pw.dxA * cosP;
      dispY += pw.a * sinP;
      dispZ += pw.dzA * cosP;
    }
    return { x: dispX, y: dispY, z: dispZ };
  }

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
  let dispY = 0;
  for (let i = 0; i < PRECOMPUTED_DEFAULT_WAVES.length; i++) {
    const pw = PRECOMPUTED_DEFAULT_WAVES[i];
    dispY += pw.a * Math.sin(pw.kx * x + pw.kz * z - pw.omega * time);
  }
  return dispY;
}

