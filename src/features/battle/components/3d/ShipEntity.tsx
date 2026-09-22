import React, { useRef, useMemo, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { ShipModel3D } from './ShipModel3D';
import { ShipWakeSplash3D } from './ShipWakeSplash3D';
import {
  MAX_VIEW_DISTANCE_DESKTOP,
  MAX_VIEW_DISTANCE_MOBILE,
} from './Environment3D';
import { SHIP_PRESETS, type SailState } from '@/types';
import type { ShipEntityProps } from '../../types/entities';
import {
  createDeadReckoningBuffer,
  pushSnapshot,
  extrapolatePosition,
} from '../../utils/deadReckoning';
import { createInitialCameraState, updateChaseCamera } from '../../utils/cameraController';
import { dampAngle, damp } from '../../utils/math';
import { getHullWaterPose, getFastHullWaterPose } from '../../utils/waveMath';
import { getOceanTime } from '../../utils/oceanTime';
import { useGameStore } from '@/stores/useGameStore';
import { findShip } from '@/stores/selectors/shipLookup';
import { navalAudio } from '../../services/navalAudio';
import { isSeaEntityInFrustum, updateFrustum } from '../../utils/frustumCuller';

const _tempParentQuat = new THREE.Quaternion();

export const ShipEntity: React.FC<ShipEntityProps> = React.memo(({
  ship,
  shipId: propShipId,
  isSelf,
  isMobile = false,
}) => {
  const targetId = propShipId || ship?.id || '';
  const initialShip = useMemo(
    () => ship || findShip(useGameStore.getState().ships, targetId),
    [ship, targetId]
  );

  const shipClass = initialShip?.shipClass || 'brig';
  const shipConfig = SHIP_PRESETS[shipClass] || SHIP_PRESETS.brig;
  const shipLen = shipConfig.length || 18;
  const draft = shipConfig.width * 0.22;
  const mastHeight = shipLen * 0.85;
  const nameplateY = mastHeight + 3.2;

  const [currentSail, setCurrentSail] = useState<SailState>(initialShip?.sail || 'HALF_SAIL');
  const curSailRef = useRef<SailState>(initialShip?.sail || 'HALF_SAIL');

  const groupRef = useRef<THREE.Group>(null);
  const waterPose = useRef({ y: 0, pitch: 0, roll: 0 });

  const isTeamMode = useGameStore((s) => s.currentRoom?.gameMode === 'TEAM');
  const selfTeam = useGameStore((s) => s.currentRoom?.players.find((p) => p.id === s.selfId)?.team);
  const playerTeam = useGameStore((s) => s.currentRoom?.players.find((p) => p.id === targetId)?.team);
  const isFriendly = isTeamMode && Boolean(selfTeam && playerTeam && selfTeam === playerTeam);
  const isAllyOrSelf = isSelf || (isTeamMode ? isFriendly : false);

  // High-precision dead reckoning extrapolation buffer
  const drBuffer = useRef(
    createDeadReckoningBuffer(
      initialShip?.x ?? 0,
      (initialShip?.y ?? 0) - draft,
      initialShip?.z ?? 0,
      initialShip?.rotationY ?? 0
    )
  );

  // Dedicated chase camera state for player ship
  const cameraState = useRef(createInitialCameraState());

  const nameplateRef = useRef<THREE.Group>(null);
  const healthBarMeshRef = useRef<THREE.Mesh>(null);
  const frameCount = useRef(Math.floor(Math.random() * 6));
  const isInitialized = useRef(false);
  const prevWasSunk = useRef(initialShip?.isSunk ?? false);
  const shipName = initialShip?.name || 'Vessel';
  const sinkingProgressRef = useRef<number>(0);
  const lastHpPctRef = useRef<number>(-1);
  const lastScaleRef = useRef<number>(1);
  const lastSailChangeTime = useRef<number>(0);
  const lastShakeTime = useRef<number>(0);
  const recoilRoll = useRef<number>(0);

  // Static high-definition Name Badge texture (Generated ONCE at mount, 0 CPU/GPU overhead during battle)
  const nameTexture = useMemo(() => {
    if (isSelf) return null;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 80;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.clearRect(0, 0, 512, 80);

    // Dark pill container
    ctx.fillStyle = 'rgba(3, 7, 18, 0.88)';
    if ('roundRect' in ctx && typeof ctx.roundRect === 'function') {
      ctx.roundRect(6, 6, 500, 68, 14);
    } else {
      ctx.rect(6, 6, 500, 68);
    }
    ctx.fill();

    // Border
    ctx.lineWidth = 3;
    ctx.strokeStyle = isAllyOrSelf ? 'rgba(34, 197, 94, 0.85)' : 'rgba(239, 68, 68, 0.85)';
    ctx.stroke();

    // Name text
    ctx.font = 'bold 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = isAllyOrSelf ? '#86efac' : '#fca5a5';
    const tag = isTeamMode ? (isFriendly ? '[ALLY] ' : '[FOE] ') : '[FOE] ';
    ctx.fillText(`${tag}${shipName}`, 256, 40);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    return tex;
  }, [shipName, isSelf, isTeamMode, isFriendly, isAllyOrSelf]);

  useEffect(() => {
    return () => {
      nameTexture?.dispose();
    };
  }, [nameTexture]);

  // Smooth interpolation with dead reckoning, distance culling, and 100% lockstep camera
  useFrame((state, delta) => {
    const { camera, clock } = state;
    if (!groupRef.current) return;

    // Always fetch latest real-time snapshot from store to prevent stale closure during memoization
    const store = useGameStore.getState();
    const curShip = findShip(store.ships, targetId);
    if (!curShip) return;

    // 1. Sunk ship handling: immediately hide overhead status bar, and smoothly animate ship capsizing & sinking
    if (curShip.isSunk) {
      if (nameplateRef.current) {
        nameplateRef.current.visible = false;
      }

      sinkingProgressRef.current += delta;
      if (sinkingProgressRef.current < 4.8) {
        groupRef.current.visible = true;
        // Ship capsizes onto its side and pitches bow-down as it founders into the sea
        groupRef.current.position.y -= 2.4 * delta;
        groupRef.current.rotation.z += 0.22 * delta;
        groupRef.current.rotation.x -= 0.12 * delta;

        if (isSelf) {
          updateChaseCamera({
            camera,
            delta,
            elapsedTime: clock.elapsedTime,
            shipX: groupRef.current.position.x,
            shipY: groupRef.current.position.y,
            shipZ: groupRef.current.position.z,
            shipHeading: groupRef.current.rotation.y,
            shipSpeed: 0,
            sailState: 'ANCHOR',
            aimDirection: 'none',
            cameraState: cameraState.current,
            shakeEvent: null,
          });
        }
        return;
      } else {
        groupRef.current.visible = false;
        return;
      }
    } else {
      if (sinkingProgressRef.current > 0) {
        sinkingProgressRef.current = 0;
        groupRef.current.visible = true;
      }
    }

    // 2. Real-time 60/120 FPS GPU Health Bar update (Only for non-player ships)
    if (!isSelf && healthBarMeshRef.current) {
      const targetShipClass = curShip.shipClass || initialShip?.shipClass || 'brig';
      const maxHp = SHIP_PRESETS[targetShipClass]?.maxHealth || curShip.maxHealth || 180;
      const rawHp = typeof curShip.health === 'number' && !isNaN(curShip.health) ? curShip.health : maxHp;
      const curHp = Math.max(0, rawHp);
      const hpPct = maxHp > 0 ? Math.max(0.001, Math.min(1.0, curHp / maxHp)) : 1.0;

      // Only touch Three.js transform if health percentage changed (prevents flagging matrixWorld dirty every frame)
      if (Math.abs(lastHpPctRef.current - hpPct) > 0.002) {
        lastHpPctRef.current = hpPct;
        healthBarMeshRef.current.scale.x = hpPct;
        healthBarMeshRef.current.position.x = -1.68 + 1.68 * hpPct;
      }
    }

    // Infrequent sail state transition (throttled for bots to prevent React reconciliation storms)
    if (curShip.sail && curShip.sail !== curSailRef.current) {
      curSailRef.current = curShip.sail;
      const nowMs = performance.now();
      if (isSelf || nowMs - lastSailChangeTime.current > 2500) {
        lastSailChangeTime.current = nowMs;
        setCurrentSail(curShip.sail);
      }
    }

    // Respawn snap detection: if ship was sunk and is now alive, or large position teleport
    const wasSunk = prevWasSunk.current;
    prevWasSunk.current = curShip.isSunk;

    const distSqFromTarget =
      (groupRef.current.position.x - curShip.x) ** 2 + (groupRef.current.position.z - curShip.z) ** 2;

    if ((wasSunk && !curShip.isSunk) || distSqFromTarget > 2500) {
      drBuffer.current = createDeadReckoningBuffer(
        curShip.x,
        curShip.y - draft,
        curShip.z,
        curShip.rotationY
      );
      groupRef.current.position.set(curShip.x, curShip.y - draft, curShip.z);
      groupRef.current.rotation.y = curShip.rotationY;
      groupRef.current.rotation.x = 0;
      groupRef.current.rotation.z = 0;
    }

    // Detect fresh server snapshot and absorb into dead reckoning buffer
    pushSnapshot(
      drBuffer.current,
      curShip.x,
      curShip.y,
      curShip.z,
      curShip.rotationY,
      curShip.vx ?? 0,
      curShip.vz ?? 0
    );

    // First frame initialization or continuous dead reckoning extrapolation
    if (!isInitialized.current) {
      groupRef.current.position.set(curShip.x, curShip.isSunk ? curShip.y : curShip.y - draft, curShip.z);
      groupRef.current.rotation.y = curShip.rotationY;
      groupRef.current.rotation.x = curShip.pitch;
      groupRef.current.rotation.z = curShip.roll;
      isInitialized.current = true;
    } else {
      // Extrapolate smooth target with collision clamping
      const target = extrapolatePosition(drBuffer.current, curShip.isSunk);

      // High-precision frame-rate independent exponential damping (60-240+ fps)
      groupRef.current.position.x = damp(groupRef.current.position.x, target.x, 24, delta);
      groupRef.current.position.z = damp(groupRef.current.position.z, target.z, 24, delta);

      if (isSelf && !curShip.isSunk) {
        // Client-Side Input Prediction: Instant 0ms steering response (Source / Unreal Netcode pattern)
        // The player's own ship steers on Frame 0 immediately upon input without waiting for server round-trip latency
        const steerage = Math.min(1, Math.max(0, curShip.speed ?? 0) / Math.max(1, shipConfig.topSpeed * 0.55));
        const effectiveTurnSpeed = shipConfig.turnSpeed * steerage;
        // Inverted sign matching the physics engine (-store.localRudder)
        const localTurnDelta = -store.localRudder * effectiveTurnSpeed * delta;
        groupRef.current.rotation.y += localTurnDelta;
        // Soft reconciliation gently absorbs minute drift towards authoritative server heading
        groupRef.current.rotation.y = dampAngle(groupRef.current.rotation.y, target.heading, 10, delta);
      } else {
        // Remote ships & bots: pure authoritative network dead reckoning interpolation
        groupRef.current.rotation.y = dampAngle(groupRef.current.rotation.y, target.heading, 20, delta);
      }
    }


    // Throttled distance and frustum check
    frameCount.current++;
    if (frameCount.current % 4 === 0) {
      if (isSelf) {
        if (!groupRef.current.visible) groupRef.current.visible = true;
      } else {
        const dx = camera.position.x - curShip.x;
        const dz = camera.position.z - curShip.z;
        const distSq = dx * dx + dz * dz;

        // 1 & 2. Distance and Frustum Culling: Skip rendering ships completely beyond view distance or outside camera frustum
        const maxViewDist = state.scene.fog instanceof THREE.FogExp2
          ? 2.5 / state.scene.fog.density + shipLen
          : (isMobile ? MAX_VIEW_DISTANCE_MOBILE : MAX_VIEW_DISTANCE_DESKTOP);
        const withinDistance = distSq <= maxViewDist * maxViewDist;
        
        const inFrustum = withinDistance && isSeaEntityInFrustum(
          camera,
          curShip.x,
          curShip.z,
          shipLen * 0.75,
          mastHeight + 4,
          24
        );

        if (groupRef.current.visible !== inFrustum) {
          groupRef.current.visible = inFrustum;
        }

        // 3. Nameplate toggling (hide if sunk or beyond 140m)
        if (nameplateRef.current) {
          const shouldShow = inFrustum && !curShip.isSunk && distSq <= 19600;
          if (nameplateRef.current.visible !== shouldShow) {
            nameplateRef.current.visible = shouldShow;
          }
        }
      }
    }

    if (!groupRef.current.visible) return;

    // Wave Pose: High-precision 5-point probe for local player; ultra-fast 2-point probe for remote vessels
    const dxFromCam = camera.position.x - groupRef.current.position.x;
    const dzFromCam = camera.position.z - groupRef.current.position.z;
    const isClose = isSelf || (dxFromCam * dxFromCam + dzFromCam * dzFromCam < 2025); // < 45m

    // Stagger wave evaluation on alternate frames for remote ships (damp provides smooth continuous motion)
    if (isSelf || isClose || frameCount.current % 2 === 0) {
      if (isClose) {
        getHullWaterPose(
          groupRef.current.position.x,
          groupRef.current.position.z,
          groupRef.current.rotation.y,
          shipLen,
          shipConfig.width,
          getOceanTime(store, clock.elapsedTime),
          waterPose.current
        );
      } else {
        getFastHullWaterPose(
          groupRef.current.position.x,
          groupRef.current.position.z,
          groupRef.current.rotation.y,
          shipLen,
          getOceanTime(store, clock.elapsedTime),
          waterPose.current
        );
      }
    }
    const pose = waterPose.current;
    const response = Math.max(2.5, 7 - shipLen * 0.09);
    groupRef.current.position.y = damp(groupRef.current.position.y, pose.y - draft, response, delta);
    groupRef.current.rotation.order = 'YXZ';
    groupRef.current.rotation.x = damp(groupRef.current.rotation.x, pose.pitch, response, delta);
    // Physical broadside salvo recoil impulse (ship heels away from firing cannons)
    if (isSelf && store.cameraShake && store.cameraShake.timestamp !== lastShakeTime.current) {
      lastShakeTime.current = store.cameraShake.timestamp;
      if (store.cameraShake.direction === 'left') {
        // Salvo left: ship heels to starboard (positive Z roll)
        recoilRoll.current = 0.07;
      } else if (store.cameraShake.direction === 'right') {
        // Salvo right: ship heels to port (negative Z roll)
        recoilRoll.current = -0.07;
      }
    }
    recoilRoll.current = damp(recoilRoll.current, 0, 5.5, delta);

    const heel = -curShip.rudder * Math.min(0.075, curShip.speed ** 2 * 0.0007);
    groupRef.current.rotation.z = damp(groupRef.current.rotation.z, pose.roll + heel + recoilRoll.current, response, delta);

    // Billboard orientation & dynamic distance scaling: orient health bar mesh to face camera
    // and scale smoothly with distance so ship name & health remain crisp and legible across the sea
    if (nameplateRef.current && nameplateRef.current.visible) {
      // Counteract parent ship pitch/yaw/roll so billboard strictly faces camera screen
      _tempParentQuat.copy(groupRef.current.quaternion);
      nameplateRef.current.quaternion.copy(_tempParentQuat).invert().multiply(camera.quaternion);

      // Distance from camera to ship
      const dx = camera.position.x - groupRef.current.position.x;
      const dy = camera.position.y - (groupRef.current.position.y + nameplateY);
      const dz = camera.position.z - groupRef.current.position.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      // Dynamic scaling: only update when scale changes meaningfully to avoid dirtying Three.js matrixWorld
      const distScale = Math.max(1.0, Math.min(3.0, 0.85 + dist * 0.015));
      const baseScale = isMobile ? 1.05 : 1.25;
      const finalScale = baseScale * distScale;
      if (Math.abs(lastScaleRef.current - finalScale) > 0.02) {
        lastScaleRef.current = finalScale;
        nameplateRef.current.scale.set(finalScale, finalScale, finalScale);
      }
    }




    // 100% Lockstep Chase Camera: camera follows the visual ship transform directly
    if (isSelf && !curShip.isSunk) {
      navalAudio.updateListener(
        groupRef.current.position.x,
        groupRef.current.position.z,
        groupRef.current.rotation.y
      );
      navalAudio.updateAmbienceSpeed(curShip.speed ?? 0);

      updateChaseCamera({
        camera,
        delta,
        elapsedTime: clock.elapsedTime,
        shipX: groupRef.current.position.x,
        shipY: groupRef.current.position.y,
        shipZ: groupRef.current.position.z,
        shipHeading: groupRef.current.rotation.y,
        shipSpeed: curShip.speed ?? 0,
        shipLength: shipLen,
        sailState: curShip.sail,
        aimDirection: store.aimDirection,
        cameraState: cameraState.current,
        shakeEvent: store.cameraShake,
      });

      // Synchronize frustum culler immediately with the fresh camera matrix
      updateFrustum(camera, true);
    }
  });

  const initialShipClass = initialShip?.shipClass || 'brig';
  const initialMaxHp = SHIP_PRESETS[initialShipClass]?.maxHealth || initialShip?.maxHealth || 180;
  const initialCurHp = typeof initialShip?.health === 'number' && !isNaN(initialShip.health)
    ? Math.max(0, initialShip.health)
    : initialMaxHp;
  const initialHpPct = initialMaxHp > 0 ? Math.max(0.001, Math.min(1.0, initialCurHp / initialMaxHp)) : 1.0;

  return (
    <group ref={groupRef}>
      <ShipWakeSplash3D hullRef={groupRef} shipId={targetId} shipLength={shipLen} shipWidth={shipConfig.width} isEnemy={!isSelf} isMobile={isMobile} />
      <ShipModel3D
        shipClass={shipClass}
        sailState={currentSail}
        rudderAngle={0}
        isEnemy={!isSelf}
        shipId={targetId}
        isSelf={isSelf}
        team={isSelf ? selfTeam : playerTeam}
        isFriendly={isFriendly}
      />

      {/* Floating Health Bar and Nameplate for OTHER vessels (Omitted for self player ship) */}
      {!isSelf && (
        <group
          ref={nameplateRef}
          position={[0, nameplateY, 0]}
          renderOrder={10000}
        >
          {/* Captain Name Badge */}
          {nameTexture && (
            <mesh position={[0, 0.44, 0.02]} renderOrder={10004}>
              <planeGeometry args={[3.4, 0.52]} />
              <meshBasicMaterial
                map={nameTexture}
                transparent
                depthTest={false}
                depthWrite={false}
                side={THREE.DoubleSide}
              />
            </mesh>
          )}

          {/* Dark Backing Container */}
          <mesh position={[0, 0, 0]} renderOrder={10001}>
            <planeGeometry args={[3.6, 0.38]} />
            <meshBasicMaterial
              color="#030712"
              opacity={0.92}
              transparent
              depthTest={false}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* Slot Border Track */}
          <mesh position={[0, 0, 0.01]} renderOrder={10002}>
            <planeGeometry args={[3.44, 0.26]} />
            <meshBasicMaterial
              color="#0f172a"
              transparent
              opacity={1.0}
              depthTest={false}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* Real-time 60/120 FPS GPU Health Fill Plane */}
          <mesh
            ref={healthBarMeshRef}
            position={[-1.68 + 1.68 * initialHpPct, 0, 0.02]}
            scale={[initialHpPct, 1, 1]}
            renderOrder={10003}
          >
            <planeGeometry args={[3.36, 0.20]} />
            <meshBasicMaterial
              color={isAllyOrSelf ? '#22c55e' : '#ef4444'}
              transparent
              opacity={1.0}
              depthTest={false}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      )}
    </group>
  );
}, (prev, next) => {
  // Ultra-lean memoization: ShipEntity identity never changes during active combat
  const prevId = prev.shipId || prev.ship?.id;
  const nextId = next.shipId || next.ship?.id;
  return (
    prevId === nextId &&
    prev.isSelf === next.isSelf &&
    prev.isMobile === next.isMobile
  );
});
