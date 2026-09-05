import * as THREE from 'three';
import type { IslandDefinition } from './types';

/**
 * Generates unique procedural terrain geometry with archetype-based silhouette,
 * volcanic craters, sea-stack pinnacles, rolling green hills, or jungle ridges,
 * and height-gradient vertex coloring.
 */
export function createIslandTerrainGeometry(
  island: IslandDefinition
): THREE.BufferGeometry {
  const { radius, height, type } = island;
  const segments = 64;
  const rings = 32;

  const geo = new THREE.CylinderGeometry(
    radius * 0.1,   // top radius (peak)
    radius * 1.15,  // bottom radius (beach base)
    height,
    segments,
    rings,
    false
  );

  const pos = geo.attributes.position as THREE.BufferAttribute;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);

    const t = (y + height / 2) / height;
    const angle = Math.atan2(z, x);

    let dx = 0, dy = 0, dz = 0;

    if (type === 'volcanic') {
      const craterRim = t > 0.88 ? Math.sin(angle * 5 + island.seed) * radius * 0.08 * (t - 0.88) / 0.12 : 0;
      const erosionGully = Math.sin(angle * 7 + 1.3) * Math.sin(angle * 13 + 2.7) * radius * 0.06 * t;
      const bulge = Math.sin(angle * 3 + 0.7) * radius * 0.12 * (1 - t) * (1 - t);
      dx = Math.cos(angle) * (erosionGully + bulge + craterRim);
      dz = Math.sin(angle) * (erosionGully + bulge + craterRim);
      dy = Math.sin(angle * 11 + y * 0.3) * 0.8 * t +
           Math.sin(angle * 19 + y * 0.7) * 0.4 * t;
    } else if (type === 'sea-stack') {
      const cliff = Math.abs(Math.sin(angle * 4 + 0.5)) * radius * 0.18 * t;
      const overhang = t > 0.6 ? Math.sin(angle * 6 + 2.1) * radius * 0.1 * (t - 0.6) / 0.4 : 0;
      const baseSpread = (1 - t) * (1 - t) * radius * 0.25 * (1 + Math.sin(angle * 3) * 0.3);
      dx = Math.cos(angle) * (cliff + overhang + baseSpread);
      dz = Math.sin(angle) * (cliff + overhang + baseSpread);
      const peakBias = Math.max(0, Math.cos(angle * 2 - 1.0)) * height * 0.15 * t * t;
      dy = peakBias + Math.sin(angle * 9 + y * 0.4) * 1.2 * t;
    } else if (type === 'atoll') {
      const ringFactor = Math.sin(t * Math.PI);
      const ringRadius = radius * 0.3 * ringFactor;
      const irregularity = Math.sin(angle * 5 + 1.7) * radius * 0.08 + Math.sin(angle * 11) * radius * 0.04;
      dx = Math.cos(angle) * (ringRadius + irregularity);
      dz = Math.sin(angle) * (ringRadius + irregularity);
      dy = -t * t * height * 0.3 + Math.sin(angle * 7 + y * 0.5) * 0.3;
    } else if (type === 'lush-flat') {
      const gentleHill = Math.sin(angle * 2 + 0.4) * radius * 0.15 * (1 - t);
      const coastalVariation = Math.sin(angle * 8 + 2.3) * radius * 0.06 * (1 - t * t);
      dx = Math.cos(angle) * (gentleHill + coastalVariation);
      dz = Math.sin(angle) * (gentleHill + coastalVariation);
      dy = Math.sin(angle * 3 + 0.8) * Math.sin(t * Math.PI) * height * 0.12 +
           Math.cos(angle * 5 - 1.2) * height * 0.06 * t;
    } else if (type === 'verdant-hills') {
      const hillSwelling = Math.sin(angle * 3 + 0.5) * Math.cos(angle * 2 - 0.7) * radius * 0.22 * (1 - t * 0.6);
      const knollRidge = Math.sin(angle * 6 + island.seed * 0.2) * radius * 0.08 * (1 - t);
      dx = Math.cos(angle) * (hillSwelling + knollRidge);
      dz = Math.sin(angle) * (hillSwelling + knollRidge);
      const rollingDome = Math.sin(t * Math.PI * 0.95) * height * 0.24;
      const saddle = Math.cos(angle * 2 + 1.1) * height * 0.14 * t;
      dy = rollingDome + saddle;
    } else if (type === 'dense-jungle') {
      const jungleSpur = Math.sin(angle * 4 + 1.2) * radius * 0.18 * (1 - t * 0.5);
      const ravine = Math.cos(angle * 7 - 0.8) * radius * 0.09 * t;
      dx = Math.cos(angle) * (jungleSpur + ravine);
      dz = Math.sin(angle) * (jungleSpur + ravine);
      const terracing = Math.sin(t * Math.PI * 3.0) * 0.6 * (1 - t);
      dy = terracing + Math.sin(angle * 5 + island.seed * 0.5) * height * 0.12 * t;
    }

    // Organic detail noise
    const noise1 = Math.sin(angle * 13 + y * 0.5 + island.seed * 0.1) * 0.6;
    const noise2 = Math.sin(angle * 23 + y * 1.1 + island.seed * 0.3) * 0.25;
    const noise3 = Math.sin(angle * 37 + y * 2.3 + island.seed * 0.7) * 0.12;
    const combinedNoise = (noise1 + noise2 + noise3) * (1 - t * 0.4);

    dx += Math.cos(angle) * combinedNoise;
    dz += Math.sin(angle) * combinedNoise;
    dy += combinedNoise * 0.4;

    const finalX = x + dx;
    let finalY = y + dy;
    const finalZ = z + dz;

    // Coastal & Plateau Terrace Flattening for Settlements
    if (island.settlement && island.settlement.type !== 'sea-arch') {
      const sx = island.settlement.x;
      const sz = island.settlement.z;
      const targetTerrace = island.settlement.terraceElevation ?? (
        island.settlement.type === 'kingston-city' ? 3.2 :
        island.settlement.type === 'mayan-temple' ? 12.0 :
        island.settlement.type === 'pirate-haven' ? 2.5 : 3.0
      );
      const terraceRad = island.settlement.terraceRadius ?? (
        island.settlement.type === 'kingston-city' ? 56.0 :
        island.settlement.type === 'mayan-temple' ? 36.0 : 24.0
      );

      const distSettlement = Math.sqrt((finalX - sx) ** 2 + (finalZ - sz) ** 2);
      if (distSettlement < terraceRad) {
        const flatZone = terraceRad * 0.72;
        let blend = 1.0;
        if (distSettlement > flatZone) {
          const u = (distSettlement - flatZone) / (terraceRad - flatZone);
          blend = 1.0 - u * u * (3 - 2 * u);
        }
        const elevOffset = getIslandElevation(island) + 2.0;
        const currentWorldY = finalY + elevOffset;
        const blendedWorldY = currentWorldY * (1 - blend) + targetTerrace * blend;
        finalY = blendedWorldY - elevOffset;
      }
    }

    pos.setXYZ(i, finalX, finalY, finalZ);
  }

  geo.computeVertexNormals();

  // Vertex colors
  const colors = new Float32Array(pos.count * 3);
  const color = new THREE.Color();

  const colLushGrass = new THREE.Color('#16a34a');
  const colGreen     = new THREE.Color('#15803d');
  const colDenseRain = new THREE.Color('#14532d');
  const colBrown     = new THREE.Color('#4e3420');
  const colRock      = new THREE.Color('#283b32');
  const colPeak      = new THREE.Color('#22332c');
  const colMoss      = new THREE.Color('#1e4d25');

  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const t = (y + height / 2) / height;
    const angle = Math.atan2(pos.getZ(i), pos.getX(i));

    const angleNoise = Math.sin(angle * 7 + island.seed * 0.3) * 0.08 +
                       Math.sin(angle * 13 + island.seed * 0.7) * 0.04;

    const adjustedT = Math.max(0, Math.min(1, t + angleNoise));

    if (type === 'verdant-hills') {
      if (adjustedT < 0.25) {
        color.lerpColors(colLushGrass, colGreen, adjustedT / 0.25);
      } else if (adjustedT < 0.75) {
        color.lerpColors(colGreen, colMoss, (adjustedT - 0.25) / 0.5);
      } else {
        color.lerpColors(colMoss, colBrown, (adjustedT - 0.75) / 0.25);
      }
    } else if (type === 'dense-jungle') {
      if (adjustedT < 0.3) {
        color.lerpColors(colGreen, colDenseRain, adjustedT / 0.3);
      } else if (adjustedT < 0.8) {
        color.lerpColors(colDenseRain, colMoss, (adjustedT - 0.3) / 0.5);
      } else {
        color.lerpColors(colMoss, colRock, (adjustedT - 0.8) / 0.2);
      }
    } else if (type === 'lush-flat') {
      if (adjustedT < 0.5) {
        color.lerpColors(colGreen, colBrown, adjustedT * 2);
      } else if (adjustedT < 0.8) {
        color.lerpColors(colBrown, colMoss, (adjustedT - 0.5) / 0.3);
      } else {
        color.lerpColors(colMoss, colRock, (adjustedT - 0.8) / 0.2);
      }
    } else if (type === 'atoll') {
      if (adjustedT < 0.4) {
        color.lerpColors(colGreen, colBrown, adjustedT / 0.4);
      } else {
        color.lerpColors(colBrown, colRock, (adjustedT - 0.4) / 0.6);
      }
    } else {
      if (adjustedT < 0.25) {
        color.lerpColors(colGreen, colBrown, adjustedT / 0.25);
      } else if (adjustedT < 0.55) {
        color.lerpColors(colBrown, colRock, (adjustedT - 0.25) / 0.3);
      } else {
        color.lerpColors(colRock, colPeak, (adjustedT - 0.55) / 0.45);
      }
    }

    // If island has Kingston City, paint paved cobblestone plaza on the flat terrace directly into the terrain mesh (100% zero Z-fighting)
    if (island.settlement && island.settlement.type === 'kingston-city') {
      const sx = island.settlement.x;
      const sz = island.settlement.z;
      const vx = pos.getX(i);
      const vz = pos.getZ(i);
      const dist = Math.sqrt((vx - sx) ** 2 + (vz - sz) ** 2);
      if (dist < 46) {
        const colPavement = new THREE.Color('#78716c'); // Weathered colonial cobblestone pavers
        const blend = Math.max(0, Math.min(1, (46 - dist) / 10));
        color.lerp(colPavement, blend * 0.88);
      }
    }

    colors[i * 3]     = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  return geo;
}

/**
 * Procedural beach / sandbank geometry with irregular coastal shoreline wobble.
 */
export function createBeachGeometry(island: IslandDefinition): THREE.BufferGeometry {
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

    const coastNoise =
      Math.sin(angle * 5 + seed * 0.1) * sandRadius * 0.08 +
      Math.sin(angle * 11 + seed * 0.3) * sandRadius * 0.04 +
      Math.sin(angle * 17 + seed * 0.7) * sandRadius * 0.02;

    const dx = Math.cos(angle) * coastNoise * (1 - t * 0.5);
    const dz = Math.sin(angle) * coastNoise * (1 - t * 0.5);
    let dy = Math.sin(angle * 7 + y * 2) * 0.15;

    // Waterfront harbor cutout for Kingston City:
    // Lowers beach sand below sea-level around docks so stone quay and jetty plunge directly into the ocean
    if (island.settlement && island.settlement.type === 'kingston-city') {
      const sx = island.settlement.x;
      const sz = island.settlement.z;
      const distHarbor = Math.sqrt((x + dx - sx) ** 2 + (z + dz - sz) ** 2);
      if (distHarbor < 45) {
        const blend = (1 - distHarbor / 45);
        dy -= blend * blend * 2.8;
      }
    }

    pos.setXYZ(i, x + dx, y + dy, z + dz);
  }

  geo.computeVertexNormals();
  return geo;
}

export function getIslandElevation(island: IslandDefinition): number {
  switch (island.type) {
    case 'volcanic': return island.height * 0.42;
    case 'sea-stack': return island.height * 0.48;
    case 'atoll': return island.height * 0.2;
    case 'lush-flat': return island.height * 0.25;
    case 'verdant-hills': return island.height * 0.35;
    case 'dense-jungle': return island.height * 0.38;
  }
}

/**
 * Calculates the exact terrain surface height Y at any (relX, relZ) coordinate
 * on the island, matching both the procedural mountain profile, terrace flattening,
 * and coastal beach transitions.
 */
export function getTerrainSurfaceY(
  island: IslandDefinition,
  relX: number,
  relZ: number
): number {
  const { settlement } = island;

  // Check terrace blend first if a settlement exists
  if (settlement && settlement.type !== 'sea-arch') {
    const sx = settlement.x;
    const sz = settlement.z;
    const targetTerrace = settlement.terraceElevation ?? (
      settlement.type === 'kingston-city' ? 3.2 :
      settlement.type === 'mayan-temple' ? 12.0 :
      settlement.type === 'pirate-haven' ? 2.5 : 3.0
    );
    const terraceRad = settlement.terraceRadius ?? (
      settlement.type === 'kingston-city' ? 56.0 :
      settlement.type === 'mayan-temple' ? 36.0 : 24.0
    );

    const distSettlement = Math.sqrt((relX - sx) ** 2 + (relZ - sz) ** 2);
    const flatZone = terraceRad * 0.72;
    if (distSettlement <= flatZone) {
      return targetTerrace;
    }
    if (distSettlement < terraceRad) {
      const u = (distSettlement - flatZone) / (terraceRad - flatZone);
      const blend = 1.0 - u * u * (3 - 2 * u);
      const naturalY = computeNaturalSlopeY(island, relX, relZ);
      return naturalY * (1 - blend) + targetTerrace * blend;
    }
  }

  return computeNaturalSlopeY(island, relX, relZ);
}

function computeNaturalSlopeY(
  island: IslandDefinition,
  relX: number,
  relZ: number
): number {
  const { radius, height, sandRadius, type, seed } = island;

  // 1. Account for elongation transformation (matches terrain mesh geometry)
  let nx = relX;
  let nz = relZ;
  if (island.elongation) {
    const cos = Math.cos(-island.elongation.angle);
    const sin = Math.sin(-island.elongation.angle);
    const rx = relX * cos - relZ * sin;
    const rz = relX * sin + relZ * cos;
    nx = rx / (island.elongation.scaleX || 1);
    nz = rz / (island.elongation.scaleZ || 1);
  }

  const r = Math.sqrt(nx * nx + nz * nz);
  const angle = Math.atan2(nz, nx);

  // 2. Deep in ocean water
  if (r >= sandRadius * 1.12) {
    return 0.1;
  }

  // 3. Sandy Shoreline / Coastal Beach zone (beyond mountain base r > radius * 1.15)
  if (r >= radius * 1.15) {
    const beachT = Math.max(0, Math.min(1, (sandRadius * 1.12 - r) / (sandRadius * 1.12 - radius * 1.15)));
    return 0.4 + beachT * 1.8;
  }

  // 4. Exact Mathematical Terrain Mesh Elevation
  // The terrain mesh is a CylinderGeometry(radius * 0.1, radius * 1.15, height)
  // placed at y = getIslandElevation(island) + 2.0.
  const elevOffset = getIslandElevation(island) + 2.0;

  // Fractional height t on the truncated cone: r(t) = radius * (1.15 - 1.05 * t)
  const t = Math.max(0, Math.min(1, (radius * 1.15 - r) / (radius * 1.05)));
  const yCyl = (t - 0.5) * height;

  // Exact vertical displacement (dy) matching createIslandTerrainGeometry
  let dy = 0;
  if (type === 'volcanic') {
    dy = Math.sin(angle * 11 + yCyl * 0.3) * 0.8 * t +
         Math.sin(angle * 19 + yCyl * 0.7) * 0.4 * t;
  } else if (type === 'sea-stack') {
    const peakBias = Math.max(0, Math.cos(angle * 2 - 1.0)) * height * 0.15 * t * t;
    dy = peakBias + Math.sin(angle * 9 + yCyl * 0.4) * 1.2 * t;
  } else if (type === 'atoll') {
    dy = -t * t * height * 0.3 + Math.sin(angle * 7 + yCyl * 0.5) * 0.3;
  } else if (type === 'lush-flat') {
    dy = Math.sin(angle * 3 + 0.8) * Math.sin(t * Math.PI) * height * 0.12 +
         Math.cos(angle * 5 - 1.2) * height * 0.06 * t;
  } else if (type === 'verdant-hills') {
    const rollingDome = Math.sin(t * Math.PI * 0.95) * height * 0.24;
    const saddle = Math.cos(angle * 2 + 1.1) * height * 0.14 * t;
    dy = rollingDome + saddle;
  } else if (type === 'dense-jungle') {
    const terracing = Math.sin(t * Math.PI * 3.0) * 0.6 * (1 - t);
    dy = terracing + Math.sin(angle * 5 + seed * 0.5) * height * 0.12 * t;
  }

  // Organic micro-noise displacement
  const noise1 = Math.sin(angle * 13 + yCyl * 0.5 + seed * 0.1) * 0.6;
  const noise2 = Math.sin(angle * 23 + yCyl * 1.1 + seed * 0.3) * 0.25;
  dy += (noise1 + noise2) * (1 - t * 0.4) * 0.4;

  // Add a clean +0.4m resting surface elevation so roots and boulders sit securely ON TOP of the terrain
  const surfaceY = elevOffset + yCyl + dy + 0.4;
  return Math.max(1.2, surfaceY);
}
