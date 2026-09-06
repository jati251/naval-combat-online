import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '@/stores/useGameStore';
import { isObjectVisible } from '../../shared/visibility';

const flagGeometry = new THREE.PlaneGeometry(1.3, 0.7, 10, 4);
const flagVertices = flagGeometry.attributes.position;
for (let i = 0; i < flagVertices.count; i++) {
  const u = (flagVertices.getX(i) + 0.65) / 1.3;
  flagVertices.setXYZ(i, u * 1.3, flagVertices.getY(i) - u * u * 0.13,
    Math.sin(u * Math.PI * 3) * u * 0.12);
}
flagGeometry.computeVertexNormals();

interface ShipFlagProps {
  position: [number, number, number];
  isEnemy?: boolean;
  isGhost?: boolean;
}

export const ShipFlag: React.FC<ShipFlagProps> = React.memo(({ position, isEnemy, isGhost }) => {
  const flagRef = useRef<THREE.Mesh>(null);
  const windAngle = useGameStore((s) => s.windAngle);
  const orientation = useMemo(() => new THREE.Quaternion(), []);
  const heading = useMemo(() => new THREE.Euler(0, 0, 0, 'YXZ'), []);

  useFrame((state) => {
    if (flagRef.current && isObjectVisible(flagRef.current)) {
      const t = state.clock.getElapsedTime();
      flagRef.current.parent?.getWorldQuaternion(orientation);
      const parentRotY = heading.setFromQuaternion(orientation, 'YXZ').y;
      // Wind blowing direction relative to the ship hull
      const targetRelYaw = (windAngle + Math.PI) - parentRotY;
      const flutter = Math.sin(t * 11) * 0.22;
      const ripple = Math.cos(t * 8) * 0.12;

      flagRef.current.rotation.y = targetRelYaw + flutter;
      flagRef.current.rotation.z = ripple;
    }
  });

  return (
    <mesh ref={flagRef} geometry={flagGeometry} position={position} castShadow>
      <meshStandardMaterial
        color={isEnemy ? '#dc2626' : isGhost ? '#059669' : '#2563eb'}
        side={THREE.DoubleSide}
        roughness={0.65}
      />
    </mesh>
  );
});
