import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '@/stores/useGameStore';
import { findShip } from '@/stores/selectors/shipLookup';
import { navalAudio } from '../../services/navalAudio';

/**
 * High-performance 2D Procedural Flying Fish / Marlin Sprite Texture
 * Radiant Caribbean turquoise & silver marlin with outstretched pectoral wings.
 */
function createFishSpriteTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.clearRect(0, 0, 256, 128);

  // 1. Torpedo fish body
  const bodyGrad = ctx.createLinearGradient(40, 64, 210, 64);
  bodyGrad.addColorStop(0, '#0284c7'); // Electric sapphire head
  bodyGrad.addColorStop(0.5, '#38bdf8'); // Shimmering turquoise flank
  bodyGrad.addColorStop(1, '#0369a1'); // Dark ocean tail

  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.ellipse(125, 64, 80, 20, 0, 0, Math.PI * 2);
  ctx.fill();

  // 2. Silver specular belly streak
  ctx.fillStyle = 'rgba(248, 250, 252, 0.9)';
  ctx.beginPath();
  ctx.ellipse(125, 72, 65, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  // 3. Outstretched Gliding Pectoral Wings (Flying Fish)
  ctx.fillStyle = 'rgba(56, 189, 248, 0.75)';
  ctx.beginPath();
  ctx.moveTo(115, 62);
  ctx.quadraticCurveTo(80, 15, 45, 10);
  ctx.quadraticCurveTo(90, 45, 135, 62);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(115, 66);
  ctx.quadraticCurveTo(80, 113, 45, 118);
  ctx.quadraticCurveTo(90, 83, 135, 66);
  ctx.closePath();
  ctx.fill();

  // 4. Crescent Tail Fin
  ctx.fillStyle = '#0284c7';
  ctx.beginPath();
  ctx.moveTo(200, 64);
  ctx.lineTo(235, 38);
  ctx.lineTo(220, 64);
  ctx.lineTo(235, 90);
  ctx.closePath();
  ctx.fill();

  // 5. Sunlit highlight glint & droplet sparkles
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(65, 62, 3, 0, Math.PI * 2); // Eye glint
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Procedural circular splashdown ripple texture.
 */
function createSplashRingTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(64, 64, 48, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(186, 230, 253, 0.5)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(64, 64, 28, 0, Math.PI * 2);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

let cachedFishTex: THREE.CanvasTexture | null = null;
let cachedRingTex: THREE.CanvasTexture | null = null;

const MAX_JUMPING_FISH = 3;

interface FishState {
  active: boolean;
  startX: number;
  startZ: number;
  targetX: number;
  targetZ: number;
  peakY: number;
  duration: number;
  elapsed: number;
  heading: number;
  scale: number;
  hasSplashedExit: boolean;
  hasSplashedEntry: boolean;
}

interface RingState {
  active: boolean;
  x: number;
  z: number;
  scale: number;
  opacity: number;
}

/**
 * Ultra-Lightweight 2D Penetrating Marine Life (Caribbean Flying Fish)
 * - 2D billboarding quad with depthWrite={false} ensuring it smoothly penetrates ("bisa nembus")
 *   all props, rocks, and ships without getting stuck.
 * - Zero React state thrashing (100% animated inside useFrame).
 * - Hard lifecycle timeout guarantees it can never bug out or remain stuck in scene.
 */
export const JumpingFish3D: React.FC = React.memo(() => {
  const fishTexture = useMemo(() => {
    if (!cachedFishTex) cachedFishTex = createFishSpriteTexture();
    return cachedFishTex;
  }, []);

  const ringTexture = useMemo(() => {
    if (!cachedRingTex) cachedRingTex = createSplashRingTexture();
    return cachedRingTex;
  }, []);

  const fishMeshRefs = useRef<(THREE.Mesh | null)[]>([]);
  const ringMeshRefs = useRef<(THREE.Mesh | null)[]>([]);

  const fishStates = useRef<FishState[]>(
    Array.from({ length: MAX_JUMPING_FISH }, () => ({
      active: false,
      startX: 0,
      startZ: 0,
      targetX: 0,
      targetZ: 0,
      peakY: 2.2,
      duration: 1.2,
      elapsed: 0,
      heading: 0,
      scale: 1.0,
      hasSplashedExit: false,
      hasSplashedEntry: false,
    }))
  );

  const ringStates = useRef<RingState[]>(
    Array.from({ length: 6 }, () => ({
      active: false,
      x: 0,
      z: 0,
      scale: 0.5,
      opacity: 0,
    }))
  );

  const spawnTimer = useRef(8.0 + Math.random() * 8.0);

  const spawnRing = (x: number, z: number) => {
    const slot = ringStates.current.find((r) => !r.active) || ringStates.current[0];
    slot.active = true;
    slot.x = x;
    slot.z = z;
    slot.scale = 0.5;
    slot.opacity = 0.85;
  };

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.08);

    // 1. Spawning timer
    spawnTimer.current -= dt;
    if (spawnTimer.current <= 0) {
      spawnTimer.current = 14.0 + Math.random() * 12.0;

      const freeFish = fishStates.current.find((f) => !f.active);
      if (freeFish) {
        const { ships, selfId } = useGameStore.getState();
        const selfShip = findShip(ships, selfId);
        const center = selfShip ? new THREE.Vector3(selfShip.x, 0, selfShip.z) : state.camera.position;

        const angle = Math.random() * Math.PI * 2;
        const dist = 18.0 + Math.random() * 26.0;
        const sx = center.x + Math.cos(angle) * dist;
        const sz = center.z + Math.sin(angle) * dist;

        const jumpAngle = angle + (Math.random() - 0.5) * 1.2;
        const jumpDist = 9.0 + Math.random() * 5.0;
        const ex = sx + Math.cos(jumpAngle) * jumpDist;
        const ez = sz + Math.sin(jumpAngle) * jumpDist;

        freeFish.active = true;
        freeFish.startX = sx;
        freeFish.startZ = sz;
        freeFish.targetX = ex;
        freeFish.targetZ = ez;
        freeFish.peakY = 2.0 + Math.random() * 1.2;
        freeFish.duration = 1.1 + Math.random() * 0.35;
        freeFish.elapsed = 0;
        freeFish.heading = jumpAngle;
        freeFish.scale = 1.6 + Math.random() * 0.8;
        freeFish.hasSplashedExit = false;
        freeFish.hasSplashedEntry = false;

        spawnRing(sx, sz);
      }
    }

    // 2. Update Fish Jumps directly on meshes (bypassing React re-renders)
    for (let i = 0; i < MAX_JUMPING_FISH; i++) {
      const fish = fishStates.current[i];
      const mesh = fishMeshRefs.current[i];
      if (!mesh) continue;

      if (fish.active) {
        fish.elapsed += dt;
        const progress = Math.min(1.0, fish.elapsed / fish.duration);

        // Water sounds
        if (!fish.hasSplashedExit && progress > 0.06) {
          fish.hasSplashedExit = true;
          navalAudio.playWaterSplash({
            worldPos: { x: fish.startX, z: fish.startZ },
            volumeMultiplier: 0.65,
          });
        }

        if (!fish.hasSplashedEntry && progress > 0.88) {
          fish.hasSplashedEntry = true;
          spawnRing(fish.targetX, fish.targetZ);
          navalAudio.playWaterSplash({
            worldPos: { x: fish.targetX, z: fish.targetZ },
            volumeMultiplier: 0.65,
          });
        }

        // Hard timeout: guaranteed cleanup so it CANNOT get stuck
        if (progress >= 1.0 || fish.elapsed > 2.0) {
          fish.active = false;
          mesh.visible = false;
          mesh.position.set(0, -100, 0);
          continue;
        }

        // Parabolic arc: 4 * h * p * (1 - p)
        const py = 4.0 * fish.peakY * progress * (1.0 - progress);
        const px = THREE.MathUtils.lerp(fish.startX, fish.targetX, progress);
        const pz = THREE.MathUtils.lerp(fish.startZ, fish.targetZ, progress);

        // Dynamic pitch angle (tilt up during launch, down on splashdown)
        const vy = 4.0 * fish.peakY * (1.0 - 2.0 * progress);
        const pitch = -Math.atan2(vy, 8.5);

        mesh.visible = true;
        mesh.position.set(px, py, pz);
        mesh.rotation.set(0, -fish.heading + Math.PI * 0.5, 0);
        mesh.rotateZ(pitch);
        mesh.scale.set(fish.scale, fish.scale, 1);
      } else {
        mesh.visible = false;
        mesh.position.set(0, -100, 0);
      }
    }

    // 3. Update Splashdown Rings directly on meshes
    for (let i = 0; i < 6; i++) {
      const ring = ringStates.current[i];
      const mesh = ringMeshRefs.current[i];
      if (!mesh) continue;

      if (ring.active) {
        ring.scale += dt * 3.8;
        ring.opacity -= dt * 1.35;

        if (ring.opacity <= 0) {
          ring.active = false;
          mesh.visible = false;
          mesh.position.set(0, -100, 0);
          continue;
        }

        mesh.visible = true;
        mesh.position.set(ring.x, 0.08, ring.z);
        mesh.scale.set(ring.scale, ring.scale, 1);
        const mat = mesh.material as THREE.MeshBasicMaterial;
        if (mat) mat.opacity = ring.opacity;
      } else {
        mesh.visible = false;
        mesh.position.set(0, -100, 0);
      }
    }
  });

  return (
    <group>
      {/* 2D Flying Fish Quads (Penetrates props cleanly with depthWrite=false) */}
      {Array.from({ length: MAX_JUMPING_FISH }).map((_, i) => (
        <mesh
          key={`fish-quad-${i}`}
          ref={(el) => {
            fishMeshRefs.current[i] = el;
          }}
          visible={false}
          position={[0, -100, 0]}
        >
          <planeGeometry args={[2.4, 1.2]} />
          <meshBasicMaterial
            map={fishTexture}
            transparent
            alphaTest={0.05}
            depthWrite={false}
            depthTest={true}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}

      {/* Ripple Rings */}
      {Array.from({ length: 6 }).map((_, i) => (
        <mesh
          key={`ring-quad-${i}`}
          ref={(el) => {
            ringMeshRefs.current[i] = el;
          }}
          visible={false}
          position={[0, -100, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[2.2, 2.2]} />
          <meshBasicMaterial
            map={ringTexture}
            transparent
            opacity={0}
            depthWrite={false}
            depthTest={true}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
});
