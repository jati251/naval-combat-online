import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface ShipHelmProps {
  position: [number, number, number];
  rudderAngle: number;
  isDouble?: boolean;
}

export const ShipHelm: React.FC<ShipHelmProps> = React.memo(({ position, rudderAngle, isDouble = false }) => {
  const helmRef = useRef<THREE.Group>(null);
  useFrame(() => {
    if (helmRef.current) {
      helmRef.current.rotation.z = -rudderAngle * 2.8;
    }
  });

  return (
    <group position={position}>
      <group ref={helmRef}>
        <mesh>
          <torusGeometry args={[0.36, 0.038, 8, 16]} />
          <meshStandardMaterial color="#5c3317" roughness={0.6} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.09, 0.09, isDouble ? 0.35 : 0.18, 8]} />
          <meshStandardMaterial color="#d97706" metalness={0.7} />
        </mesh>
        {[0, 45, 90, 135].map((deg) => (
          <mesh key={deg} rotation={[0, 0, (deg * Math.PI) / 180]}>
            <cylinderGeometry args={[0.024, 0.024, 0.92, 6]} />
            <meshStandardMaterial color="#78350f" roughness={0.7} />
          </mesh>
        ))}
        {isDouble && (
          <mesh position={[0, 0, -0.22]}>
            <torusGeometry args={[0.36, 0.038, 8, 16]} />
            <meshStandardMaterial color="#5c3317" roughness={0.6} />
          </mesh>
        )}
      </group>
      <mesh position={[0, -0.45, 0.08]}>
        <boxGeometry args={[0.26, 0.75, 0.26]} />
        <meshStandardMaterial color="#382013" />
      </mesh>
    </group>
  );
});
