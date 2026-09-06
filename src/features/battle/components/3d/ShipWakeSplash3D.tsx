import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '@/stores/useGameStore';
import { findShip } from '@/stores/selectors/shipLookup';

/**
 * High-definition 2D stylized cartoon water bubble sprite texture.
 * Features a crisp luminous rim, translucent aqua body, and twin specular glints.
 */
function create2DBubbleTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.clearRect(0, 0, 64, 64);
  const cx = 32;
  const cy = 32;
  const r = 24;

  // 1. Soft translucent buoyant aqua core
  const bodyGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, r);
  bodyGrad.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
  bodyGrad.addColorStop(0.65, 'rgba(186, 230, 253, 0.40)');
  bodyGrad.addColorStop(0.85, 'rgba(125, 211, 252, 0.75)');
  bodyGrad.addColorStop(1, 'rgba(255, 255, 255, 0.98)');

  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // 2. Crisp bright bubble perimeter rim
  ctx.strokeStyle = 'rgba(255, 255, 255, 1.0)';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(cx, cy, r - 1.0, 0, Math.PI * 2);
  ctx.stroke();

  // 3. Primary top-left specular highlight glint (star glint)
  ctx.fillStyle = 'rgba(255, 255, 255, 1.0)';
  ctx.beginPath();
  ctx.ellipse(cx - 8, cy - 9, 6.0, 3.2, -Math.PI / 4, 0, Math.PI * 2);
  ctx.fill();

  // 4. Secondary bottom-right water reflection glint
  ctx.fillStyle = 'rgba(224, 242, 254, 0.9)';
  ctx.beginPath();
  ctx.ellipse(cx + 8, cy + 8, 4.2, 2.2, -Math.PI / 4, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

let cachedBubbleTexture: THREE.CanvasTexture | null = null;
function getBubbleTexture(): THREE.CanvasTexture {
  if (!cachedBubbleTexture) {
    cachedBubbleTexture = create2DBubbleTexture();
  }
  return cachedBubbleTexture;
}

interface ShipWakeSplash3DProps {
  shipId: string;
  shipLength?: number;
  shipWidth?: number;
  isEnemy?: boolean;
  isMobile?: boolean;
}

interface BubbleParticle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  wobbleSpeed: number;
  wobblePhase: number;
  life: number;
  maxLife: number;
}

/**
 * Lightweight 2D Water Bubbles & Stern Froth for Player & Opponent vessels.
 * Directly reads real-time speed & rudder in useFrame to eliminate memoization starvation.
 * Includes dynamic distance culling and mobile LOD budgets to prevent CPU/GPU stall.
 */
export const ShipWakeSplash3D: React.FC<ShipWakeSplash3DProps> = React.memo(({
  shipId,
  shipLength = 18,
  shipWidth = 6.0,
  isEnemy = false,
  isMobile = false,
}) => {
  const timeOfDay = useGameStore((s) => s.timeOfDay);
  const isNight = timeOfDay === 'NIGHT';
  const texture = useMemo(() => getBubbleTexture(), []);
  const pointsRef = useRef<THREE.Points>(null);

  // Scaled particle budget: opponents & mobile get leaner budgets
  const count = isEnemy ? (isMobile ? 12 : 22) : (isMobile ? 28 : 55);
  const particles = useRef<BubbleParticle[]>([]);

  // Initial buffer allocation
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    particles.current = [];

    for (let i = 0; i < count; i++) {
      particles.current.push({
        x: 0,
        y: -100, // offscreen until spawned
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        wobbleSpeed: 3 + Math.random() * 4,
        wobblePhase: Math.random() * Math.PI * 2,
        life: 0,
        maxLife: 1.0,
      });
      pos[i * 3 + 1] = -100;
    }
    return pos;
  }, [count]);

  const emitAccumulator = useRef(0);

  useFrame((state, delta) => {
    if (!pointsRef.current) return;

    // Fetch live state from Zustand on every frame (bypasses parent React.memo prop stagnation)
    const store = useGameStore.getState();
    const curShip = findShip(store.ships, shipId);
    if (!curShip || curShip.isSunk) {
      if (pointsRef.current.visible) pointsRef.current.visible = false;
      return;
    }

    // Distance Culling: Opponents beyond wake visibility distance require zero CPU simulation or buffer uploads
    const cameraPos = state.camera.position;
    const dx = cameraPos.x - curShip.x;
    const dz = cameraPos.z - curShip.z;
    const distSq = dx * dx + dz * dz;
    const maxWakeDist = isEnemy ? (isMobile ? 55 : 85) : 150;

    if (distSq > maxWakeDist * maxWakeDist) {
      if (pointsRef.current.visible) pointsRef.current.visible = false;
      return;
    }

    if (!pointsRef.current.visible) pointsRef.current.visible = true;

    const currentSpeed = Math.max(0, curShip.speed ?? 0);
    const rudderAngle = curShip.rudder ?? 0;

    const geo = pointsRef.current.geometry;
    const posAttr = geo.attributes.position as THREE.BufferAttribute;
    const posArr = posAttr.array as Float32Array;

    const halfLen = shipLength * 0.5;
    const halfWid = shipWidth * 0.5;
    const sternZ = -halfLen * 0.95;

    // Local waterline level: ship group is at y=+0.85, so sea surface is at local y = -0.72
    const waterLevelY = -0.72;

    // Emission rate scales with true real-time ship speed (15-35 bubbles/sec at speed)
    const emitRate = currentSpeed > 0.4 ? 10 + currentSpeed * 2.2 : 0;
    emitAccumulator.current += emitRate * delta;

    while (emitAccumulator.current >= 1.0) {
      emitAccumulator.current -= 1.0;

      // Find an inactive slot
      let slot = -1;
      for (let i = 0; i < count; i++) {
        if (particles.current[i].life <= 0) {
          slot = i;
          break;
        }
      }
      if (slot === -1) {
        slot = Math.floor(Math.random() * count);
      }

      const p = particles.current[slot];

      // 65% stern churn bubbles, 35% hull waterline bubbles
      const isFlank = Math.random() < 0.35;
      const side = Math.random() > 0.5 ? 1 : -1;

      if (isFlank) {
        // Flank waterline bubble
        const flankZ = -halfLen * (0.1 + Math.random() * 0.65);
        p.x = side * (halfWid * 0.82 + Math.random() * 0.4);
        p.y = waterLevelY + 0.02 + Math.random() * 0.08;
        p.z = flankZ;
        p.vx = side * (0.6 + Math.random() * 0.5);
        p.vy = 0.06 + Math.random() * 0.12;
        p.vz = -currentSpeed * 0.75 - (0.5 + Math.random() * 0.8);
        p.maxLife = 1.0 + Math.random() * 0.7;
      } else {
        // Stern wake bubble behind rudder
        const rudderOffset = -rudderAngle * halfWid * 0.5;
        const spreadX = (Math.random() - 0.5) * halfWid * 1.2 + rudderOffset;
        p.x = spreadX;
        p.y = waterLevelY + 0.04 + Math.random() * 0.12;
        p.z = sternZ - Math.random() * 1.5;
        p.vx = (Math.random() - 0.5) * 0.8 - rudderAngle * 1.2;
        p.vy = 0.10 + Math.random() * 0.18;
        p.vz = -currentSpeed * 0.95 - (0.8 + Math.random() * 1.2);
        p.maxLife = 1.2 + Math.random() * 0.8;
      }

      p.life = p.maxLife;
    }

    // Update active 2D bubbles
    let activeCount = 0;
    for (let i = 0; i < count; i++) {
      const p = particles.current[i];
      if (p.life > 0) {
        p.life -= delta;

        // Subtle organic bobbing & upward buoyancy
        p.wobblePhase += p.wobbleSpeed * delta;
        const wobbleX = Math.sin(p.wobblePhase) * 0.35 * delta;

        p.x += (p.vx + wobbleX) * delta;
        p.y += p.vy * delta;
        p.z += p.vz * delta;

        // Water drag deceleration
        p.vx *= Math.max(0, 1.0 - 1.1 * delta);
        p.vz *= Math.max(0, 1.0 - 0.85 * delta);

        // Pack active particles to the start of the GPU vertex buffer
        const idx = activeCount * 3;
        posArr[idx] = p.x;
        posArr[idx + 1] = Math.min(waterLevelY + 0.35, Math.max(waterLevelY - 0.05, p.y));
        posArr[idx + 2] = p.z;
        activeCount++;
      }
    }

    geo.setDrawRange(0, activeCount);
    if (activeCount > 0) {
      posAttr.needsUpdate = true;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        map={texture}
        transparent
        depthWrite={false}
        blending={THREE.NormalBlending}
        opacity={isNight ? 0.48 : 0.92}
        color={isNight ? '#769ec9' : '#ffffff'}
        size={isNight ? 2.5 : 3.2}
        sizeAttenuation
      />
    </points>
  );
});
