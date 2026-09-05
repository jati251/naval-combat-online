import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { SubModelProps } from '../types';
import { createLateenSailGeometry } from '../common/shipGeometries';
import { RudderBlade } from '../common/RudderBlade';
import { BroadsideCannons } from '../common/BroadsideCannons';
import { ShipFlag } from '../common/ShipFlag';

export const GunboatModel: React.FC<SubModelProps> = React.memo(({
  config,
  sailState,
  rudderAngle,
  isEnemy,
  hullTexture,
  deckTexture,
  sailTexture,
}) => {
  const { length, width } = config;
  const sailScale = sailState === 'ANCHOR' ? 0.15 : sailState === 'HALF_SAIL' ? 0.65 : 1.0;
  const tillerRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (tillerRef.current) {
      tillerRef.current.rotation.y = rudderAngle * 0.75;
    }
  });

  const lateenGeo = useMemo(() => createLateenSailGeometry(length * 0.85, length * 0.65, 0.4), [length]);

  return (
    <group>
      {/* Sleek Dart Skiff Hull */}
      <mesh position={[0, 0.9, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, 2.2, length]} />
        <meshStandardMaterial map={hullTexture} roughness={0.7} />
      </mesh>

      {/* Cyan Trim Stripe */}
      <mesh position={[0, 2.05, 0]}>
        <boxGeometry args={[width + 0.25, 0.22, length + 0.3]} />
        <meshStandardMaterial color="#0ea5e9" metalness={0.4} roughness={0.4} />
      </mesh>

      {/* Razor Sharp Bow Beak */}
      <mesh position={[0, 1.0, length * 0.5 + 1.1]} rotation={[Math.PI / 4, 0, 0]} castShadow>
        <coneGeometry args={[width * 0.45, 2.6, 4]} />
        <meshStandardMaterial map={hullTexture} roughness={0.65} />
      </mesh>

      {/* Open Weatherdeck */}
      <mesh position={[0, 1.95, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[width * 0.88, length * 0.92]} />
        <meshStandardMaterial map={deckTexture} roughness={0.75} />
      </mesh>

      {/* Centerline Bow Swivel Chase Cannon */}
      <group position={[0, 2.4, length * 0.38]}>
        <mesh rotation={[0, 0, 0]} castShadow>
          <cylinderGeometry args={[0.16, 0.22, 1.7, 8]} />
          <meshStandardMaterial color="#18181b" metalness={0.9} roughness={0.2} />
        </mesh>
        <mesh position={[0, -0.2, 0]}>
          <cylinderGeometry args={[0.42, 0.45, 0.32, 8]} />
          <meshStandardMaterial color="#382013" />
        </mesh>
      </group>

      {/* 1 Broadside Swivel per Side */}
      <BroadsideCannons positions={[0]} width={width} y={1.8} scale={0.85} />

      {/* Mediterranean Raked Mast & Lateen Yardarm */}
      <group position={[0, 1.9, length * 0.08]} rotation={[0.14, 0, 0]}>
        <mesh position={[0, length * 0.42, 0]} castShadow>
          <cylinderGeometry args={[0.12, 0.22, length * 0.85, 8]} />
          <meshStandardMaterial color="#382013" roughness={0.8} />
        </mesh>
        <group position={[0, length * 0.48, 0.1]} rotation={[-0.48, 0, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.07, 0.07, length * 1.1, 8]} />
            <meshStandardMaterial color="#2d1c12" roughness={0.8} />
          </mesh>
          <mesh
            geometry={lateenGeo}
            position={[0, -length * 0.28 * sailScale, 0.15]}
            scale={[1, sailScale, 1]}
            rotation={[0, Math.PI / 2, 0]}
            castShadow
            receiveShadow
          >
            <meshStandardMaterial map={sailTexture} side={THREE.DoubleSide} roughness={0.85} />
          </mesh>
        </group>
        <ShipFlag position={[0, length * 0.88, -0.4]} isEnemy={isEnemy} />
      </group>

      {/* Wooden Tiller Bar on Open Aft Cockpit */}
      <group position={[0, 2.1, -length * 0.42]}>
        <mesh ref={tillerRef} position={[0, 0, 0.4]} rotation={[0.2, 0, 0]}>
          <cylinderGeometry args={[0.04, 0.06, 1.1, 6]} />
          <meshStandardMaterial color="#d97706" />
        </mesh>
      </group>

      <RudderBlade length={length} rudderAngle={rudderAngle} />
    </group>
  );
});
