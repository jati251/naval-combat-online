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
  createBeachSandTexture,
  createVegetationTexture,
  createDarkRockTexture,
} from './textures/proceduralTextures';

export type { IslandDefinition };
export { ARENA_ISLANDS };

interface Islands3DProps {
  isMobile?: boolean;
}

/**
 * Islands3D Root Component
 * Sets up shared standard materials with procedural textures and renders
 * all 8 unique Caribbean arena islands.
 */
export const Islands3D: React.FC<Islands3DProps> = React.memo(({ isMobile = false }) => {
  const rockTexture = useMemo(() => createCliffRockTexture(), []);
  const sandTexture = useMemo(() => createBeachSandTexture(), []);
  const vegTexture = useMemo(() => createVegetationTexture(), []);
  const darkRockTexture = useMemo(() => createDarkRockTexture(), []);

  const materials: IslandMaterials = useMemo(() => {
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
        <IslandEntity key={island.id} island={island} materials={materials} isMobile={isMobile} />
      ))}
    </group>
  );
});
