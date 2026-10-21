import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';
import type { IslandDefinition } from './types';

const RESOLUTION = 112;
const smooth = (a: number, b: number, x: number) => THREE.MathUtils.smoothstep(x, a, b);
export const getTerrainExtent = (island: IslandDefinition) => Math.max(island.sandRadius * 1.32, island.radius * 1.45);
interface TerrainGridRecord {
  heights: Float64Array;
  size: number;
  invStep: number;
  invScaleX: number;
  invScaleZ: number;
}

const terrainHeights = new WeakMap<IslandDefinition, TerrainGridRecord>();
const terrainGeometries = new WeakMap<IslandDefinition, THREE.BufferGeometry>();
let lastQueriedIsland: IslandDefinition | null = null;
let lastQueriedRecord: TerrainGridRecord | null = null;

function getTerrainRecord(island: IslandDefinition): TerrainGridRecord {
  if (island === lastQueriedIsland && lastQueriedRecord !== null) {
    return lastQueriedRecord;
  }
  let record = terrainHeights.get(island);
  if (!record) {
    const size = getTerrainExtent(island);
    const step = (size * 2) / RESOLUTION;
    const heights = new Float64Array((RESOLUTION + 1) ** 2);
    for (let z = 0; z <= RESOLUTION; z++) {
      const worldZ = -size + z * step;
      const rowOffset = z * (RESOLUTION + 1);
      for (let x = 0; x <= RESOLUTION; x++) {
        heights[rowOffset + x] = surface(island, -size + x * step, worldZ);
      }
    }
    record = {
      heights,
      size,
      invStep: 1 / step,
      invScaleX: 1 / (island.elongation?.scaleX ?? 1),
      invScaleZ: 1 / (island.elongation?.scaleZ ?? 1),
    };
    terrainHeights.set(island, record);
  }
  lastQueriedIsland = island;
  lastQueriedRecord = record;
  return record;
}

function getHeightGrid(island: IslandDefinition): Float64Array {
  return getTerrainRecord(island).heights;
}

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
  const rawX = x / radius, rawZ = z / radius;
  const warp = type === 'atoll' ? 0 : type === 'volcanic' ? 0.12 * smooth(0.2, 0.6, Math.hypot(rawX + 0.13, rawZ - 0.08)) : 0.12;
  const nx = rawX + noise(rawX * 2.2 + seed, rawZ * 2.2) * warp;
  const nz = rawZ + noise(rawX * 2.2, rawZ * 2.2 - seed) * warp;
  const angle = Math.atan2(nz, nx);
  const coast = type === 'atoll' ? 1 + 0.08 * Math.sin(angle * 3 + seed) + 0.045 * Math.cos(angle * 7 - seed) : 0.96 + 0.11 * Math.sin(angle * 3 + seed) + 0.065 * Math.cos(angle * 7 - seed)
    + 0.035 * Math.sin(angle * 13 + seed * 0.7);
  const r = Math.hypot(nx, nz) / coast;
  const beachEnd = Math.max(1.13, island.sandRadius / radius);
  const shore = 1.65 - smooth(0.92, beachEnd * 1.13, r) * 5.65;
  const envelope = 1 - smooth(0.55, 1.04, r);
  const n = relief(nx, nz, seed);
  let peak: number;
  if (type === 'volcanic') {
    const crater = Math.hypot(rawX + 0.13, rawZ - 0.08);
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
  if (type !== 'atoll' && type !== 'lush-flat') {
    const ridgeNoise = 1 - Math.abs(noise(nx * 4.3 + seed * 0.3, nz * 4.3 - seed));
    const ridge = ridgeNoise * ridgeNoise;
    const ravine = Math.pow(1 - Math.abs(noise(nx * 3.2 - seed, nz * 6.5 + seed)), 7);
    const land = envelope * smooth(2, 8, y) * (type === 'volcanic' ? smooth(0.2, 0.4, Math.hypot(rawX + 0.13, rawZ - 0.08)) : 1);
    // Erosion cuts broad gullies into the main forms. Keep the relief proportional to
    // the island height so it reads as geology instead of a quantized staircase.
    y += (ridge * 0.14 - ravine * 0.10 - 0.02) * height * land;
  }

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

export function getCachedIslandTerrainGeometry(island: IslandDefinition): THREE.BufferGeometry {
  let geo = terrainGeometries.get(island);
  if (!geo) {
    geo = createIslandTerrainGeometry(island);
    terrainGeometries.set(island, geo);
  }
  return geo;
}

export function createIslandTerrainGeometry(island: IslandDefinition): THREE.BufferGeometry {
  const size = getTerrainExtent(island);
  const heights = getHeightGrid(island);
  const geo = new THREE.PlaneGeometry(size * 2, size * 2, RESOLUTION, RESOLUTION);
  geo.rotateX(-Math.PI / 2);
  const p = geo.getAttribute('position');
  const uv = geo.getAttribute('uv');
  const posArr = p.array as Float32Array;
  const uvArr = uv.array as Float32Array;
  const halfHeight = island.height * 0.5;
  const count = p.count;

  for (let i = 0; i < count; i++) {
    const idx3 = i * 3;
    const idx2 = i * 2;
    posArr[idx3 + 1] = heights[i] - halfHeight;
    uvArr[idx2] = posArr[idx3] * 0.125;
    uvArr[idx2 + 1] = posArr[idx3 + 2] * 0.125;
  }
  geo.computeVertexNormals();
  const normal = geo.getAttribute('normal');
  const normArr = normal.array as Float32Array;
  const colors = new Float32Array(count * 3);
  const sand = new THREE.Color('#dfce9e');
  const sandWet = new THREE.Color('#bfae7e');
  const cliffRock = new THREE.Color(
    island.type === 'volcanic' ? '#68655e' :
    island.type === 'sea-stack' ? '#ada696' : '#a8a292'
  );
  const mossyRock = new THREE.Color(
    island.type === 'volcanic' ? '#5c6052' : '#929d78'
  );

  // Vibrant tropical forest canopy palettes
  const jungleDeep = new THREE.Color('#456a26');  // Soft canopy shadow
  const jungleCore = new THREE.Color('#5b8530');  // Lush broadleaf rainforest canopy
  const jungleSun = new THREE.Color('#749e3b');   // Sunlit treetop highlights
  const jungleCrest = new THREE.Color('#88b348'); // Bright tropical canopy shoots

  const hillsDeep = new THREE.Color('#4d7228');   // Woodland hollows
  const hillsCore = new THREE.Color('#648d33');   // Rolling verdant forest
  const hillsSun = new THREE.Color('#7ca742');    // Sunlit grassland & canopy
  const hillsCrest = new THREE.Color('#8ebd4b');  // Bright sunny ridge crests

  const stackDeep = new THREE.Color('#486d28');   // Karst summit canopy
  const stackCore = new THREE.Color('#5f8a32');   // Karst summit jungle foliage
  const stackSun = new THREE.Color('#79a33f');    // Karst summit sunlit crown

  const c = new THREE.Color();
  const rockCol = new THREE.Color();
  const forestCol = new THREE.Color();
  const tideSand = new THREE.Color();

  const seed = island.seed;
  const seedGroveX = seed * 0.17, seedGroveZ = seed * 0.23;
  const seedCrownX = seed * 0.63, seedCrownZ = seed * 0.41;
  const seedFolX = seed * 1.11, seedFolZ = seed * 0.89;

  for (let i = 0; i < count; i++) {
    const idx3 = i * 3;
    const px = posArr[idx3], pz = posArr[idx3 + 2];
    const y = posArr[idx3 + 1] + halfHeight;
    const ny = normArr[idx3 + 1];

    // 1. Procedural Forest Canopy Simulation
    // Macro grove variation (~20m)
    const grove = noise(px * 0.05 + seedGroveX, pz * 0.05 - seedGroveZ);
    // Tree crown clumps (~4.5m)
    const crown = noise(px * 0.24 - seedCrownX, pz * 0.24 + seedCrownZ);
    // Leafy micro-texture (~1.8m)
    const foliage = noise(px * 0.58 + seedFolX, pz * 0.58 - seedFolZ);
    // Combined tree crown structure (-1.0 to 1.0)
    const canopyClump = crown * 0.55 + foliage * 0.30 + grove * 0.15;

    // Forest color gradient based on tree crown clumping
    if (island.type === 'dense-jungle') {
      if (canopyClump > 0.25) {
        forestCol.copy(jungleSun).lerp(jungleCrest, smooth(0.25, 0.85, canopyClump));
      } else if (canopyClump > -0.15) {
        forestCol.copy(jungleCore).lerp(jungleSun, smooth(-0.15, 0.25, canopyClump));
      } else {
        forestCol.copy(jungleDeep).lerp(jungleCore, smooth(-0.85, -0.15, canopyClump));
      }
    } else if (island.type === 'verdant-hills') {
      if (canopyClump > 0.25) {
        forestCol.copy(hillsSun).lerp(hillsCrest, smooth(0.25, 0.85, canopyClump));
      } else if (canopyClump > -0.15) {
        forestCol.copy(hillsCore).lerp(hillsSun, smooth(-0.15, 0.25, canopyClump));
      } else {
        forestCol.copy(hillsDeep).lerp(hillsCore, smooth(-0.85, -0.15, canopyClump));
      }
    } else if (island.type === 'sea-stack') {
      if (canopyClump > 0.1) {
        forestCol.copy(stackCore).lerp(stackSun, smooth(0.1, 0.75, canopyClump));
      } else {
        forestCol.copy(stackDeep).lerp(stackCore, smooth(-0.75, 0.1, canopyClump));
      }
    } else {
      if (canopyClump > 0.2) {
        forestCol.copy(jungleCore).lerp(jungleSun, smooth(0.2, 0.8, canopyClump));
      } else {
        forestCol.copy(jungleDeep).lerp(jungleCore, smooth(-0.8, 0.2, canopyClump));
      }
    }

    // 2. Geological Rock / Cliff Detailing (reuses multi-octave noise samples)
    const cliffRelief = grove * 0.55 + crown * 0.27 + foliage * 0.12;
    rockCol.copy(cliffRock).lerp(mossyRock, smooth(0.1, 0.7, cliffRelief + (1 - ny) * 0.3));

    // 3. Slope & Elevation Vegetation Coverage per Island Archetype
    let vegetation: number;
    const heightEmerge = smooth(1.6, 3.8, y);

    if (island.type === 'dense-jungle') {
      const slopeCoverage = smooth(0.20, 0.48, ny);
      vegetation = slopeCoverage * heightEmerge;
    } else if (island.type === 'verdant-hills') {
      const slopeCoverage = smooth(0.28, 0.58, ny);
      vegetation = slopeCoverage * heightEmerge;
    } else if (island.type === 'sea-stack') {
      const summit = smooth(island.height * 0.45, island.height * 0.72, y);
      const topCoverage = smooth(0.25, 0.55, ny) * summit;
      const ledgeCoverage = smooth(0.50, 0.80, ny) * smooth(2, 6, y) * (1 - summit);
      vegetation = Math.min(1, (topCoverage + ledgeCoverage) * heightEmerge);
    } else if (island.type === 'volcanic') {
      const slopeCoverage = smooth(0.35, 0.68, ny);
      const volcanoRock = 1 - smooth(island.height * 0.32, island.height * 0.72, y);
      vegetation = slopeCoverage * heightEmerge * volcanoRock;
    } else {
      vegetation = smooth(0.40, 0.75, ny) * heightEmerge;
    }

    // 4. Color Assembly: Base rock -> Forest Canopy -> Sand beach
    c.copy(rockCol).lerp(forestCol, vegetation);
    const sandFactor = 1 - smooth(1.4, 3.6, y);
    if (sandFactor > 0) {
      tideSand.copy(sandWet).lerp(sand, smooth(0.3, 1.8, y));
      c.lerp(tideSand, sandFactor);
    }

    // 5. Gentle Shading & Relief
    const canopyShade = vegetation > 0.25 ? (0.97 + canopyClump * 0.06) : 1.0;
    const reliefMod = (0.96 + cliffRelief * 0.08);
    const heightWarmth = (0.88 + smooth(-0.8, 1.5, y) * 0.12);
    const shadeScalar = canopyShade * reliefMod * heightWarmth;

    colors[idx3] = c.r * shadeScalar;
    colors[idx3 + 1] = c.g * shadeScalar;
    colors[idx3 + 2] = c.b * shadeScalar;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeBoundingSphere();
  return geo;
}

/** Interpolate the same triangles as the rendered grid, including elongated islands. */
export function getTerrainSurfaceY(island: IslandDefinition, relX: number, relZ: number): number {
  const record = island === lastQueriedIsland && lastQueriedRecord !== null
    ? lastQueriedRecord
    : getTerrainRecord(island);
  const size = record.size;
  const x = relX * record.invScaleX;
  if (x > size || x < -size) return -4;
  const z = relZ * record.invScaleZ;
  if (z > size || z < -size) return -4;
  const gx = (x + size) * record.invStep;
  const gz = (z + size) * record.invStep;
  const ix = gx >= RESOLUTION ? RESOLUTION - 1 : gx | 0;
  const iz = gz >= RESOLUTION ? RESOLUTION - 1 : gz | 0;
  const u = gx - ix, v = gz - iz;
  const heights = record.heights;
  const index = iz * (RESOLUTION + 1) + ix;
  const a = heights[index], b = heights[index + 1];
  const c = heights[index + RESOLUTION + 1], d = heights[index + RESOLUTION + 2];
  return u + v <= 1 ? a + (b - a) * u + (c - a) * v : d + (c - d) * (1 - u) + (b - d) * (1 - v);
}
