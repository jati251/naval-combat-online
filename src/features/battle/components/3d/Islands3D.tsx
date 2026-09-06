import React, { useMemo } from 'react';
import * as THREE from 'three';
import {
  type IslandDefinition,
  ARENA_ISLANDS,
  IslandEntity,
  type IslandMaterials,
} from './islands';
import {
  createCliffRockTexture,
  createCliffRockBumpTexture,
  createCliffRockRoughnessTexture,
  createBeachSandTexture,
  createBeachSandBumpTexture,
  createVegetationTexture,
  createDarkRockTexture,
} from './textures/proceduralTextures';

import { useGameStore } from '@/stores/useGameStore';
import { getMapConfig } from '../../maps';

export type { IslandDefinition };
export { ARENA_ISLANDS };

interface Islands3DProps {
  isMobile?: boolean;
}

/**
 * Islands3D Root Component
 * Sets up shared high-detail standard materials with procedural textures,
 * micro-relief bump maps, roughness maps, and renders all islands for the active battle map.
 */
export const Islands3D: React.FC<Islands3DProps> = React.memo(({ isMobile = false }) => {
  const currentMapId = useGameStore((s) => s.currentMapId || s.currentRoom?.mapId || 'caribbean');
  const activeMap = useMemo(() => getMapConfig(currentMapId), [currentMapId]);
  const islands = activeMap.islands;

  const rockTexture = useMemo(() => createCliffRockTexture(), []);
  const rockBumpTexture = useMemo(() => createCliffRockBumpTexture(), []);
  const rockRoughnessTexture = useMemo(() => createCliffRockRoughnessTexture(), []);

  const sandTexture = useMemo(() => createBeachSandTexture(), []);
  const sandBumpTexture = useMemo(() => createBeachSandBumpTexture(), []);

  const vegTexture = useMemo(() => createVegetationTexture(), []);
  const darkRockTexture = useMemo(() => createDarkRockTexture(), []);

  const materials: IslandMaterials = useMemo(() => {
    return {
      sand: new THREE.MeshStandardMaterial({
        map: sandTexture,
        bumpMap: sandBumpTexture,
        bumpScale: 0.22,
        color: '#d8b47a',
        roughness: 0.9,
        metalness: 0.02,
      }),
      rock: new THREE.MeshStandardMaterial({
        map: rockTexture,
        bumpMap: rockBumpTexture,
        bumpScale: 0.65,
        roughnessMap: rockRoughnessTexture,
        vertexColors: true, // height & slope-aware procedural splatting
        roughness: 0.86,
        metalness: 0.03,
      }),
      darkRock: new THREE.MeshStandardMaterial({
        map: darkRockTexture,
        bumpMap: rockBumpTexture,
        bumpScale: 0.45,
        roughness: 0.92,
        metalness: 0.05,
      }),
      vegetation: new THREE.MeshStandardMaterial({
        map: vegTexture,
        roughness: 0.74,
      }),
      lushVeg: new THREE.MeshStandardMaterial({
        map: vegTexture,
        color: '#1a5c28',
        roughness: 0.72,
      }),
      shallows: new THREE.MeshStandardMaterial({
        color: '#06b6d4',
        transparent: true,
        opacity: 0.5,
        roughness: 0.2,
      }),
    };
  }, [rockTexture, rockBumpTexture, rockRoughnessTexture, sandTexture, sandBumpTexture, vegTexture, darkRockTexture]);

  return (
    <group>
      {islands.map((island) => (
        <IslandEntity key={island.id} island={island} materials={materials} isMobile={isMobile} />
      ))}
    </group>
  );
});
