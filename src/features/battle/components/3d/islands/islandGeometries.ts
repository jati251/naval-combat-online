import * as THREE from 'three';
import type { IslandDefinition } from './types';

// ────────────────────────────────────────────────────────────────────────
// Fast math helpers for ridged mountain relief
// ────────────────────────────────────────────────────────────────────────
function ridgedNoise(val: number): number {
  return 1.0 - Math.abs(Math.sin(val));
}

/**
 * Generates high-detail procedural terrain geometry with archetype-based mountain morphology:
 * - High geometric density (120 segments × 56 rings) for smooth, sharp ridges and gullies
 * - World-scaled UV mapping to eliminate texture stretching and maximize texture clarity
 * - Ridged multifractal mountain spines, volcanic caldera rims, and stepped karst cliffs
 * - Slope-aware (tri-planar style) vertex color splatting exposing sheer rock cliffs and lush turf plateaus
 */
export function createIslandTerrainGeometry(
  island: IslandDefinition
): THREE.BufferGeometry {
  const { radius, height, type, seed } = island;
  const segments = 120; // High radial resolution for crisp mountain crags
  const rings = 56;     // High vertical resolution for stratified rock ledges

  const geo = new THREE.CylinderGeometry(
    radius * 0.08,  // Sharp mountain summit peak
    radius * 1.15,  // Base radius merging with beach
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
      // Jagged caldera rim with craggy teeth at the summit
      const craterRim = t > 0.82
        ? (Math.sin(angle * 6 + seed * 0.5) * 0.6 + ridgedNoise(angle * 12 + 0.8) * 0.4) * radius * 0.12 * ((t - 0.82) / 0.18)
        : 0;
      // Radiating lava flow ribs and vertical erosion chutes
      const lavaRibs = ridgedNoise(angle * 8 + 0.5) * radius * 0.16 * t;
      const erosionGully = Math.sin(angle * 5 + 1.3) * Math.sin(angle * 11 + 2.7) * radius * 0.08 * t;
      const basaltButtress = Math.sin(angle * 3 + 0.7) * radius * 0.14 * (1 - t) * (1 - t);
      
      dx = Math.cos(angle) * (erosionGully + basaltButtress + craterRim + lavaRibs);
      dz = Math.sin(angle) * (erosionGully + basaltButtress + craterRim + lavaRibs);
      
      // Basalt columnar steps and sheer drops
      const stepTerracing = Math.sin(t * Math.PI * 5) * 0.5 * t;
      dy = Math.sin(angle * 11 + y * 0.3) * 0.9 * t +
           Math.sin(angle * 19 + y * 0.7) * 0.45 * t +
           stepTerracing;

    } else if (type === 'sea-stack') {
      // Sheer vertical limestone cliffs, undercut wave notch, and jagged summit spires
      const cliff = (Math.abs(Math.sin(angle * 4 + 0.5)) + ridgedNoise(angle * 8 + 1.2) * 0.6) * radius * 0.16 * t;
      const overhang = t > 0.55 ? Math.sin(angle * 6 + 2.1) * radius * 0.12 * ((t - 0.55) / 0.45) : 0;
      const waveNotch = (t < 0.15) ? -Math.sin((t / 0.15) * Math.PI) * radius * 0.08 : 0;
      const baseSpread = (1 - t) * (1 - t) * radius * 0.25 * (1 + Math.sin(angle * 3) * 0.3);

      dx = Math.cos(angle) * (cliff + overhang + waveNotch + baseSpread);
      dz = Math.sin(angle) * (cliff + overhang + waveNotch + baseSpread);

      const peakBias = Math.max(0, Math.cos(angle * 2 - 1.0)) * height * 0.18 * t * t;
      dy = peakBias + Math.sin(angle * 9 + y * 0.4) * 1.3 * t;

    } else if (type === 'atoll') {
      // Reef ring with coral limestone outcrops and central lagoon depression
      const ringFactor = Math.sin(t * Math.PI);
      const ringRadius = radius * 0.3 * ringFactor;
      const irregularity = Math.sin(angle * 5 + 1.7) * radius * 0.09 + Math.sin(angle * 11) * radius * 0.05;
      const reefLedge = ridgedNoise(angle * 7) * radius * 0.06 * (1 - t);

      dx = Math.cos(angle) * (ringRadius + irregularity + reefLedge);
      dz = Math.sin(angle) * (ringRadius + irregularity + reefLedge);
      dy = -t * t * height * 0.28 + Math.sin(angle * 7 + y * 0.5) * 0.35;

    } else if (type === 'lush-flat') {
      // Undulating savannah knolls and coastal dune swells
      const gentleHill = Math.sin(angle * 2 + 0.4) * radius * 0.16 * (1 - t);
      const coastalVariation = Math.sin(angle * 8 + 2.3) * radius * 0.07 * (1 - t * t);
      const duneWobble = ridgedNoise(angle * 6 + seed) * radius * 0.06 * (1 - t);

      dx = Math.cos(angle) * (gentleHill + coastalVariation + duneWobble);
      dz = Math.sin(angle) * (gentleHill + coastalVariation + duneWobble);
      dy = Math.sin(angle * 3 + 0.8) * Math.sin(t * Math.PI) * height * 0.14 +
           Math.cos(angle * 5 - 1.2) * height * 0.07 * t;

    } else if (type === 'verdant-hills') {
      // Broad rolling hills, sharp connecting mountain spine, and stepped knolls
      const hillSwelling = Math.sin(angle * 3 + 0.5) * Math.cos(angle * 2 - 0.7) * radius * 0.22 * (1 - t * 0.6);
      const ridgeSpine = ridgedNoise(angle * 4 + seed * 0.25) * radius * 0.14 * (1 - t * 0.3);
      const knollRidge = Math.sin(angle * 7 + seed * 0.5) * radius * 0.08 * (1 - t);

      dx = Math.cos(angle) * (hillSwelling + ridgeSpine + knollRidge);
      dz = Math.sin(angle) * (hillSwelling + ridgeSpine + knollRidge);

      // Rolling terraced dome + spine crest
      const rollingDome = Math.sin(t * Math.PI * 0.95) * height * 0.26;
      const saddle = Math.cos(angle * 2 + 1.1) * height * 0.16 * t;
      const terracedLedges = (Math.sin(t * Math.PI * 6.0) * 0.35 + Math.cos(angle * 5 + t * 4) * 0.4) * (1 - t * 0.4);
      dy = rollingDome + saddle + terracedLedges;

    } else if (type === 'dense-jungle') {
      // Knife-edge razor spine ridges (Na Pali / Jurassic Park style) and fluted valleys
      const spine = ridgedNoise(angle * 5 + 1.2) * radius * 0.22 * (1 - t * 0.4);
      const ravine = Math.cos(angle * 9 - 0.8) * radius * 0.12 * t;
      const spur = Math.sin(angle * 3 + seed * 0.4) * radius * 0.14 * (1 - t * 0.6);

      dx = Math.cos(angle) * (spine + ravine + spur);
      dz = Math.sin(angle) * (spine + ravine + spur);

      const fluting = Math.sin(t * Math.PI * 4.0) * 0.7 * (1 - t);
      dy = fluting + Math.sin(angle * 6 + seed * 0.5) * height * 0.15 * t;
    }

    // High-frequency geological micro-noise
    const noise1 = Math.sin(angle * 13 + y * 0.55 + seed * 0.1) * 0.65;
    const noise2 = Math.sin(angle * 27 + y * 1.2 + seed * 0.3) * 0.3;
    const noise3 = Math.sin(angle * 43 + y * 2.5 + seed * 0.7) * 0.15;
    const combinedNoise = (noise1 + noise2 + noise3) * (1 - t * 0.35);

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

  // ────────────────────────────────────────────────────────────────────────
  // World-Scaled UV Mapping (preserves CylinderGeometry's native seam-split vertices)
  // Scaling native UV avoids atan2 wrap-around jumps that cause vertical mipmap blur ramps.
  // ────────────────────────────────────────────────────────────────────────
  const uvAttr = geo.attributes.uv as THREE.BufferAttribute;
  const uRepeat = Math.max(4, Math.round((2 * Math.PI * radius) / 22)); // 1 tile per ~22m circumference
  const vRepeat = Math.max(3, Math.round(height / 9));                 // 1 tile per ~9m height

  for (let i = 0; i < uvAttr.count; i++) {
    uvAttr.setXY(i, uvAttr.getX(i) * uRepeat, uvAttr.getY(i) * vRepeat);
  }

  // ────────────────────────────────────────────────────────────────────────
  // Slope-Aware & Elevation-Aware Vertex Color Splatting
  // ────────────────────────────────────────────────────────────────────────
  const norms = geo.attributes.normal as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const color = new THREE.Color();

  // Natural Deep Tropical Palette
  const colSunlitTurf  = new THREE.Color('#4c721c'); // Sunlit tropical grass turf (warm golden-olive)
  const colWarmMeadow  = new THREE.Color('#385614'); // Rich forest turf
  const colDenseRain   = new THREE.Color('#223a0d'); // Deep rainforest floor moss
  const colGoldenRidge = new THREE.Color('#647422'); // Sun-baked knoll ridge
  const colSoil        = new THREE.Color('#48361e'); // Warm fertile tropical soil & loam
  const colLichen      = new THREE.Color('#506024'); // Clinging warm rock moss/lichen
  const colSandBase    = new THREE.Color('#8a7952'); // Sandy coastal earth base
  // Authentic Rock Tints (Preserves the 1024x1024 rock texture with strata & fissures)
  const colRockCliff   = new THREE.Color('#ded7cc'); // Clean, sharp exposed rock face (lets texture pop)
  const colRockDark    = new THREE.Color('#948c82'); // Weathered dark basalt / crags
  const colPeakCrag    = new THREE.Color('#6b645c'); // Alpine mountain summits & ridges

  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const t = Math.max(0, Math.min(1, (y + height / 2) / height));
    const ny = norms.getY(i); // Steepness factor: 1 = flat horizontal, 0 = vertical cliff

    // Base vegetative tone along height
    const baseGreen = new THREE.Color();
    if (type === 'verdant-hills') {
      if (t < 0.25) {
        baseGreen.lerpColors(colSunlitTurf, colWarmMeadow, t / 0.25);
      } else if (t < 0.68) {
        baseGreen.lerpColors(colWarmMeadow, colGoldenRidge, (t - 0.25) / 0.43);
      } else {
        baseGreen.lerpColors(colGoldenRidge, colLichen, (t - 0.68) / 0.32);
      }
    } else if (type === 'dense-jungle') {
      if (t < 0.3) {
        baseGreen.lerpColors(colSunlitTurf, colDenseRain, t / 0.3);
      } else if (t < 0.75) {
        baseGreen.lerpColors(colDenseRain, colLichen, (t - 0.3) / 0.45);
      } else {
        baseGreen.lerpColors(colLichen, colRockDark, (t - 0.75) / 0.25);
      }
    } else if (type === 'volcanic') {
      if (t < 0.2) {
        baseGreen.lerpColors(colWarmMeadow, colSoil, t / 0.2);
      } else if (t < 0.55) {
        baseGreen.lerpColors(colSoil, colRockDark, (t - 0.2) / 0.35);
      } else {
        baseGreen.lerpColors(colRockDark, colPeakCrag, (t - 0.55) / 0.45);
      }
    } else {
      if (t < 0.35) {
        baseGreen.lerpColors(colSunlitTurf, colWarmMeadow, t / 0.35);
      } else {
        baseGreen.lerpColors(colWarmMeadow, colSoil, (t - 0.35) / 0.65);
      }
    }

    // High-frequency ridge and ravine perturbation:
    // Mountain crests and erosion channels expose rock even on gentler slopes
    const ridgeNoise = ridgedNoise(pos.getX(i) * 0.08 + pos.getZ(i) * 0.08 + seed * 0.4) * 0.13;
    const effectiveNy = ny - ridgeNoise;

    // Calibrated Slope-Aware Splatting (based on real cone slope range ny ~ 0.80 - 0.96):
    // effectiveNy >= 0.93 -> Flat plateau / gentle valley: lush vegetation
    // effectiveNy <= 0.85 -> Steep cliff face: bare rock strata & crags
    // 0.85 < effectiveNy < 0.93 -> Transitional ledges, clinging lichen, exposed soil
    const summitRockBias = t > 0.65 ? (t - 0.65) / 0.35 : 0;
    const slopeRock = new THREE.Color().lerpColors(colRockCliff, colPeakCrag, t * 0.7 + summitRockBias * 0.3);

    if (effectiveNy < 0.85) {
      // Sheer cliff face / jagged mountain crags: full exposed rock texture!
      const cliffT = Math.max(0, Math.min(1, effectiveNy / 0.85));
      color.lerpColors(colPeakCrag, colRockCliff, cliffT);
    } else if (effectiveNy < 0.93) {
      // Steep slope with rock ledges, clinging lichen & fertile loam
      const transT = (effectiveNy - 0.85) / 0.08;
      const transSoilRock = new THREE.Color().lerpColors(colSoil, slopeRock, 0.6);
      const transRock = new THREE.Color().lerpColors(transSoilRock, colLichen, transT);
      color.lerpColors(transRock, baseGreen, transT * 0.65);
    } else {
      // Gentle slope / lush plateau
      color.copy(baseGreen);
      if (summitRockBias > 0) {
        color.lerp(slopeRock, summitRockBias * 0.7);
      }
    }

    // Coastal waterline blend at base (t < 0.12)
    if (t < 0.12) {
      const sandBlend = 1.0 - t / 0.12;
      color.lerp(colSandBase, sandBlend * 0.75);
    }

    // Kingston City paved cobblestone plaza
    if (island.settlement && island.settlement.type === 'kingston-city') {
      const sx = island.settlement.x;
      const sz = island.settlement.z;
      const vx = pos.getX(i);
      const vz = pos.getZ(i);
      const dist = Math.sqrt((vx - sx) ** 2 + (vz - sz) ** 2);
      if (dist < 48) {
        const colPavement = new THREE.Color('#78716c'); // Colonial cobblestone
        const blend = Math.max(0, Math.min(1, (48 - dist) / 12));
        color.lerp(colPavement, blend * 0.9);
      }
    }

    // ────────────────────────────────────────────────────────────────────────
    // Macro Ambient Occlusion & Soft Atmospheric Skylight Tinting
    // ────────────────────────────────────────────────────────────────────────
    // Celestial sun vector in sky: normalized [70, 140, -50] -> (0.428, 0.857, -0.306)
    const sunDot = norms.getX(i) * 0.428 + norms.getY(i) * 0.857 - norms.getZ(i) * 0.306;
    const sunDiffuse = THREE.MathUtils.clamp((sunDot + 0.1) / 0.9, 0.0, 1.0);

    // Directional shadow factor: 1 = shadow, 0 = sun
    const shadowFactor = 1.0 - sunDiffuse;
    const colShadowSky = new THREE.Color('#4a5c6e'); // Soft Caribbean atmospheric ambient tint

    // Micro-concavity ambient occlusion (valleys, ravines, cliff undercuts)
    const aoNoise = (Math.sin(pos.getX(i) * 0.15 + pos.getZ(i) * 0.15) + 1) * 0.5;
    const heightExposure = 0.88 + t * 0.22; // Ridge crests get clean sky exposure
    const aoFactor = (0.88 + aoNoise * 0.18) * heightExposure;

    // Apply gentle macro AO and warm/cool hemispheric grading (prevents double-shadowing black smudges)
    color.multiplyScalar((0.84 + sunDiffuse * 0.24) * aoFactor);
    color.lerp(colShadowSky, shadowFactor * 0.10);

    colors[i * 3]     = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  return geo;
}

/**
 * Procedural beach / sandbank geometry with realistic wet/dry tide line
 * vertex coloring, directional sun shading, irregular coastal shoreline wobble,
 * and world-scaled UV mapping.
 */
export function createBeachGeometry(island: IslandDefinition): THREE.BufferGeometry {
  const segments = 96;
  const { sandRadius, radius, seed } = island;

  const geo = new THREE.CylinderGeometry(
    radius * 1.08,
    sandRadius * 1.2,
    2.8,
    segments,
    10,
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

    // Waterfront harbor cutout for Kingston City
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

  // World-scaled UV mapping for beach sand ripples (preserves native seam vertices)
  const uvAttr = geo.attributes.uv as THREE.BufferAttribute;
  const uRepeat = Math.max(6, Math.round((2 * Math.PI * sandRadius) / 16));
  for (let i = 0; i < uvAttr.count; i++) {
    uvAttr.setXY(i, uvAttr.getX(i) * uRepeat, uvAttr.getY(i) * 3);
  }

  // AAA Realistic Sand Tide Gradient Vertex Colors:
  // Wet saturated waterline sand -> Warm sunlit coral sand -> Coastal earth
  const norms = geo.attributes.normal as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const color = new THREE.Color();
  const colWetSand = new THREE.Color('#6b4c27');      // Saturated ocean wash tide line
  const colDampSand = new THREE.Color('#9e7947');     // Damp waterline sand
  const colDryCoralSand = new THREE.Color('#eed49e'); // Sun-warmed Caribbean coral sand
  const colUpperSand = new THREE.Color('#d2b57b');    // Upper beach sand
  const colCoastalLoam = new THREE.Color('#786544');  // Blending into coastal terrain base

  for (let i = 0; i < pos.count; i++) {
    const py = pos.getY(i);
    const t = Math.max(0, Math.min(1, (py + 1.4) / 2.8));

    if (t < 0.25) {
      color.lerpColors(colWetSand, colDampSand, t / 0.25);
    } else if (t < 0.68) {
      color.lerpColors(colDampSand, colDryCoralSand, (t - 0.25) / 0.43);
    } else if (t < 0.88) {
      color.lerpColors(colDryCoralSand, colUpperSand, (t - 0.68) / 0.2);
    } else {
      color.lerpColors(colUpperSand, colCoastalLoam, (t - 0.88) / 0.12);
    }

    // Directional sun lighting on beach sand - soft natural skylight fill
    const sunDot = norms.getX(i) * 0.428 + norms.getY(i) * 0.857 - norms.getZ(i) * 0.306;
    const sunDiffuse = THREE.MathUtils.clamp((sunDot + 0.1) / 0.9, 0.0, 1.0);
    color.multiplyScalar(0.88 + sunDiffuse * 0.18);
    color.lerp(new THREE.Color('#4a5c6e'), (1.0 - sunDiffuse) * 0.08);

    colors[i * 3]     = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

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

  // 1. Account for elongation transformation
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

  // 3. Sandy Shoreline / Coastal Beach zone
  if (r >= radius * 1.15) {
    const beachT = Math.max(0, Math.min(1, (sandRadius * 1.12 - r) / (sandRadius * 1.12 - radius * 1.15)));
    return 0.4 + beachT * 1.8;
  }

  // 4. Exact Mathematical Terrain Mesh Elevation
  const elevOffset = getIslandElevation(island) + 2.0;

  // Fractional height t on the truncated cone: r(t) = radius * (1.15 - 1.07 * t)
  const t = Math.max(0, Math.min(1, (radius * 1.15 - r) / (radius * 1.07)));
  const yCyl = (t - 0.5) * height;

  // Exact vertical displacement matching createIslandTerrainGeometry
  let dy = 0;
  if (type === 'volcanic') {
    const stepTerracing = Math.sin(t * Math.PI * 5) * 0.5 * t;
    dy = Math.sin(angle * 11 + yCyl * 0.3) * 0.9 * t +
         Math.sin(angle * 19 + yCyl * 0.7) * 0.45 * t +
         stepTerracing;
  } else if (type === 'sea-stack') {
    const peakBias = Math.max(0, Math.cos(angle * 2 - 1.0)) * height * 0.18 * t * t;
    dy = peakBias + Math.sin(angle * 9 + yCyl * 0.4) * 1.3 * t;
  } else if (type === 'atoll') {
    dy = -t * t * height * 0.28 + Math.sin(angle * 7 + yCyl * 0.5) * 0.35;
  } else if (type === 'lush-flat') {
    dy = Math.sin(angle * 3 + 0.8) * Math.sin(t * Math.PI) * height * 0.14 +
         Math.cos(angle * 5 - 1.2) * height * 0.07 * t;
  } else if (type === 'verdant-hills') {
    const rollingDome = Math.sin(t * Math.PI * 0.95) * height * 0.26;
    const saddle = Math.cos(angle * 2 + 1.1) * height * 0.16 * t;
    const terracedLedges = (Math.sin(t * Math.PI * 6.0) * 0.35 + Math.cos(angle * 5 + t * 4) * 0.4) * (1 - t * 0.4);
    dy = rollingDome + saddle + terracedLedges;
  } else if (type === 'dense-jungle') {
    const fluting = Math.sin(t * Math.PI * 4.0) * 0.7 * (1 - t);
    dy = fluting + Math.sin(angle * 6 + seed * 0.5) * height * 0.15 * t;
  }

  // High-frequency geological micro-noise
  const noise1 = Math.sin(angle * 13 + yCyl * 0.55 + seed * 0.1) * 0.65;
  const noise2 = Math.sin(angle * 27 + yCyl * 1.2 + seed * 0.3) * 0.3;
  dy += (noise1 + noise2) * (1 - t * 0.35) * 0.4;

  // Add a clean resting surface elevation so foliage and props sit firmly on terrain
  const surfaceY = elevOffset + yCyl + dy + 0.4;

  // Account for settlement plateau terrace flattening (flush seating for buildings & props)
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

    const distSettlement = Math.sqrt((relX - sx) ** 2 + (relZ - sz) ** 2);
    if (distSettlement < terraceRad) {
      const flatZone = terraceRad * 0.72;
      let blend = 1.0;
      if (distSettlement > flatZone) {
        const u = (distSettlement - flatZone) / (terraceRad - flatZone);
        blend = 1.0 - u * u * (3 - 2 * u);
      }
      return targetTerrace * blend + Math.max(1.2, surfaceY) * (1.0 - blend);
    }
  }

  return Math.max(1.2, surfaceY);
}
