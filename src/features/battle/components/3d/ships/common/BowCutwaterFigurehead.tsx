import React from 'react';
import * as THREE from 'three';

interface BowCutwaterFigureheadProps {
  position: [number, number, number];
  stemScale?: number;
  figureheadType?: 'lion' | 'dolphin' | 'eagle' | 'dragon';
  figureheadColor?: string;
  timberColor?: string;
  isEnemy?: boolean;
}

const stemGeo = new THREE.BoxGeometry(0.24, 1.15, 1.4);
const lionGeo = new THREE.ConeGeometry(0.36, 1.25, 6);
const dolphinGeo = new THREE.ConeGeometry(0.28, 1.1, 6);
const eagleGeo = new THREE.ConeGeometry(0.32, 1.2, 5);
const beakGeo = new THREE.ConeGeometry(0.12, 0.4, 4);
const dragonGeo = new THREE.ConeGeometry(0.38, 1.35, 7);
const beakMat = new THREE.MeshStandardMaterial({ color: '#ca8a04', roughness: 0.3, metalness: 0.6 });

const timberMatCache = new Map<string, THREE.MeshStandardMaterial>();
const figureheadMatCache = new Map<string, THREE.MeshStandardMaterial>();

function getTimberMaterial(color: string): THREE.MeshStandardMaterial {
  let mat = timberMatCache.get(color);
  if (!mat) {
    mat = new THREE.MeshStandardMaterial({ color, roughness: 0.75 });
    timberMatCache.set(color, mat);
  }
  return mat;
}

function getFigureheadMaterial(color: string): THREE.MeshStandardMaterial {
  let mat = figureheadMatCache.get(color);
  if (!mat) {
    mat = new THREE.MeshStandardMaterial({ color, roughness: 0.25, metalness: 0.85 });
    figureheadMatCache.set(color, mat);
  }
  return mat;
}

export const BowCutwaterFigurehead: React.FC<BowCutwaterFigureheadProps> = React.memo(({
  position,
  stemScale = 1,
  figureheadType = 'lion',
  figureheadColor = '#f59e0b',
  timberColor = '#4a2511',
  isEnemy = false,
}) => {
  const timberMat = getTimberMaterial(timberColor);
  const figMat = getFigureheadMaterial(figureheadColor);

  return (
    <group position={position} scale={[stemScale, stemScale, stemScale]}>
      {/* Cutwater stem knee timber */}
      <mesh position={[0, -0.26, 0.48]} rotation={[0.42, 0, 0]} geometry={stemGeo} material={timberMat} castShadow={!isEnemy} />

      {/* Carved Naval Figurehead */}
      <group position={[0, 0.44, 1.25]} rotation={[-0.38, 0, 0]}>
        {figureheadType === 'lion' && (
          <mesh geometry={lionGeo} material={figMat} castShadow={!isEnemy} />
        )}
        {figureheadType === 'dolphin' && (
          <mesh geometry={dolphinGeo} material={figMat} castShadow={!isEnemy} />
        )}
        {figureheadType === 'eagle' && (
          <group>
            <mesh geometry={eagleGeo} material={figMat} castShadow={!isEnemy} />
            {/* Eagle beak hook */}
            <mesh position={[0, -0.15, 0.22]} rotation={[0.5, 0, 0]} geometry={beakGeo} material={beakMat} />
          </group>
        )}
        {figureheadType === 'dragon' && (
          <mesh geometry={dragonGeo} material={figMat} castShadow={!isEnemy} />
        )}
      </group>
    </group>
  );
});
