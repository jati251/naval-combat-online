import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { MAX_VIEW_DISTANCE, ISLAND_LOD_DISTANCE } from './Environment3D';
import { createCliffRockTexture, createBeachSandTexture, createVegetationTexture, createDarkRockTexture } from './textures/proceduralTextures';

export interface IslandDefinition {
  id: string;
  name: string;
  x: number;
  z: number;
  radius: number;
  height: number;
  sandRadius: number;
  /** Island archetype for unique silhouette generation */
  type: 'volcanic' | 'atoll' | 'sea-stack' | 'lush-flat';
  palms: Array<[number, number, number]>; // [relX, relZ, scale]
  /** Extra vegetation clusters [relX, relZ, scale, type] */
  bushes: Array<[number, number, number]>;
  /** Rock formation scatter [relX, relZ, scale, yRot] */
  rocks: Array<[number, number, number, number]>;
  /** Seed for deterministic procedural variation */
  seed: number;
}

export const ARENA_ISLANDS: IslandDefinition[] = [
  {
    id: 'dead-mans-cay',
    name: "Dead Man's Cay",
    x: -150,
    z: 140,
    radius: 52,
    height: 34,
    sandRadius: 70,
    type: 'volcanic',
    seed: 42,
    palms: [
      [-18, 14, 1.3], [20, -12, 1.1], [-8, -22, 1.4], [24, 16, 1.0],
      [10, 24, 1.2], [-26, -6, 1.1], [0, -30, 0.9], [30, 0, 1.3],
      [-14, 28, 1.0], [16, -26, 1.2],
    ],
    bushes: [
      [-10, 8, 1.2], [12, -6, 1.0], [-4, -14, 1.1], [18, 10, 0.9],
      [6, 16, 1.3], [-20, 2, 1.0], [8, -20, 1.1], [-16, -16, 0.8],
    ],
    rocks: [
      [-32, 20, 2.2, 0.4], [28, -18, 1.8, 1.2], [-24, -28, 2.5, 2.8],
      [36, 8, 1.5, 0.7], [-8, 36, 2.0, 1.9],
    ],
  },
  {
    id: 'isla-de-la-muerte',
    name: 'Isla de la Muerte',
    x: 160,
    z: -130,
    radius: 64,
    height: 42,
    sandRadius: 82,
    type: 'sea-stack',
    seed: 137,
    palms: [
      [-24, -16, 1.4], [22, 18, 1.2], [-14, 28, 1.5], [30, -14, 1.1],
      [0, -30, 1.3], [-30, 8, 1.0], [18, 26, 1.2], [-20, -24, 1.1],
      [36, -4, 1.3], [-6, 34, 1.0], [12, -34, 1.4], [-34, -12, 0.9],
    ],
    bushes: [
      [-16, 10, 1.3], [14, -8, 1.1], [-6, -18, 1.2], [20, 14, 1.0],
      [4, 22, 1.4], [-22, -4, 1.1], [10, -24, 0.9], [-12, 24, 1.3],
      [26, 6, 1.0], [-28, 16, 1.2],
    ],
    rocks: [
      [-40, 24, 3.0, 0.6], [34, -22, 2.5, 1.5], [-28, -34, 2.8, 3.1],
      [42, 12, 2.2, 0.3], [-12, 42, 2.6, 2.2], [20, 38, 1.8, 1.8],
      [-38, -8, 2.4, 0.9],
    ],
  },
  {
    id: 'smugglers-reef',
    name: "Smuggler's Reef",
    x: 130,
    z: 80,
    radius: 30,
    height: 10,
    sandRadius: 48,
    type: 'atoll',
    seed: 73,
    palms: [
      [-10, 8, 1.0], [12, -6, 0.9], [4, 14, 1.1], [-6, -10, 1.0],
      [14, 4, 0.8], [-12, -4, 1.2],
    ],
    bushes: [
      [-6, 4, 0.9], [8, -4, 0.8], [2, 8, 1.0], [-8, -6, 0.7],
      [10, 6, 1.1], [0, -12, 0.9],
    ],
    rocks: [
      [-16, 12, 1.2, 0.8], [14, -10, 1.0, 2.1], [-12, -14, 1.4, 1.3],
    ],
  },
  {
    id: 'tortuga-atoll',
    name: 'Tortuga Atoll',
    x: -140,
    z: -120,
    radius: 44,
    height: 14,
    sandRadius: 60,
    type: 'lush-flat',
    seed: 211,
    palms: [
      [-14, -12, 1.3], [16, 14, 1.2], [-8, 20, 1.4], [20, -16, 1.0],
      [4, -24, 1.1], [-22, 6, 1.3], [24, 8, 1.0], [-18, -18, 1.2],
      [10, 22, 0.9], [-6, -8, 1.5],
    ],
    bushes: [
      [-10, 6, 1.3], [12, -4, 1.1], [-4, -12, 1.2], [16, 10, 1.0],
      [6, 16, 1.4], [-18, -2, 1.1], [8, -18, 0.9], [-14, 14, 1.3],
      [20, 2, 1.0], [0, 20, 1.2],
    ],
    rocks: [
      [-24, 16, 1.6, 0.5], [20, -14, 1.4, 1.8], [-18, -20, 1.8, 2.5],
      [28, 4, 1.2, 0.9],
    ],
  },
];

// ────────────────────────────────────────────────────────────────────────────
// Procedural terrain geometry with vertex displacement noise
// ────────────────────────────────────────────────────────────────────────────
function createIslandTerrainGeometry(
  island: IslandDefinition
): THREE.BufferGeometry {
  const { radius, height, type } = island;
  const segments = 64;
  const rings = 32;

  const geo = new THREE.CylinderGeometry(
    radius * 0.1,   // top radius (peak)
    radius * 1.15,   // bottom radius (beach base)
    height,
    segments,
    rings,
    false
  );

  const pos = geo.attributes.position as THREE.BufferAttribute;

  // Pre-compute noise octaves for each vertex
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);

    // Normalized height (0 = bottom, 1 = top)
    const t = (y + height / 2) / height;
    // Angle around axis
    const angle = Math.atan2(z, x);

    let dx = 0, dy = 0, dz = 0;

    // ── Type-specific silhouette shaping ──
    if (type === 'volcanic') {
      // Dramatic cone with eroded gullies and an irregular crater rim
      const craterRim = t > 0.88 ? Math.sin(angle * 5 + island.seed) * radius * 0.08 * (t - 0.88) / 0.12 : 0;
      const erosionGully = Math.sin(angle * 7 + 1.3) * Math.sin(angle * 13 + 2.7) * radius * 0.06 * t;
      const bulge = Math.sin(angle * 3 + 0.7) * radius * 0.12 * (1 - t) * (1 - t);
      dx = Math.cos(angle) * (erosionGully + bulge + craterRim);
      dz = Math.sin(angle) * (erosionGully + bulge + craterRim);
      // Vertical noise: rocky ridges
      dy = Math.sin(angle * 11 + y * 0.3) * 0.8 * t +
           Math.sin(angle * 19 + y * 0.7) * 0.4 * t;
    } else if (type === 'sea-stack') {
      // Towering dramatic cliffs with sheer faces and overhangs
      const cliff = Math.abs(Math.sin(angle * 4 + 0.5)) * radius * 0.18 * t;
      const overhang = t > 0.6 ? Math.sin(angle * 6 + 2.1) * radius * 0.1 * (t - 0.6) / 0.4 : 0;
      const baseSpread = (1 - t) * (1 - t) * radius * 0.25 * (1 + Math.sin(angle * 3) * 0.3);
      dx = Math.cos(angle) * (cliff + overhang + baseSpread);
      dz = Math.sin(angle) * (cliff + overhang + baseSpread);
      // Multiple dramatic peaks
      const peakBias = Math.max(0, Math.cos(angle * 2 - 1.0)) * height * 0.15 * t * t;
      dy = peakBias + Math.sin(angle * 9 + y * 0.4) * 1.2 * t;
    } else if (type === 'atoll') {
      // Low ring shape with lagoon depression in center
      const ringFactor = Math.sin(t * Math.PI); // bulge in the middle height
      const ringRadius = radius * 0.3 * ringFactor;
      // Slightly irregular ring
      const irregularity = Math.sin(angle * 5 + 1.7) * radius * 0.08 + Math.sin(angle * 11) * radius * 0.04;
      dx = Math.cos(angle) * (ringRadius + irregularity);
      dz = Math.sin(angle) * (ringRadius + irregularity);
      // Flatten the top significantly
      dy = -t * t * height * 0.3 + Math.sin(angle * 7 + y * 0.5) * 0.3;
    } else if (type === 'lush-flat') {
      // Broad, gently undulating tropical island with gradual slopes
      const gentleHill = Math.sin(angle * 2 + 0.4) * radius * 0.15 * (1 - t);
      const coastalVariation = Math.sin(angle * 8 + 2.3) * radius * 0.06 * (1 - t * t);
      dx = Math.cos(angle) * (gentleHill + coastalVariation);
      dz = Math.sin(angle) * (gentleHill + coastalVariation);
      // Very gentle rolling hills
      dy = Math.sin(angle * 3 + 0.8) * Math.sin(t * Math.PI) * height * 0.12 +
           Math.cos(angle * 5 - 1.2) * height * 0.06 * t;
    }

    // ── Universal multi-octave noise for organic detail ──
    const noise1 = Math.sin(angle * 13 + y * 0.5 + island.seed * 0.1) * 0.6;
    const noise2 = Math.sin(angle * 23 + y * 1.1 + island.seed * 0.3) * 0.25;
    const noise3 = Math.sin(angle * 37 + y * 2.3 + island.seed * 0.7) * 0.12;
    const combinedNoise = (noise1 + noise2 + noise3) * (1 - t * 0.4);

    dx += Math.cos(angle) * combinedNoise;
    dz += Math.sin(angle) * combinedNoise;
    dy += combinedNoise * 0.4;

    pos.setXYZ(i, x + dx, y + dy, z + dz);
  }

  geo.computeVertexNormals();

  // ── Height-based vertex colors for multi-zone terrain look ──
  // Bottom: lush tropical green → Mid: earthy brown → Top: weathered grey rock
  const colors = new Float32Array(pos.count * 3);
  const color = new THREE.Color();

  // Define color zones
  const colGreen = new THREE.Color('#2d6a30');    // Tropical jungle green
  const colBrown = new THREE.Color('#6b4226');    // Rich earthy brown soil
  const colRock  = new THREE.Color('#5c5147');     // Dark weathered rock
  const colPeak  = new THREE.Color('#7a726a');     // Lighter exposed peak stone
  const colMoss  = new THREE.Color('#3a6b35');     // Dark moss green

  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const t = (y + height / 2) / height; // 0=bottom, 1=top
    const angle = Math.atan2(pos.getZ(i), pos.getX(i));

    // Subtle angle-based variation for organic look
    const angleNoise = Math.sin(angle * 7 + island.seed * 0.3) * 0.08 +
                       Math.sin(angle * 13 + island.seed * 0.7) * 0.04;

    const adjustedT = Math.max(0, Math.min(1, t + angleNoise));

    if (type === 'lush-flat') {
      // Mostly green with brown dirt patches
      if (adjustedT < 0.5) {
        color.lerpColors(colGreen, colBrown, adjustedT * 2);
      } else if (adjustedT < 0.8) {
        color.lerpColors(colBrown, colMoss, (adjustedT - 0.5) / 0.3);
      } else {
        color.lerpColors(colMoss, colRock, (adjustedT - 0.8) / 0.2);
      }
    } else if (type === 'atoll') {
      // Sandy bottom, green mid, light rock top
      if (adjustedT < 0.4) {
        color.lerpColors(colGreen, colBrown, adjustedT / 0.4);
      } else {
        color.lerpColors(colBrown, colRock, (adjustedT - 0.4) / 0.6);
      }
    } else {
      // Volcanic & sea-stack: green base → brown → dark rock → lighter peak
      if (adjustedT < 0.25) {
        color.lerpColors(colGreen, colBrown, adjustedT / 0.25);
      } else if (adjustedT < 0.55) {
        color.lerpColors(colBrown, colRock, (adjustedT - 0.25) / 0.3);
      } else {
        color.lerpColors(colRock, colPeak, (adjustedT - 0.55) / 0.45);
      }
    }

    colors[i * 3]     = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  return geo;
}

// ────────────────────────────────────────────────────────────────────────────
// Procedural beach / sandbank geometry (organic irregular shoreline)
// ────────────────────────────────────────────────────────────────────────────
function createBeachGeometry(island: IslandDefinition): THREE.BufferGeometry {
  const segments = 72;
  const { sandRadius, radius, seed } = island;

  const geo = new THREE.CylinderGeometry(
    radius * 1.08,
    sandRadius * 1.2,
    2.8,
    segments,
    8,
    false
  );

  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const angle = Math.atan2(z, x);
    const t = (y + 1.4) / 2.8;

    // Irregular coastline wobble
    const coastNoise =
      Math.sin(angle * 5 + seed * 0.1) * sandRadius * 0.08 +
      Math.sin(angle * 11 + seed * 0.3) * sandRadius * 0.04 +
      Math.sin(angle * 17 + seed * 0.7) * sandRadius * 0.02;

    const dx = Math.cos(angle) * coastNoise * (1 - t * 0.5);
    const dz = Math.sin(angle) * coastNoise * (1 - t * 0.5);
    const dy = Math.sin(angle * 7 + y * 2) * 0.15;

    pos.setXYZ(i, x + dx, y + dy, z + dz);
  }

  geo.computeVertexNormals();
  return geo;
}

// ────────────────────────────────────────────────────────────────────────────
// Shared static geometries for vegetation & decoration
// ────────────────────────────────────────────────────────────────────────────

// ─── PALM TREE (High-detail curved trunk) ───
const palmTrunkLowerGeo = new THREE.CylinderGeometry(0.28, 0.5, 4.0, 10);
const palmTrunkMidGeo = new THREE.CylinderGeometry(0.24, 0.3, 3.2, 10);
const palmTrunkUpperGeo = new THREE.CylinderGeometry(0.18, 0.26, 2.8, 10);
const coconutGeo = new THREE.SphereGeometry(0.2, 8, 8);
const frondGeo = (() => {
  // Custom elongated drooping frond shape
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.quadraticCurveTo(0.5, 1.8, 0.15, 4.0);
  shape.lineTo(-0.15, 4.0);
  shape.quadraticCurveTo(-0.5, 1.8, 0, 0);
  const extrudeSettings = { depth: 0.04, bevelEnabled: false };
  return new THREE.ExtrudeGeometry(shape, extrudeSettings);
})();

// ─── TROPICAL BUSH ───
const bushGeo = new THREE.IcosahedronGeometry(1, 2);
const bushGeoSmall = new THREE.IcosahedronGeometry(0.6, 2);

// ─── ROCK FORMATIONS ───
const rockGeoLarge = new THREE.DodecahedronGeometry(1, 2);
const rockGeoMedium = new THREE.DodecahedronGeometry(0.7, 2);
const rockGeoSmall = new THREE.DodecahedronGeometry(0.4, 1);
// Apply random vertex displacement for organic rock shapes
[rockGeoLarge, rockGeoMedium, rockGeoSmall].forEach((geo) => {
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const noise = Math.sin(x * 4.3 + y * 3.1) * Math.cos(z * 5.7 + x * 2.2) * 0.15;
    pos.setXYZ(i, x * (1 + noise), y * (1 + noise * 0.6), z * (1 + noise));
  }
  geo.computeVertexNormals();
});

// ─── MATERIALS (shared across all islands) ───
const palmTrunkLowerMat = new THREE.MeshStandardMaterial({
  color: '#5c3a1e',
  roughness: 0.95,
  metalness: 0,
});
const palmTrunkMidMat = new THREE.MeshStandardMaterial({
  color: '#4a2e18',
  roughness: 0.92,
  metalness: 0,
});
const palmTrunkUpperMat = new THREE.MeshStandardMaterial({
  color: '#3a2213',
  roughness: 0.9,
  metalness: 0,
});
const coconutMat = new THREE.MeshStandardMaterial({
  color: '#4a2a10',
  roughness: 0.78,
  metalness: 0,
});
const frondMatA = new THREE.MeshStandardMaterial({
  color: '#15803d',
  roughness: 0.72,
  side: THREE.DoubleSide,
});
const frondMatB = new THREE.MeshStandardMaterial({
  color: '#16a34a',
  roughness: 0.72,
  side: THREE.DoubleSide,
});
const frondMatC = new THREE.MeshStandardMaterial({
  color: '#22c55e',
  roughness: 0.7,
  side: THREE.DoubleSide,
});

const bushMatA = new THREE.MeshStandardMaterial({ color: '#166534', roughness: 0.8 });
const bushMatB = new THREE.MeshStandardMaterial({ color: '#15803d', roughness: 0.78 });
const bushMatC = new THREE.MeshStandardMaterial({ color: '#14532d', roughness: 0.82 });
const frondMats = [frondMatA, frondMatB, frondMatC];
const bushMats = [bushMatA, bushMatB, bushMatC];

const rockMat = new THREE.MeshStandardMaterial({
  color: '#57534e',
  roughness: 0.88,
  metalness: 0.06,
});
const rockMatDark = new THREE.MeshStandardMaterial({
  color: '#3f3f46',
  roughness: 0.92,
  metalness: 0.04,
});
const rockMatMoss = new THREE.MeshStandardMaterial({
  color: '#475544',
  roughness: 0.85,
  metalness: 0.03,
});

/**
 * High-Detail Procedural Caribbean Coconut Palm Tree
 * Three-section curved trunk with 10-frond drooping crown.
 */
const PalmTree: React.FC<{ position: [number, number, number]; scale?: number; seed?: number }> = React.memo(({
  position,
  scale = 1,
  seed = 0,
}) => {
  // Deterministic lean angle per tree
  const leanX = Math.sin(seed * 1.7) * 0.12;
  const leanZ = Math.cos(seed * 2.3) * 0.1;
  const trunkTwist = Math.sin(seed * 3.1) * 0.3;

  return (
    <group position={position} scale={scale}>
      {/* Lower Curved Trunk */}
      <mesh
        position={[0, 2.0, 0]}
        rotation={[leanX * 0.3, trunkTwist * 0.5, leanZ * 0.3]}
        castShadow
        geometry={palmTrunkLowerGeo}
        material={palmTrunkLowerMat}
      />

      {/* Mid Trunk Section */}
      <mesh
        position={[leanX * 2, 4.8, leanZ * 2]}
        rotation={[leanX * 0.6, trunkTwist, leanZ * 0.6]}
        castShadow
        geometry={palmTrunkMidGeo}
        material={palmTrunkMidMat}
      />

      {/* Upper Leaning Trunk */}
      <mesh
        position={[leanX * 4, 7.2, leanZ * 4]}
        rotation={[leanX, trunkTwist * 1.5, leanZ]}
        castShadow
        geometry={palmTrunkUpperGeo}
        material={palmTrunkUpperMat}
      />

      {/* Coconuts Cluster */}
      <group position={[leanX * 5, 8.5, leanZ * 5]}>
        {[0, 1, 2, 3].map((i) => (
          <mesh
            key={`nut-${i}`}
            position={[
              Math.cos(i * 1.57 + seed) * 0.25,
              -0.12,
              Math.sin(i * 1.57 + seed) * 0.25,
            ]}
            castShadow
            geometry={coconutGeo}
            material={coconutMat}
          />
        ))}
      </group>

      {/* 10 Drooping Palm Crown Fronds */}
      <group position={[leanX * 5, 8.8, leanZ * 5]}>
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => {
          const angle = (i / 10) * Math.PI * 2 + seed * 0.5;
          const droop = 0.35 + Math.sin(i * 1.3 + seed) * 0.12;
          const frondScale = 0.8 + Math.sin(i * 2.1 + seed * 0.7) * 0.2;
          return (
            <group key={`frond-${i}`} rotation={[0, angle, 0]}>
              <mesh
                position={[1.6, -0.3, 0]}
                rotation={[droop, 0, -0.18]}
                scale={[frondScale, frondScale, frondScale]}
                castShadow
                geometry={frondGeo}
                material={frondMats[i % 3]}
              />
            </group>
          );
        })}
      </group>
    </group>
  );
});

/**
 * Tropical Undergrowth Bush Cluster
 */
const TropicalBush: React.FC<{ position: [number, number, number]; scale?: number; seed?: number }> = React.memo(({
  position,
  scale = 1,
  seed = 0,
}) => {
  const matIdx = Math.abs(Math.floor(seed * 7)) % 3;
  return (
    <group position={position} scale={scale}>
      <mesh
        castShadow
        geometry={bushGeo}
        material={bushMats[matIdx]}
        scale={[1, 0.7, 1]}
      />
      <mesh
        position={[0.6 * Math.cos(seed), 0.2, 0.6 * Math.sin(seed)]}
        castShadow
        geometry={bushGeoSmall}
        material={bushMats[(matIdx + 1) % 3]}
        scale={[1.1, 0.65, 1.1]}
      />
      <mesh
        position={[-0.4 * Math.cos(seed + 1), 0.1, -0.4 * Math.sin(seed + 1)]}
        castShadow
        geometry={bushGeoSmall}
        material={bushMats[(matIdx + 2) % 3]}
        scale={[0.9, 0.55, 0.9]}
      />
    </group>
  );
});

/**
 * Coastal Rock Formation - scattered irregular boulders
 */
const RockFormation: React.FC<{
  position: [number, number, number];
  scale?: number;
  rotation?: number;
}> = React.memo(({ position, scale = 1, rotation = 0 }) => {
  return (
    <group position={position} rotation={[0, rotation, 0]} scale={scale}>
      {/* Main boulder */}
      <mesh
        castShadow
        receiveShadow
        geometry={rockGeoLarge}
        material={rockMat}
        scale={[1, 0.7, 1.1]}
      />
      {/* Secondary rock */}
      <mesh
        position={[0.8, -0.2, 0.5]}
        castShadow
        receiveShadow
        geometry={rockGeoMedium}
        material={rockMatDark}
        rotation={[0.3, 0.8, 0.2]}
        scale={[1.1, 0.8, 0.9]}
      />
      {/* Moss-covered pebble */}
      <mesh
        position={[-0.5, -0.3, -0.6]}
        castShadow
        geometry={rockGeoSmall}
        material={rockMatMoss}
        rotation={[0.5, 1.2, 0]}
      />
    </group>
  );
});

// ────────────────────────────────────────────────────────────────────────────
// Island Entity with LOD, culling, and unique terrain
// ────────────────────────────────────────────────────────────────────────────

interface IslandEntityProps {
  island: IslandDefinition;
  materials: {
    sand: THREE.Material;
    rock: THREE.Material;
    vegetation: THREE.Material;
    shallows: THREE.Material;
    darkRock: THREE.Material;
    lushVeg: THREE.Material;
  };
}

/**
 * High-Detail Island Entity with procedural terrain, unique silhouette per type,
 * organic vegetation scatter, coastal rock formations, and LOD culling.
 */
const IslandEntity: React.FC<IslandEntityProps> = React.memo(({ island, materials }) => {
  const groupRef = useRef<THREE.Group>(null);
  const palmsRef = useRef<THREE.Group>(null);
  const detailRef = useRef<THREE.Group>(null);
  const frameCount = useRef(Math.floor(Math.random() * 6));

  // Procedural terrain geometry (unique per island)
  const terrainGeo = useMemo(() => createIslandTerrainGeometry(island), [island]);
  const beachGeo = useMemo(() => createBeachGeometry(island), [island]);

  // Shallow lagoon ring (organic irregular shape)
  const shallowGeo = useMemo(() => {
    const segments = 64;
    const geo = new THREE.CylinderGeometry(
      island.sandRadius * 1.12,
      island.sandRadius * 1.3,
      0.8,
      segments,
      4,
      false
    );
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const angle = Math.atan2(z, x);
      const wobble = Math.sin(angle * 6 + island.seed) * island.sandRadius * 0.06 +
                     Math.sin(angle * 13 + island.seed * 2) * island.sandRadius * 0.03;
      pos.setXYZ(i, x + Math.cos(angle) * wobble, pos.getY(i), z + Math.sin(angle) * wobble);
    }
    geo.computeVertexNormals();
    return geo;
  }, [island]);

  useFrame(({ camera }) => {
    frameCount.current++;
    if (frameCount.current % 6 !== 0) return;

    const dx = camera.position.x - island.x;
    const dz = camera.position.z - island.z;
    const distSq = dx * dx + dz * dz;

    // 1. Distance Culling
    const inViewDistance = distSq <= MAX_VIEW_DISTANCE * MAX_VIEW_DISTANCE;
    if (groupRef.current && groupRef.current.visible !== inViewDistance) {
      groupRef.current.visible = inViewDistance;
    }

    if (!inViewDistance) return;

    // 2. LOD: Hide detailed vegetation at mid-to-far range
    const showDetail = distSq <= ISLAND_LOD_DISTANCE * ISLAND_LOD_DISTANCE;
    if (palmsRef.current && palmsRef.current.visible !== showDetail) {
      palmsRef.current.visible = showDetail;
    }
    if (detailRef.current && detailRef.current.visible !== showDetail) {
      detailRef.current.visible = showDetail;
    }
  });

  return (
    <group ref={groupRef} position={[island.x, 0, island.z]}>
      {/* Shallow Turquoise Lagoon / Coral Reef Rim */}
      <mesh position={[0, -0.25, 0]} receiveShadow material={materials.shallows} geometry={shallowGeo} />

      {/* Organic Sandy Beach Shoreline */}
      <mesh position={[0, 0.6, 0]} receiveShadow material={materials.sand} geometry={beachGeo} />

      {/* Lush Tropical Vegetation Shelf */}
      <mesh position={[0, 2.0, 0]} receiveShadow material={materials.vegetation}>
        <cylinderGeometry args={[island.radius * 0.96, island.radius * 1.06, 2.2, 48]} />
      </mesh>

      {/* Main Terrain Mass (procedurally displaced unique silhouette) */}
      <mesh
        position={[0, height(island) + 2.0, 0]}
        castShadow
        receiveShadow
        material={materials.rock}
        geometry={terrainGeo}
      />

      {/* Secondary Rock Outcrops (type-specific) */}
      {island.type === 'volcanic' && (
        <>
          <mesh
            position={[island.radius * 0.3, island.height * 0.3 + 1.5, -island.radius * 0.2]}
            castShadow
            receiveShadow
            material={materials.darkRock}
          >
            <dodecahedronGeometry args={[island.radius * 0.22, 3]} />
          </mesh>
          <mesh
            position={[-island.radius * 0.35, island.height * 0.25, island.radius * 0.3]}
            castShadow
            receiveShadow
            material={materials.darkRock}
          >
            <dodecahedronGeometry args={[island.radius * 0.18, 3]} />
          </mesh>
        </>
      )}

      {island.type === 'sea-stack' && (
        <>
          {/* Dramatic secondary pinnacle */}
          <mesh
            position={[island.radius * 0.4, island.height * 0.5, -island.radius * 0.3]}
            castShadow
            receiveShadow
            material={materials.darkRock}
          >
            <coneGeometry args={[island.radius * 0.2, island.height * 0.6, 32]} />
          </mesh>
          {/* Arch formation base */}
          <mesh
            position={[-island.radius * 0.5, 2.0, island.radius * 0.4]}
            castShadow
            receiveShadow
            material={materials.rock}
          >
            <dodecahedronGeometry args={[island.radius * 0.15, 3]} />
          </mesh>
        </>
      )}

      {island.type === 'atoll' && (
        <>
          {/* Central lagoon depression marker */}
          <mesh position={[0, 1.2, 0]} material={materials.shallows}>
            <cylinderGeometry args={[island.radius * 0.4, island.radius * 0.45, 0.5, 48]} />
          </mesh>
          {/* Scattered coral heads */}
          {[0, 1, 2, 3, 4].map((i) => {
            const a = (i / 5) * Math.PI * 2 + island.seed * 0.3;
            const d = island.radius * 0.55 + Math.sin(a + island.seed) * island.radius * 0.1;
            return (
              <mesh
                key={`coral-${i}`}
                position={[Math.cos(a) * d, 1.8, Math.sin(a) * d]}
                castShadow
                material={materials.lushVeg}
              >
                <dodecahedronGeometry args={[1.2 + Math.sin(i * 2.3) * 0.4, 2]} />
              </mesh>
            );
          })}
        </>
      )}

      {island.type === 'lush-flat' && (
        <>
          {/* Dense undergrowth carpet */}
          <mesh position={[0, 2.6, 0]} material={materials.lushVeg}>
            <cylinderGeometry args={[island.radius * 0.8, island.radius * 0.9, 1.0, 48]} />
          </mesh>
        </>
      )}

      {/* Coastal Rock Formations (High-Detail LOD) */}
      <group ref={detailRef}>
        {island.rocks.map(([rx, rz, rScale, rRot], rIdx) => (
          <RockFormation
            key={`rock-${rIdx}`}
            position={[rx, 1.8, rz]}
            scale={rScale}
            rotation={rRot}
          />
        ))}

        {/* Tropical Undergrowth Bushes */}
        {island.bushes.map(([bx, bz, bScale], bIdx) => (
          <TropicalBush
            key={`bush-${bIdx}`}
            position={[bx, 2.8, bz]}
            scale={bScale}
            seed={bIdx + island.seed}
          />
        ))}
      </group>

      {/* Scattered Coconut Palms (High-Detail LOD) */}
      <group ref={palmsRef}>
        {island.palms.map(([px, pz, pScale], pIdx) => (
          <PalmTree
            key={pIdx}
            position={[px, 2.6, pz]}
            scale={pScale}
            seed={pIdx + island.seed}
          />
        ))}
      </group>
    </group>
  );
});

function height(island: IslandDefinition): number {
  switch (island.type) {
    case 'volcanic': return island.height * 0.42;
    case 'sea-stack': return island.height * 0.48;
    case 'atoll': return island.height * 0.2;
    case 'lush-flat': return island.height * 0.25;
  }
}

export const Islands3D: React.FC = React.memo(() => {
  const rockTexture = useMemo(() => createCliffRockTexture(), []);
  const sandTexture = useMemo(() => createBeachSandTexture(), []);
  const vegTexture = useMemo(() => createVegetationTexture(), []);
  const darkRockTexture = useMemo(() => createDarkRockTexture(), []);

  const materials = useMemo(() => {
    return {
      sand: new THREE.MeshStandardMaterial({
        map: sandTexture,
        roughness: 0.88,
        metalness: 0.02,
      }),
      rock: new THREE.MeshStandardMaterial({
        map: rockTexture,
        vertexColors: true, // height-based green→brown→rock gradient
        roughness: 0.82,
        metalness: 0.04,
      }),
      darkRock: new THREE.MeshStandardMaterial({
        map: darkRockTexture,
        roughness: 0.9,
        metalness: 0.06,
      }),
      vegetation: new THREE.MeshStandardMaterial({
        map: vegTexture,
        roughness: 0.72,
      }),
      lushVeg: new THREE.MeshStandardMaterial({
        map: vegTexture,
        color: '#1a5c28',
        roughness: 0.7,
      }),
      shallows: new THREE.MeshStandardMaterial({
        color: '#06b6d4',
        transparent: true,
        opacity: 0.5,
        roughness: 0.2,
      }),
    };
  }, [rockTexture, sandTexture, vegTexture, darkRockTexture]);

  return (
    <group>
      {ARENA_ISLANDS.map((island) => (
        <IslandEntity key={island.id} island={island} materials={materials} />
      ))}
    </group>
  );
});

