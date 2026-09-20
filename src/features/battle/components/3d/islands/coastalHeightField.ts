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

/** Bake static world-space bathymetry once; no island loops are needed on the GPU. */
export function createCoastalHeightField(islands: readonly IslandDefinition[], resolution = 1024): CoastalHeightField {
  const bounds = islands.filter(i => i.settlement?.type !== 'sea-arch').map(island => {
    const size = getTerrainExtent(island);
    const cos = Math.cos(island.elongation?.angle ?? 0);
    const sin = Math.sin(island.elongation?.angle ?? 0);
    const sx = island.elongation?.scaleX ?? 1;
    const sz = island.elongation?.scaleZ ?? 1;
    return { island, size, cos, sin, sx, sz,
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
  for (const b of bounds) {
    const x0 = Math.max(0, Math.floor((b.island.x - b.x - minX) / dx));
    const x1 = Math.min(resolution - 1, Math.ceil((b.island.x + b.x - minX) / dx));
    const z0 = Math.max(0, Math.floor((b.island.z - b.z - minZ) / dz));
    const z1 = Math.min(resolution - 1, Math.ceil((b.island.z + b.z - minZ) / dz));
    for (let z = z0; z <= z1; z++) {
      for (let x = x0; x <= x1; x++) {
        const rx = minX + x * dx - b.island.x, rz = minZ + z * dz - b.island.z;
        const localX = b.cos * rx - b.sin * rz, localZ = b.sin * rx + b.cos * rz;
        if (Math.abs(localX / b.sx) > b.size || Math.abs(localZ / b.sz) > b.size) continue;
        const height = getTerrainSurfaceY(b.island, localX, localZ);
        const index = (z * resolution + x) * 2;
        const encoded = Math.round(Math.max(0, Math.min(1, (height - MIN_HEIGHT) / HEIGHT_RANGE)) * 65535);
        if (encoded > data[index] * 256 + data[index + 1]) {
          data[index] = encoded >>> 8;
          data[index + 1] = encoded & 255;
        }
      }
    }
  }
  return { data, resolution, minX, minZ, spanX, spanZ };
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
