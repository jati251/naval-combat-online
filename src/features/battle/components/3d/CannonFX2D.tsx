import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '@/stores/useGameStore';
import { findShip } from '@/stores/selectors/shipLookup';
import { SHIP_PRESETS } from '@/types/game';
import { getBroadsideTransform } from '../../utils/navalCombatMath';
import {
  MAX_FLASH,
  MAX_SMOKE,
  MAX_SPARKS,
  MAX_WATER_PLUMES,
  MAX_FLASH_MOBILE,
  MAX_SMOKE_MOBILE,
  MAX_SPARKS_MOBILE,
  MAX_WATER_PLUMES_MOBILE,
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
export const CannonFX2D: React.FC<{ isMobile?: boolean }> = React.memo(({ isMobile = false }) => {
  // Resolve pool sizes once based on device tier
  const maxFlash = isMobile ? MAX_FLASH_MOBILE : MAX_FLASH;
  const maxSmoke = isMobile ? MAX_SMOKE_MOBILE : MAX_SMOKE;
  const maxSparks = isMobile ? MAX_SPARKS_MOBILE : MAX_SPARKS;
  const maxPlumes = isMobile ? MAX_WATER_PLUMES_MOBILE : MAX_WATER_PLUMES;

  const flashTex = useMemo(() => createMuzzleFlashTexture(), []);
  const smokeTex = useMemo(() => createGunpowderSmokeTexture(), []);
  const sparkTex = useMemo(() => createSparkTexture(), []);
  const plumeTex = useMemo(() => createWaterPlumeTexture(), []);

  const flashPool = useRef<FXParticle[]>(createParticlePool(maxFlash));
  const smokePool = useRef<FXParticle[]>(createParticlePool(maxSmoke));
  const sparkPool = useRef<FXParticle[]>(createParticlePool(maxSparks));
  const plumePool = useRef<FXParticle[]>(createParticlePool(maxPlumes));

  const flashPointsRef = useRef<THREE.Points>(null);
  const smokePointsRef = useRef<THREE.Points>(null);
  const sparkPointsRef = useRef<THREE.Points>(null);
  const plumePointsRef = useRef<THREE.Points>(null);

  const [flashPos, flashSz] = useMemo(() => [new Float32Array(maxFlash * 3), new Float32Array(maxFlash)], [maxFlash]);
  const [smokePos, smokeSz] = useMemo(() => [new Float32Array(maxSmoke * 3), new Float32Array(maxSmoke)], [maxSmoke]);
  const [sparkPos, sparkSz] = useMemo(() => [new Float32Array(maxSparks * 3), new Float32Array(maxSparks)], [maxSparks]);
  const [plumePos, plumeSz] = useMemo(() => [new Float32Array(maxPlumes * 3), new Float32Array(maxPlumes)], [maxPlumes]);

  const knownBallIds = useRef<Map<string, { x: number; y: number; z: number }>>(new Map());
  const processedFireEvents = useRef<Set<string>>(new Set());
  const lastShipBurstTime = useRef<Map<string, number>>(new Map());

  // Helper: Trigger dense volumetric muzzle smoke and flash along the ship's active battery
  const spawnBroadsideBurst = (shipId: string, side: 'left' | 'right') => {
    const now = performance.now();
    const lastBurst = lastShipBurstTime.current.get(shipId) || 0;
    // Debounce duplicate fire events within 350ms for the same ship to avoid particle storms
    if (now - lastBurst < 350) return;
    lastShipBurstTime.current.set(shipId, now);

    const { ships, selfId } = useGameStore.getState();
    const firingShip = findShip(ships, shipId);
    if (!firingShip) return;

    const isSelf = shipId === selfId;
    const shipCfg = SHIP_PRESETS[firingShip.shipClass] || SHIP_PRESETS.brig;
    const gunDeckY = firingShip.y + 1.8;

    // For player ship: full cinematic salvo; for bot/opponent ships: clean balanced emitters
    const numGuns = isSelf
      ? (isMobile ? Math.min(4, Math.max(2, Math.floor(shipCfg.length / 3.0))) : Math.min(8, Math.max(3, Math.floor(shipCfg.length / 2.2))))
      : (isMobile ? 2 : 3);

    for (let g = 0; g < numGuns; g++) {
      const relZ = (g - (numGuns - 1) * 0.5) * ((shipCfg.length * 0.6) / numGuns);
      const transform = getBroadsideTransform(firingShip.x, firingShip.z, firingShip.rotationY, side, shipCfg.width, relZ);
      const gx = transform.spawnX;
      const gy = gunDeckY + (Math.random() - 0.5) * 0.2;
      const gz = transform.spawnZ;

      const normX = transform.lateralX;
      const normZ = transform.lateralZ;

      // Bright muzzle explosion burst
      spawnFlash(flashPool.current, gx, gy, gz, isSelf ? 4.8 + Math.random() * 2.0 : 3.8);
      if (!isMobile && isSelf) {
        spawnSparks(sparkPool.current, gx, gy, gz, normX, normZ);
      }

      // Billowy smoke clouds per gun emitter (lean on opponents to prevent particle pool thrashing)
      const smokeCount = isSelf ? (isMobile ? 2 : (2 + Math.floor(Math.random() * 2))) : 1;
      for (let sm = 0; sm < smokeCount; sm++) {
        const outSpeed = 5.0 + Math.random() * 10.0;
        const svx = normX * outSpeed + (Math.random() - 0.5) * 3.5;
        const svy = 1.0 + Math.random() * 2.5;
        const svz = normZ * outSpeed + (Math.random() - 0.5) * 3.5;
        spawnSmoke(smokePool.current, gx, gy, gz, svx, svy, svz, 3.8 + Math.random() * 2.2);
      }
    }
  };

  const currentBallIds = useRef<Set<string>>(new Set());
  const frameCounter = useRef(0);

  useFrame((_, delta) => {
    frameCounter.current++;
    const { cannonballs, fireEvents } = useGameStore.getState();

    // 1. Check & Dispatch Fire Events (Instant Local & Network Firing Feedback)
    if (fireEvents.length > 0) {
      for (const ev of fireEvents) {
        if (!processedFireEvents.current.has(ev.id)) {
          processedFireEvents.current.add(ev.id);
          spawnBroadsideBurst(ev.ownerId, ev.side);
        }
      }
      // Prune processed events when exceeding limit by retaining only active ones
      if (processedFireEvents.current.size > 40) {
        const activeIds = new Set(fireEvents.map((e) => e.id));
        for (const id of processedFireEvents.current) {
          if (!activeIds.has(id)) {
            processedFireEvents.current.delete(id);
          }
        }
      }
    }

    // 2. Track Ball Flight Smoke Trails & Detect Impacts (Zero-Allocation Loop)
    currentBallIds.current.clear();
    const totalBalls = cannonballs.length;
    // Dynamic smoke ribbon throttling when many cannonballs are active
    const smokeInterval = totalBalls > 20 ? (isMobile ? 6 : 4) : (isMobile ? 4 : 2);
    const shouldSpawnBallSmoke = frameCounter.current % smokeInterval === 0;

    for (const b of cannonballs) {
      currentBallIds.current.add(b.id);
      let ballPos = knownBallIds.current.get(b.id);
      if (!ballPos) {
        ballPos = { x: b.x, y: b.y, z: b.z };
        knownBallIds.current.set(b.id, ballPos);
      } else {
        ballPos.x = b.x;
        ballPos.y = b.y;
        ballPos.z = b.z;
      }

      // Persistent smoke ribbon following each flying cannonball (throttled for high FPS)
      if (shouldSpawnBallSmoke) {
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
    }

    // Check vanished balls (impact with water or hit target)
    let plumesSpawnedThisFrame = 0;
    for (const [id, lastPos] of knownBallIds.current.entries()) {
      if (!currentBallIds.current.has(id)) {
        if (lastPos.y <= 1.8) {
          if (plumesSpawnedThisFrame < 3) {
            spawnWaterImpact(plumePool.current, smokePool.current, lastPos.x, lastPos.z);
            plumesSpawnedThisFrame++;
          }
        } else {
          spawnFlash(flashPool.current, lastPos.x, lastPos.y, lastPos.z, 4.5);
          const hitSmokeCount = isMobile ? 2 : 4;
          for (let sp = 0; sp < hitSmokeCount; sp++) {
            spawnSmoke(
              smokePool.current,
              lastPos.x,
              lastPos.y,
              lastPos.z,
              (Math.random() - 0.5) * 6.0,
              1.5 + Math.random() * 3.0,
              (Math.random() - 0.5) * 6.0,
              1.8
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

      for (let i = 0; i < maxSmoke; i++) {
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

      for (let i = 0; i < maxFlash; i++) {
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

      for (let i = 0; i < maxSparks; i++) {
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

      for (let i = 0; i < maxPlumes; i++) {
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
