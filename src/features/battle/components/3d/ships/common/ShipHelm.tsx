import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '@/stores/useGameStore';
import { findShip } from '@/stores/selectors/shipLookup';

interface ShipHelmProps {
  position: [number, number, number];
  rudderAngle?: number;
  isDouble?: boolean;
  shipId?: string;
  isSelf?: boolean;
}

const wheelRimGeo = new THREE.TorusGeometry(0.38, 0.038, 8, 20);
const wheelRimMat = new THREE.MeshStandardMaterial({ color: '#5c3317', roughness: 0.6 });
const hubSingleGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.2, 8);
const hubDoubleGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.38, 8);
const hubMat = new THREE.MeshStandardMaterial({ color: '#d97706', metalness: 0.8, roughness: 0.3 });
const spokeGeo = new THREE.CylinderGeometry(0.026, 0.026, 1.05, 6);
const spokeMat = new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.7 });
const pedestalGeo = new THREE.BoxGeometry(0.3, 0.8, 0.32);
const pedestalMat = new THREE.MeshStandardMaterial({ color: '#382013', roughness: 0.8 });
const binnacleBodyGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.48, 8);
const binnacleBodyMat = new THREE.MeshStandardMaterial({ color: '#d97706', metalness: 0.85, roughness: 0.25 });
const binnacleDomeGeo = new THREE.SphereGeometry(0.12, 8, 8, 0, Math.PI * 2, 0, Math.PI * 0.5);
const binnacleDomeMat = new THREE.MeshStandardMaterial({ color: '#fbbf24', metalness: 0.9, roughness: 0.2 });
const SPOKE_DEGREES = [0, 45, 90, 135] as const;

export const ShipHelm: React.FC<ShipHelmProps> = React.memo(({
  position,
  rudderAngle = 0,
  isDouble = false,
  shipId,
  isSelf = false,
}) => {
  const helmRef = useRef<THREE.Group>(null);
  const frameSkip = useRef(0);

  useFrame((_, delta) => {
    if (!helmRef.current) return;
    if (++frameSkip.current % 2 !== 0) return;

    const store = useGameStore.getState();
    const targetRudder = isSelf
      ? store.localRudder
      : (findShip(store.ships, shipId)?.rudder ?? rudderAngle ?? 0);

    const targetRotZ = -targetRudder * 2.8;
    helmRef.current.rotation.z = THREE.MathUtils.damp(
      helmRef.current.rotation.z,
      targetRotZ,
      18,
      delta * 2
    );
  });

  return (
    <group position={position}>
      {/* Rotating Wheel Unit */}
      <group ref={helmRef}>
        <mesh geometry={wheelRimGeo} material={wheelRimMat} castShadow />
        <mesh rotation={[Math.PI / 2, 0, 0]} geometry={isDouble ? hubDoubleGeo : hubSingleGeo} material={hubMat} />
        {/* Spokes with protruding handles */}
        {SPOKE_DEGREES.map((deg) => (
          <mesh key={deg} rotation={[0, 0, (deg * Math.PI) / 180]} geometry={spokeGeo} material={spokeMat} />
        ))}
        {isDouble && (
          <group position={[0, 0, -0.24]}>
            <mesh geometry={wheelRimGeo} material={wheelRimMat} castShadow />
            {SPOKE_DEGREES.map((deg) => (
              <mesh key={`sp-${deg}`} rotation={[0, 0, (deg * Math.PI) / 180]} geometry={spokeGeo} material={spokeMat} />
            ))}
          </group>
        )}
      </group>

      {/* Steering Gear Pedestal & Barrel */}
      <mesh position={[0, -0.42, 0.06]} geometry={pedestalGeo} material={pedestalMat} castShadow />

      {/* Polished Brass Binnacle Compass Housing (Forward of the wheel) */}
      <group position={[0, -0.15, 0.32]}>
        <mesh geometry={binnacleBodyGeo} material={binnacleBodyMat} castShadow />
        {/* Brass Compass Dome */}
        <mesh position={[0, 0.24, 0]} geometry={binnacleDomeGeo} material={binnacleDomeMat} />
      </group>
    </group>
  );
});
