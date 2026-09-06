import { memo, useMemo, useRef } from 'react';
import type { Group } from 'three';
import { useFrame } from '@react-three/fiber';
import { StaticInstances, type InstanceTransform } from '../shared/StaticInstances';
import { getVegMaterials, palmPlaneGeo, junglePlaneGeo, bushPlaneGeo } from './IslandVegetation';
import { getTerrainSurfaceY } from './islandGeometries';
import type { IslandDefinition } from './types';
import { palmTrunkGeometry, palmCrownGeometry, palmTrunkMaterial, palmCrownMaterial } from './palmGeometries';

/** Preserve the authored scatter while batching all crossed planes by species. */
export const IslandFoliage = memo(function IslandFoliage({ island, isMobile }: {
  island: IslandDefinition; isMobile: boolean;
}) {
  const nearPalms = useRef<Group>(null);
  const farPalms = useRef<Group>(null);
  const { palms, solidPalms, jungle, bushes } = useMemo(() => {
    const palms: InstanceTransform[] = [];
    const solidPalms: InstanceTransform[] = [];
    const jungle: InstanceTransform[] = [];
    const bushes: InstanceTransform[] = [];
    function cross(target: InstanceTransform[], x: number, y: number, z: number, scale: number, angle: number, planes: number) {
      for (let i = 0; i < planes; i++) target.push({ position: [x, y, z],
        rotation: [0, angle + i * Math.PI / planes, 0], scale: [scale, scale, scale] });
    }
    island.palms.forEach(([x, z, scale], i) => {
      const y = getTerrainSurfaceY(island, x, z);
      solidPalms.push({ position: [x, y, z], rotation: [0, (i + island.seed) * 1.618, 0], scale: [scale, scale, scale] });
      cross(palms, x, y, z, scale, (i + island.seed) * 1.618, 3);
      cross(bushes, x + 0.5 * scale, y - 0.1, z + 0.4 * scale, scale * 0.55, (i * 7 + 3) * 2.11, 3);

      // Natural companion palm shoot / sapling forming organic palm groves
      const compAngle = (i * 4.3 + island.seed * 0.7) % (Math.PI * 2);
      const compDist = (2.4 + ((i * 3) % 4) * 0.8) * scale;
      const cx = x + Math.cos(compAngle) * compDist;
      const cz = z + Math.sin(compAngle) * compDist;
      const cy = getTerrainSurfaceY(island, cx, cz);
      const cScale = scale * (0.65 + ((i * 5) % 3) * 0.15);
      cross(palms, cx, cy, cz, cScale, compAngle + 1.2, 3);
    });

    island.jungleTrees?.forEach(([x, z, scale], i) => {
      const y = getTerrainSurfaceY(island, x, z);
      cross(jungle, x, y, z, scale, (i + island.seed * 3) * 1.345, isMobile ? 3 : 4);
      cross(bushes, x + 0.7 * scale, y - 0.1, z + 0.5 * scale, scale * 0.65, (i * 11 + 1) * 2.11, 3);
      if (!isMobile) cross(bushes, x - 0.6 * scale, y - 0.1, z - 0.6 * scale, scale * 0.6, (i * 13 + 5) * 2.11, 3);

      // Companion rainforest trees forming dense, contiguous jungle canopies
      const compA1 = (i * 3.7 + island.seed * 1.1) % (Math.PI * 2);
      const compD1 = (3.4 + ((i * 2) % 3) * 1.2) * scale;
      const cx1 = x + Math.cos(compA1) * compD1;
      const cz1 = z + Math.sin(compA1) * compD1;
      const cy1 = getTerrainSurfaceY(island, cx1, cz1);
      cross(jungle, cx1, cy1, cz1, scale * 0.88, compA1 + 0.9, isMobile ? 3 : 4);

      if (!isMobile) {
        const compA2 = compA1 + 2.1;
        const compD2 = (4.2 + (i % 3) * 1.2) * scale;
        const cx2 = x + Math.cos(compA2) * compD2;
        const cz2 = z + Math.sin(compA2) * compD2;
        const cy2 = getTerrainSurfaceY(island, cx2, cz2);
        cross(jungle, cx2, cy2, cz2, scale * 0.78, compA2 + 1.8, 3);
      }
    });

    // Authored coastal and undergrowth bushes batched into instanced draw call
    island.bushes?.forEach(([bx, bz, bScale], i) => {
      const y = getTerrainSurfaceY(island, bx, bz);
      cross(bushes, bx, y, bz, bScale, (i * 17 + island.seed) * 1.618, 3);
    });

    return { palms, solidPalms, jungle, bushes };
  }, [island, isMobile]);
  useFrame(({ camera }) => {
    if (!nearPalms.current || !farPalms.current) return;
    const threshold = (isMobile ? 90 : 170) + island.radius * 0.5 + (nearPalms.current.visible ? 20 : 0);
    const close = (camera.position.x - island.x) ** 2 + (camera.position.z - island.z) ** 2 < threshold ** 2;
    nearPalms.current.visible = close;
    farPalms.current.visible = !close;
  });
  const { palmMat, jungleMat, bushMat } = getVegMaterials();
  return <group>
    <group ref={farPalms}>
      <StaticInstances geometry={palmPlaneGeo} material={palmMat} instances={palms} />
    </group>
    <group ref={nearPalms} visible={false}>
      <StaticInstances geometry={palmTrunkGeometry} material={palmTrunkMaterial} instances={solidPalms} castShadow={!isMobile} />
      <StaticInstances geometry={palmCrownGeometry} material={palmCrownMaterial} instances={solidPalms} castShadow={!isMobile} />
    </group>
    <StaticInstances geometry={junglePlaneGeo} material={jungleMat} instances={jungle} castShadow={!isMobile} />
    <StaticInstances geometry={bushPlaneGeo} material={bushMat} instances={bushes} />
  </group>;
});
