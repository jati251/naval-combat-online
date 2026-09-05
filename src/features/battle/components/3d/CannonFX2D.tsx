import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '@/stores/useGameStore';
import { SHIP_PRESETS, type CannonballSnapshot } from '@/types/game';
import {
  MAX_FLASH,
  MAX_SMOKE,
  MAX_SPARKS,
  MAX_WATER_PLUMES,
  type FXParticle,
  createParticlePool,
  spawnSmoke,
  spawnFlash,
  spawnSparks,
  spawnWaterImpact,
  createMuzzleFlashTexture,
  createGunpowderSmokeTexture,
  createSparkTexture,
  createWaterPlumeTexture,
} from './cannon';

/**
 * High-performance GPU Point-Billboard 2D Particle System for Naval Cannon Combat
 * Includes Muzzle Flash, Volumetric Gunpowder Smoke Clouds, and Ballistic Smoke Trails.
 * Frustum-culling disabled ensures particles are always rendered anywhere on the ocean.
 */
export const CannonFX2D: React.FC = React.memo(() => {
  const flashTex = useMemo(() => createMuzzleFlashTexture(), []);
  const smokeTex = useMemo(() => createGunpowderSmokeTexture(), []);
  const sparkTex = useMemo(() => createSparkTexture(), []);
  const plumeTex = useMemo(() => createWaterPlumeTexture(), []);

  const flashPool = useRef<FXParticle[]>(createParticlePool(MAX_FLASH));
  const smokePool = useRef<FXParticle[]>(createParticlePool(MAX_SMOKE));
  const sparkPool = useRef<FXParticle[]>(createParticlePool(MAX_SPARKS));
  const plumePool = useRef<FXParticle[]>(createParticlePool(MAX_WATER_PLUMES));

  const flashPointsRef = useRef<THREE.Points>(null);
  const smokePointsRef = useRef<THREE.Points>(null);
  const sparkPointsRef = useRef<THREE.Points>(null);
  const plumePointsRef = useRef<THREE.Points>(null);

  const [flashPos, flashSz] = useMemo(() => [new Float32Array(MAX_FLASH * 3), new Float32Array(MAX_FLASH)], []);
  const [smokePos, smokeSz] = useMemo(() => [new Float32Array(MAX_SMOKE * 3), new Float32Array(MAX_SMOKE)], []);
  const [sparkPos, sparkSz] = useMemo(() => [new Float32Array(MAX_SPARKS * 3), new Float32Array(MAX_SPARKS)], []);
  const [plumePos, plumeSz] = useMemo(() => [new Float32Array(MAX_WATER_PLUMES * 3), new Float32Array(MAX_WATER_PLUMES)], []);

  const knownBallIds = useRef<Map<string, { x: number; y: number; z: number }>>(new Map());
  const processedFireEvents = useRef<Set<string>>(new Set());

  // Helper: Trigger dense volumetric muzzle smoke and flash along the ship's active battery
  const spawnBroadsideBurst = (shipId: string, side: 'port' | 'starboard') => {
    const { ships } = useGameStore.getState();
    const firingShip = ships.find((s) => s.id === shipId);
    if (!firingShip) return;

    const shipCfg = SHIP_PRESETS[firingShip.shipClass] || SHIP_PRESETS.brig;
    const heading = firingShip.rotationY;
    const sinH = Math.sin(heading);
    const cosH = Math.cos(heading);
    const sideSign = side === 'port' ? -1 : 1;
    const halfWid = shipCfg.width * 0.5 + 0.5;
    const gunDeckY = firingShip.y + 1.8;

    const numGuns = Math.min(16, Math.max(3, Math.floor(shipCfg.length / 2.0)));
    for (let g = 0; g < numGuns; g++) {
      const relZ = (g - (numGuns - 1) * 0.5) * ((shipCfg.length * 0.6) / numGuns);
      const gx = firingShip.x + (cosH * sideSign * halfWid + sinH * relZ);
      const gy = gunDeckY + (Math.random() - 0.5) * 0.3;
      const gz = firingShip.z + (-sinH * sideSign * halfWid + cosH * relZ);

      const normX = cosH * sideSign;
      const normZ = -sinH * sideSign;

      // Bright muzzle explosion burst
      spawnFlash(flashPool.current, gx, gy, gz, 5.0 + Math.random() * 2.5);
      spawnSparks(sparkPool.current, gx, gy, gz, normX, normZ);

      // Thick billowing gunpowder smoke cloud (5-8 clouds per barrel)
      const smokeCount = 6 + Math.floor(Math.random() * 4);
      for (let sm = 0; sm < smokeCount; sm++) {
        const outSpeed = 6.0 + Math.random() * 12.0;
        const svx = normX * outSpeed + (Math.random() - 0.5) * 4.5;
        const svy = 1.2 + Math.random() * 3.2;
        const svz = normZ * outSpeed + (Math.random() - 0.5) * 4.5;
        spawnSmoke(smokePool.current, gx, gy, gz, svx, svy, svz, 4.0 + Math.random() * 2.8);
      }
    }
  };

  useFrame((_, delta) => {
    const { cannonballs, fireEvents } = useGameStore.getState();

    // 1. Check & Dispatch Fire Events (Instant Local & Network Firing Feedback)
    if (fireEvents.length > 0) {
      for (const ev of fireEvents) {
        if (!processedFireEvents.current.has(ev.id)) {
          processedFireEvents.current.add(ev.id);
          spawnBroadsideBurst(ev.ownerId, ev.side);
        }
      }
      // Prune processed event set to prevent memory growth
      if (processedFireEvents.current.size > 50) {
        processedFireEvents.current.clear();
      }
    }

    // 2. Track Ball Flight Smoke Trails & Detect Impacts
    const currentBallMap = new Map<string, CannonballSnapshot>();
    for (const b of cannonballs) {
      currentBallMap.set(b.id, b);
      knownBallIds.current.set(b.id, { x: b.x, y: b.y, z: b.z });

      // Persistent smoke ribbon following each flying cannonball
      spawnSmoke(
        smokePool.current,
        b.x - (b.vx ?? 0) * 0.03,
        b.y - (b.vy ?? 0) * 0.03,
        b.z - (b.vz ?? 0) * 0.03,
        (Math.random() - 0.5) * 0.3,
        0.2 + (Math.random() - 0.5) * 0.2,
        (Math.random() - 0.5) * 0.3,
        1.5 + Math.random() * 0.8
      );
    }

    // Check vanished balls (impact with water or hit target)
    for (const [id, lastPos] of knownBallIds.current.entries()) {
      if (!currentBallMap.has(id)) {
        if (lastPos.y <= 1.8) {
          spawnWaterImpact(plumePool.current, smokePool.current, lastPos.x, lastPos.z);
        } else {
          spawnFlash(flashPool.current, lastPos.x, lastPos.y, lastPos.z, 5.0);
          for (let sp = 0; sp < 14; sp++) {
            spawnSmoke(
              smokePool.current,
              lastPos.x,
              lastPos.y,
              lastPos.z,
              (Math.random() - 0.5) * 8.0,
              2.0 + Math.random() * 5.0,
              (Math.random() - 0.5) * 8.0,
              2.2
            );
          }
        }
        knownBallIds.current.delete(id);
      }
    }

    // 3. Update GPU Particles Buffers
    // A. Smoke Update
    if (smokePointsRef.current) {
      const geo = smokePointsRef.current.geometry;
      const posAttr = geo.attributes.position as THREE.BufferAttribute;
      const szAttr = geo.attributes.size as THREE.BufferAttribute;
      const posArr = posAttr.array as Float32Array;
      const szArr = szAttr.array as Float32Array;

      for (let i = 0; i < MAX_SMOKE; i++) {
        const p = smokePool.current[i];
        if (p.life > 0) {
          p.life -= delta;
          const prog = 1.0 - p.life / p.maxLife;

          // Drag / deceleration & expansion
          p.x += p.vx * delta;
          p.y += p.vy * delta;
          p.z += p.vz * delta;
          p.vx *= 0.94;
          p.vz *= 0.94;
          p.vy = Math.max(0.15, p.vy * 0.96);

          posArr[i * 3] = p.x;
          posArr[i * 3 + 1] = Math.max(0.2, p.y);
          posArr[i * 3 + 2] = p.z;
          szArr[i] = p.size * (1.0 + prog * p.growth);
        } else {
          posArr[i * 3 + 1] = -500;
          szArr[i] = 0;
        }
      }
      posAttr.needsUpdate = true;
      szAttr.needsUpdate = true;
    }

    // B. Flash Update
    if (flashPointsRef.current) {
      const geo = flashPointsRef.current.geometry;
      const posAttr = geo.attributes.position as THREE.BufferAttribute;
      const szAttr = geo.attributes.size as THREE.BufferAttribute;
      const posArr = posAttr.array as Float32Array;
      const szArr = szAttr.array as Float32Array;

      for (let i = 0; i < MAX_FLASH; i++) {
        const p = flashPool.current[i];
        if (p.life > 0) {
          p.life -= delta;
          posArr[i * 3] = p.x;
          posArr[i * 3 + 1] = p.y;
          posArr[i * 3 + 2] = p.z;
          szArr[i] = p.size * (1.0 + (1.0 - p.life / p.maxLife) * p.growth);
        } else {
          posArr[i * 3 + 1] = -500;
          szArr[i] = 0;
        }
      }
      posAttr.needsUpdate = true;
      szAttr.needsUpdate = true;
    }

    // C. Sparks Update
    if (sparkPointsRef.current) {
      const geo = sparkPointsRef.current.geometry;
      const posAttr = geo.attributes.position as THREE.BufferAttribute;
      const szAttr = geo.attributes.size as THREE.BufferAttribute;
      const posArr = posAttr.array as Float32Array;
      const szArr = szAttr.array as Float32Array;

      for (let i = 0; i < MAX_SPARKS; i++) {
        const p = sparkPool.current[i];
        if (p.life > 0) {
          p.life -= delta;
          p.x += p.vx * delta;
          p.y += p.vy * delta;
          p.z += p.vz * delta;
          p.vy -= 9.8 * delta;

          posArr[i * 3] = p.x;
          posArr[i * 3 + 1] = Math.max(0.1, p.y);
          posArr[i * 3 + 2] = p.z;
          szArr[i] = Math.max(0.2, p.size * (p.life / p.maxLife));
        } else {
          posArr[i * 3 + 1] = -500;
          szArr[i] = 0;
        }
      }
      posAttr.needsUpdate = true;
      szAttr.needsUpdate = true;
    }

    // D. Water Plumes Update
    if (plumePointsRef.current) {
      const geo = plumePointsRef.current.geometry;
      const posAttr = geo.attributes.position as THREE.BufferAttribute;
      const szAttr = geo.attributes.size as THREE.BufferAttribute;
      const posArr = posAttr.array as Float32Array;
      const szArr = szAttr.array as Float32Array;

      for (let i = 0; i < MAX_WATER_PLUMES; i++) {
        const p = plumePool.current[i];
        if (p.life > 0) {
          p.life -= delta;
          const prog = 1.0 - p.life / p.maxLife;
          p.y += p.vy * delta;
          p.vy -= 4.0 * delta;

          posArr[i * 3] = p.x;
          posArr[i * 3 + 1] = Math.max(0.4, p.y);
          posArr[i * 3 + 2] = p.z;
          szArr[i] = p.size * (1.0 + prog * 1.5) * (1.0 - prog * 0.5);
        } else {
          posArr[i * 3 + 1] = -500;
          szArr[i] = 0;
        }
      }
      posAttr.needsUpdate = true;
      szAttr.needsUpdate = true;
    }
  });

  return (
    <group>
      {/* 2D Billowy Gunpowder Smoke Clouds */}
      <points ref={smokePointsRef} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[smokePos, 3]} />
          <bufferAttribute attach="attributes-size" args={[smokeSz, 1]} />
        </bufferGeometry>
        <pointsMaterial
          map={smokeTex}
          transparent
          depthWrite={false}
          blending={THREE.NormalBlending}
          opacity={0.85}
          color="#f1f5f9"
          size={6.0}
          sizeAttenuation
        />
      </points>

      {/* 2D Muzzle Flash Explosive Bursts */}
      <points ref={flashPointsRef} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[flashPos, 3]} />
          <bufferAttribute attach="attributes-size" args={[flashSz, 1]} />
        </bufferGeometry>
        <pointsMaterial
          map={flashTex}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          opacity={1.0}
          color="#ffffff"
          size={7.5}
          sizeAttenuation
        />
      </points>

      {/* 2D Flying Ember Sparks */}
      <points ref={sparkPointsRef} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[sparkPos, 3]} />
          <bufferAttribute attach="attributes-size" args={[sparkSz, 1]} />
        </bufferGeometry>
        <pointsMaterial
          map={sparkTex}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          opacity={0.95}
          color="#fef08a"
          size={1.8}
          sizeAttenuation
        />
      </points>

      {/* 2D Vertical Water Splash Plumes */}
      <points ref={plumePointsRef} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[plumePos, 3]} />
          <bufferAttribute attach="attributes-size" args={[plumeSz, 1]} />
        </bufferGeometry>
        <pointsMaterial
          map={plumeTex}
          transparent
          depthWrite={false}
          blending={THREE.NormalBlending}
          opacity={0.9}
          color="#f0f9ff"
          size={8.5}
          sizeAttenuation
        />
      </points>
    </group>
  );
});
