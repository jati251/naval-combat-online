import * as THREE from 'three';
import React, { useMemo } from 'react';
import { useGameStore } from '@/stores/useGameStore';
import type { CannonballSnapshot } from '@/types/game';

interface CannonSystem3DProps {
  cannonballs: CannonballSnapshot[];
}

// Procedural 2D Cast-Iron Roundshot Billboard Texture (No 3D orange glowing spheres)
function createRoundShotTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Cast iron cannonball: dark charcoal-black with metallic specular highlight
  const grad = ctx.createRadialGradient(24, 24, 2, 32, 32, 28);
  grad.addColorStop(0, '#94a3b8'); // Specular sun reflection
  grad.addColorStop(0.25, '#475569');
  grad.addColorStop(0.65, '#1e293b');
  grad.addColorStop(1, '#020617'); // Dark cast iron edge

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(32, 32, 28, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

let cachedRoundShotTex: THREE.CanvasTexture | null = null;
function getRoundShotTex(): THREE.CanvasTexture {
  if (!cachedRoundShotTex) {
    cachedRoundShotTex = createRoundShotTexture();
  }
  return cachedRoundShotTex;
}

const EMPTY_TRAJECTORY: number[] = [];

export const CannonSystem3D: React.FC<CannonSystem3DProps> = React.memo(({ cannonballs }) => {
  const selfId = useGameStore((s) => s.selfId);
  const ships = useGameStore((s) => s.ships);
  const isAiming = useGameStore((s) => s.isAiming);
  const aimDirection = useGameStore((s) => s.aimDirection);

  const selfShip = ships.find((s) => s.id === selfId);
  const roundShotTexture = useMemo(() => getRoundShotTex(), []);

  // Pack 2D billboard cannonball positions into Float32Array (0 3D mesh overhead)
  const ballPositions = useMemo(() => {
    const arr = new Float32Array(cannonballs.length * 3);
    for (let i = 0; i < cannonballs.length; i++) {
      arr[i * 3] = cannonballs[i].x;
      arr[i * 3 + 1] = cannonballs[i].y;
      arr[i * 3 + 2] = cannonballs[i].z;
    }
    return arr;
  }, [cannonballs]);

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
      {/* 2D Billboard Cast-Iron Roundshot Projectiles (No 3D Orange Meshes) */}
      {cannonballs.length > 0 && (
        <points>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[ballPositions, 3]}
            />
          </bufferGeometry>
          <pointsMaterial
            map={roundShotTexture}
            transparent
            alphaTest={0.2}
            depthWrite={false}
            size={1.5}
            sizeAttenuation
          />
        </points>
      )}

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

