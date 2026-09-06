import React, { useMemo } from 'react';
import {
  palmPlaneGeo,
  junglePlaneGeo,
  bushPlaneGeo,
  smallBushPlaneGeo,
} from './vegetationGeometries';
import {
  createPalmTreeSpriteTexture,
  createJungleTreeSpriteTexture,
  createTropicalBushSpriteTexture,
  createSmallBushSpriteTexture,
  getVegMaterials,
} from './vegetationSprites';

// Re-export geometries, textures, and materials for backwards compatibility
export {
  palmPlaneGeo,
  junglePlaneGeo,
  bushPlaneGeo,
  smallBushPlaneGeo,
  createPalmTreeSpriteTexture,
  createJungleTreeSpriteTexture,
  createTropicalBushSpriteTexture,
  createSmallBushSpriteTexture,
  getVegMaterials,
};

/**
 * 2.5D Triple-Crossed Billboard Caribbean Palm Tree
 */
export const PalmTree: React.FC<{
  position: [number, number, number];
  scale?: number;
  seed?: number;
}> = React.memo(({ position, scale = 1, seed = 0 }) => {
  const { palmMat } = useMemo(() => getVegMaterials(), []);
  const baseRot = (seed * 1.618) % (Math.PI * 2);

  return (
    <group position={position} scale={[scale, scale, scale]} rotation={[0, baseRot, 0]}>
      <mesh geometry={palmPlaneGeo} material={palmMat} castShadow receiveShadow />
      <mesh geometry={palmPlaneGeo} material={palmMat} rotation={[0, Math.PI / 3, 0]} castShadow receiveShadow />
      <mesh geometry={palmPlaneGeo} material={palmMat} rotation={[0, (Math.PI * 2) / 3, 0]} castShadow receiveShadow />
    </group>
  );
});

/**
 * 2.5D Quad-Crossed Billboard Jungle Canopy Rainforest Tree (Full 3D Volume)
 */
export const JungleTree: React.FC<{
  position: [number, number, number];
  scale?: number;
  seed?: number;
}> = React.memo(({ position, scale = 1, seed = 0 }) => {
  const { jungleMat } = useMemo(() => getVegMaterials(), []);
  const baseRot = (seed * 1.345) % (Math.PI * 2);

  return (
    <group position={position} scale={[scale, scale, scale]} rotation={[0, baseRot, 0]}>
      <mesh geometry={junglePlaneGeo} material={jungleMat} castShadow receiveShadow />
      <mesh geometry={junglePlaneGeo} material={jungleMat} rotation={[0, Math.PI * 0.25, 0]} castShadow receiveShadow />
      <mesh geometry={junglePlaneGeo} material={jungleMat} rotation={[0, Math.PI * 0.5, 0]} castShadow receiveShadow />
      <mesh geometry={junglePlaneGeo} material={jungleMat} rotation={[0, Math.PI * 0.75, 0]} castShadow receiveShadow />
    </group>
  );
});

/**
 * 2.5D Triple-Crossed Billboard Tropical Fern & Broadleaf Bush Cluster
 */
export const TropicalBush: React.FC<{
  position: [number, number, number];
  scale?: number;
  seed?: number;
}> = React.memo(({ position, scale = 1, seed = 0 }) => {
  const { bushMat } = useMemo(() => getVegMaterials(), []);
  const baseRot = (seed * 2.11) % (Math.PI * 2);

  return (
    <group position={position} scale={[scale, scale, scale]} rotation={[0, baseRot, 0]}>
      <mesh geometry={bushPlaneGeo} material={bushMat} castShadow receiveShadow />
      <mesh geometry={bushPlaneGeo} material={bushMat} rotation={[0, Math.PI / 3, 0]} castShadow receiveShadow />
      <mesh geometry={bushPlaneGeo} material={bushMat} rotation={[0, (Math.PI * 2) / 3, 0]} castShadow receiveShadow />
    </group>
  );
});
