import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface ShipFlagProps {
  position: [number, number, number];
  isEnemy?: boolean;
  isGhost?: boolean;
}

export const ShipFlag: React.FC<ShipFlagProps> = React.memo(({ position, isEnemy, isGhost }) => {
  const flagRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (flagRef.current) {
      const t = state.clock.getElapsedTime();
      flagRef.current.rotation.y = Math.sin(t * 8) * 0.24;
      flagRef.current.rotation.z = Math.cos(t * 6) * 0.15;
    }
  });

  return (
    <mesh ref={flagRef} position={position} castShadow>
      <planeGeometry args={[1.3, 0.7]} />
      <meshStandardMaterial
        color={isEnemy ? '#dc2626' : isGhost ? '#059669' : '#2563eb'}
        side={THREE.DoubleSide}
        roughness={0.65}
      />
    </mesh>
  );
});
