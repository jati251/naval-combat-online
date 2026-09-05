import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '@/stores/useGameStore';

interface ShipFlagProps {
  position: [number, number, number];
  isEnemy?: boolean;
  isGhost?: boolean;
}

export const ShipFlag: React.FC<ShipFlagProps> = React.memo(({ position, isEnemy, isGhost }) => {
  const flagRef = useRef<THREE.Mesh>(null);
  const windAngle = useGameStore((s) => s.windAngle);

  useFrame((state) => {
    if (flagRef.current) {
      const t = state.clock.getElapsedTime();
      const parentRotY = flagRef.current.parent?.rotation.y ?? 0;
      // Wind blowing direction relative to the ship hull
      const targetRelYaw = (windAngle + Math.PI) - parentRotY;
      const flutter = Math.sin(t * 11) * 0.22;
      const ripple = Math.cos(t * 8) * 0.12;

      flagRef.current.rotation.y = targetRelYaw + flutter;
      flagRef.current.rotation.z = ripple;
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
