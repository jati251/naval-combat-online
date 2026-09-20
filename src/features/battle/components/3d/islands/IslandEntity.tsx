import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { IslandDefinition } from './types';
import { createIslandTerrainGeometry, getIslandElevation, getTerrainSurfaceY, getTerrainExtent } from './islandGeometries';
import { IslandFoliage } from './IslandFoliage';
import { IslandRocks } from './RockFormation';
import { CoastalSettlement } from './CoastalSettlement';
import { KingstonCity } from './KingstonCity';
import { MayanPyramid } from './MayanPyramid';
import { SeaArch } from './SeaArch';

export interface IslandMaterials {
  rock: THREE.Material;
}

interface IslandEntityProps {
  island: IslandDefinition;
  materials: IslandMaterials;
  isMobile?: boolean;
}

export const IslandEntity: React.FC<IslandEntityProps> = React.memo(({ island, materials, isMobile = false }) => {
  const rootRef = useRef<THREE.Group>(null);
  const treesRef = useRef<THREE.Group>(null);
  const detailRef = useRef<THREE.Group>(null);

  // Procedural terrain & beach geometries (unique per island)
  const terrainGeo = useMemo(() => createIslandTerrainGeometry(island), [island]);
  useEffect(() => () => terrainGeo.dispose(), [terrainGeo]);

  const boundsRadius = getTerrainExtent(island) * Math.SQRT2 * Math.max(island.elongation?.scaleX ?? 1, island.elongation?.scaleZ ?? 1) + island.height;
  const nextVisibilityCheck = useRef(0);
  useFrame(({ camera, scene, clock }) => {
    if (clock.elapsedTime < nextVisibilityCheck.current) return;
    nextVisibilityCheck.current = clock.elapsedTime + 0.1;
    const dx = camera.position.x - island.x;
    const dz = camera.position.z - island.z;
    const dist = Math.hypot(dx, dz);
    const islandRadius = Math.max(island.radius, island.sandRadius) * Math.max(island.elongation?.scaleX ?? 1, island.elongation?.scaleZ ?? 1);
    // At this distance exponential fog hides over 99.8% of the entire island.
    const hiddenDistance = scene.fog instanceof THREE.FogExp2 ? 2.5 / scene.fog.density : Infinity;
    if (rootRef.current) rootRef.current.visible = dist - boundsRadius < hiddenDistance;
    if (dist - boundsRadius >= hiddenDistance) return;

    // 3. Tree Canopy Foliage Staging (Visible across entire battle sea, smooth vertical emergence at far horizon)
    const treeFar = (isMobile ? 400 : 780) + islandRadius * 0.6;
    const treeNear = (isMobile ? 260 : 520) + islandRadius * 0.6;
    if (treesRef.current) {
      const isVisible = dist < treeFar;
      if (treesRef.current.visible !== isVisible) treesRef.current.visible = isVisible;
      if (isVisible) {
        if (dist > treeNear) {
          const t = (treeFar - dist) / (treeFar - treeNear);
          treesRef.current.scale.set(1, Math.max(0.08, t), 1);
        } else if (treesRef.current.scale.y !== 1 || treesRef.current.scale.x !== 1) {
          treesRef.current.scale.set(1, 1, 1);
        }
      }
    }

    // 4. Coastal Boulders, Rocks & Undergrowth Bushes Staging
    const detailFar = (isMobile ? 180 : 420) + islandRadius * 0.4;
    const detailNear = (isMobile ? 110 : 260) + islandRadius * 0.4;
    if (detailRef.current) {
      const isVisible = dist < detailFar;
      if (detailRef.current.visible !== isVisible) detailRef.current.visible = isVisible;
      if (isVisible) {
        if (dist > detailNear) {
          const t = (detailFar - dist) / (detailFar - detailNear);
          detailRef.current.scale.set(1, Math.max(0.08, t), 1);
        } else if (detailRef.current.scale.y !== 1 || detailRef.current.scale.x !== 1) {
          detailRef.current.scale.set(1, 1, 1);
        }
      }
    }
  });

  const scaleX = island.elongation?.scaleX ?? 1;
  const scaleZ = island.elongation?.scaleZ ?? 1;
  const rotY = island.elongation?.angle ?? 0;
  const isSeaArch = island.settlement?.type === 'sea-arch';

  return (
    <group ref={rootRef} position={[island.x, 0, island.z]} rotation={[0, rotY, 0]}>
      {/* Scaled Island Mass (Terrain, Beach, Shallows) - Not rendered for sea-arch formations */}
      {!isSeaArch && (
        <group scale={[scaleX, 1, scaleZ]}>
          {/* Terrain silhouette survives until concealed by haze */}
          <mesh
            position={[0, getIslandElevation(island) + 2.0, 0]}
            castShadow
            receiveShadow
            material={materials.rock}
            geometry={terrainGeo}
          />

        </group>
      )}

      {/* Coastal Rock Formations (Instanced LOD: only 3 draw calls total) - Skipped for sea-arch */}
      {!isSeaArch && (
        <group ref={detailRef}>
          <IslandRocks island={island} isMobile={isMobile} />
        </group>
      )}

      {/* Scattered Coconut Palms & Jungle Canopy Trees - Skipped for sea-arch */}
      {!isSeaArch && (
        <group ref={treesRef}>
          <IslandFoliage island={island} isMobile={isMobile} />
        </group>
      )}

      {/* Dynamic 3D Settlement & Architectural Wonders (Seated flush on terrain terrace or ocean level) */}
      {island.settlement && (() => {
        const settlementY = isSeaArch ? 0 : getTerrainSurfaceY(island, island.settlement.x, island.settlement.z);
        return (
          <group position={[0, settlementY, 0]}>
            {island.settlement.type === 'kingston-city' && (
              <KingstonCity settlement={island.settlement} isMobile={isMobile} />
            )}
            {island.settlement.type === 'mayan-temple' && (
              <MayanPyramid settlement={island.settlement} isMobile={isMobile} />
            )}
            {island.settlement.type === 'sea-arch' && (
              <SeaArch settlement={island.settlement} isMobile={isMobile} />
            )}
            {(island.settlement.type === 'pirate-haven' || island.settlement.type === 'colonial-fort') && (
              <CoastalSettlement settlement={island.settlement} isMobile={isMobile} />
            )}
          </group>
        );
      })()}
    </group>
  );
});
