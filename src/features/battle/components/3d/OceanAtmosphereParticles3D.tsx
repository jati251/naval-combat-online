import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '@/stores/useGameStore';

/**
 * Procedural circular soft sparkle particle texture.
 */
function createParticleTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
  grad.addColorStop(0.3, 'rgba(224, 242, 254, 0.8)');
  grad.addColorStop(0.7, 'rgba(186, 230, 253, 0.3)');
  grad.addColorStop(1, 'rgba(186, 230, 253, 0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(32, 32, 30, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

let cachedParticleTexture: THREE.CanvasTexture | null = null;
function getParticleTexture(): THREE.CanvasTexture {
  if (!cachedParticleTexture) {
    cachedParticleTexture = createParticleTexture();
  }
  return cachedParticleTexture;
}

/**
 * Ultra-Lightweight Ambient Sea Spray & Sunlit Marine Particles
 * 200 sparkling water droplets & golden sun motes floating around the ship.
 */
export const OceanAtmosphereParticles3D: React.FC<{ isMobile?: boolean; particleCount?: number }> = React.memo(({ isMobile = false, particleCount }) => {
  const texture = useMemo(() => getParticleTexture(), []);
  const pointsRef = useRef<THREE.Points>(null);
  const count = particleCount ?? (isMobile ? 80 : 180);

  const [positions, initialOffsets] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const offsets = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      const x = (Math.random() - 0.5) * 120;
      const y = 1.5 + Math.random() * 22;
      const z = (Math.random() - 0.5) * 120;
      pos[idx] = x;
      pos[idx + 1] = y;
      pos[idx + 2] = z;

      offsets[idx] = Math.random() * Math.PI * 2;
      offsets[idx + 1] = 0.5 + Math.random() * 1.5; // vertical drift speed
      offsets[idx + 2] = 0.8 + Math.random() * 2.0; // wind drift speed
    }
    return [pos, offsets];
  }, [count]);

  useFrame((state, delta) => {
    if (!pointsRef.current) return;

    // Follow camera horizontally so particles are always surrounding the player's ship
    pointsRef.current.position.x = state.camera.position.x;
    pointsRef.current.position.z = state.camera.position.z;

    const geo = pointsRef.current.geometry;
    const posAttr = geo.attributes.position as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;

    const windAngle = useGameStore.getState().windAngle;
    const windSpeed = useGameStore.getState().windSpeed;
    // Breeze blows towards (windAngle + Math.PI)
    const blowX = Math.sin(windAngle + Math.PI);
    const blowZ = Math.cos(windAngle + Math.PI);
    const speedMult = Math.max(2.5, (windSpeed || 10) * 0.35);

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      const speed = speedMult * initialOffsets[idx + 2];
      // Physical wind drift
      arr[idx] += blowX * speed * delta;
      arr[idx + 1] += Math.sin(state.clock.getElapsedTime() + initialOffsets[idx]) * delta * 1.0;
      arr[idx + 2] += blowZ * speed * delta;

      // Wrap boundaries around camera
      if (arr[idx] > 60) arr[idx] -= 120;
      if (arr[idx] < -60) arr[idx] += 120;
      if (arr[idx + 2] > 60) arr[idx + 2] -= 120;
      if (arr[idx + 2] < -60) arr[idx + 2] += 120;
    }
    posAttr.needsUpdate = true;
  });

  const timeOfDay = useGameStore((s) => s.timeOfDay);
  const isNight = timeOfDay === 'NIGHT';

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
        size={isNight ? 0.22 : 0.16}
        transparent
        opacity={isNight ? 0.55 : 0.42}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        color={isNight ? '#67e8f9' : '#fffbeb'}
        fog={true}
      />
    </points>
  );
});
