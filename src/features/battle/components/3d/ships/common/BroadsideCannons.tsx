import React from 'react';
import * as THREE from 'three';

interface BroadsideCannonsProps {
  positions: number[];
  width: number;
  y?: number;
  scale?: number;
  color?: string;
  isDoubleDecker?: boolean;
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
  isPort: boolean;
  color: string;
  barrelScale?: number;
}> = React.memo(({ isPort, color, barrelScale = 1.0 }) => {
  const dir = isPort ? -1 : 1;
  const barrelMat = color === '#09090b' ? gunMetalDarkMat : gunMetalMat;

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

      {/* Wheeled Naval Truck Carriage */}
      <group position={[-dir * 0.28, -0.16, 0]}>
        <mesh castShadow position={[0, 0.06, 0]} geometry={carriageGeo} material={carriageMat} />
        <mesh position={[-0.14, -0.06, -0.18]} rotation={[0, 0, Math.PI / 2]} geometry={wheelGeo} material={wheelMat} />
        <mesh position={[-0.14, -0.06, 0.18]} rotation={[0, 0, Math.PI / 2]} geometry={wheelGeo} material={wheelMat} />
        <mesh position={[0.14, -0.06, -0.18]} rotation={[0, 0, Math.PI / 2]} geometry={wheelGeo} material={wheelMat} />
        <mesh position={[0.14, -0.06, 0.18]} rotation={[0, 0, Math.PI / 2]} geometry={wheelGeo} material={wheelMat} />
      </group>
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
}) => {
  return (
    <>
      {positions.map((posZ, idx) => (
        <group key={`gun-${idx}`} position={[0, y, posZ]} scale={[scale, scale, scale]}>
          {/* Port Gun */}
          <group position={[-width * 0.5 - 0.22, 0, 0]}>
            <SingleCannonUnit isPort={true} color={color} />
          </group>

          {/* Starboard Gun */}
          <group position={[width * 0.5 + 0.22, 0, 0]}>
            <SingleCannonUnit isPort={false} color={color} />
          </group>

          {/* Lower Gun Deck Ports (Man-o'-War double decker) */}
          {isDoubleDecker && (
            <>
              <group position={[-width * 0.5 - 0.25, -1.0, 0]}>
                <SingleCannonUnit isPort={true} color="#09090b" barrelScale={1.1} />
              </group>
              <group position={[width * 0.5 + 0.25, -1.0, 0]}>
                <SingleCannonUnit isPort={false} color="#09090b" barrelScale={1.1} />
              </group>
            </>
          )}
        </group>
      ))}
    </>
  );
});
