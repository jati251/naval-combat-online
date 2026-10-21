import { getTerrainExtent, getTerrainSurfaceY } from './islandGeometries';
import type { IslandDefinition } from './types';

export interface CoastalHeightField {
  data: Uint8Array;
  resolution: number;
  minX: number;
  minZ: number;
  spanX: number;
  spanZ: number;
}

const MIN_HEIGHT = -8;
const HEIGHT_RANGE = 16;
const decode = (data: Uint8Array, index: number) => MIN_HEIGHT + (data[index] * 256 + data[index + 1]) * HEIGHT_RANGE / 65535;

const coastalFieldCache = new WeakMap<readonly IslandDefinition[], Map<number, CoastalHeightField>>();

/** Bake static world-space bathymetry once; no island loops are needed on the GPU. */
export function createCoastalHeightField(islands: readonly IslandDefinition[], resolution = 1024): CoastalHeightField {
  let byRes = coastalFieldCache.get(islands);
  if (byRes) {
    const cached = byRes.get(resolution);
    if (cached) return cached;
  } else {
    byRes = new Map<number, CoastalHeightField>();
    coastalFieldCache.set(islands, byRes);
  }

  const bounds = islands.filter(i => i.settlement?.type !== 'sea-arch').map(island => {
    const size = getTerrainExtent(island);
    const cos = Math.cos(island.elongation?.angle ?? 0);
    const sin = Math.sin(island.elongation?.angle ?? 0);
    const sx = island.elongation?.scaleX ?? 1;
    const sz = island.elongation?.scaleZ ?? 1;
    return { island, size, cos, sin, sx, sz,
      maxLocalX: size * sx,
      maxLocalZ: size * sz,
      x: size * (Math.abs(cos * sx) + Math.abs(sin * sz)),
      z: size * (Math.abs(sin * sx) + Math.abs(cos * sz)) };
  });
  const minX = Math.min(-1, ...bounds.map(b => b.island.x - b.x)) - 8;
  const minZ = Math.min(-1, ...bounds.map(b => b.island.z - b.z)) - 8;
  const maxX = Math.max(1, ...bounds.map(b => b.island.x + b.x)) + 8;
  const maxZ = Math.max(1, ...bounds.map(b => b.island.z + b.z)) + 8;
  const spanX = maxX - minX, spanZ = maxZ - minZ;
  const dx = spanX / (resolution - 1), dz = spanZ / (resolution - 1);
  const data = new Uint8Array(resolution * resolution * 2);
  const invHeightRange = 65535 / HEIGHT_RANGE;

  for (const b of bounds) {
    const x0 = Math.max(0, Math.floor((b.island.x - b.x - minX) / dx));
    const x1 = Math.min(resolution - 1, Math.ceil((b.island.x + b.x - minX) / dx));
    const z0 = Math.max(0, Math.floor((b.island.z - b.z - minZ) / dz));
    const z1 = Math.min(resolution - 1, Math.ceil((b.island.z + b.z - minZ) / dz));
    const baseRx = minX - b.island.x;
    const baseRz = minZ - b.island.z;
    const cos = b.cos, sin = b.sin;
    const maxLocalX = b.maxLocalX, maxLocalZ = b.maxLocalZ;

    for (let z = z0; z <= z1; z++) {
      const rz = baseRz + z * dz;
      const sinRz = sin * rz;
      const cosRz = cos * rz;
      const rowBase = z * resolution;
      for (let x = x0; x <= x1; x++) {
        const rx = baseRx + x * dx;
        const localX = cos * rx - sinRz;
        if (localX > maxLocalX || localX < -maxLocalX) continue;
        const localZ = sin * rx + cosRz;
        if (localZ > maxLocalZ || localZ < -maxLocalZ) continue;
        const height = getTerrainSurfaceY(b.island, localX, localZ);
        const index = (rowBase + x) * 2;
        const norm = (height - MIN_HEIGHT) * invHeightRange;
        const encoded = norm <= 0 ? 0 : norm >= 65535 ? 65535 : (norm + 0.5) | 0;
        if (encoded > ((data[index] << 8) | data[index + 1])) {
          data[index] = encoded >>> 8;
          data[index + 1] = encoded & 255;
        }
      }
    }
  }
  const result = { data, resolution, minX, minZ, spanX, spanZ };
  byRes.set(resolution, result);
  return result;
}

/** Matches linear texture filtering, including the half-texel offset in GLSL. */
export function sampleCoastalHeight(field: CoastalHeightField, x: number, z: number): number {
  const u = (x - field.minX) / field.spanX, v = (z - field.minZ) / field.spanZ;
  if (u < 0 || v < 0 || u > 1 || v > 1) return MIN_HEIGHT;
  const gx = u * (field.resolution - 1), gz = v * (field.resolution - 1);
  const ix = Math.min(field.resolution - 2, Math.floor(gx));
  const iz = Math.min(field.resolution - 2, Math.floor(gz));
  const fx = gx - ix, fz = gz - iz;
  const i = (iz * field.resolution + ix) * 2;
  const a = decode(field.data, i), b = decode(field.data, i + 2);
  const c = decode(field.data, i + field.resolution * 2), d = decode(field.data, i + field.resolution * 2 + 2);
  return (a + (b - a) * fx) * (1 - fz) + (c + (d - c) * fx) * fz;
}
