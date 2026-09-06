import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { isSphereInFrustum } from '../../utils/frustumCuller';

/**
 * Generates an in-memory crisp 2D white seagull silhouette texture.
 */
function createSeagullTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.clearRect(0, 0, 128, 64);

  // Stylized nautical white seagull in flight (V-wing profile)
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  // Left wing tip
  ctx.moveTo(8, 14);
  // Left wing arch
  ctx.quadraticCurveTo(36, 6, 60, 32);
  // Beak & Head
  ctx.lineTo(64, 38);
  ctx.lineTo(68, 32);
  // Right wing arch
  ctx.quadraticCurveTo(92, 6, 120, 14);
  // Right wing under-arch
  ctx.quadraticCurveTo(90, 22, 68, 36);
  // Tail
  ctx.lineTo(64, 48);
  ctx.lineTo(60, 36);
  // Left wing under-arch
  ctx.quadraticCurveTo(38, 22, 8, 14);
  ctx.closePath();
  ctx.fill();

  // Dark wingtips (classic black-tipped Caribbean gull)
  ctx.fillStyle = '#18181b';
  ctx.beginPath();
  ctx.moveTo(8, 14);
  ctx.quadraticCurveTo(18, 10, 26, 18);
  ctx.lineTo(8, 14);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(120, 14);
  ctx.quadraticCurveTo(110, 10, 102, 18);
  ctx.lineTo(120, 14);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

let cachedSeagullTexture: THREE.CanvasTexture | null = null;
function getSeagullTexture(): THREE.CanvasTexture {
  if (!cachedSeagullTexture) {
    cachedSeagullTexture = createSeagullTexture();
  }
  return cachedSeagullTexture;
}

interface BirdData {
  id: number;
  orbitCenter: [number, number];
  orbitRadius: number;
  altitude: number;
  speed: number;
  phase: number;
  scale: number;
  flapSpeed: number;
}

/**
 * Ultra-Lightweight 2D Animated Caribbean Seabirds Flock
 * Soaring gulls circling islands and ocean swells with procedural wing flaps.
 */
export const CaribbeanSeabirds3D: React.FC = React.memo(() => {
  const texture = useMemo(() => getSeagullTexture(), []);
  const groupRef = useRef<THREE.Group>(null);

  // 12 Birds organized in 3 localized tropical flocks
  const birds = useMemo<BirdData[]>(() => {
    const list: BirdData[] = [];
    // Flock centers (over ocean near Dead Man's Cay, Tortuga, and open water)
    const centers: Array<[number, number]> = [
      [-110, 90],
      [90, 40],
      [-70, -80],
    ];

    for (let i = 0; i < 12; i++) {
      const center = centers[i % centers.length];
      list.push({
        id: i,
        orbitCenter: center,
        orbitRadius: 35 + Math.random() * 45,
        altitude: 28 + Math.random() * 22,
        speed: 0.35 + Math.random() * 0.25,
        phase: (i / 12) * Math.PI * 2 + Math.random(),
        scale: 3.2 + Math.random() * 1.2,
        flapSpeed: 5.5 + Math.random() * 3.0,
      });
    }
    return list;
  }, []);

  const spriteRefs = useRef<(THREE.Sprite | null)[]>([]);
  const flockVisibleRef = useRef<boolean[]>([true, true, true]);
  const frameCount = useRef(0);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    // Horizon Zero Dawn Frustum Culling: Test each of the 3 flocks every 4 frames
    frameCount.current++;
    if (frameCount.current % 4 === 0) {
      const flockCenters: Array<[number, number]> = [
        [-110, 90],
        [90, 40],
        [-70, -80],
      ];
      for (let f = 0; f < 3; f++) {
        const c = flockCenters[f];
        flockVisibleRef.current[f] = isSphereInFrustum(state.camera, c[0], 35, c[1], 85, 20);
      }
    }

    birds.forEach((bird, idx) => {
      const sprite = spriteRefs.current[idx];
      if (!sprite) return;

      const flockIdx = idx % 3;
      const isVisible = flockVisibleRef.current[flockIdx];
      if (sprite.visible !== isVisible) {
        sprite.visible = isVisible;
      }
      if (!isVisible) return;

      const angle = bird.phase + t * bird.speed;
      const x = bird.orbitCenter[0] + Math.cos(angle) * bird.orbitRadius;
      const z = bird.orbitCenter[1] + Math.sin(angle) * bird.orbitRadius;
      const y = bird.altitude + Math.sin(t * 1.2 + bird.id) * 3.5;

      sprite.position.set(x, y, z);

      // Sinusoidal wing flap animation (scaling Y subtly)
      const flap = Math.sin(t * bird.flapSpeed + bird.id);
      const flapScaleY = bird.scale * 0.5 * (0.8 + flap * 0.4);
      sprite.scale.set(bird.scale, flapScaleY, 1);
    });
  });

  return (
    <group ref={groupRef}>
      {birds.map((b, idx) => (
        <sprite
          key={b.id}
          ref={(el) => {
            spriteRefs.current[idx] = el;
          }}
          position={[0, 0, 0]}
          scale={[b.scale, b.scale * 0.5, 1]}
        >
          <spriteMaterial map={texture} transparent opacity={0.92} depthWrite={false} fog={true} />
        </sprite>
      ))}
    </group>
  );
});
