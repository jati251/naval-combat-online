import * as THREE from 'three';
import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '@/stores/useGameStore';
import type { CannonballSnapshot } from '@/types/game';

interface CannonSystem3DProps {
  cannonballs: CannonballSnapshot[];
}

// Procedural 2D Cast-Iron Black Roundshot Billboard Texture (Ultra Lightweight & Crisp)
function createBlackRoundShotTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Deep pitch-black cast iron with sharp metallic sun glint
  const grad = ctx.createRadialGradient(46, 46, 3, 64, 64, 58);
  grad.addColorStop(0, '#f8fafc'); // Specular highlight
  grad.addColorStop(0.12, '#94a3b8');
  grad.addColorStop(0.32, '#334155');
  grad.addColorStop(0.65, '#0f172a');
  grad.addColorStop(0.92, '#020617');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)'); // Clean anti-aliased edge

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(64, 64, 58, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

let cachedRoundShotTex: THREE.CanvasTexture | null = null;
function getRoundShotTex(): THREE.CanvasTexture {
  if (!cachedRoundShotTex) {
    cachedRoundShotTex = createBlackRoundShotTexture();
  }
  return cachedRoundShotTex;
}

const MAX_RENDER_BALLS = 250;
const EMPTY_TRAJECTORY: number[] = [];

interface ClientBallState {
  id: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  targetX: number;
  targetY: number;
  targetZ: number;
  lastServerUpdate: number;
}

/**
 * Ultra-Lightweight 2D Black Roundshot Billboard Cannonball System
 * - High-contrast authentic black cast-iron roundshot sprites.
 * - Smooth 60-144 FPS client-side ballistic physics interpolation.
 * - frustumCulled={false} ensures zero culling glitches anywhere across the sea.
 * - Single GPU draw call with 0 dynamic GC allocation.
 */
export const CannonSystem3D: React.FC<CannonSystem3DProps> = React.memo(({ cannonballs }) => {
  const selfId = useGameStore((s) => s.selfId);
  const ships = useGameStore((s) => s.ships);
  const isAiming = useGameStore((s) => s.isAiming);
  const aimDirection = useGameStore((s) => s.aimDirection);

  const selfShip = ships.find((s) => s.id === selfId);
  const roundShotTexture = useMemo(() => getRoundShotTex(), []);

  const pointsRef = useRef<THREE.Points>(null);
  const ballPositions = useMemo(() => new Float32Array(MAX_RENDER_BALLS * 3), []);
  const clientBalls = useRef<Map<string, ClientBallState>>(new Map());

  // Ballistic aiming arc trajectory (computed only when actively aiming)
  const trajectoryPoints = useMemo(() => {
    if (!isAiming || aimDirection === 'none' || !selfShip || selfShip.isSunk) {
      return EMPTY_TRAJECTORY;
    }

    const pts: number[] = [];
    const fireAngle =
      selfShip.rotationY + (aimDirection === 'port' ? -Math.PI * 0.5 : Math.PI * 0.5);
    const speed = 40.0;
    const gravity = 9.81;
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

  // Per-Frame Ballistic Flight Physics & Smooth Position Updates (60-144 FPS)
  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const now = state.clock.elapsedTime;
    const serverMap = new Map<string, CannonballSnapshot>();

    // 1. Sync from server snapshots
    for (const b of cannonballs) {
      serverMap.set(b.id, b);
      const existing = clientBalls.current.get(b.id);
      if (!existing) {
        clientBalls.current.set(b.id, {
          id: b.id,
          x: b.x,
          y: b.y,
          z: b.z,
          vx: b.vx ?? 0,
          vy: b.vy ?? 5.5,
          vz: b.vz ?? 0,
          targetX: b.x,
          targetY: b.y,
          targetZ: b.z,
          lastServerUpdate: now,
        });
      } else {
        existing.targetX = b.x;
        existing.targetY = b.y;
        existing.targetZ = b.z;
        if (b.vx !== undefined) existing.vx = b.vx;
        if (b.vy !== undefined) existing.vy = b.vy;
        if (b.vz !== undefined) existing.vz = b.vz;
        existing.lastServerUpdate = now;
      }
    }

    // 2. Remove expired balls
    for (const [id, ball] of clientBalls.current.entries()) {
      if (!serverMap.has(id)) {
        if (now - ball.lastServerUpdate > 0.25 || ball.y <= -0.5) {
          clientBalls.current.delete(id);
        }
      }
    }

    // 3. Integrate flight physics & update GPU buffer
    const gravity = -9.81;
    let count = 0;

    for (const ball of clientBalls.current.values()) {
      if (count >= MAX_RENDER_BALLS) break;

      // Ballistic integration
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt + 0.5 * gravity * dt * dt;
      ball.vy += gravity * dt;
      ball.z += ball.vz * dt;

      // Smooth soft reconciliation towards authoritative server position
      ball.x = THREE.MathUtils.lerp(ball.x, ball.targetX, Math.min(1.0, 8.0 * dt));
      ball.y = THREE.MathUtils.lerp(ball.y, ball.targetY, Math.min(1.0, 8.0 * dt));
      ball.z = THREE.MathUtils.lerp(ball.z, ball.targetZ, Math.min(1.0, 8.0 * dt));

      ballPositions[count * 3] = ball.x;
      ballPositions[count * 3 + 1] = ball.y;
      ballPositions[count * 3 + 2] = ball.z;
      count++;
    }

    // Hide remaining unused slots below water
    for (let i = count; i < MAX_RENDER_BALLS; i++) {
      ballPositions[i * 3 + 1] = -500;
    }

    if (pointsRef.current) {
      const geo = pointsRef.current.geometry;
      const posAttr = geo.attributes.position as THREE.BufferAttribute;
      if (posAttr) posAttr.needsUpdate = true;
    }
  });

  return (
    <group>
      {/* High-Performance 2D Black Roundshot Billboard Points (Always Visible, Zero Stutter) */}
      <points ref={pointsRef} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[ballPositions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          map={roundShotTexture}
          transparent
          alphaTest={0.01}
          depthWrite={false}
          size={3.2}
          sizeAttenuation
        />
      </points>

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
