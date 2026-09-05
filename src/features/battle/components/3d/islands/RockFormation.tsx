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

/**
 * Coastal Rock Formation - scattered irregular boulders
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
