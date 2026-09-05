import React from 'react';
import type { CannonballSnapshot } from '@/types/game';

interface CannonSystem3DProps {
  cannonballs: CannonballSnapshot[];
}

export const CannonSystem3D: React.FC<CannonSystem3DProps> = ({ cannonballs }) => {
  return (
    <group>
      {cannonballs.map((ball) => (
        <group key={ball.id} position={[ball.x, ball.y, ball.z]}>
          {/* Iron Cannonball Mesh */}
          <mesh castShadow>
            <sphereGeometry args={[0.32, 12, 12]} />
            <meshStandardMaterial
              color="#111827"
              roughness={0.4}
              metalness={0.9}
              emissive="#ea580c"
              emissiveIntensity={0.6}
            />
          </mesh>
          {/* Flame & Smoke Trail glow */}
          <pointLight color="#f97316" intensity={1.5} distance={8} decay={2} />
        </group>
      ))}
    </group>
  );
};
