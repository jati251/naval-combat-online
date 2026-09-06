import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { IslandDefinition } from './types';
import { createIslandTerrainGeometry, getIslandElevation, getTerrainSurfaceY } from './islandGeometries';
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

/**
 * High-Detail Island Entity with procedural terrain, unique silhouette per type,
 * organic vegetation scatter, coastal rock formations, and smooth atmospheric fog integration.
 */
export const IslandEntity: React.FC<IslandEntityProps> = React.memo(({ island, materials, isMobile = false }) => {
  const rootRef = useRef<THREE.Group>(null);
  const treesRef = useRef<THREE.Group>(null);
  const detailRef = useRef<THREE.Group>(null);

  // Procedural terrain & beach geometries (unique per island)
  const terrainGeo = useMemo(() => createIslandTerrainGeometry(island), [island]);
  useEffect(() => () => terrainGeo.dispose(), [terrainGeo]);

  // AAA Staged Level-of-Detail (LOD) Emergence:
  // 1. Mountain terrain is ALWAYS visible as a distant horizon landmark through soft sea haze (ZERO pop-in).
  // 2. Beach & shoreline emerge at 350m (desktop) / 200m (mobile).
  // 3. Tree canopy smoothly emerges from 230m down to 140m via scale interpolation.
  // 4. Coastal boulders & bushes smoothly emerge from 130m down to 75m via scale interpolation.
  useFrame(({ camera }) => {
    const scaleX = island.elongation?.scaleX ?? 1;
    const scaleZ = island.elongation?.scaleZ ?? 1;
    const islandRadius = Math.max(island.radius, island.sandRadius) * Math.max(scaleX, scaleZ);

    // Three.js InstancedMesh automatically performs GPU/render-pass frustum culling per draw call.
    // Preserving group visibility maintains consistent directional shadow maps with zero pipeline stalls.

    const dx = camera.position.x - island.x;
    const dz = camera.position.z - island.z;
    const distSq = dx * dx + dz * dz;
    const dist = Math.sqrt(distSq);

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
          {/* Tier 1: Core Geological Mountain Mass (Always rendered as horizon landmark) */}
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
