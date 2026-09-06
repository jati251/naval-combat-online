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

  for (let i = 0; i < p.count; i++) {
    const px = p.getX(i), pz = p.getZ(i);
    const y = p.getY(i) + island.height * 0.5;
    const ny = normal.getY(i);

    // 1. Procedural Forest Canopy Simulation
    // Macro grove variation (~20m)
    const grove = noise(px * 0.05 + island.seed * 0.17, pz * 0.05 - island.seed * 0.23);
    // Tree crown clumps (~4.5m)
    const crown = noise(px * 0.24 - island.seed * 0.63, pz * 0.24 + island.seed * 0.41);
    // Leafy micro-texture (~1.8m)
    const foliage = noise(px * 0.58 + island.seed * 1.11, pz * 0.58 - island.seed * 0.89);
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

    // 2. Geological Rock / Cliff Detailing
    const cliffRelief = relief(px / 12, pz / 12, island.seed);
    rockCol.copy(cliffRock).lerp(mossyRock, smooth(0.1, 0.7, cliffRelief + (1 - ny) * 0.3));

    // 3. Slope & Elevation Vegetation Coverage per Island Archetype
    let vegetation: number;
    const heightEmerge = smooth(1.6, 3.8, y);

    if (island.type === 'dense-jungle') {
      // In tropical rainforests, dense jungle and vines cover mountain slopes up to ~75° (ny down to 0.20)
      // and blanket the mountain across all ridges and summits
      const slopeCoverage = smooth(0.20, 0.48, ny);
      vegetation = slopeCoverage * heightEmerge;
    } else if (island.type === 'verdant-hills') {
      // Verdant rolling green hills with lush grasslands and woodland groves up to hill crests
      const slopeCoverage = smooth(0.28, 0.58, ny);
      vegetation = slopeCoverage * heightEmerge;
    } else if (island.type === 'sea-stack') {
      // Sea stacks have a dense tropical jungle crown on top plateau, with moss clinging to ledges
      const summit = smooth(island.height * 0.45, island.height * 0.72, y);
      const topCoverage = smooth(0.25, 0.55, ny) * summit;
      const ledgeCoverage = smooth(0.50, 0.80, ny) * smooth(2, 6, y) * (1 - summit);
      vegetation = Math.min(1, (topCoverage + ledgeCoverage) * heightEmerge);
    } else if (island.type === 'volcanic') {
      // Lush jungle lower/mid slopes, fading into dark basalt/ash near summit caldera
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
      const tideSand = sandWet.clone().lerp(sand, smooth(0.3, 1.8, y));
      c.lerp(tideSand, sandFactor);
    }

    // 5. Gentle Shading & Relief
    const canopyShade = vegetation > 0.25 ? (0.97 + canopyClump * 0.06) : 1.0;
    const reliefMod = (0.96 + relief(px / 17, pz / 17, island.seed) * 0.08);
    const heightWarmth = (0.88 + smooth(-0.8, 1.5, y) * 0.12);
    c.multiplyScalar(canopyShade * reliefMod * heightWarmth);

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
