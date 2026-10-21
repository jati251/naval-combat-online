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
      pos[idx] = (Math.random() - 0.5) * 120;
      pos[idx + 1] = 1.5 + Math.random() * 8;
      pos[idx + 2] = (Math.random() - 0.5) * 120;

      offsets[idx] = Math.random() * Math.PI * 2;
      offsets[idx + 1] = 0.5 + Math.random() * 1.5; // vertical drift speed
      offsets[idx + 2] = 0.8 + Math.random() * 2.0; // wind drift speed
    }
    return [pos, offsets];
  }, [count]);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uWindDrift: { value: new THREE.Vector2(0, 0) },
    uCameraXZ: { value: new THREE.Vector2(0, 0) },
  }), []);

  const compileAtmosphereShader = useMemo(() => (shader: THREE.WebGLProgramParametersWithUniforms) => {
    shader.uniforms.uTime = uniforms.uTime;
    shader.uniforms.uWindDrift = uniforms.uWindDrift;
    shader.uniforms.uCameraXZ = uniforms.uCameraXZ;
    shader.vertexShader = `attribute vec3 aOffset;\nuniform float uTime;\nuniform vec2 uWindDrift;\nuniform vec2 uCameraXZ;\n` + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `vec3 transformed = vec3(
        mod(position.x + uWindDrift.x * aOffset.z - uCameraXZ.x + 60.0, 120.0) - 60.0,
        position.y + sin(uTime * aOffset.y + aOffset.x) * 0.85,
        mod(position.z + uWindDrift.y * aOffset.z - uCameraXZ.y + 60.0, 120.0) - 60.0
      );`
    );
  }, [uniforms]);

  useFrame((state, delta) => {
    if (!pointsRef.current) return;

    const camX = state.camera.position.x;
    const camZ = state.camera.position.z;
    pointsRef.current.position.x = camX;
    pointsRef.current.position.z = camZ;

    const dt = Math.min(delta, 0.1);
    const store = useGameStore.getState();
    const windAngle = store.windAngle;
    const speedMult = Math.max(2.5, (store.windSpeed || 10) * 0.35);

    uniforms.uTime.value = state.clock.elapsedTime;
    uniforms.uWindDrift.value.x -= Math.sin(windAngle) * speedMult * dt;
    uniforms.uWindDrift.value.y -= Math.cos(windAngle) * speedMult * dt;
    uniforms.uCameraXZ.value.set(camX, camZ);
  });

  const timeOfDay = useGameStore((s) => s.timeOfDay);
  const isNight = timeOfDay === 'NIGHT';

  return (
    <points ref={pointsRef} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-aOffset"
          args={[initialOffsets, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        onBeforeCompile={compileAtmosphereShader}
        customProgramCacheKey={() => 'ocean-atmosphere-particles-v1'}
        map={texture}
        size={isNight ? 0.22 : 0.16}
        transparent
        opacity={isNight ? 0.55 : 0.42}
        depthWrite={false}
        blending={THREE.NormalBlending}
        color={isNight ? '#657c89' : '#d0dbd5'}
        fog={true}
      />
    </points>
  );
});
