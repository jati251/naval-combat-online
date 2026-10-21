import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '@/stores/useGameStore';
import { findShip } from '@/stores/selectors/shipLookup';

interface RudderBladeProps {
  length: number;
  rudderAngle?: number;
  isEnemy?: boolean;
  shipId?: string;
  isSelf?: boolean;
}

const sternpostGeo = new THREE.BoxGeometry(0.22, 2.45, 0.2);
const sternpostMat = new THREE.MeshStandardMaterial({ color: '#382013', roughness: 0.75 });
const rudderBladeGeo = new THREE.BoxGeometry(0.18, 2.35, 0.9);
const rudderBladeMat = new THREE.MeshStandardMaterial({ color: '#4a2810', roughness: 0.7 });
const hingeGeo = new THREE.BoxGeometry(0.24, 0.14, 0.55);
const hingeMat = new THREE.MeshStandardMaterial({ color: '#18181b', metalness: 0.85, roughness: 0.3 });
const HINGE_OFFSETS = [-0.7, 0, 0.7] as const;

export const RudderBlade: React.FC<RudderBladeProps> = React.memo(({
  length,
  rudderAngle = 0,
  isEnemy = false,
  shipId,
  isSelf = false,
}) => {
  const meshRef = useRef<THREE.Group>(null);
  const frameSkip = useRef(0);

  useFrame((_, delta) => {
    if (isEnemy || !meshRef.current) return;
    if (++frameSkip.current % 2 !== 0) return;

    const store = useGameStore.getState();
    const targetRudder = isSelf
      ? store.localRudder
      : (findShip(store.ships, shipId)?.rudder ?? rudderAngle ?? 0);

    const targetRotY = -targetRudder * 0.55;
    meshRef.current.rotation.y = THREE.MathUtils.damp(
      meshRef.current.rotation.y,
      targetRotY,
      18,
      delta * 2
    );
  });

  return (
    <group position={[0, 0.6, -length * 0.5]}>
      {/* Fixed Sternpost Timber attached to Hull Keel */}
      {!isEnemy && (
        <mesh position={[0, 0, -0.08]} geometry={sternpostGeo} material={sternpostMat} castShadow={false} receiveShadow />
      )}

      {/* Pivoting Rudder Blade */}
      <group ref={meshRef} position={[0, 0, -0.18]}>
        <mesh position={[0, 0, -0.45]} geometry={rudderBladeGeo} material={rudderBladeMat} castShadow={!isEnemy} receiveShadow />
        {/* 3 Heavy Forged Iron Pintle Hinge Straps (Player only) */}
        {!isEnemy && HINGE_OFFSETS.map((hy, hIdx) => (
          <mesh key={`hinge-${hIdx}`} position={[0, hy, -0.25]} geometry={hingeGeo} material={hingeMat} castShadow={false} />
        ))}
      </group>
    </group>
  );
});
