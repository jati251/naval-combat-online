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
  const lastBallCount = useRef(0);

  useFrame((_, delta) => {
    const { cannonballs, ships } = useGameStore.getState();

    // 1. Detect Newly Fired Cannonballs → Trigger Broadside Muzzle Flash & Smoke
    if (cannonballs.length > lastBallCount.current) {
      for (const ball of cannonballs) {
        if (!knownBallIds.current.has(ball.id)) {
          const firingShip = ships.find((s) => s.id === ball.ownerId);
          if (firingShip) {
            const shipCfg = SHIP_PRESETS[firingShip.shipClass] || SHIP_PRESETS.brig;
            const heading = firingShip.rotationY;
            const sinH = Math.sin(heading);
            const cosH = Math.cos(heading);

            const ballVelAngle = Math.atan2(ball.vx, ball.vz);
            const angleRelToShip = ballVelAngle - heading;
            const isPort = Math.sin(angleRelToShip) < 0;

            const sideSign = isPort ? -1 : 1;
            const halfWid = shipCfg.width * 0.5 + 0.4;
            const gunDeckY = firingShip.y + 1.8;

            const numGuns = Math.min(8, Math.max(3, Math.floor(shipCfg.length / 4)));
            for (let g = 0; g < numGuns; g++) {
              const relZ = (g - (numGuns - 1) * 0.5) * 2.4;
              const gx = firingShip.x + (cosH * sideSign * halfWid + sinH * relZ);
              const gy = gunDeckY + (Math.random() - 0.5) * 0.4;
              const gz = firingShip.z + (-sinH * sideSign * halfWid + cosH * relZ);

              const normX = cosH * sideSign;
              const normZ = -sinH * sideSign;

              spawnFlash(flashPool.current, gx, gy, gz, 3.2 + Math.random() * 1.5);
              spawnSparks(sparkPool.current, gx, gy, gz, normX, normZ);

              const smokeCount = 3 + Math.floor(Math.random() * 2);
              for (let sm = 0; sm < smokeCount; sm++) {
                const outSpeed = 4.0 + Math.random() * 8.0;
                const svx = normX * outSpeed + (Math.random() - 0.5) * 3.0;
                const svy = 0.8 + Math.random() * 2.2;
                const svz = normZ * outSpeed + (Math.random() - 0.5) * 3.0;
                spawnSmoke(smokePool.current, gx, gy, gz, svx, svy, svz, 2.2 + Math.random() * 1.8);
              }
            }
          }
        }
      }
    }

    // 2. Track Ball Flight Smoke Trails & Detect Impacts
    const currentBallMap = new Map<string, CannonballSnapshot>();
    for (const b of cannonballs) {
      currentBallMap.set(b.id, b);
      knownBallIds.current.set(b.id, { x: b.x, y: b.y, z: b.z });

      if (Math.random() < 0.75) {
        spawnSmoke(
          smokePool.current,
          b.x - (b.vx ?? 0) * 0.025,
          b.y - (b.vy ?? 0) * 0.025,
          b.z - (b.vz ?? 0) * 0.025,
          (Math.random() - 0.5) * 0.4,
          (Math.random() - 0.5) * 0.2,
          (Math.random() - 0.5) * 0.4,
          0.8 + Math.random() * 0.5
        );
      }
    }

    // Check vanished balls
    for (const [id, lastPos] of knownBallIds.current.entries()) {
      if (!currentBallMap.has(id)) {
        if (lastPos.y <= 1.5) {
          spawnWaterImpact(plumePool.current, smokePool.current, lastPos.x, lastPos.z);
        } else {
          spawnFlash(flashPool.current, lastPos.x, lastPos.y, lastPos.z, 4.5);
          for (let sp = 0; sp < 12; sp++) {
            spawnSmoke(
              smokePool.current,
              lastPos.x,
              lastPos.y,
              lastPos.z,
              (Math.random() - 0.5) * 8.0,
              2.0 + Math.random() * 5.0,
              (Math.random() - 0.5) * 8.0,
              1.8
            );
          }
        }
        knownBallIds.current.delete(id);
      }
    }
    lastBallCount.current = cannonballs.length;

    // 3. Update Flash Pool
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
          const prog = 1.0 - p.life / p.maxLife;
          posArr[i * 3] = p.x;
          posArr[i * 3 + 1] = p.y;
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

    // 4. Update Smoke Pool
    if (smokePointsRef.current) {
      const geo = smokePointsRef.current.geometry;
      const posAttr = geo.attributes.position as THREE.BufferAttribute;
      const szAttr = geo.attributes.size as THREE.BufferAttribute;
      const posArr = posAttr.array as Float32Array;
      const szArr = szAttr.array as Float32Array;

      const drag = Math.max(0, 1.0 - 1.2 * delta);

      for (let i = 0; i < MAX_SMOKE; i++) {
        const p = smokePool.current[i];
        if (p.life > 0) {
          p.life -= delta;
          const prog = 1.0 - p.life / p.maxLife;

          p.x += p.vx * delta;
          p.y += p.vy * delta;
          p.z += p.vz * delta;

          p.vx *= drag;
          p.vz *= drag;
          p.vy = Math.max(0.2, p.vy * drag + 0.4 * delta);

          posArr[i * 3] = p.x;
          posArr[i * 3 + 1] = p.y;
          posArr[i * 3 + 2] = p.z;
          szArr[i] = p.size + prog * p.growth * 3.5;
        } else {
          posArr[i * 3 + 1] = -500;
          szArr[i] = 0;
        }
      }
      posAttr.needsUpdate = true;
      szAttr.needsUpdate = true;
    }

    // 5. Update Sparks Pool
    if (sparkPointsRef.current) {
      const geo = sparkPointsRef.current.geometry;
      const posAttr = geo.attributes.position as THREE.BufferAttribute;
      const szAttr = geo.attributes.size as THREE.BufferAttribute;
      const posArr = posAttr.array as Float32Array;
      const szArr = szAttr.array as Float32Array;

      const gravity = -12.0;

      for (let i = 0; i < MAX_SPARKS; i++) {
        const p = sparkPool.current[i];
        if (p.life > 0) {
          p.life -= delta;
          p.x += p.vx * delta;
          p.y += p.vy * delta;
          p.z += p.vz * delta;
          p.vy += gravity * delta;

          posArr[i * 3] = p.x;
          posArr[i * 3 + 1] = p.y;
          posArr[i * 3 + 2] = p.z;
          szArr[i] = p.size * (p.life / p.maxLife);
        } else {
          posArr[i * 3 + 1] = -500;
          szArr[i] = 0;
        }
      }
      posAttr.needsUpdate = true;
      szAttr.needsUpdate = true;
    }

    // 6. Update Water Plumes Pool
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
      <points ref={smokePointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[smokePos, 3]} />
          <bufferAttribute attach="attributes-size" args={[smokeSz, 1]} />
        </bufferGeometry>
        <pointsMaterial
          map={smokeTex}
          transparent
          depthWrite={false}
          blending={THREE.NormalBlending}
          opacity={0.78}
          color="#f1f5f9"
          size={5.5}
          sizeAttenuation
        />
      </points>

      {/* 2D Muzzle Flash Explosive Bursts */}
      <points ref={flashPointsRef}>
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
          size={7.0}
          sizeAttenuation
        />
      </points>

      {/* 2D Flying Ember Sparks */}
      <points ref={sparkPointsRef}>
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
          size={1.6}
          sizeAttenuation
        />
      </points>

      {/* 2D Vertical Water Splash Plumes */}
      <points ref={plumePointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[plumePos, 3]} />
          <bufferAttribute attach="attributes-size" args={[plumeSz, 1]} />
        </bufferGeometry>
        <pointsMaterial
          map={plumeTex}
          transparent
          depthWrite={false}
          blending={THREE.NormalBlending}
          opacity={0.88}
          color="#f0f9ff"
          size={8.0}
          sizeAttenuation
        />
      </points>
    </group>
  );
});
