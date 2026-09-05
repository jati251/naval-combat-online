import React from 'react';
import * as THREE from 'three';

interface BroadsideCannonsProps {
  positions: number[];
  width: number;
  y?: number;
  scale?: number;
  color?: string;
  isDoubleDecker?: boolean;
  isEnemy?: boolean;
}

// Module-level shared geometries for all broadside cannons (zero memory leaks / GC)
const barrelGeo = new THREE.CylinderGeometry(0.11, 0.17, 1.35, 8);
const muzzleGeo = new THREE.CylinderGeometry(0.13, 0.13, 0.08, 8);
const breechGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.1, 8);
const cascabelGeo = new THREE.SphereGeometry(0.07, 6, 6);
const trunnionGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.38, 6);
const carriageGeo = new THREE.BoxGeometry(0.42, 0.28, 0.38);
const wheelGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.06, 6);

// Module-level shared materials
const gunMetalMat = new THREE.MeshStandardMaterial({ color: '#18181b', metalness: 0.92, roughness: 0.25 });
const gunMetalDarkMat = new THREE.MeshStandardMaterial({ color: '#09090b', metalness: 0.92, roughness: 0.25 });
const carriageMat = new THREE.MeshStandardMaterial({ color: '#831843', roughness: 0.7 });
const wheelMat = new THREE.MeshStandardMaterial({ color: '#381a08', roughness: 0.8 });

const SingleCannonUnit: React.FC<{
  isLeft: boolean;
  color: string;
  barrelScale?: number;
  isEnemy?: boolean;
}> = React.memo(({ isLeft, color, barrelScale = 1.0, isEnemy = false }) => {
  const dir = isLeft ? 1 : -1;
  const barrelMat = color === '#09090b' ? gunMetalDarkMat : gunMetalMat;

  // Opponent ships at distance only need the protruding barrel cylinder (saves 90% meshes)
  if (isEnemy) {
    return (
      <group scale={[barrelScale, barrelScale, barrelScale]}>
        <group rotation={[0, 0, dir * Math.PI / 2]}>
          <mesh geometry={barrelGeo} material={barrelMat} />
        </group>
      </group>
    );
  }

  return (
    <group scale={[barrelScale, barrelScale, barrelScale]}>
      {/* Naval Cannon Barrel */}
      <group rotation={[0, 0, dir * Math.PI / 2]}>
        <mesh castShadow geometry={barrelGeo} material={barrelMat} />
        <mesh position={[0, 0.64, 0]} geometry={muzzleGeo} material={barrelMat} />
        <mesh position={[0, -0.66, 0]} geometry={breechGeo} material={barrelMat} />
        <mesh position={[0, -0.74, 0]} geometry={cascabelGeo} material={barrelMat} />
        <mesh position={[0, 0.05, 0]} rotation={[Math.PI / 2, 0, 0]} geometry={trunnionGeo} material={barrelMat} />
      </group>

      {/* Heavy Wood Naval Truck Carriage */}
      <mesh position={[0, -0.16, 0]} geometry={carriageGeo} material={carriageMat} />

      {/* 4 Wooden Wheels */}
      <mesh position={[-0.19, -0.22, 0.16]} rotation={[0, 0, Math.PI / 2]} geometry={wheelGeo} material={wheelMat} />
      <mesh position={[0.19, -0.22, 0.16]} rotation={[0, 0, Math.PI / 2]} geometry={wheelGeo} material={wheelMat} />
      <mesh position={[-0.19, -0.22, -0.16]} rotation={[0, 0, Math.PI / 2]} geometry={wheelGeo} material={wheelMat} />
      <mesh position={[0.19, -0.22, -0.16]} rotation={[0, 0, Math.PI / 2]} geometry={wheelGeo} material={wheelMat} />
    </group>
  );
});

export const BroadsideCannons: React.FC<BroadsideCannonsProps> = React.memo(({
  positions,
  width,
  y = 2.65,
  scale = 1,
  color = '#18181b',
  isDoubleDecker = false,
  isEnemy = false,
}) => {
  return (
    <>
      {positions.map((posZ, idx) => (
        <group key={`gun-${idx}`} position={[0, y, posZ]} scale={[scale, scale, scale]}>
          {/* Left Gun */}
          <group position={[-width * 0.5 - 0.22, 0, 0]}>
            <SingleCannonUnit isLeft={true} color={color} isEnemy={isEnemy} />
          </group>

          {/* Right Gun */}
          <group position={[width * 0.5 + 0.22, 0, 0]}>
            <SingleCannonUnit isLeft={false} color={color} isEnemy={isEnemy} />
          </group>

          {/* Lower Gun Deck Ports (Man-o'-War double decker) */}
          {isDoubleDecker && (
            <>
              <group position={[-width * 0.5 - 0.25, -1.0, 0]}>
                <SingleCannonUnit isLeft={true} color="#09090b" barrelScale={1.1} isEnemy={isEnemy} />
              </group>
              <group position={[width * 0.5 + 0.25, -1.0, 0]}>
                <SingleCannonUnit isLeft={false} color="#09090b" barrelScale={1.1} isEnemy={isEnemy} />
              </group>
            </>
          )}
        </group>
      ))}
    </>
  );
});
