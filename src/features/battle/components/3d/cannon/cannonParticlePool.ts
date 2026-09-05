import { navalAudio } from '../../../services/navalAudio';

export const MAX_FLASH = 160;
export const MAX_SMOKE = 800;
export const MAX_SPARKS = 360;
export const MAX_WATER_PLUMES = 120;

// Mobile-optimized pool sizes: ~75% reduction in per-frame iteration budget
export const MAX_FLASH_MOBILE = 40;
export const MAX_SMOKE_MOBILE = 200;
export const MAX_SPARKS_MOBILE = 80;
export const MAX_WATER_PLUMES_MOBILE = 30;

export interface FXParticle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  size: number;
  growth: number;
  colorR: number;
  colorG: number;
  colorB: number;
  opacity: number;
}

export function createParticlePool(size: number): FXParticle[] {
  const list: FXParticle[] = [];
  for (let i = 0; i < size; i++) {
    list.push({
      x: 0,
      y: -500,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      life: 0,
      maxLife: 1.0,
      size: 1.0,
      growth: 0,
      colorR: 1,
      colorG: 1,
      colorB: 1,
      opacity: 0,
    });
  }
  return list;
}

let smokeCursor = 0;
let flashCursor = 0;
let sparkCursor = 0;
let plumeCursor = 0;

export function spawnSmoke(
  pool: FXParticle[],
  x: number,
  y: number,
  z: number,
  vx: number,
  vy: number,
  vz: number,
  size: number
): void {
  const len = pool.length;
  if (len === 0) return;

  // Fast circular search for free slot, bounded to 16 steps to eliminate frame hitch
  let slot = -1;
  for (let i = 0; i < 16; i++) {
    const idx = (smokeCursor + i) % len;
    if (pool[idx] && pool[idx].life <= 0) {
      slot = idx;
      smokeCursor = (idx + 1) % len;
      break;
    }
  }
  // If all tested are active, cycle oldest particle
  if (slot === -1) {
    slot = smokeCursor;
    smokeCursor = (smokeCursor + 1) % len;
  }

  const p = pool[slot];
  if (!p) return;

  p.x = x;
  p.y = y;
  p.z = z;
  p.vx = vx;
  p.vy = vy;
  p.vz = vz;
  p.maxLife = 2.4 + Math.random() * 1.8;
  p.life = p.maxLife;
  p.size = size;
  p.growth = 3.6 + Math.random() * 2.8;
  p.opacity = 0.88;
}

export function spawnFlash(
  pool: FXParticle[],
  x: number,
  y: number,
  z: number,
  size: number
): void {
  const len = pool.length;
  if (len === 0) return;

  let slot = -1;
  for (let i = 0; i < 12; i++) {
    const idx = (flashCursor + i) % len;
    if (pool[idx] && pool[idx].life <= 0) {
      slot = idx;
      flashCursor = (idx + 1) % len;
      break;
    }
  }
  if (slot === -1) {
    slot = flashCursor;
    flashCursor = (flashCursor + 1) % len;
  }

  const p = pool[slot];
  if (!p) return;

  p.x = x;
  p.y = y;
  p.z = z;
  p.vx = 0;
  p.vy = 0;
  p.vz = 0;
  p.maxLife = 0.12 + Math.random() * 0.06;
  p.life = p.maxLife;
  p.size = size * 1.35;
  p.growth = 1.8;
  p.opacity = 1.0;
}

export function spawnSparks(
  pool: FXParticle[],
  x: number,
  y: number,
  z: number,
  dirX: number,
  dirZ: number
): void {
  const len = pool.length;
  if (len === 0) return;

  const sparkCount = 10 + Math.floor(Math.random() * 6);
  for (let s = 0; s < sparkCount; s++) {
    const slot = sparkCursor;
    sparkCursor = (sparkCursor + 1) % len;

    const p = pool[slot];
    if (!p) continue;

    p.x = x;
    p.y = y;
    p.z = z;
    const speed = 14.0 + Math.random() * 18.0;
    p.vx = dirX * speed + (Math.random() - 0.5) * 9.0;
    p.vy = 3.5 + Math.random() * 8.0;
    p.vz = dirZ * speed + (Math.random() - 0.5) * 9.0;
    p.maxLife = 0.45 + Math.random() * 0.4;
    p.life = p.maxLife;
    p.size = 0.8 + Math.random() * 0.9;
    p.growth = -0.4;
    p.opacity = 1.0;
  }
}

export function spawnWaterImpact(
  plumePool: FXParticle[],
  smokePool: FXParticle[],
  x: number,
  z: number
): void {
  const plumeLen = plumePool.length;
  if (plumeLen > 0) {
    let slot = -1;
    for (let i = 0; i < 8; i++) {
      const idx = (plumeCursor + i) % plumeLen;
      if (plumePool[idx] && plumePool[idx].life <= 0) {
        slot = idx;
        plumeCursor = (idx + 1) % plumeLen;
        break;
      }
    }
    if (slot === -1) {
      slot = plumeCursor;
      plumeCursor = (plumeCursor + 1) % plumeLen;
    }

    const p = plumePool[slot];
    if (p) {
      p.x = x;
      p.y = 1.6;
      p.z = z;
      p.vx = 0;
      p.vy = 2.4;
      p.vz = 0;
      p.maxLife = 0.85 + Math.random() * 0.3;
      p.life = p.maxLife;
      p.size = 4.0 + Math.random() * 2.0;
      p.growth = 2.0;
      p.opacity = 0.9;
    }
  }

  // Reduced water plume froth on impact
  for (let d = 0; d < 4; d++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 3.0 + Math.random() * 5.0;
    spawnSmoke(
      smokePool,
      x,
      0.4,
      z,
      Math.cos(angle) * speed,
      2.5 + Math.random() * 3.0,
      Math.sin(angle) * speed,
      1.6
    );
  }

  navalAudio.playWaterSplash();
}
