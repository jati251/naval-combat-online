import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface RudderBladeProps {
  length: number;
  rudderAngle: number;
  isEnemy?: boolean;
}

export const RudderBlade: React.FC<RudderBladeProps> = React.memo(({ length, rudderAngle, isEnemy = false }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y = -rudderAngle * 0.55;
    }
  });

  return (
    <group position={[0, 0.6, -length * 0.5]}>
      {/* Fixed Sternpost Timber attached to Hull Keel */}
      {!isEnemy && (
        <mesh position={[0, 0, -0.08]} castShadow={false} receiveShadow>
          <boxGeometry args={[0.22, 2.45, 0.2]} />
          <meshStandardMaterial color="#382013" roughness={0.75} />
        </mesh>
      )}

      {/* Pivoting Rudder Blade */}
      <group ref={meshRef} position={[0, 0, -0.18]}>
        <mesh position={[0, 0, -0.45]} castShadow={!isEnemy} receiveShadow>
          <boxGeometry args={[0.18, 2.35, 0.9]} />
          <meshStandardMaterial color="#4a2810" roughness={0.7} />
        </mesh>
        {/* 3 Heavy Forged Iron Pintle Hinge Straps (Player only) */}
        {!isEnemy && [-0.7, 0, 0.7].map((hy, hIdx) => (
          <mesh key={`hinge-${hIdx}`} position={[0, hy, -0.25]} castShadow={false}>
            <boxGeometry args={[0.24, 0.14, 0.55]} />
            <meshStandardMaterial color="#18181b" metalness={0.85} roughness={0.3} />
          </mesh>
        ))}
      </group>
    </group>
  );
});
