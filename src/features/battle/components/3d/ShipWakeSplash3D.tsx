import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

/**
 * Procedural water splash droplet texture.
 */
function createSplashTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 28);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
  grad.addColorStop(0.35, 'rgba(240, 249, 255, 0.8)');
  grad.addColorStop(0.7, 'rgba(186, 230, 253, 0.35)');
  grad.addColorStop(1, 'rgba(186, 230, 253, 0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(32, 32, 28, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

let cachedSplashTexture: THREE.CanvasTexture | null = null;
function getSplashTexture(): THREE.CanvasTexture {
  if (!cachedSplashTexture) {
    cachedSplashTexture = createSplashTexture();
  }
  return cachedSplashTexture;
}

interface ShipWakeSplash3DProps {
  speed: number;
  rudderAngle?: number;
  shipLength?: number;
  shipWidth?: number;
  isSunk?: boolean;
}

/**
 * High-Performance Dynamic Stern Wake Spray & Churning Foam Particles.
 * Emits continuous, buttery-smooth water droplets & froth behind the ship's rudder.
 * Operates at 60-120fps with delta-time physics, eliminating all 30Hz tick stutter.
 */
export const ShipWakeSplash3D: React.FC<ShipWakeSplash3DProps> = React.memo(({
  speed,
  rudderAngle = 0,
  shipLength = 22,
  shipWidth = 6.0,
  isSunk = false,
}) => {
  const texture = useMemo(() => getSplashTexture(), []);
  const pointsRef = useRef<THREE.Points>(null);

  const count = 75; // Optimal particle budget per ship
  const particles = useRef<{
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    vz: number;
    life: number;
    maxLife: number;
    size: number;
  }[]>([]);

  // Initial buffer allocation
  const [positions, sizes] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const sz = new Float32Array(count);
    particles.current = [];

    for (let i = 0; i < count; i++) {
      particles.current.push({
        x: 0,
        y: -100, // offscreen until spawned
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 1.0,
        size: 0,
      });
      pos[i * 3 + 1] = -100;
      sz[i] = 0;
    }
    return [pos, sz];
  }, [count]);

  const emitAccumulator = useRef(0);

  useFrame((_, delta) => {
    if (!pointsRef.current || isSunk) return;

    const geo = pointsRef.current.geometry;
    const posAttr = geo.attributes.position as THREE.BufferAttribute;
    const szAttr = geo.attributes.size as THREE.BufferAttribute;
    const posArr = posAttr.array as Float32Array;
    const szArr = szAttr.array as Float32Array;

    const halfLen = shipLength * 0.5;
    const halfWid = shipWidth * 0.5;
    const sternZ = -halfLen * 0.95; // Behind the stern transom

    // Emission rate proportional to ship speed
    const currentSpeed = Math.max(0, speed);
    const emitRate = currentSpeed > 0.4 ? currentSpeed * 28 : 0; // particles per second
    emitAccumulator.current += emitRate * delta;

    while (emitAccumulator.current >= 1.0) {
      emitAccumulator.current -= 1.0;

      // Find an inactive or oldest particle
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
      // Rudder offset bias
      const rudderOffset = -rudderAngle * 1.2;
      const spreadX = (Math.random() - 0.5) * halfWid * 0.85 + rudderOffset;
      const spreadZ = sternZ - Math.random() * 1.5;

      p.x = spreadX;
      p.y = 0.15 + Math.random() * 0.25; // Waterline
      p.z = spreadZ;

      // Shoot spray backwards and laterally
      const lateralVel = spreadX * 0.9 + (Math.random() - 0.5) * 1.8;
      const backwardVel = -currentSpeed * 0.45 - Math.random() * 2.2;
      const upwardVel = 0.8 + Math.random() * 1.6 * Math.min(1.0, currentSpeed / 3.0);

      p.vx = lateralVel;
      p.vy = upwardVel;
      p.vz = backwardVel;

      p.maxLife = 0.55 + Math.random() * 0.55;
      p.life = p.maxLife;
      p.size = 1.4 + Math.random() * 1.2;
    }

    // Update active particles with gravity and drag
    const gravity = -4.5;
    const drag = Math.max(0, 1.0 - 1.8 * delta);

    for (let i = 0; i < count; i++) {
      const p = particles.current[i];
      if (p.life > 0) {
        p.life -= delta;

        p.x += p.vx * delta;
        p.y += p.vy * delta;
        p.z += p.vz * delta;

        p.vy += gravity * delta;
        p.vx *= drag;
        p.vz *= drag;

        // Fade out size as life ends
        const progress = 1.0 - (p.life / p.maxLife);
        const currentSz = p.size * (1.0 + progress * 0.8) * (1.0 - progress);

        posArr[i * 3] = p.x;
        posArr[i * 3 + 1] = Math.max(0.05, p.y);
        posArr[i * 3 + 2] = p.z;
        szArr[i] = currentSz;
      } else {
        posArr[i * 3 + 1] = -100;
        szArr[i] = 0;
      }
    }

    posAttr.needsUpdate = true;
    szAttr.needsUpdate = true;
  });

  if (isSunk) return null;

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-size"
          args={[sizes, 1]}
        />
      </bufferGeometry>
      <pointsMaterial
        map={texture}
        transparent
        depthWrite={false}
        blending={THREE.NormalBlending}
        opacity={0.82}
        color="#f0f9ff"
        size={2.2}
        sizeAttenuation
      />
    </points>
  );
});
