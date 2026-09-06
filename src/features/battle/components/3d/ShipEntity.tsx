import React, { useRef, useMemo, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { ShipModel3D } from './ShipModel3D';
import { ShipWakeSplash3D } from './ShipWakeSplash3D';
import {
  MAX_VIEW_DISTANCE_DESKTOP,
  MAX_VIEW_DISTANCE_MOBILE,
  NAMEPLATE_CULL_DISTANCE,
  NAMEPLATE_CULL_DISTANCE_MOBILE,
} from './Environment3D';
import { SHIP_PRESETS, type SailState } from '@/types';
import type { ShipEntityProps } from '../../types/entities';
import {
  createDeadReckoningBuffer,
  pushSnapshot,
  extrapolatePosition,
} from '../../utils/deadReckoning';
import { createInitialCameraState, updateChaseCamera } from '../../utils/cameraController';
import { lerpAngle, damp } from '../../utils/math';
import { useGameStore } from '@/stores/useGameStore';
import { findShip } from '@/stores/selectors/shipLookup';
import { navalAudio } from '../../services/navalAudio';

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
  const shipWid = shipConfig.width || 6;
  const mastHeight = shipLen * 0.85;
  const nameplateY = mastHeight + 3.2;

  const [currentSail, setCurrentSail] = useState<SailState>(initialShip?.sail || 'HALF_SAIL');
  const curSailRef = useRef<SailState>(initialShip?.sail || 'HALF_SAIL');

  const groupRef = useRef<THREE.Group>(null);
  const healthBarMeshRef = useRef<THREE.Mesh>(null);

  const isTeamMode = useGameStore((s) => s.currentRoom?.gameMode === 'TEAM');
  const selfTeam = useGameStore((s) => s.currentRoom?.players.find((p) => p.id === s.selfId)?.team);
  const playerTeam = useGameStore((s) => s.currentRoom?.players.find((p) => p.id === targetId)?.team);
  const isFriendly = isTeamMode && Boolean(selfTeam && playerTeam && selfTeam === playerTeam);
  const isAllyOrSelf = isSelf || (isTeamMode ? isFriendly : false);

  // High-precision dead reckoning extrapolation buffer
  const drBuffer = useRef(
    createDeadReckoningBuffer(
      initialShip?.x ?? 0,
      (initialShip?.y ?? 0) + 0.85,
      initialShip?.z ?? 0,
      initialShip?.rotationY ?? 0
    )
  );

  // Dedicated chase camera state for player ship
  const cameraState = useRef(createInitialCameraState());

  const nameplateRef = useRef<THREE.Group>(null);
  const frameCount = useRef(Math.floor(Math.random() * 6));
  const isInitialized = useRef(false);
  const prevWasSunk = useRef(initialShip?.isSunk ?? false);
  const shipName = initialShip?.name || 'Vessel';

  // Lightweight 2D canvas texture for ship name badge (rendered once into WebGL texture, 0 DOM overhead)
  const nameTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 48;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.clearRect(0, 0, 256, 48);

    // Dark pill background (emerald tone for allies/self, crimson tone for enemies)
    ctx.fillStyle = isAllyOrSelf
      ? 'rgba(4, 30, 18, 0.92)'
      : 'rgba(38, 7, 12, 0.92)';

    if ('roundRect' in ctx && typeof ctx.roundRect === 'function') {
      ctx.beginPath();
      ctx.roundRect(6, 4, 244, 40, 8);
      ctx.fill();
    } else {
      ctx.fillRect(6, 4, 244, 40);
    }

    // Border outline: Hijau untuk kawan, Merah untuk musuh
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = isAllyOrSelf
      ? 'rgba(34, 197, 94, 0.85)'
      : 'rgba(239, 68, 68, 0.85)';

    if ('roundRect' in ctx && typeof ctx.roundRect === 'function') {
      ctx.beginPath();
      ctx.roundRect(6, 4, 244, 40, 8);
      ctx.stroke();
    } else {
      ctx.strokeRect(6, 4, 244, 40);
    }

    // Text label: Ship name with optional squad tag
    ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = isAllyOrSelf ? '#86efac' : '#fca5a5';
    const tag = isSelf ? '[YOU] ' : (isTeamMode ? (isFriendly ? '[ALLY] ' : '[FOE] ') : '');
    ctx.fillText(`${tag}${shipName}`, 128, 24);

    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
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

    // Real-time GPU update for Floating Health Bar (Zero React re-render overhead during damage)
    if (healthBarMeshRef.current) {
      const maxHp = curShip.maxHealth || 180;
      const curHp = Math.max(0, curShip.health ?? maxHp);
      const hpPct = Math.max(0, Math.min(100, (curHp / maxHp) * 100));
      healthBarMeshRef.current.scale.x = Math.max(0.001, hpPct / 100);
      healthBarMeshRef.current.position.x = -1.45 + (1.45 * hpPct) / 100;
    }

    // Infrequent sail state transition (only updates local state when sail changes)
    if (curShip.sail && curShip.sail !== curSailRef.current) {
      curSailRef.current = curShip.sail;
      setCurrentSail(curShip.sail);
    }

    // Respawn snap detection: if ship was sunk and is now alive, or large position teleport
    const wasSunk = prevWasSunk.current;
    prevWasSunk.current = curShip.isSunk;

    const distSqFromTarget =
      (groupRef.current.position.x - curShip.x) ** 2 + (groupRef.current.position.z - curShip.z) ** 2;

    if ((wasSunk && !curShip.isSunk) || distSqFromTarget > 2500) {
      drBuffer.current = createDeadReckoningBuffer(
        curShip.x,
        curShip.y + 0.85,
        curShip.z,
        curShip.rotationY
      );
      groupRef.current.position.set(curShip.x, curShip.y + 0.85, curShip.z);
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

    // Throttled distance check once every 6 frames
    frameCount.current++;
    if (frameCount.current % 6 === 0) {
      const dx = camera.position.x - curShip.x;
      const dz = camera.position.z - curShip.z;
      const distSq = dx * dx + dz * dz;

      // 1. Distance Culling: Skip rendering ships beyond view distance (fully veiled by fog)
      const maxViewDist = isMobile ? MAX_VIEW_DISTANCE_MOBILE : MAX_VIEW_DISTANCE_DESKTOP;
      const inView = isSelf || distSq <= maxViewDist * maxViewDist;
      if (groupRef.current.visible !== inView) {
        groupRef.current.visible = inView;
      }

      // 2. Nameplate Culling (Tighter culling radius for non-self ships)
      if (nameplateRef.current) {
        if (isSelf) {
          nameplateRef.current.visible = inView;
        } else {
          const maxNameplateDist = isMobile ? NAMEPLATE_CULL_DISTANCE_MOBILE : NAMEPLATE_CULL_DISTANCE;
          const shouldShow = inView && distSq <= maxNameplateDist * maxNameplateDist;
          if (nameplateRef.current.visible !== shouldShow) {
            nameplateRef.current.visible = shouldShow;
          }
        }
      }
    }

    if (!groupRef.current.visible) return;

    // Billboard orientation & dynamic distance scaling: orient health bar mesh to face camera
    // and scale with distance so ship name & health remain crisp and legible across the sea
    if (nameplateRef.current && nameplateRef.current.visible) {
      // Counteract parent ship pitch/yaw/roll so billboard strictly faces camera screen
      groupRef.current.getWorldQuaternion(_tempParentQuat);
      nameplateRef.current.quaternion.copy(_tempParentQuat).invert().multiply(camera.quaternion);

      // Distance from camera to ship
      const dx = camera.position.x - groupRef.current.position.x;
      const dy = camera.position.y - (groupRef.current.position.y + nameplateY);
      const dz = camera.position.z - groupRef.current.position.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      // Dynamic scaling: at 20m scale is ~1.0x, smoothly expanding up to 2.8x at long combat range
      const distScale = Math.max(1.0, Math.min(2.8, 0.75 + dist * 0.014));
      const baseScale = isMobile ? 1.15 : 1.35;
      const finalScale = baseScale * distScale;
      nameplateRef.current.scale.set(finalScale, finalScale, finalScale);
    }

    // First frame initialization (snap immediately without initial sweeping lerp)
    if (!isInitialized.current) {
      groupRef.current.position.set(curShip.x, curShip.isSunk ? curShip.y : curShip.y + 0.85, curShip.z);
      groupRef.current.rotation.y = curShip.rotationY;
      groupRef.current.rotation.x = curShip.pitch;
      groupRef.current.rotation.z = curShip.roll;
      isInitialized.current = true;
    } else {
      // Extrapolate smooth target with collision clamping
      const target = extrapolatePosition(drBuffer.current, curShip.isSunk);

      // High-precision smooth transform damping (60-120fps)
      groupRef.current.position.x = damp(groupRef.current.position.x, target.x, 24, delta);
      groupRef.current.position.y = damp(groupRef.current.position.y, target.y, 16, delta);
      groupRef.current.position.z = damp(groupRef.current.position.z, target.z, 24, delta);

      // Shortest-arc angle wrapping
      groupRef.current.rotation.y = lerpAngle(groupRef.current.rotation.y, target.heading, Math.min(1.0, 20 * delta));
      groupRef.current.rotation.x = damp(groupRef.current.rotation.x, curShip.pitch, 12, delta);
      groupRef.current.rotation.z = damp(groupRef.current.rotation.z, curShip.roll, 12, delta);
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
        sailState: curShip.sail,
        aimDirection: store.aimDirection,
        cameraState: cameraState.current,
        shakeEvent: store.cameraShake,
      });
    }
  });

  const initialHpPercent = Math.max(
    0,
    Math.min(100, ((initialShip?.health ?? 180) / (initialShip?.maxHealth || 180)) * 100)
  );

  return (
    <group ref={groupRef}>
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

      {/* Dynamic Stern Wake Spray & 2D Bubbles (Reads live state directly) */}
      <ShipWakeSplash3D
        shipId={targetId}
        shipLength={shipLen}
        shipWidth={shipWid}
        isEnemy={!isSelf}
        isMobile={isMobile}
      />

      {/* Floating Health Bar and Nameplate (Always visible, billboarding to camera, no depth clipping) */}
      <group
        ref={nameplateRef}
        position={[0, nameplateY, 0]}
        scale={isMobile ? [1.15, 1.15, 1.15] : [1.35, 1.35, 1.35]}
        renderOrder={9999}
      >
        <group>
          {/* 3D WebGL Ship Name Badge */}
          {nameTexture && (
            <mesh position={[0, 0.46, 0]} renderOrder={10000}>
              <planeGeometry args={[3.2, 0.54]} />
              <meshBasicMaterial
                map={nameTexture}
                transparent
                depthTest={false}
                depthWrite={false}
                side={THREE.DoubleSide}
              />
            </mesh>
          )}

          {/* Dark Backing Bar */}
          <mesh position={[0, 0, 0]} renderOrder={9998}>
            <planeGeometry args={[3.2, 0.36]} />
            <meshBasicMaterial
              color="#030712"
              opacity={0.92}
              transparent
              depthTest={false}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* Border Outline */}
          <mesh position={[0, 0, 0]} renderOrder={9999}>
            <planeGeometry args={[3.04, 0.22]} />
            <meshBasicMaterial
              color="#1e293b"
              depthTest={false}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* Real-time GPU Health Fill Bar (Hijau untuk kawan/self, Merah untuk musuh) */}
          <mesh
            ref={healthBarMeshRef}
            position={[-1.45 + (1.45 * initialHpPercent) / 100, 0, 0]}
            scale={[Math.max(0.001, initialHpPercent / 100), 1, 1]}
            renderOrder={10001}
          >
            <planeGeometry args={[2.9, 0.18]} />
            <meshBasicMaterial
              color={isAllyOrSelf ? '#22c55e' : '#ef4444'}
              depthTest={false}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      </group>
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
