import React, { useRef, useMemo, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '@/stores/useGameStore';
import { navalAudio } from '../../services/navalAudio';

/**
 * Procedural circular ripple & droplet splash texture.
 */
function createSplashRingTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(64, 64, 48, 0, Math.PI * 2);
  ctx.stroke();

  // Subtle inner ripple
  ctx.strokeStyle = 'rgba(224, 242, 254, 0.5)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(64, 64, 28, 0, Math.PI * 2);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

let cachedRingTexture: THREE.CanvasTexture | null = null;
function getRingTexture(): THREE.CanvasTexture {
  if (!cachedRingTexture) {
    cachedRingTexture = createSplashRingTexture();
  }
  return cachedRingTexture;
}

// ────────────────────────────────────────────────────────────────────────────
// Streamlined Caribbean Flying Fish / Marlin Mesh Geometry & Materials
// ────────────────────────────────────────────────────────────────────────────
const fishBodyGeo = new THREE.ConeGeometry(0.32, 2.4, 8);
fishBodyGeo.rotateX(-Math.PI / 2); // align along forward Z

const dorsalFinGeo = new THREE.ConeGeometry(0.12, 0.9, 4);
dorsalFinGeo.rotateZ(Math.PI / 3);

const pectoralFinGeo = new THREE.PlaneGeometry(1.6, 0.6);
pectoralFinGeo.rotateX(-Math.PI / 2);

const caudalFinGeo = new THREE.ConeGeometry(0.2, 0.8, 3);
caudalFinGeo.rotateZ(-Math.PI / 2);

const fishScaleMat = new THREE.MeshStandardMaterial({
  color: '#0284c7', // Caribbean sapphire blue back
  metalness: 0.85,
  roughness: 0.22,
  emissive: '#0369a1',
  emissiveIntensity: 0.25,
});

const fishBellyMat = new THREE.MeshStandardMaterial({
  color: '#f8fafc', // Shimmering silver white belly
  metalness: 0.9,
  roughness: 0.2,
});

const finMat = new THREE.MeshStandardMaterial({
  color: '#38bdf8',
  transparent: true,
  opacity: 0.65,
  side: THREE.DoubleSide,
  roughness: 0.3,
});

interface ActiveFishJump {
  id: number;
  startX: number;
  startZ: number;
  targetX: number;
  targetZ: number;
  peakY: number;
  duration: number;
  elapsed: number;
  scale: number;
  heading: number;
  hasSplashedExit: boolean;
  hasSplashedEntry: boolean;
}

interface SplashRing {
  id: number;
  x: number;
  z: number;
  scale: number;
  opacity: number;
}

/**
 * Rare Random Leaping Marine Life (Caribbean Flying Fish / Blue Marlin Breaches)
 * Occasionally leaps gracefully out of the ocean in view of the ship.
 */
export const JumpingFish3D: React.FC = React.memo(() => {
  const ringTexture = useMemo(() => getRingTexture(), []);
  const activeJumps = useRef<ActiveFishJump[]>([]);
  const splashRings = useRef<SplashRing[]>([]);
  const [, setRenderTick] = useState(0);

  const nextSpawnTimer = useRef(12.0 + Math.random() * 14.0); // Next jump in 12-26 seconds
  const jumpIdSeq = useRef(1);

  useFrame((state, delta) => {
    // 1. Spawning Timer Countdown
    nextSpawnTimer.current -= delta;
    if (nextSpawnTimer.current <= 0) {
      // Schedule next jump (rare: 18 - 32 seconds)
      nextSpawnTimer.current = 18.0 + Math.random() * 14.0;

      // Spawn near player's ship or camera
      const { ships, selfId } = useGameStore.getState();
      const selfShip = ships.find((s) => s.id === selfId);

      const center = selfShip ? new THREE.Vector3(selfShip.x, 0, selfShip.z) : state.camera.position;
      // Random angle & distance (20m to 55m away for great cinematic visibility)
      const angle = Math.random() * Math.PI * 2;
      const dist = 22.0 + Math.random() * 32.0;

      const sx = center.x + Math.cos(angle) * dist;
      const sz = center.z + Math.sin(angle) * dist;

      // Leap direction (tangent / forward vector)
      const jumpAngle = angle + (Math.random() - 0.5) * 1.5;
      const jumpDist = 8.0 + Math.random() * 5.0; // 8-13m leap
      const ex = sx + Math.cos(jumpAngle) * jumpDist;
      const ez = sz + Math.sin(jumpAngle) * jumpDist;

      const duration = 1.25 + Math.random() * 0.4;
      const peakHeight = 2.4 + Math.random() * 1.2;

      activeJumps.current.push({
        id: jumpIdSeq.current++,
        startX: sx,
        startZ: sz,
        targetX: ex,
        targetZ: ez,
        peakY: peakHeight,
        duration,
        elapsed: 0,
        scale: 0.8 + Math.random() * 0.4,
        heading: jumpAngle + Math.PI * 0.5,
        hasSplashedExit: false,
        hasSplashedEntry: false,
      });

      // Spawn exit splash ring
      splashRings.current.push({
        id: jumpIdSeq.current++,
        x: sx,
        z: sz,
        scale: 0.4,
        opacity: 0.9,
      });
    }

    // 2. Update active fish jumps
    for (let i = activeJumps.current.length - 1; i >= 0; i--) {
      const jump = activeJumps.current[i];
      jump.elapsed += delta;

      const progress = Math.min(1.0, jump.elapsed / jump.duration);

      // Audio splash on exit and re-entry if close to player
      if (!jump.hasSplashedExit && progress > 0.05) {
        jump.hasSplashedExit = true;
        navalAudio.playWaterSplash();
      }

      if (!jump.hasSplashedEntry && progress > 0.88) {
        jump.hasSplashedEntry = true;
        splashRings.current.push({
          id: jumpIdSeq.current++,
          x: jump.targetX,
          z: jump.targetZ,
          scale: 0.4,
          opacity: 0.95,
        });
        navalAudio.playWaterSplash();
      }

      if (progress >= 1.0) {
        activeJumps.current.splice(i, 1);
      }
    }

    // 3. Update splash rings
    for (let i = splashRings.current.length - 1; i >= 0; i--) {
      const ring = splashRings.current[i];
      ring.scale += delta * 3.5;
      ring.opacity -= delta * 1.2;
      if (ring.opacity <= 0) {
        splashRings.current.splice(i, 1);
      }
    }

    // Trigger lightweight component sync when jumps are active
    if (activeJumps.current.length > 0 || splashRings.current.length > 0) {
      setRenderTick((t) => (t + 1) % 1000000);
    }
  });

  return (
    <group>
      {/* Active Leaping Fish */}
      {activeJumps.current.map((jump) => {
        const progress = Math.min(1.0, jump.elapsed / jump.duration);
        // Parabolic arc: 4 * h * p * (1 - p)
        const py = 4.0 * jump.peakY * progress * (1.0 - progress);
        const px = THREE.MathUtils.lerp(jump.startX, jump.targetX, progress);
        const pz = THREE.MathUtils.lerp(jump.startZ, jump.targetZ, progress);

        // Dynamic pitch angle (tilts upward at launch, downwards at dive)
        const verticalVelocity = 4.0 * jump.peakY * (1.0 - 2.0 * progress);
        const pitch = -Math.atan2(verticalVelocity, 8.0);

        return (
          <group
            key={`fish-${jump.id}`}
            position={[px, py, pz]}
            rotation={[pitch, jump.heading, 0]}
            scale={[jump.scale, jump.scale, jump.scale]}
          >
            {/* Upper Sapphire Body */}
            <mesh geometry={fishBodyGeo} material={fishScaleMat} castShadow />
            {/* Lower Silver Belly */}
            <mesh position={[0, -0.08, 0]} scale={[0.85, 0.85, 0.95]} geometry={fishBodyGeo} material={fishBellyMat} />
            {/* Dorsal Fin */}
            <mesh position={[0, 0.35, -0.2]} geometry={dorsalFinGeo} material={finMat} />
            {/* Large Gliding Pectoral Fins (Flying Fish Wings) */}
            <mesh position={[0, 0.05, 0.4]} geometry={pectoralFinGeo} material={finMat} />
            {/* Caudal Tail Fin */}
            <mesh position={[0, 0.05, -1.2]} geometry={caudalFinGeo} material={finMat} />
          </group>
        );
      })}

      {/* Splashdown & Breach Ripple Rings */}
      {splashRings.current.map((ring) => (
        <mesh
          key={`ring-${ring.id}`}
          position={[ring.x, 0.12, ring.z]}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={[ring.scale, ring.scale, ring.scale]}
        >
          <planeGeometry args={[2.5, 2.5]} />
          <meshBasicMaterial
            map={ringTexture}
            transparent
            opacity={Math.max(0, ring.opacity)}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
});
