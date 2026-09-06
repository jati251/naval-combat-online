import { jungleTrunkGeometry, jungleCrownGeometry, jungleTrunkMaterial, jungleCrownMaterial } from './jungleGeometries';
import { memo, useMemo, useRef } from 'react';
import type { Group } from 'three';
import { useFrame } from '@react-three/fiber';
import { StaticInstances, type InstanceTransform } from '../shared/StaticInstances';
import {
  getVegMaterials,
  palmPlaneGeo,
  junglePlaneGeo,
  bushPlaneGeo,
  smallBushPlaneGeo,
} from './IslandVegetation';
import { getTerrainSurfaceY } from './islandGeometries';
import type { IslandDefinition } from './types';
import { palmTrunkGeometry, palmCrownGeometry, palmTrunkMaterial, palmCrownMaterial } from './palmGeometries';

/**
 * Dense Tropical Island Foliage (AC Black Flag Aesthetic)
 * Combines authored landmark groves with dense procedural rainforest canopy
 * and optimized small sprite bushes batched into instanced draw calls.
 */
export const IslandFoliage = memo(function IslandFoliage({ island, isMobile }: {
  island: IslandDefinition; isMobile: boolean;
}) {
  const nearPalms = useRef<Group>(null);
  const farPalms = useRef<Group>(null);

  const { palms, solidPalms, solidJungle, jungle, bushes, smallBushes } = useMemo(() => {
    const palms: InstanceTransform[] = [];
    const solidPalms: InstanceTransform[] = [];
    const jungle: InstanceTransform[] = [];
    const solidJungle: InstanceTransform[] = [];
    const bushes: InstanceTransform[] = [];
    const smallBushes: InstanceTransform[] = [];

    function cross(target: InstanceTransform[], x: number, y: number, z: number, scale: number, angle: number, planes: number) {
      if (y < 0.8) return;
      if (target === jungle) solidJungle.push({ position: [x, y, z], rotation: [0, angle, 0], scale: [scale, scale, scale] });
      for (let i = 0; i < planes; i++) {
        target.push({
          position: [x, y, z],
          rotation: [0, angle + (i * Math.PI) / planes, 0],
          scale: [scale, scale, scale],
        });
      }
    }

    // 1. Authored coconut palms & companion groves
    island.palms.forEach(([x, z, scale], i) => {
      const y = getTerrainSurfaceY(island, x, z);
      if (y < 0.8) return;
      solidPalms.push({ position: [x, y, z], rotation: [0, (i + island.seed) * 1.618, 0], scale: [scale, scale, scale] });
      cross(palms, x, y, z, scale, (i + island.seed) * 1.618, 3);
      cross(bushes, x + 0.5 * scale, y - 0.1, z + 0.4 * scale, scale * 0.55, (i * 7 + 3) * 2.11, 3);
      cross(smallBushes, x - 0.4 * scale, y - 0.05, z - 0.3 * scale, scale * 0.7, (i * 9 + 5) * 1.5, 2);

      // Natural companion palm shoot / sapling forming organic palm groves
      const compAngle = (i * 4.3 + island.seed * 0.7) % (Math.PI * 2);
      const compDist = (2.4 + ((i * 3) % 4) * 0.8) * scale;
      const cx = x + Math.cos(compAngle) * compDist;
      const cz = z + Math.sin(compAngle) * compDist;
      const cy = getTerrainSurfaceY(island, cx, cz);
      const cScale = scale * (0.65 + ((i * 5) % 3) * 0.15);
      cross(palms, cx, cy, cz, cScale, compAngle + 1.2, 3);
      cross(smallBushes, cx + 0.3, cy - 0.05, cz + 0.3, cScale * 0.8, compAngle, 2);
    });

    // 2. Authored rainforest canopy trees
    island.jungleTrees?.forEach(([x, z, scale], i) => {
      const y = getTerrainSurfaceY(island, x, z);
      cross(jungle, x, y, z, scale, (i + island.seed * 3) * 1.345, isMobile ? 3 : 4);
      cross(bushes, x + 0.7 * scale, y - 0.1, z + 0.5 * scale, scale * 0.65, (i * 11 + 1) * 2.11, 3);
      cross(smallBushes, x - 0.5 * scale, y - 0.05, z + 0.6 * scale, scale * 0.75, (i * 15 + 7) * 1.7, 2);
      if (!isMobile) cross(bushes, x - 0.6 * scale, y - 0.1, z - 0.6 * scale, scale * 0.6, (i * 13 + 5) * 2.11, 3);

      // Companion rainforest trees forming dense, contiguous jungle canopies
      const compA1 = (i * 3.7 + island.seed * 1.1) % (Math.PI * 2);
      const compD1 = (3.4 + ((i * 2) % 3) * 1.2) * scale;
      const cx1 = x + Math.cos(compA1) * compD1;
      const cz1 = z + Math.sin(compA1) * compD1;
      const cy1 = getTerrainSurfaceY(island, cx1, cz1);
      cross(jungle, cx1, cy1, cz1, scale * 0.88, compA1 + 0.9, isMobile ? 3 : 4);
      cross(smallBushes, cx1 + 0.4, cy1 - 0.05, cz1 - 0.3, scale * 0.7, compA1 + 0.4, 2);

      if (!isMobile) {
        const compA2 = compA1 + 2.1;
        const compD2 = (4.2 + (i % 3) * 1.2) * scale;
        const cx2 = x + Math.cos(compA2) * compD2;
        const cz2 = z + Math.sin(compA2) * compD2;
        const cy2 = getTerrainSurfaceY(island, cx2, cz2);
        cross(jungle, cx2, cy2, cz2, scale * 0.78, compA2 + 1.8, 3);
        cross(smallBushes, cx2 - 0.3, cy2 - 0.05, cz2 + 0.4, scale * 0.65, compA2, 2);
      }
    });

    // 3. Authored undergrowth bushes
    island.bushes?.forEach(([bx, bz, bScale], i) => {
      const y = getTerrainSurfaceY(island, bx, bz);
      cross(bushes, bx, y, bz, bScale, (i * 17 + island.seed) * 1.618, 3);
      cross(smallBushes, bx + 0.5 * bScale, y - 0.05, bz - 0.4 * bScale, bScale * 0.75, i * 2.3, 2);
    });

    // 4. Dense Procedural Rainforest Canopy Infill (AC Black Flag thick jungle coverage)
    // Eliminates bare ("botak") mountains by carpeting slopes and crowns in continuous foliage
    let prngState = (island.seed * 9301 + 49297) % 233280;
    const rnd = () => {
      prngState = (prngState * 9301 + 49297) % 233280;
      return prngState / 233280;
    };

    const scaleX = island.elongation?.scaleX ?? 1;
    const scaleZ = island.elongation?.scaleZ ?? 1;
    const islandRadius = island.radius;
    const isAtoll = island.type === 'atoll';
    const isSeaArch = island.settlement?.type === 'sea-arch';

    if (!isSeaArch) {
      const step = isMobile ? 6.8 : 5.0;
      const maxBoundX = islandRadius * scaleX * 0.88;
      const maxBoundZ = islandRadius * scaleZ * 0.88;

      for (let gx = -maxBoundX; gx <= maxBoundX; gx += step) {
        for (let gz = -maxBoundZ; gz <= maxBoundZ; gz += step) {
          const jx = gx + (rnd() - 0.5) * (step * 0.85);
          const jz = gz + (rnd() - 0.5) * (step * 0.85);

          const nx = jx / (islandRadius * scaleX);
          const nz = jz / (islandRadius * scaleZ);
          const distSq = nx * nx + nz * nz;
          if (distSq > 0.85) continue;

          // Skip atoll lagoon center
          if (isAtoll && distSq < 0.22) continue;

          // Skip settlements (Colonial Fort, Kingston City, Mayan Pyramid)
          if (island.settlement) {
            const sdx = jx - island.settlement.x;
            const sdz = jz - island.settlement.z;
            const clearDist = island.settlement.type === 'kingston-city' ? 44 : 22;
            if (Math.hypot(sdx, sdz) < clearDist) continue;
          }

          const y = getTerrainSurfaceY(island, jx, jz);
          // Only plant above beach waterline
          if (y < 1.4) continue;

          const treeScale = 0.95 + rnd() * 0.45;
          const angle = rnd() * Math.PI * 2;

          if (distSq < 0.65) {
            // Upper slopes, interior ridges, and mountain crowns: dense rainforest canopy
            cross(jungle, jx, y, jz, treeScale, angle, isMobile ? 3 : 4);
            // Dense undergrowth small bush cluster at trunk base
            cross(smallBushes, jx + (rnd() - 0.5) * 1.8, y - 0.05, jz + (rnd() - 0.5) * 1.8, 0.75 + rnd() * 0.35, angle + 1.1, 2);
            if (!isMobile && rnd() > 0.4) {
              cross(smallBushes, jx + (rnd() - 0.5) * 2.4, y - 0.05, jz + (rnd() - 0.5) * 2.4, 0.65 + rnd() * 0.35, angle + 2.4, 2);
            }
          } else {
            // Lower slopes & coastal perimeter: coconut palms and tropical fringe trees
            if (rnd() > 0.45) {
              solidPalms.push({ position: [jx, y, jz], rotation: [0, angle, 0], scale: [treeScale, treeScale, treeScale] });
              cross(palms, jx, y, jz, treeScale, angle, 3);
            } else {
              cross(jungle, jx, y, jz, treeScale * 0.9, angle, isMobile ? 3 : 4);
            }
            cross(smallBushes, jx + (rnd() - 0.5) * 1.5, y - 0.05, jz + (rnd() - 0.5) * 1.5, 0.7 + rnd() * 0.3, angle + 1.5, 2);
          }
        }
      }

      // 5. Standalone Small Sprite Bush Carpet across hillside ledges and clearings
      const bushStep = isMobile ? 5.2 : 3.6;
      for (let bx = -maxBoundX * 0.95; bx <= maxBoundX * 0.95; bx += bushStep) {
        for (let bz = -maxBoundZ * 0.95; bz <= maxBoundZ * 0.95; bz += bushStep) {
          if (rnd() > (isMobile ? 0.42 : 0.62)) continue;
          const jx = bx + (rnd() - 0.5) * (bushStep * 0.9);
          const jz = bz + (rnd() - 0.5) * (bushStep * 0.9);
          const nx = jx / (islandRadius * scaleX);
          const nz = jz / (islandRadius * scaleZ);
          const distSq = nx * nx + nz * nz;
          if (distSq > 0.92) continue;
          if (isAtoll && distSq < 0.18) continue;

          if (island.settlement) {
            const sdx = jx - island.settlement.x;
            const sdz = jz - island.settlement.z;
            const clearDist = island.settlement.type === 'kingston-city' ? 42 : 20;
            if (Math.hypot(sdx, sdz) < clearDist) continue;
          }

          const y = getTerrainSurfaceY(island, jx, jz);
          if (y < 0.9) continue; // Just above the sand level

          const bScale = 0.65 + rnd() * 0.45;
          cross(smallBushes, jx, y - 0.04, jz, bScale, rnd() * Math.PI * 2, 2);
        }
      }
    }

    return { palms, solidPalms, solidJungle, jungle, bushes, smallBushes };
  }, [island, isMobile]);

  useFrame(({ camera }) => {
    if (!nearPalms.current || !farPalms.current) return;
    const threshold = (isMobile ? 90 : 260) + island.radius * Math.max(island.elongation?.scaleX ?? 1, island.elongation?.scaleZ ?? 1) + (nearPalms.current.visible ? 20 : 0);
    const close = (camera.position.x - island.x) ** 2 + (camera.position.z - island.z) ** 2 < threshold ** 2;
    nearPalms.current.visible = close;
    farPalms.current.visible = !close;
  });

  const { palmMat, jungleMat, bushMat, smallBushMat } = getVegMaterials();

  return (
    <group>
      {/* 2D Crossed Billboard Palms (Distant LOD) */}
      <group ref={farPalms}>
        <StaticInstances geometry={palmPlaneGeo} material={palmMat} instances={palms} />
        <StaticInstances geometry={junglePlaneGeo} material={jungleMat} instances={jungle} />
      </group>

      {/* 3D Solid Meshed Palms (Close-up LOD) */}
      <group ref={nearPalms} visible={false}>
        <StaticInstances geometry={palmTrunkGeometry} material={palmTrunkMaterial} instances={solidPalms} castShadow={!isMobile} />
        <StaticInstances geometry={palmCrownGeometry} material={palmCrownMaterial} instances={solidPalms} castShadow={!isMobile} />
        <StaticInstances geometry={jungleTrunkGeometry} material={jungleTrunkMaterial} instances={solidJungle} castShadow={!isMobile} />
        <StaticInstances geometry={jungleCrownGeometry} material={jungleCrownMaterial} instances={solidJungle} castShadow={!isMobile} />
      </group>


      {/* Medium Tropical Bush Clusters */}
      <StaticInstances geometry={bushPlaneGeo} material={bushMat} instances={bushes} />

      {/* Optimized Small Sprite Bushes (Understory & Hillside Ground Carpet) */}
      <StaticInstances geometry={smallBushPlaneGeo} material={smallBushMat} instances={smallBushes} />
    </group>
  );
});
