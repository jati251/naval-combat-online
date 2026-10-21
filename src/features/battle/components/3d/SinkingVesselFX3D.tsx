import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '@/stores/useGameStore';
import {
  sinkingEventQueue,
  sinkingShipTracker,
} from '../../services/sinkingEventQueue';
import {
  type FXParticle,
  createParticlePool,
  createSparkTexture,
} from './cannon';
import {
  createRagingFlameTexture,
  createDenseBlackSmokeTexture,
  createExplosionDetonationTexture,
  createSteamVaporTexture,
} from './cannon/sinkingTextures';
import {
  compileParticleAppearance,
  writeParticleAppearance,
} from './cannon/particleAppearance';

interface SinkingVesselFX3DProps {
  isMobile?: boolean;
}

const MAX_EXPLOSIONS = 50;
const MAX_FIRE = 220;
const MAX_SMOKE = 320;
const MAX_SPARKS = 140;
const MAX_STEAM = 80;

const MAX_EXPLOSIONS_MOBILE = 25;
const MAX_FIRE_MOBILE = 90;
const MAX_SMOKE_MOBILE = 140;
const MAX_SPARKS_MOBILE = 60;
const MAX_STEAM_MOBILE = 40;

interface PendingDetonation {
  shipId: string;
  x: number;
  y: number;
  z: number;
  fwdX: number;
  fwdZ: number;
  offset: number;
  triggerTime: number;
  scale: number;
  isSelf: boolean;
}

export const SinkingVesselFX3D: React.FC<SinkingVesselFX3DProps> = React.memo(
  ({ isMobile = false }) => {
    const maxExplosions = isMobile ? MAX_EXPLOSIONS_MOBILE : MAX_EXPLOSIONS;
    const maxFire = isMobile ? MAX_FIRE_MOBILE : MAX_FIRE;
    const maxSmoke = isMobile ? MAX_SMOKE_MOBILE : MAX_SMOKE;
    const maxSparks = isMobile ? MAX_SPARKS_MOBILE : MAX_SPARKS;
    const maxSteam = isMobile ? MAX_STEAM_MOBILE : MAX_STEAM;

    const explosionTex = useMemo(() => createExplosionDetonationTexture(), []);
    const fireTex = useMemo(() => createRagingFlameTexture(), []);
    const smokeTex = useMemo(() => createDenseBlackSmokeTexture(), []);
    const sparkTex = useMemo(() => createSparkTexture(), []);
    const steamTex = useMemo(() => createSteamVaporTexture(), []);

    const explosionPool = useRef<FXParticle[]>(createParticlePool(maxExplosions));
    const firePool = useRef<FXParticle[]>(createParticlePool(maxFire));
    const smokePool = useRef<FXParticle[]>(createParticlePool(maxSmoke));
    const sparkPool = useRef<FXParticle[]>(createParticlePool(maxSparks));
    const steamPool = useRef<FXParticle[]>(createParticlePool(maxSteam));

    const explosionPointsRef = useRef<THREE.Points>(null);
    const firePointsRef = useRef<THREE.Points>(null);
    const smokePointsRef = useRef<THREE.Points>(null);
    const sparkPointsRef = useRef<THREE.Points>(null);
    const steamPointsRef = useRef<THREE.Points>(null);

    const fireLightRef = useRef<THREE.PointLight>(null);
    const fireLightIntensity = useRef(0);

    const explosionStyle = useMemo(() => new Float32Array(maxExplosions * 2), [maxExplosions]);
    const explosionPos = useMemo(() => new Float32Array(maxExplosions * 3), [maxExplosions]);
    const fireStyle = useMemo(() => new Float32Array(maxFire * 2), [maxFire]);
    const firePos = useMemo(() => new Float32Array(maxFire * 3), [maxFire]);
    const smokeStyle = useMemo(() => new Float32Array(maxSmoke * 2), [maxSmoke]);
    const smokePos = useMemo(() => new Float32Array(maxSmoke * 3), [maxSmoke]);
    const sparkStyle = useMemo(() => new Float32Array(maxSparks * 2), [maxSparks]);
    const sparkPos = useMemo(() => new Float32Array(maxSparks * 3), [maxSparks]);
    const steamStyle = useMemo(() => new Float32Array(maxSteam * 2), [maxSteam]);
    const steamPos = useMemo(() => new Float32Array(maxSteam * 3), [maxSteam]);

    const pendingDetonations = useRef<PendingDetonation[]>([]);
    const explosionCursor = useRef(0);
    const fireCursor = useRef(0);
    const smokeCursor = useRef(0);
    const sparkCursor = useRef(0);
    const steamCursor = useRef(0);

    const frameCounter = useRef(0);

    const spawnExplosionBurst = (
      x: number,
      y: number,
      z: number,
      size: number
    ) => {
      const len = explosionPool.current.length;
      if (len === 0) return;
      const slot = explosionCursor.current;
      explosionCursor.current = (slot + 1) % len;
      const p = explosionPool.current[slot];
      if (!p) return;

      p.x = x + (Math.random() - 0.5) * 1.5;
      p.y = y + Math.random() * 1.2;
      p.z = z + (Math.random() - 0.5) * 1.5;
      p.vx = (Math.random() - 0.5) * 1.2;
      p.vy = 1.0 + Math.random() * 2.0;
      p.vz = (Math.random() - 0.5) * 1.2;
      p.maxLife = 0.45 + Math.random() * 0.25;
      p.life = p.maxLife;
      p.size = size * (1.1 + Math.random() * 0.4);
      p.growth = 4.5;
      p.opacity = 1.0;

      // Spawn initial blast sparks
      const sparkLen = sparkPool.current.length;
      if (sparkLen > 0) {
        const count = isMobile ? 8 : 14;
        for (let s = 0; s < count; s++) {
          const sSlot = sparkCursor.current;
          sparkCursor.current = (sSlot + 1) % sparkLen;
          const sp = sparkPool.current[sSlot];
          if (!sp) continue;
          sp.x = x;
          sp.y = y;
          sp.z = z;
          const angle = Math.random() * Math.PI * 2;
          const speed = 8.0 + Math.random() * 18.0;
          sp.vx = Math.cos(angle) * speed;
          sp.vy = 8.0 + Math.random() * 14.0;
          sp.vz = Math.sin(angle) * speed;
          sp.maxLife = 0.8 + Math.random() * 0.6;
          sp.life = sp.maxLife;
          sp.size = 1.2 + Math.random() * 1.0;
          sp.growth = -0.3;
          sp.opacity = 1.0;
        }
      }

      // Spawn initial black smoke plume
      const smLen = smokePool.current.length;
      if (smLen > 0) {
        const smCount = isMobile ? 3 : 5;
        for (let sm = 0; sm < smCount; sm++) {
          const smSlot = smokeCursor.current;
          smokeCursor.current = (smSlot + 1) % smLen;
          const sp = smokePool.current[smSlot];
          if (!sp) continue;
          sp.x = x + (Math.random() - 0.5) * 3;
          sp.y = y + Math.random() * 2;
          sp.z = z + (Math.random() - 0.5) * 3;
          const angle = Math.random() * Math.PI * 2;
          const spd = 2.0 + Math.random() * 3.5;
          sp.vx = Math.cos(angle) * spd;
          sp.vy = 3.0 + Math.random() * 4.0;
          sp.vz = Math.sin(angle) * spd;
          sp.maxLife = 2.8 + Math.random() * 1.6;
          sp.life = sp.maxLife;
          sp.size = 5.0 + Math.random() * 3.0;
          sp.growth = 4.2;
          sp.opacity = 0.95;
        }
      }
    };

    useFrame((state, delta) => {
      frameCounter.current++;
      const now = performance.now();
      const dt = Math.min(delta, 0.05);
      const store = useGameStore.getState();

      const windAngle = store.windAngle || 0;
      const windSpeed = store.windSpeed || 12;
      const windDx = Math.sin(windAngle) * (windSpeed * 0.14);
      const windDz = Math.cos(windAngle) * (windSpeed * 0.14);

      // 1. Drain new sinking events
      const newSinkingEvents = sinkingEventQueue.drain();
      for (const ev of newSinkingEvents) {
        const fwdX = Math.sin(ev.rotationY);
        const fwdZ = Math.cos(ev.rotationY);
        const halfLen = ev.shipLength * 0.4;

        // Camera impact shake if player vessel sinks or within 120m
        const camDistSq =
          (state.camera.position.x - ev.x) ** 2 + (state.camera.position.z - ev.z) ** 2;
        if (ev.isSelf) {
          store.triggerCameraShake(1.4, 'hit');
        } else if (camDistSq < 14400) {
          const factor = Math.max(0.2, 1 - Math.sqrt(camDistSq) / 120);
          store.triggerCameraShake(factor * 0.9, 'hit');
        }

        // Schedule 3 staggered explosive powder detonations along the hull
        // Detonation 1: Midship magazine (Immediate)
        spawnExplosionBurst(ev.x, ev.y + 1.8, ev.z, 9.5);

        // Detonation 2: Stern powder room (+280ms)
        pendingDetonations.current.push({
          shipId: ev.shipId,
          x: ev.x,
          y: ev.y + 1.6,
          z: ev.z,
          fwdX,
          fwdZ,
          offset: -halfLen * 0.65,
          triggerTime: now + 280,
          scale: 8.5,
          isSelf: Boolean(ev.isSelf),
        });

        // Detonation 3: Forward ammunition locker (+650ms)
        pendingDetonations.current.push({
          shipId: ev.shipId,
          x: ev.x,
          y: ev.y + 1.6,
          z: ev.z,
          fwdX,
          fwdZ,
          offset: halfLen * 0.72,
          triggerTime: now + 650,
          scale: 7.8,
          isSelf: Boolean(ev.isSelf),
        });
      }

      // 2. Process pending delayed powder detonations
      if (pendingDetonations.current.length > 0) {
        const remaining: PendingDetonation[] = [];
        for (const det of pendingDetonations.current) {
          if (now >= det.triggerTime) {
            const posX = det.x + det.fwdX * det.offset;
            const posZ = det.z + det.fwdZ * det.offset;
            spawnExplosionBurst(posX, det.y, posZ, det.scale);
            if (det.isSelf) {
              store.triggerCameraShake(0.85, 'hit');
            }
          } else {
            remaining.push(det);
          }
        }
        pendingDetonations.current = remaining;
      }

      // 3. Continuously emit Raging Flames & Billowing Charcoal Smoke for Active Sinking Ships
      const activeSinkingShips = sinkingShipTracker.getActiveShips();
      let primaryShipX = 0;
      let primaryShipY = 0;
      let primaryShipZ = 0;
      let hasActiveSinking = false;

      for (const ship of activeSinkingShips) {
        hasActiveSinking = true;
        primaryShipX = ship.x;
        primaryShipY = Math.max(0.5, ship.y + 1.5);
        primaryShipZ = ship.z;

        const fwdX = Math.sin(ship.rotationY);
        const fwdZ = Math.cos(ship.rotationY);
        const halfLen = ship.shipLength * 0.42;

        // Continuous Fire Flame Generation (every frame on desktop, alternate on mobile)
        const shouldSpawnFire = !isMobile || frameCounter.current % 2 === 0;
        if (shouldSpawnFire && ship.progress < 5.2) {
          const fLen = firePool.current.length;
          if (fLen > 0) {
            // Pick a random spot along the deck / masts
            const offset = (Math.random() - 0.5) * 2 * halfLen;
            const rightX = fwdZ;
            const rightZ = -fwdX;
            const lateral = (Math.random() - 0.5) * (ship.shipWidth * 0.8);

            const fx = ship.x + fwdX * offset + rightX * lateral;
            const fy = Math.max(0.4, ship.y + 1.2 + Math.random() * 2.5);
            const fz = ship.z + fwdZ * offset + rightZ * lateral;

            const slot = fireCursor.current;
            fireCursor.current = (slot + 1) % fLen;
            const p = firePool.current[slot];
            if (p) {
              p.x = fx;
              p.y = fy;
              p.z = fz;
              p.vx = (Math.random() - 0.5) * 0.8 + windDx * 0.2;
              p.vy = 2.2 + Math.random() * 3.2; // Thermal buoyancy
              p.vz = (Math.random() - 0.5) * 0.8 + windDz * 0.2;
              p.maxLife = 0.65 + Math.random() * 0.35;
              p.life = p.maxLife;
              p.size = 3.6 + Math.random() * 2.5;
              p.growth = 1.8;
              p.opacity = 0.95;
            }
          }
        }

        // Continuous Towering Black Smoke Generation (rolls 20-35m high and drifts with wind)
        const shouldSpawnSmoke = frameCounter.current % (isMobile ? 3 : 2) === 0;
        if (shouldSpawnSmoke && ship.progress < 5.8) {
          const sLen = smokePool.current.length;
          if (sLen > 0) {
            const offset = (Math.random() - 0.5) * 1.6 * halfLen;
            const smX = ship.x + fwdX * offset;
            const smY = Math.max(0.6, ship.y + 2.0);
            const smZ = ship.z + fwdZ * offset;

            const slot = smokeCursor.current;
            smokeCursor.current = (slot + 1) % sLen;
            const p = smokePool.current[slot];
            if (p) {
              p.x = smX;
              p.y = smY;
              p.z = smZ;
              p.vx = (Math.random() - 0.5) * 1.2 + windDx * 0.7;
              p.vy = 3.5 + Math.random() * 3.8; // Strong rising convection
              p.vz = (Math.random() - 0.5) * 1.2 + windDz * 0.7;
              p.maxLife = 3.2 + Math.random() * 1.8;
              p.life = p.maxLife;
              p.size = 5.5 + Math.random() * 3.5;
              p.growth = 5.2; // Expands as it reaches into the sky
              p.opacity = 0.92;
            }
          }
        }

        // Water Quenching Steam Plumes (as hot burning timbers dip into water)
        if (ship.y < 0.8 && frameCounter.current % (isMobile ? 4 : 2) === 0) {
          const stLen = steamPool.current.length;
          if (stLen > 0) {
            const offset = (Math.random() - 0.5) * 1.8 * halfLen;
            const stX = ship.x + fwdX * offset;
            const stZ = ship.z + fwdZ * offset;

            const slot = steamCursor.current;
            steamCursor.current = (slot + 1) % stLen;
            const p = steamPool.current[slot];
            if (p) {
              p.x = stX;
              p.y = 0.4 + Math.random() * 0.5;
              p.z = stZ;
              p.vx = (Math.random() - 0.5) * 1.8;
              p.vy = 2.0 + Math.random() * 2.2;
              p.vz = (Math.random() - 0.5) * 1.8;
              p.maxLife = 1.4 + Math.random() * 0.8;
              p.life = p.maxLife;
              p.size = 4.0 + Math.random() * 2.0;
              p.growth = 3.2;
              p.opacity = 0.8;
            }
          }
        }
      }

      // Update dynamic flickering warm fire point light
      if (fireLightRef.current) {
        if (hasActiveSinking) {
          fireLightRef.current.position.set(primaryShipX, primaryShipY + 2.0, primaryShipZ);
          // Realistic high-frequency flame intensity flicker
          const flicker = Math.sin(now * 0.015) * 0.15 + Math.sin(now * 0.038) * 0.2 + 0.85;
          fireLightIntensity.current = THREE.MathUtils.damp(
            fireLightIntensity.current,
            24.0 * flicker,
            8.0,
            dt
          );
        } else {
          fireLightIntensity.current = THREE.MathUtils.damp(
            fireLightIntensity.current,
            0,
            5.0,
            dt
          );
        }
        fireLightRef.current.intensity = fireLightIntensity.current;
      }

      // 4. Update GPU Particle Buffers
      // A. Detonation Explosions Update
      if (explosionPointsRef.current) {
        const geo = explosionPointsRef.current.geometry;
        const posAttr = geo.attributes.position as THREE.BufferAttribute;
        const posArr = posAttr.array as Float32Array;
        const styleAttr = geo.attributes.particleStyle as THREE.BufferAttribute;

        let activeCount = 0;
        for (let i = 0; i < maxExplosions; i++) {
          const p = explosionPool.current[i];
          if (p.life > 0) {
            p.life -= dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.z += p.vz * dt;

            posArr[activeCount * 3] = p.x;
            posArr[activeCount * 3 + 1] = p.y;
            posArr[activeCount * 3 + 2] = p.z;
            writeParticleAppearance(styleAttr, activeCount, p, 'Flash');
            activeCount++;
          }
        }
        geo.setDrawRange(0, activeCount);
        if (activeCount > 0) {
          posAttr.needsUpdate = true;
          styleAttr.needsUpdate = true;
        }
      }

      // B. Raging Fire Update
      if (firePointsRef.current) {
        const geo = firePointsRef.current.geometry;
        const posAttr = geo.attributes.position as THREE.BufferAttribute;
        const posArr = posAttr.array as Float32Array;
        const styleAttr = geo.attributes.particleStyle as THREE.BufferAttribute;

        let activeCount = 0;
        for (let i = 0; i < maxFire; i++) {
          const p = firePool.current[i];
          if (p.life > 0) {
            p.life -= dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.z += p.vz * dt;

            posArr[activeCount * 3] = p.x;
            posArr[activeCount * 3 + 1] = p.y;
            posArr[activeCount * 3 + 2] = p.z;
            writeParticleAppearance(styleAttr, activeCount, p, 'Fire');
            activeCount++;
          }
        }
        geo.setDrawRange(0, activeCount);
        if (activeCount > 0) {
          posAttr.needsUpdate = true;
          styleAttr.needsUpdate = true;
        }
      }

      // C. Billowing Black Smoke Update
      if (smokePointsRef.current) {
        const geo = smokePointsRef.current.geometry;
        const posAttr = geo.attributes.position as THREE.BufferAttribute;
        const posArr = posAttr.array as Float32Array;
        const styleAttr = geo.attributes.particleStyle as THREE.BufferAttribute;

        let activeCount = 0;
        for (let i = 0; i < maxSmoke; i++) {
          const p = smokePool.current[i];
          if (p.life > 0) {
            p.life -= dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.z += p.vz * dt;

            posArr[activeCount * 3] = p.x;
            posArr[activeCount * 3 + 1] = p.y;
            posArr[activeCount * 3 + 2] = p.z;
            writeParticleAppearance(styleAttr, activeCount, p, 'Smoke');
            activeCount++;
          }
        }
        geo.setDrawRange(0, activeCount);
        if (activeCount > 0) {
          posAttr.needsUpdate = true;
          styleAttr.needsUpdate = true;
        }
      }

      // D. Fiery Flying Sparks Update
      if (sparkPointsRef.current) {
        const geo = sparkPointsRef.current.geometry;
        const posAttr = geo.attributes.position as THREE.BufferAttribute;
        const posArr = posAttr.array as Float32Array;
        const styleAttr = geo.attributes.particleStyle as THREE.BufferAttribute;
        const gravityStep = 9.81 * dt;

        let activeCount = 0;
        for (let i = 0; i < maxSparks; i++) {
          const p = sparkPool.current[i];
          if (p.life > 0) {
            p.life -= dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.z += p.vz * dt;
            p.vy -= gravityStep;

            posArr[activeCount * 3] = p.x;
            posArr[activeCount * 3 + 1] = Math.max(0.2, p.y);
            posArr[activeCount * 3 + 2] = p.z;
            writeParticleAppearance(styleAttr, activeCount, p, 'Sparks');
            activeCount++;
          }
        }
        geo.setDrawRange(0, activeCount);
        if (activeCount > 0) {
          posAttr.needsUpdate = true;
          styleAttr.needsUpdate = true;
        }
      }

      // E. Water Sizzling Steam Update
      if (steamPointsRef.current) {
        const geo = steamPointsRef.current.geometry;
        const posAttr = geo.attributes.position as THREE.BufferAttribute;
        const posArr = posAttr.array as Float32Array;
        const styleAttr = geo.attributes.particleStyle as THREE.BufferAttribute;

        let activeCount = 0;
        for (let i = 0; i < maxSteam; i++) {
          const p = steamPool.current[i];
          if (p.life > 0) {
            p.life -= dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.z += p.vz * dt;

            posArr[activeCount * 3] = p.x;
            posArr[activeCount * 3 + 1] = p.y;
            posArr[activeCount * 3 + 2] = p.z;
            writeParticleAppearance(styleAttr, activeCount, p, 'Steam');
            activeCount++;
          }
        }
        geo.setDrawRange(0, activeCount);
        if (activeCount > 0) {
          posAttr.needsUpdate = true;
          styleAttr.needsUpdate = true;
        }
      }
    });

    return (
      <group>
        {/* Dynamic Warm Flame Point Light Illuminating Sinking Wreck and Waves */}
        <pointLight
          ref={fireLightRef}
          color="#ff7b25"
          intensity={0}
          distance={85}
          decay={2}
        />

        {/* 1. Catastrophic Powder Magazine Explosions (Additive Flash) */}
        <points ref={explosionPointsRef} frustumCulled={false}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[explosionPos, 3]}
              usage={THREE.DynamicDrawUsage}
            />
            <bufferAttribute
              attach="attributes-particleStyle"
              args={[explosionStyle, 2]}
              usage={THREE.DynamicDrawUsage}
            />
          </bufferGeometry>
          <pointsMaterial
            onBeforeCompile={compileParticleAppearance}
            map={explosionTex}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            opacity={1.0}
            color="#ffffff"
            size={12.5}
            sizeAttenuation
          />
        </points>

        {/* 2. Raging Hull and Deck Fire (Additive Flame) */}
        <points ref={firePointsRef} frustumCulled={false}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[firePos, 3]}
              usage={THREE.DynamicDrawUsage}
            />
            <bufferAttribute
              attach="attributes-particleStyle"
              args={[fireStyle, 2]}
              usage={THREE.DynamicDrawUsage}
            />
          </bufferGeometry>
          <pointsMaterial
            onBeforeCompile={compileParticleAppearance}
            map={fireTex}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            opacity={0.95}
            color="#ffeedd"
            size={8.5}
            sizeAttenuation
          />
        </points>

        {/* 3. Towering Dense Charcoal Soot Smoke (Normal Blending, Opaque Billows) */}
        <points ref={smokePointsRef} frustumCulled={false}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[smokePos, 3]}
              usage={THREE.DynamicDrawUsage}
            />
            <bufferAttribute
              attach="attributes-particleStyle"
              args={[smokeStyle, 2]}
              usage={THREE.DynamicDrawUsage}
            />
          </bufferGeometry>
          <pointsMaterial
            onBeforeCompile={compileParticleAppearance}
            map={smokeTex}
            transparent
            depthWrite={false}
            blending={THREE.NormalBlending}
            opacity={0.92}
            color="#334155"
            size={14.0}
            sizeAttenuation
          />
        </points>

        {/* 4. Fiery Splinter Sparks and Embers (Additive) */}
        <points ref={sparkPointsRef} frustumCulled={false}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[sparkPos, 3]}
              usage={THREE.DynamicDrawUsage}
            />
            <bufferAttribute
              attach="attributes-particleStyle"
              args={[sparkStyle, 2]}
              usage={THREE.DynamicDrawUsage}
            />
          </bufferGeometry>
          <pointsMaterial
            onBeforeCompile={compileParticleAppearance}
            map={sparkTex}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            opacity={1.0}
            color="#fde047"
            size={2.8}
            sizeAttenuation
          />
        </points>

        {/* 5. Water Quench Steam Plumes (Normal Blending White-Grey Vapor) */}
        <points ref={steamPointsRef} frustumCulled={false}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[steamPos, 3]}
              usage={THREE.DynamicDrawUsage}
            />
            <bufferAttribute
              attach="attributes-particleStyle"
              args={[steamStyle, 2]}
              usage={THREE.DynamicDrawUsage}
            />
          </bufferGeometry>
          <pointsMaterial
            onBeforeCompile={compileParticleAppearance}
            map={steamTex}
            transparent
            depthWrite={false}
            blending={THREE.NormalBlending}
            opacity={0.82}
            color="#f1f5f9"
            size={9.5}
            sizeAttenuation
          />
        </points>
      </group>
    );
  }
);
