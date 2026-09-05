import React, { useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { OceanWater } from './OceanWater';
import { ShipModel3D } from './ShipModel3D';
import { CannonSystem3D } from './CannonSystem3D';
import { CannonFX2D } from './CannonFX2D';
import { Environment3D, FOG_COLOR, MAX_VIEW_DISTANCE, NAMEPLATE_CULL_DISTANCE } from './Environment3D';
import { Islands3D, ARENA_ISLANDS } from './Islands3D';
import { Shipwrecks3D, ARENA_SHIPWRECKS } from './Shipwrecks3D';
import { JumpingFish3D } from './JumpingFish3D';
import { MapBoundary3D } from './MapBoundary3D';
import { CaribbeanSeabirds3D } from './CaribbeanSeabirds3D';
import { OceanAtmosphereParticles3D } from './OceanAtmosphereParticles3D';
import { useGameStore } from '@/stores/useGameStore';
import { useBattleCamera } from '../../hooks/useBattleCamera';
import { CONTROL_CONFIG } from '../../utils/controls';
import { type ShipSnapshot, SHIP_PRESETS } from '@/types/game';

function lerpAngle(current: number, target: number, alpha: number): number {
  let diff = (target - current) % (Math.PI * 2);
  if (diff > Math.PI) diff -= Math.PI * 2;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * alpha;
}

interface ShipEntityProps {
  ship: ShipSnapshot;
  isSelf: boolean;
}

const ShipEntity: React.FC<ShipEntityProps> = React.memo(({ ship, isSelf }) => {
  const groupRef = useRef<THREE.Group>(null);
  const shipRef = useRef(ship);
  shipRef.current = ship;

  // High-precision dead reckoning extrapolation state
  const lastPacketTime = useRef(performance.now());
  const snapshotPos = useRef(new THREE.Vector3(ship.x, ship.y + 0.85, ship.z));
  const snapshotHeading = useRef(ship.rotationY);
  const lastSeqKey = useRef('');

  const [showNameplate, setShowNameplate] = useState(false);
  const frameCount = useRef(Math.floor(Math.random() * 6));
  const isInitialized = useRef(false);

  const currentAimSide = useRef(0);
  const currentAimFwd = useRef(0);

  // Dynamic Camera Trauma & Speed VFX Refs
  const cameraTrauma = useRef(0);
  const lastShakeTime = useRef(0);
  const lastRecoilDir = useRef<'port' | 'starboard' | 'hit' | undefined>(undefined);

  // Smooth interpolation with dead reckoning extrapolation and distance culling
  useFrame((state, delta) => {
    const { camera } = state;
    if (!groupRef.current) return;
    const curShip = shipRef.current;

    // Detect fresh server snapshot arrival and record baseline for extrapolation
    const seqKey = `${curShip.x}_${curShip.z}_${curShip.rotationY}`;
    if (seqKey !== lastSeqKey.current) {
      lastSeqKey.current = seqKey;
      lastPacketTime.current = performance.now();
      snapshotPos.current.set(curShip.x, curShip.isSunk ? curShip.y : curShip.y + 0.85, curShip.z);
      snapshotHeading.current = curShip.rotationY;
    }

    // Throttled distance check once every 6 frames
    frameCount.current++;
    if (frameCount.current % 6 === 0) {
      const dx = camera.position.x - curShip.x;
      const dz = camera.position.z - curShip.z;
      const distSq = dx * dx + dz * dz;

      // 1. Distance Culling: Skip rendering ships beyond view distance
      const inView = isSelf || distSq <= MAX_VIEW_DISTANCE * MAX_VIEW_DISTANCE;
      if (groupRef.current.visible !== inView) {
        groupRef.current.visible = inView;
      }

      // 2. Nameplate Culling: Only mount Drei Html overlay when close (110m)
      if (!isSelf) {
        const shouldShow = inView && distSq <= NAMEPLATE_CULL_DISTANCE * NAMEPLATE_CULL_DISTANCE;
        if (showNameplate !== shouldShow) {
          setShowNameplate(shouldShow);
        }
      }
    }

    if (!groupRef.current.visible) return;

    // First frame initialization (snap immediately without sweeping)
    if (!isInitialized.current) {
      groupRef.current.position.set(snapshotPos.current.x, snapshotPos.current.y, snapshotPos.current.z);
      groupRef.current.rotation.y = curShip.rotationY;
      groupRef.current.rotation.x = curShip.pitch;
      groupRef.current.rotation.z = curShip.roll;
      isInitialized.current = true;
    } else {
      // Velocity-based dead reckoning extrapolation between 30Hz server ticks
      const now = performance.now();
      const elapsed = Math.min(0.1, (now - lastPacketTime.current) / 1000);
      const vx = curShip.vx ?? 0;
      const vz = curShip.vz ?? 0;
      let targetX = snapshotPos.current.x + vx * elapsed;
      let targetZ = snapshotPos.current.z + vz * elapsed;
      const targetY = snapshotPos.current.y;

      // Real-time client collision clamping prevents visual clipping into land/wrecks
      const shipColRadius = 2.5;
      for (const isl of ARENA_ISLANDS) {
        const bound = (isl.sandRadius + 15) * (isl.elongation ? Math.max(isl.elongation.scaleX, isl.elongation.scaleZ) : 1);
        if (Math.abs(targetX - isl.x) > bound || Math.abs(targetZ - isl.z) > bound) {
          continue;
        }

        if (isl.elongation) {
          const relX = targetX - isl.x;
          const relZ = targetZ - isl.z;
          const cosA = Math.cos(isl.elongation.angle);
          const sinA = Math.sin(isl.elongation.angle);
          const localX = relX * cosA - relZ * sinA;
          const localZ = relX * sinA + relZ * cosA;

          const worldDist = Math.hypot(localX, localZ);
          const uX = localX / isl.elongation.scaleX;
          const uZ = localZ / isl.elongation.scaleZ;
          const a = Math.atan2(uZ, uX);
          const scaleFactor = Math.hypot(Math.cos(a) * isl.elongation.scaleX, Math.sin(a) * isl.elongation.scaleZ);
          const minSafeDist = isl.sandRadius * 0.76 * scaleFactor + shipColRadius;

          if (worldDist < minSafeDist) {
            const safeDist = Math.max(0.001, worldDist);
            const pushLocalX = (localX / safeDist) * minSafeDist;
            const pushLocalZ = (localZ / safeDist) * minSafeDist;

            targetX = isl.x + pushLocalX * cosA + pushLocalZ * sinA;
            targetZ = isl.z - pushLocalX * sinA + pushLocalZ * cosA;
          }
        } else {
          const dx = targetX - isl.x;
          const dz = targetZ - isl.z;
          const dist = Math.hypot(dx, dz);
          const minSafe = isl.sandRadius * 0.76 + shipColRadius;
          if (dist < minSafe && dist > 0.001) {
            targetX = isl.x + (dx / dist) * minSafe;
            targetZ = isl.z + (dz / dist) * minSafe;
          }
        }
      }

      for (const wreck of ARENA_SHIPWRECKS) {
        const bound = wreck.radius + 10;
        if (Math.abs(targetX - wreck.x) > bound || Math.abs(targetZ - wreck.z) > bound) {
          continue;
        }

        const dx = targetX - wreck.x;
        const dz = targetZ - wreck.z;
        const dist = Math.hypot(dx, dz);
        const minSafe = wreck.radius * 0.65 + shipColRadius;
        if (dist < minSafe && dist > 0.001) {
          targetX = wreck.x + (dx / dist) * minSafe;
          targetZ = wreck.z + (dz / dist) * minSafe;
        }
      }

      // High-precision smooth transform interpolation
      const posAlpha = Math.min(1.0, 22 * delta);
      const yAlpha = Math.min(1.0, 16 * delta);
      groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, targetX, posAlpha);
      groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, targetY, yAlpha);
      groupRef.current.position.z = THREE.MathUtils.lerp(groupRef.current.position.z, targetZ, posAlpha);

      // Continuous shortest-arc angle wrapping
      groupRef.current.rotation.y = lerpAngle(groupRef.current.rotation.y, snapshotHeading.current, Math.min(1.0, 18 * delta));
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, curShip.pitch, Math.min(1.0, 12 * delta));
      groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, curShip.roll, Math.min(1.0, 12 * delta));
    }

    // 100% Lockstep Chase Camera: Immersive dynamic speed, salvo recoil & hit trauma
    if (isSelf) {
      const heading = groupRef.current.rotation.y;
      const sinH = Math.sin(heading);
      const cosH = Math.cos(heading);

      // 1. Process incoming camera trauma (salvo firing recoil or hull damage impact)
      const shakeEvent = useGameStore.getState().cameraShake;
      if (shakeEvent && shakeEvent.timestamp !== lastShakeTime.current) {
        lastShakeTime.current = shakeEvent.timestamp;
        cameraTrauma.current = Math.min(1.0, cameraTrauma.current + shakeEvent.intensity);
        lastRecoilDir.current = shakeEvent.direction;
      }

      // Exponential trauma decay
      cameraTrauma.current = Math.max(0, cameraTrauma.current - delta * 2.6);
      const traumaSq = cameraTrauma.current * cameraTrauma.current;

      // High-frequency trauma shake vibrations
      const shakeT = performance.now() * 0.055;
      const shakeX = (Math.sin(shakeT * 1.8) + Math.cos(shakeT * 2.5)) * traumaSq * 0.75;
      const shakeY = Math.cos(shakeT * 2.1) * traumaSq * 0.55;
      const shakeZ = (Math.sin(shakeT * 1.4)) * traumaSq * 0.45;

      // Lateral salvo recoil impulse
      let recoilOffset = 0;
      if (lastRecoilDir.current === 'port') {
        recoilOffset = traumaSq * 1.5; // kick camera rightward
      } else if (lastRecoilDir.current === 'starboard') {
        recoilOffset = -traumaSq * 1.5; // kick camera leftward
      }

      // 2. Dynamic Speed Sensation & Camera Heave ("melaju")
      const currentSpeed = Math.max(0, curShip.speed ?? 0);
      const speedRatio = Math.min(1.2, currentSpeed / 9.5);

      // Speed FOV expansion (smoothly expands from 55 to ~62.5 FOV at full sail, plus trauma kick)
      const perspCamera = camera as THREE.PerspectiveCamera;
      if (perspCamera.isPerspectiveCamera) {
        const targetFov = 55 + speedRatio * 7.5 + (lastRecoilDir.current === 'hit' ? traumaSq * 4.5 : traumaSq * 2.0);
        perspCamera.fov = THREE.MathUtils.lerp(perspCamera.fov, targetFov, Math.min(1.0, 9 * delta));
        perspCamera.updateProjectionMatrix();
      }

      const aimDirection = useGameStore.getState().aimDirection;
      let targetSide = 0;
      let targetFwd = 0;
      if (aimDirection === 'port') {
        targetSide = -CONTROL_CONFIG.CAMERA_AIM_SIDE_OFFSET;
        targetFwd = CONTROL_CONFIG.CAMERA_AIM_FORWARD_OFFSET;
      } else if (aimDirection === 'starboard') {
        targetSide = CONTROL_CONFIG.CAMERA_AIM_SIDE_OFFSET;
        targetFwd = CONTROL_CONFIG.CAMERA_AIM_FORWARD_OFFSET;
      }

      currentAimSide.current = THREE.MathUtils.lerp(currentAimSide.current, targetSide, Math.min(1.0, 8 * delta));
      currentAimFwd.current = THREE.MathUtils.lerp(currentAimFwd.current, targetFwd, Math.min(1.0, 8 * delta));

      const sOffset = currentAimSide.current + recoilOffset;
      const fOffset = currentAimFwd.current;

      const posX = groupRef.current.position.x;
      const posY = groupRef.current.position.y;
      const posZ = groupRef.current.position.z;

      // Dynamic distance pull-back and gentle ocean swell breathing on camera height
      const dynamicDist = CONTROL_CONFIG.CAMERA_DISTANCE + speedRatio * 2.4;
      const speedBob = Math.sin(state.clock.elapsedTime * 1.9) * 0.28 * speedRatio;
      const dynamicHeight = CONTROL_CONFIG.CAMERA_HEIGHT + speedBob;

      camera.position.x = posX - sinH * dynamicDist + cosH * sOffset + sinH * fOffset + cosH * shakeX;
      camera.position.y = posY + dynamicHeight + shakeY;
      camera.position.z = posZ - cosH * dynamicDist - sinH * sOffset + cosH * fOffset - sinH * shakeX + shakeZ;

      const lookAheadDist = 6.0 + speedRatio * 3.5;
      camera.lookAt(posX + sinH * lookAheadDist, posY + 3.5 + shakeY * 0.5, posZ + cosH * lookAheadDist);
    }
  });

  const hpPercent = Math.max(0, Math.min(100, (ship.health / ship.maxHealth) * 100));
  const shipConfig = SHIP_PRESETS[ship.shipClass] || SHIP_PRESETS.brig;
  const shipLen = shipConfig.length || 18;
  const nameplateY = shipLen * 0.76 + 3.6;

  return (
    // Note: Do not pass dynamic position={...} to avoid React Three Fiber resetting group transform during useFrame lerping
    <group ref={groupRef}>
      <ShipModel3D
        shipClass={ship.shipClass}
        sailState={ship.sail}
        rudderAngle={ship.rudder}
        isEnemy={!isSelf}
      />


      {/* Floating Health Bar and Nameplate (Culled beyond 110m for enemy vessels, hidden for player ship) */}
      {!isSelf && showNameplate && (
        <Html position={[0, nameplateY, 0]} center distanceFactor={45}>
          <div className="flex flex-col items-center pointer-events-none select-none">
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-950/85 border border-slate-700/60 shadow-md text-[10px] font-bold tracking-wide uppercase">
              <span className="text-amber-300">
                {ship.name}
              </span>
            </div>

            <div className="w-20 h-1 bg-slate-950/90 border border-slate-800 rounded-full overflow-hidden mt-0.5">
              <div
                className={`h-full rounded-full transition-all duration-150 ${
                  hpPercent > 50 ? 'bg-emerald-400' : hpPercent > 25 ? 'bg-amber-400' : 'bg-rose-500'
                }`}
                style={{ width: `${hpPercent}%` }}
              />
            </div>
          </div>
        </Html>
      )}
    </group>
  );
});

const CameraRig: React.FC = () => {
  useBattleCamera();
  return null;
};

const FleetEntities: React.FC = React.memo(() => {
  const ships = useGameStore((s) => s.ships);
  const selfId = useGameStore((s) => s.selfId);
  const hasSelfShip = ships.some((s) => s.id === selfId && !s.isSunk);

  return (
    <>
      {!hasSelfShip && <CameraRig />}
      {ships.map((ship) => (
        <ShipEntity key={ship.id} ship={ship} isSelf={ship.id === selfId} />
      ))}
    </>
  );
});

const CannonEntities: React.FC = React.memo(() => {
  const cannonballs = useGameStore((s) => s.cannonballs);
  return (
    <>
      <CannonSystem3D cannonballs={cannonballs} />
      <CannonFX2D />
    </>
  );
});

export const NavalCanvas: React.FC = React.memo(() => {
  return (
    <div className="w-full h-full absolute inset-0 bg-sky-700">
      <Canvas
        camera={{ position: [0, 25, -45], fov: 55, near: 0.5, far: 1200 }}
        shadows
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.15,
        }}
      >
        <color attach="background" args={[FOG_COLOR]} />
        <Environment3D />
        <OceanWater />
        <Islands3D />
        <Shipwrecks3D />
        <JumpingFish3D />
        <MapBoundary3D />
        <CaribbeanSeabirds3D />
        <OceanAtmosphereParticles3D />
        <FleetEntities />
        <CannonEntities />
      </Canvas>
    </div>
  );
});

