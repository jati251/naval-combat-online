import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface RudderBladeProps {
  length: number;
  rudderAngle: number;
}

export const RudderBlade: React.FC<RudderBladeProps> = React.memo(({ length, rudderAngle }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y = -rudderAngle * 0.55;
    }
  });

  return (
    <group position={[0, 0.6, -length * 0.5]}>
      <mesh ref={meshRef} position={[0, 0, -0.42]} castShadow>
        <boxGeometry args={[0.2, 2.4, 0.9]} />
        <meshStandardMaterial color="#2d170b" roughness={0.85} />
      </mesh>
    </group>
  );
});
