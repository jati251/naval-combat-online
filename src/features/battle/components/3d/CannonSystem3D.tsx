import * as THREE from 'three';
import React, { useMemo } from 'react';
import { useGameStore } from '@/stores/useGameStore';
import type { CannonballSnapshot } from '@/types/game';

interface CannonSystem3DProps {
  cannonballs: CannonballSnapshot[];
}

// Shared Cannonball Geometry & Radiant Emissive Material (0 allocation in render loop)
const cannonballGeo = new THREE.SphereGeometry(0.34, 10, 10);
const cannonballMat = new THREE.MeshStandardMaterial({
  color: '#111827',
  roughness: 0.35,
  metalness: 0.9,
  emissive: '#ea580c',
  emissiveIntensity: 0.85,
});

const EMPTY_TRAJECTORY: number[] = [];

export const CannonSystem3D: React.FC<CannonSystem3DProps> = React.memo(({ cannonballs }) => {
  const selfId = useGameStore((s) => s.selfId);
  const ships = useGameStore((s) => s.ships);
  const isAiming = useGameStore((s) => s.isAiming);
  const aimDirection = useGameStore((s) => s.aimDirection);

  const selfShip = ships.find((s) => s.id === selfId);

  // Ballistic aiming arc trajectory (computed only when actively aiming)
  const trajectoryPoints = useMemo(() => {
    if (!isAiming || aimDirection === 'none' || !selfShip || selfShip.isSunk) {
      return EMPTY_TRAJECTORY;
    }

    const pts: number[] = [];
    const fireAngle =
      selfShip.rotationY + (aimDirection === 'port' ? -Math.PI * 0.5 : Math.PI * 0.5);
    const speed = 40.0;
    const gravity = 9.8;
    const originX = selfShip.x + Math.sin(fireAngle) * 3.5;
    const originY = selfShip.y + 1.8;
    const originZ = selfShip.z + Math.cos(fireAngle) * 3.5;

    const vx = Math.sin(fireAngle) * speed;
    const vy = 5.5;
    const vz = Math.cos(fireAngle) * speed;

    for (let step = 0; step <= 25; step++) {
      const t = step * 0.08;
      const px = originX + vx * t;
      const py = originY + vy * t - 0.5 * gravity * t * t;
      const pz = originZ + vz * t;
      pts.push(px, py, pz);
      if (py < 0.0) break;
    }

    return pts;
  }, [
    isAiming,
    aimDirection,
    selfShip?.x,
    selfShip?.y,
    selfShip?.z,
    selfShip?.rotationY,
    selfShip?.isSunk,
  ]);

  return (
    <group>
      {/* Active Cannonballs in Flight (Using Shared GPU Geometry & Material) */}
      {cannonballs.map((ball) => (
        <mesh
          key={ball.id}
          position={[ball.x, ball.y, ball.z]}
          castShadow
          geometry={cannonballGeo}
          material={cannonballMat}
        />
      ))}

      {/* Ballistic Aiming Arc Projector Line */}
      {isAiming && trajectoryPoints.length > 3 && (
        <line>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[new Float32Array(trajectoryPoints), 3]}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#38bdf8" linewidth={3} transparent opacity={0.75} />
        </line>
      )}
    </group>
  );
});

