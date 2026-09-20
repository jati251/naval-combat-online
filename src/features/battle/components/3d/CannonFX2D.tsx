import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '@/stores/useGameStore';
import { findShip } from '@/stores/selectors/shipLookup';
import { SHIP_PRESETS } from '@/types/game';
import { getBroadsideTransform } from '../../utils/navalCombatMath';
import { fireEventQueue } from '../../services/fireEventQueue';
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
  spawnHullImpactDebris,
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

  const flashLightRef = useRef<THREE.PointLight>(null);
  const flashLightIntensity = useRef(0);

  const flashPos = useMemo(() => new Float32Array(maxFlash * 3), [maxFlash]);
  const smokePos = useMemo(() => new Float32Array(maxSmoke * 3), [maxSmoke]);
  const sparkPos = useMemo(() => new Float32Array(maxSparks * 3), [maxSparks]);
  const plumePos = useMemo(() => new Float32Array(maxPlumes * 3), [maxPlumes]);

  const knownBallIds = useRef<Map<string, { x: number; y: number; z: number }>>(new Map());
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

    // Position dynamic warm muzzle flash light to illuminate the hull, rigging and ocean
    const midTransform = getBroadsideTransform(firingShip.x, firingShip.z, firingShip.rotationY, side, shipCfg.width * 0.9, 0);
    if (flashLightRef.current) {
      flashLightRef.current.position.set(midTransform.spawnX, gunDeckY + 0.8, midTransform.spawnZ);
      flashLightIntensity.current = isSelf ? 22.0 : 12.0;
    }

    // For player ship: full cinematic salvo; for bot/opponent ships: clean balanced emitters
    const numGuns = isSelf
      ? (isMobile ? Math.min(4, Math.max(2, Math.floor(shipCfg.length / 3.0))) : Math.min(6, Math.max(3, Math.floor(shipCfg.length / 2.4))))
      : (isMobile ? 2 : 3);

    for (let g = 0; g < numGuns; g++) {
      const relZ = (g - (numGuns - 1) * 0.5) * ((shipCfg.length * 0.6) / numGuns);
      const transform = getBroadsideTransform(firingShip.x, firingShip.z, firingShip.rotationY, side, shipCfg.width, relZ);
      const gx = transform.spawnX;
      const gy = gunDeckY + (Math.random() - 0.5) * 0.2;
      const gz = transform.spawnZ;
      const normX = Math.sin(transform.fireAngle);
      const normZ = Math.cos(transform.fireAngle);

      // Bright fiery muzzle flash point (high-contrast explosion starburst)
      spawnFlash(flashPool.current, gx, gy, gz, 7.5 + Math.random() * 3.5);

      // Gunpowder sparks & burning wad debris
      spawnSparks(sparkPool.current, gx, gy, gz, normX, normZ);

      // Billowy volumetric smoke clouds per gun emitter
      const smokeCount = isSelf ? (isMobile ? 2 : 3) : 1;
      for (let sm = 0; sm < smokeCount; sm++) {
        const outSpeed = 5.5 + Math.random() * 9.5;
        const svx = normX * outSpeed + (Math.random() - 0.5) * 3.5;
        const svy = 1.2 + Math.random() * 2.2;
        const svz = normZ * outSpeed + (Math.random() - 0.5) * 3.5;
        spawnSmoke(smokePool.current, gx, gy, gz, svx, svy, svz, 4.2 + Math.random() * 2.5);
      }
    }
  };

  const currentBallIds = useRef<Set<string>>(new Set());
  const frameCounter = useRef(0);

  useFrame((_, delta) => {
    frameCounter.current++;
    const { cannonballs } = useGameStore.getState();

    // Fade dynamic muzzle flash light
    if (flashLightRef.current) {
      if (flashLightIntensity.current > 0.02) {
        flashLightIntensity.current = Math.max(0, flashLightIntensity.current - delta * 42.0);
        flashLightRef.current.intensity = flashLightIntensity.current;
      } else {
        flashLightRef.current.intensity = 0;
      }
    }

    // 1. Check & Dispatch Fire Events (Instant Local & Network Firing Feedback via zero-overhead queue)
    const newFireEvents = fireEventQueue.drain();
    for (const ev of newFireEvents) {
      spawnBroadsideBurst(ev.ownerId, ev.side);
    }

    // 2. Track Ball Flight Smoke Trails & Detect Impacts (Zero-Allocation Loop)
    currentBallIds.current.clear();
    const totalBalls = cannonballs.length;
    // Dynamic smoke ribbon throttling when many cannonballs are active
    const smokeInterval = totalBalls > 15 ? (isMobile ? 7 : 5) : (isMobile ? 4 : 2);
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

      // Persistent smoke ribbon following flying cannonballs
      if (shouldSpawnBallSmoke && totalBalls <= 36) {
        spawnSmoke(
          smokePool.current,
          b.x - (b.vx ?? 0) * 0.03,
          b.y - (b.vy ?? 0) * 0.03,
          b.z - (b.vz ?? 0) * 0.03,
          (Math.random() - 0.5) * 0.3,
          0.25 + (Math.random() - 0.5) * 0.2,
          (Math.random() - 0.5) * 0.3,
          1.8 + Math.random() * 0.8
        );
      }

      // Micro-spark fiery tail behind flying cannonballs (every 2 frames)
      if (frameCounter.current % 2 === 0 && totalBalls <= 32) {
        const spLen = sparkPool.current.length;
        if (spLen > 0) {
          const slot = Math.floor(Math.random() * spLen);
          const p = sparkPool.current[slot];
          if (p && p.life <= 0) {
            p.x = b.x - (b.vx ?? 0) * 0.02 + (Math.random() - 0.5) * 0.3;
            p.y = b.y - (b.vy ?? 0) * 0.02 + (Math.random() - 0.5) * 0.3;
            p.z = b.z - (b.vz ?? 0) * 0.02 + (Math.random() - 0.5) * 0.3;
            p.vx = (Math.random() - 0.5) * 1.5;
            p.vy = 0.5 + Math.random() * 1.5;
            p.vz = (Math.random() - 0.5) * 1.5;
            p.maxLife = 0.25 + Math.random() * 0.2;
            p.life = p.maxLife;
            p.size = 1.2;
            p.growth = -0.4;
            p.opacity = 1.0;
          }
        }
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
          // Cannonball smashed into a ship hull: explosive wooden splinters, sparks & smoke
          spawnHullImpactDebris(
            flashPool.current,
            sparkPool.current,
            smokePool.current,
            lastPos.x,
            lastPos.y,
            lastPos.z
          );
        }
        knownBallIds.current.delete(id);
      }
    }

    // 3. Update GPU Particles Buffers with Compacted Draw Ranges (zero waste uploads)
    // A. Smoke Update
    if (smokePointsRef.current) {
      const geo = smokePointsRef.current.geometry;
      const posAttr = geo.attributes.position as THREE.BufferAttribute;
      const posArr = posAttr.array as Float32Array;

      let activeSmoke = 0;
      for (let i = 0; i < maxSmoke; i++) {
        const p = smokePool.current[i];
        if (p.life > 0) {
          p.life -= delta;
          p.x += p.vx * delta;
          p.y += p.vy * delta;
          p.z += p.vz * delta;
          p.vx *= 0.94;
          p.vz *= 0.94;
          p.vy = Math.max(0.15, p.vy * 0.96);

          posArr[activeSmoke * 3] = p.x;
          posArr[activeSmoke * 3 + 1] = Math.max(0.2, p.y);
          posArr[activeSmoke * 3 + 2] = p.z;
          activeSmoke++;
        }
      }
      geo.setDrawRange(0, activeSmoke);
      if (activeSmoke > 0) {
        posAttr.clearUpdateRanges();
        posAttr.addUpdateRange(0, activeSmoke * 3);
        posAttr.needsUpdate = true;
      }
    }

    // B. Flash Update
    if (flashPointsRef.current) {
      const geo = flashPointsRef.current.geometry;
      const posAttr = geo.attributes.position as THREE.BufferAttribute;
      const posArr = posAttr.array as Float32Array;

      let activeFlash = 0;
      for (let i = 0; i < maxFlash; i++) {
        const p = flashPool.current[i];
        if (p.life > 0) {
          p.life -= delta;
          posArr[activeFlash * 3] = p.x;
          posArr[activeFlash * 3 + 1] = p.y;
          posArr[activeFlash * 3 + 2] = p.z;
          activeFlash++;
        }
      }
      geo.setDrawRange(0, activeFlash);
      if (activeFlash > 0) {
        posAttr.clearUpdateRanges();
        posAttr.addUpdateRange(0, activeFlash * 3);
        posAttr.needsUpdate = true;
      }
    }

    // C. Sparks Update
    if (sparkPointsRef.current) {
      const geo = sparkPointsRef.current.geometry;
      const posAttr = geo.attributes.position as THREE.BufferAttribute;
      const posArr = posAttr.array as Float32Array;

      let activeSparks = 0;
      for (let i = 0; i < maxSparks; i++) {
        const p = sparkPool.current[i];
        if (p.life > 0) {
          p.life -= delta;
          p.x += p.vx * delta;
          p.y += p.vy * delta;
          p.z += p.vz * delta;
          p.vy -= 9.8 * delta;

          posArr[activeSparks * 3] = p.x;
          posArr[activeSparks * 3 + 1] = Math.max(0.1, p.y);
          posArr[activeSparks * 3 + 2] = p.z;
          activeSparks++;
        }
      }
      geo.setDrawRange(0, activeSparks);
      if (activeSparks > 0) {
        posAttr.clearUpdateRanges();
        posAttr.addUpdateRange(0, activeSparks * 3);
        posAttr.needsUpdate = true;
      }
    }

    // D. Water Plumes Update
    if (plumePointsRef.current) {
      const geo = plumePointsRef.current.geometry;
      const posAttr = geo.attributes.position as THREE.BufferAttribute;
      const posArr = posAttr.array as Float32Array;

      let activePlumes = 0;
      for (let i = 0; i < maxPlumes; i++) {
        const p = plumePool.current[i];
        if (p.life > 0) {
          p.life -= delta;
          p.y += p.vy * delta;
          p.vy -= 4.0 * delta;

          posArr[activePlumes * 3] = p.x;
          posArr[activePlumes * 3 + 1] = Math.max(0.4, p.y);
          posArr[activePlumes * 3 + 2] = p.z;
          activePlumes++;
        }
      }
      geo.setDrawRange(0, activePlumes);
      if (activePlumes > 0) {
        posAttr.clearUpdateRanges();
        posAttr.addUpdateRange(0, activePlumes * 3);
        posAttr.needsUpdate = true;
      }
    }
  });

  return (
    <group>
      {/* Dynamic Salvo Muzzle Flash Light (Illuminates hull, rigging and ocean) */}
      <pointLight
        ref={flashLightRef}
        color="#ffaa3b"
        intensity={0}
        distance={55}
        decay={2}
      />

      {/* 2D Billowy Gunpowder Smoke Clouds */}
      <points ref={smokePointsRef} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[smokePos, 3]} usage={THREE.DynamicDrawUsage} />
        </bufferGeometry>
        <pointsMaterial
          map={smokeTex}
          transparent
          depthWrite={false}
          blending={THREE.NormalBlending}
          opacity={0.88}
          color="#f1f5f9"
          size={7.5}
          sizeAttenuation
        />
      </points>

      {/* 2D Muzzle Flash Explosive Bursts */}
      <points ref={flashPointsRef} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[flashPos, 3]} usage={THREE.DynamicDrawUsage} />
        </bufferGeometry>
        <pointsMaterial
          map={flashTex}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          opacity={1.0}
          color="#ffffff"
          size={9.2}
          sizeAttenuation
        />
      </points>

      {/* 2D Flying Ember Sparks */}
      <points ref={sparkPointsRef} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[sparkPos, 3]} usage={THREE.DynamicDrawUsage} />
        </bufferGeometry>
        <pointsMaterial
          map={sparkTex}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          opacity={0.98}
          color="#fef08a"
          size={2.2}
          sizeAttenuation
        />
      </points>

      {/* 2D Vertical Water Splash Plumes */}
      <points ref={plumePointsRef} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[plumePos, 3]} usage={THREE.DynamicDrawUsage} />
        </bufferGeometry>
        <pointsMaterial
          map={plumeTex}
          transparent
          depthWrite={false}
          blending={THREE.NormalBlending}
          opacity={0.92}
          color="#f0f9ff"
          size={9.8}
          sizeAttenuation
        />
      </points>
    </group>
  );
});
