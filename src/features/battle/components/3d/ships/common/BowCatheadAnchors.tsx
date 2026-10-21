import React from 'react';
import * as THREE from 'three';

interface BowCatheadAnchorsProps {
  width: number;
  z: number;
}

const shankGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.3, 6);
const flukeGeo = new THREE.TorusGeometry(0.32, 0.04, 6, 12, Math.PI);
const stockGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.75, 6);
const anchorIronMat = new THREE.MeshStandardMaterial({ color: '#27272a', metalness: 0.85, roughness: 0.3 });
const anchorWoodMat = new THREE.MeshStandardMaterial({ color: '#5c3317', roughness: 0.8 });

export const BowCatheadAnchors: React.FC<BowCatheadAnchorsProps> = React.memo(({ width, z }) => {
  return (
    <>
      {[-width * 0.52, width * 0.52].map((ax, aIdx) => (
        <group key={`anchor-${aIdx}`} position={[ax, 2.2, z]}>
          <mesh geometry={shankGeo} material={anchorIronMat} castShadow />
          <mesh position={[0, -0.6, 0]} rotation={[0, 0, Math.PI / 2]} geometry={flukeGeo} material={anchorIronMat} />
          <mesh position={[0, 0.5, 0]} rotation={[Math.PI / 2, 0, 0]} geometry={stockGeo} material={anchorWoodMat} />
        </group>
      ))}
    </>
  );
});
