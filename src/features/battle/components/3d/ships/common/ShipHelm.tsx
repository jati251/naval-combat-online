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
      {/* Rotating Wheel Unit */}
      <group ref={helmRef}>
        <mesh castShadow>
          <torusGeometry args={[0.38, 0.038, 8, 20]} />
          <meshStandardMaterial color="#5c3317" roughness={0.6} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.1, 0.1, isDouble ? 0.38 : 0.2, 8]} />
          <meshStandardMaterial color="#d97706" metalness={0.8} roughness={0.3} />
        </mesh>
        {/* Spokes with protruding handles */}
        {[0, 45, 90, 135].map((deg) => (
          <mesh key={deg} rotation={[0, 0, (deg * Math.PI) / 180]}>
            <cylinderGeometry args={[0.026, 0.026, 1.05, 6]} />
            <meshStandardMaterial color="#78350f" roughness={0.7} />
          </mesh>
        ))}
        {isDouble && (
          <group position={[0, 0, -0.24]}>
            <mesh castShadow>
              <torusGeometry args={[0.38, 0.038, 8, 20]} />
              <meshStandardMaterial color="#5c3317" roughness={0.6} />
            </mesh>
            {[0, 45, 90, 135].map((deg) => (
              <mesh key={`sp-${deg}`} rotation={[0, 0, (deg * Math.PI) / 180]}>
                <cylinderGeometry args={[0.026, 0.026, 1.05, 6]} />
                <meshStandardMaterial color="#78350f" roughness={0.7} />
              </mesh>
            ))}
          </group>
        )}
      </group>

      {/* Steering Gear Pedestal & Barrel */}
      <mesh position={[0, -0.42, 0.06]} castShadow>
        <boxGeometry args={[0.3, 0.8, 0.32]} />
        <meshStandardMaterial color="#382013" roughness={0.8} />
      </mesh>

      {/* Polished Brass Binnacle Compass Housing (Forward of the wheel) */}
      <group position={[0, -0.15, 0.32]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.12, 0.14, 0.48, 8]} />
          <meshStandardMaterial color="#d97706" metalness={0.85} roughness={0.25} />
        </mesh>
        {/* Brass Compass Dome */}
        <mesh position={[0, 0.24, 0]}>
          <sphereGeometry args={[0.12, 8, 8, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
          <meshStandardMaterial color="#fbbf24" metalness={0.9} roughness={0.2} />
        </mesh>
      </group>
    </group>
  );
});
