import React from 'react';
import * as THREE from 'three';

const rockGeoLarge = new THREE.DodecahedronGeometry(1, 2);
const rockGeoMedium = new THREE.DodecahedronGeometry(0.7, 2);
const rockGeoSmall = new THREE.DodecahedronGeometry(0.4, 1);

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

import { StaticInstances, type InstanceTransform } from '../shared/StaticInstances';
import { getTerrainSurfaceY } from './islandGeometries';
import type { IslandDefinition } from './types';

/**
 * Coastal Rock Formation - scattered irregular boulders (individual fallback)
 */
export const RockFormation: React.FC<{
  position: [number, number, number];
  scale?: number;
  rotation?: number;
}> = React.memo(({ position, scale = 1, rotation = 0 }) => {
  return (
    <group position={position} rotation={[0, rotation, 0]} scale={scale}>
      <mesh castShadow receiveShadow geometry={rockGeoLarge} material={rockMat} scale={[1, 0.7, 1.1]} />
      <mesh position={[0.8, -0.2, 0.5]} castShadow receiveShadow geometry={rockGeoMedium} material={rockMatDark} rotation={[0.3, 0.8, 0.2]} scale={[1.1, 0.8, 0.9]} />
      <mesh position={[-0.5, -0.3, -0.6]} castShadow geometry={rockGeoSmall} material={rockMatMoss} rotation={[0.5, 1.2, 0]} />
    </group>
  );
});

/**
 * Batched Island Rocks:
 * Collapses all coastal rock boulder meshes across an island into exactly 3 InstancedMesh draw calls!
 */
export const IslandRocks: React.FC<{
  island: IslandDefinition;
  isMobile?: boolean;
}> = React.memo(({ island, isMobile = false }) => {
  const { large, medium, small } = React.useMemo(() => {
    const large: InstanceTransform[] = [];
    const medium: InstanceTransform[] = [];
    const small: InstanceTransform[] = [];

    island.rocks.forEach(([rx, rz, rScale, rRot]) => {
      const y = getTerrainSurfaceY(island, rx, rz);
      const cos = Math.cos(rRot);
      const sin = Math.sin(rRot);

      // Large central boulder
      large.push({
        position: [rx, y, rz],
        rotation: [0, rRot, 0],
        scale: [rScale, rScale * 0.7, rScale * 1.1],
      });

      // Medium secondary boulder offset
      const ox1 = 0.8 * rScale;
      const oz1 = 0.5 * rScale;
      medium.push({
        position: [rx + ox1 * cos - oz1 * sin, y - 0.2 * rScale, rz + ox1 * sin + oz1 * cos],
        rotation: [0.3, rRot + 0.8, 0.2],
        scale: [rScale * 1.1, rScale * 0.8, rScale * 0.9],
      });

      // Small mossy boulder offset
      const ox2 = -0.5 * rScale;
      const oz2 = -0.6 * rScale;
      small.push({
        position: [rx + ox2 * cos - oz2 * sin, y - 0.3 * rScale, rz + ox2 * sin + oz2 * cos],
        rotation: [0.5, rRot + 1.2, 0],
        scale: [rScale, rScale, rScale],
      });
    });

    return { large, medium, small };
  }, [island]);

  return (
    <group>
      <StaticInstances geometry={rockGeoLarge} material={rockMat} instances={large} castShadow={!isMobile} receiveShadow />
      <StaticInstances geometry={rockGeoMedium} material={rockMatDark} instances={medium} castShadow={!isMobile} receiveShadow />
      <StaticInstances geometry={rockGeoSmall} material={rockMatMoss} instances={small} castShadow={!isMobile} />
    </group>
  );
});
