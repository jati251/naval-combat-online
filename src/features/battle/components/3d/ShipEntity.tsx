import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { ShipModel3D } from './ShipModel3D';
import { ShipWakeSplash3D } from './ShipWakeSplash3D';
import { MAX_VIEW_DISTANCE, NAMEPLATE_CULL_DISTANCE } from './Environment3D';
import { SHIP_PRESETS } from '@/types';
import type { ShipEntityProps } from '../../types/entities';
import {
  createDeadReckoningBuffer,
  pushSnapshot,
  extrapolatePosition,
} from '../../utils/deadReckoning';
import { createInitialCameraState, updateChaseCamera } from '../../utils/cameraController';
import { lerpAngle, damp } from '../../utils/math';
import { useGameStore } from '@/stores/useGameStore';

export const ShipEntity: React.FC<ShipEntityProps> = React.memo(({ ship, isSelf, isMobile = false }) => {
  const groupRef = useRef<THREE.Group>(null);

  // High-precision dead reckoning extrapolation buffer
  const drBuffer = useRef(
    createDeadReckoningBuffer(ship.x, ship.y + 0.85, ship.z, ship.rotationY)
  );

  // Dedicated chase camera state for player ship
  const cameraState = useRef(createInitialCameraState());

  const nameplateRef = useRef<THREE.Group>(null);
  const frameCount = useRef(Math.floor(Math.random() * 6));
  const isInitialized = useRef(false);
  const prevWasSunk = useRef(ship.isSunk);

  // Smooth interpolation with dead reckoning, distance culling, and 100% lockstep camera
  useFrame((state, delta) => {
    const { camera, clock } = state;
    if (!groupRef.current) return;

    // Always fetch latest real-time snapshot from store to prevent stale closure during memoization
    const store = useGameStore.getState();
    const curShip = store.ships.find((s) => s.id === ship.id) || ship;

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

      // 1. Distance Culling: Skip rendering ships beyond view distance
      const inView = isSelf || distSq <= MAX_VIEW_DISTANCE * MAX_VIEW_DISTANCE;
      if (groupRef.current.visible !== inView) {
        groupRef.current.visible = inView;
      }

      // 2. Nameplate Culling (Tighter culling radius on mobile)
      if (!isSelf && nameplateRef.current) {
        const maxNameplateDist = isMobile ? 65 : NAMEPLATE_CULL_DISTANCE;
        const shouldShow = inView && distSq <= maxNameplateDist * maxNameplateDist;
        if (nameplateRef.current.visible !== shouldShow) {
          nameplateRef.current.visible = shouldShow;
        }
      }
    }

    if (!groupRef.current.visible) return;

    // Mobile billboard orientation: orient health bar mesh to face camera without Drei DOM overhead
    if (!isSelf && isMobile && nameplateRef.current && nameplateRef.current.visible) {
      nameplateRef.current.quaternion.copy(camera.quaternion);
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
      updateChaseCamera({
        camera,
        delta,
        elapsedTime: clock.elapsedTime,
        shipX: groupRef.current.position.x,
        shipY: groupRef.current.position.y,
        shipZ: groupRef.current.position.z,
        shipHeading: groupRef.current.rotation.y,
        shipSpeed: curShip.speed ?? 0,
        aimDirection: store.aimDirection,
        cameraState: cameraState.current,
        shakeEvent: store.cameraShake,
      });
    }
  });

  const hpPercent = Math.max(0, Math.min(100, (ship.health / ship.maxHealth) * 100));
  const shipConfig = SHIP_PRESETS[ship.shipClass] || SHIP_PRESETS.brig;
  const shipLen = shipConfig.length || 18;
  const shipWid = shipConfig.width || 6;
  const nameplateY = shipLen * 0.76 + 3.6;

  return (
    <group ref={groupRef}>
      <ShipModel3D
        shipClass={ship.shipClass}
        sailState={ship.sail}
        rudderAngle={ship.rudder}
        isEnemy={!isSelf}
      />

      {/* Dynamic Stern Wake Spray & 2D Bubbles (Reads live state directly) */}
      <ShipWakeSplash3D
        shipId={ship.id}
        shipLength={shipLen}
        shipWidth={shipWid}
        isEnemy={!isSelf}
        isMobile={isMobile}
      />

      {/* Floating Health Bar and Nameplate (Culled for enemy vessels, hidden for player ship) */}
      {!isSelf && (
        <group ref={nameplateRef} position={[0, nameplateY, 0]} visible={false}>
          {isMobile ? (
            /* On mobile: lightweight 3D billboard health bar with 0 DOM mutations */
            <group scale={[1.2, 1.2, 1.2]}>
              {/* Dark Backing Bar */}
              <mesh position={[0, 0, 0]}>
                <planeGeometry args={[3.2, 0.42]} />
                <meshBasicMaterial color="#020617" opacity={0.88} transparent depthWrite={false} />
              </mesh>
              {/* Border Outline */}
              <mesh position={[0, 0, 0.01]}>
                <planeGeometry args={[3.0, 0.28]} />
                <meshBasicMaterial color="#1e293b" depthWrite={false} />
              </mesh>
              {/* Health Fill Bar */}
              <mesh
                position={[-1.45 + (1.45 * hpPercent) / 100, 0, 0.02]}
                scale={[Math.max(0.001, hpPercent / 100), 1, 1]}
              >
                <planeGeometry args={[2.9, 0.22]} />
                <meshBasicMaterial
                  color={hpPercent > 50 ? '#34d399' : hpPercent > 25 ? '#fbbf24' : '#f43f5e'}
                  depthWrite={false}
                />
              </mesh>
            </group>
          ) : (
            <Html center distanceFactor={45}>
              <div className="flex flex-col items-center pointer-events-none select-none">
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-950/85 border border-slate-700/60 shadow-md text-[10px] font-bold tracking-wide uppercase">
                  <span className="text-amber-300">{ship.name}</span>
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
      )}
    </group>
  );
}, (prev, next) => {
  // Memoization: Only re-render when structural attributes change
  // High-frequency transforms (position, rotation, pitch, roll) are read in useFrame from store
  return (
    prev.ship.id === next.ship.id &&
    prev.ship.shipClass === next.ship.shipClass &&
    prev.ship.sail === next.ship.sail &&
    prev.ship.isSunk === next.ship.isSunk &&
    prev.ship.health === next.ship.health &&
    prev.isSelf === next.isSelf &&
    prev.isMobile === next.isMobile
  );
});
