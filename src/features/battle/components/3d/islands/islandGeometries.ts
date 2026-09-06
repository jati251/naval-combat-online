import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';
import type { IslandDefinition } from './types';

const RESOLUTION = 112;
const smooth = (a: number, b: number, x: number) => THREE.MathUtils.smoothstep(x, a, b);
const extent = (island: IslandDefinition) => Math.max(island.sandRadius * 1.32, island.radius * 1.45);

let noiseSeed = 271828;
const noise = createNoise2D(() => {
  noiseSeed = (Math.imul(noiseSeed, 1664525) + 1013904223) >>> 0;
  return noiseSeed / 4294967296;
});
function relief(x: number, z: number, seed: number) {
  const sx = x + seed * 0.731, sz = z - seed * 0.419;
  return noise(sx * 2, sz * 2) * 0.55 + noise(sx * 5, sz * 5) * 0.27 + noise(sx * 12, sz * 12) * 0.12;
}

function surface(island: IslandDefinition, x: number, z: number): number {
  const { radius, height, seed, type } = island;
  const nx = x / radius, nz = z / radius;
  const angle = Math.atan2(nz, nx);
  const coast = 1 + 0.08 * Math.sin(angle * 3 + seed) + 0.045 * Math.cos(angle * 7 - seed);
  const r = Math.hypot(nx, nz) / coast;
  const beachEnd = Math.max(1.13, island.sandRadius / radius);
  const shore = 1.65 - smooth(0.92, beachEnd * 1.13, r) * 5.65;
  const envelope = 1 - smooth(0.55, 1.04, r);
  const n = relief(nx, nz, seed);
  let peak: number;
  if (type === 'volcanic') {
    const crater = Math.hypot(nx + 0.13, nz - 0.08);
    peak = Math.exp(-crater * crater * 2.8) * (0.86 + n * 0.16)
      - Math.exp(-crater * crater * 65) * 0.48;
  } else if (type === 'sea-stack') {
    peak = (1 - smooth(0.48 + n * 0.09, 0.83 + n * 0.08, r)) * (0.76 + n * 0.18);
  } else if (type === 'atoll') {
    peak = Math.exp(-(((r - 0.72) / 0.21) ** 2)) * (0.42 + n * 0.1);
  } else if (type === 'lush-flat') {
    peak = (0.22 + n * 0.12) * (1 - smooth(0.25, 0.96, r));
  } else {
    const spine = nz + Math.sin(nx * 3 + seed) * 0.18;
    const ridge = Math.exp(-spine * spine * (type === 'dense-jungle' ? 10 : 5));
    const shoulders = Math.exp(-((nx + 0.38) ** 2 + (nz - 0.28) ** 2) * 6);
    peak = (ridge * 0.62 + shoulders * 0.24 + n * 0.16) * (1 - smooth(0.25, 1.1, r));
  }
  let y = shore + Math.max(0, peak) * height * envelope;
  if (type === 'atoll') y -= (1 - smooth(0.25, 0.56, r)) * 4.5;
  const gullies = 1 - Math.abs(noise(nx * 9 + seed, nz * 9 - seed));
  const erosion = type === 'lush-flat' || type === 'atoll' ? 0.015 : 0.045;
  y += (gullies - 0.55) * height * erosion * envelope * smooth(2, 7, y);
  y += n * 0.28 * envelope;

  const s = island.settlement;
  if (s && s.type !== 'sea-arch') {
    // Settlements and vegetation live outside the elongated terrain group.
    const wx = x * (island.elongation?.scaleX ?? 1);
    const wz = z * (island.elongation?.scaleZ ?? 1);
    const terrace = s.terraceElevation ?? (s.type === 'kingston-city' ? 3.2 : s.type === 'mayan-temple' ? 12 : s.type === 'pirate-haven' ? 2.5 : 3);
    const terraceRadius = s.terraceRadius ?? (s.type === 'kingston-city' ? 56 : s.type === 'mayan-temple' ? 36 : 24);
    const blend = 1 - smooth(terraceRadius * 0.72, terraceRadius, Math.hypot(wx - s.x, wz - s.z));
    y = THREE.MathUtils.lerp(y, terrace, blend);
  }
  return y;
}

export function getIslandElevation(island: IslandDefinition): number {
  return island.height * 0.5 - 2;
}

export function createIslandTerrainGeometry(island: IslandDefinition): THREE.BufferGeometry {
  const size = extent(island);
  const geo = new THREE.PlaneGeometry(size * 2, size * 2, RESOLUTION, RESOLUTION);
  geo.rotateX(-Math.PI / 2);
  const p = geo.getAttribute('position');
  const uv = geo.getAttribute('uv');
  for (let i = 0; i < p.count; i++) {
    p.setY(i, surface(island, p.getX(i), p.getZ(i)) - island.height * 0.5);
    uv.setXY(i, p.getX(i) / 8, p.getZ(i) / 8);
  }
  geo.computeVertexNormals();
  const normal = geo.getAttribute('normal');
  const colors: number[] = [];
  const sand = new THREE.Color('#dfce9e');
  const rock = new THREE.Color(island.type === 'volcanic' ? '#77756e' : '#b7b1a0');
  const grass = new THREE.Color(island.type === 'dense-jungle' ? '#52663a' : '#78864c');
  const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i) + island.height * 0.5;
    const vegetation = smooth(0.58, 0.91, normal.getY(i)) * smooth(2, 5, y)
      * (island.type === 'volcanic' ? 1 - smooth(island.height * 0.25, island.height * 0.65, y) : 1);
    c.copy(rock).lerp(grass, vegetation).lerp(sand, 1 - smooth(1.4, 3.8, y));
    c.multiplyScalar((0.93 + relief(p.getX(i) / 17, p.getZ(i) / 17, island.seed) * 0.1) * (0.72 + smooth(-0.8, 1.5, y) * 0.28));
    colors.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.computeBoundingSphere();
  return geo;
}

/** Interpolate the same triangles as the rendered grid, including elongated islands. */
export function getTerrainSurfaceY(island: IslandDefinition, relX: number, relZ: number): number {
  const size = extent(island), step = size * 2 / RESOLUTION;
  const x = relX / (island.elongation?.scaleX ?? 1);
  const z = relZ / (island.elongation?.scaleZ ?? 1);
  if (Math.abs(x) > size || Math.abs(z) > size) return -4;
  const gx = (x + size) / step, gz = (z + size) / step;
  const ix = Math.min(RESOLUTION - 1, Math.floor(gx));
  const iz = Math.min(RESOLUTION - 1, Math.floor(gz));
  const u = gx - ix, v = gz - iz;
  const x0 = -size + ix * step, z0 = -size + iz * step;
  const a = surface(island, x0, z0), b = surface(island, x0 + step, z0);
  const c = surface(island, x0, z0 + step), d = surface(island, x0 + step, z0 + step);
  return u + v <= 1 ? a + (b - a) * u + (c - a) * v : d + (c - d) * (1 - u) + (b - d) * (1 - v);
}
