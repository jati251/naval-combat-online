import React, { useRef, useState } from 'react';
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

export const ShipEntity: React.FC<ShipEntityProps> = React.memo(({ ship, isSelf }) => {
  const groupRef = useRef<THREE.Group>(null);

  // High-precision dead reckoning extrapolation buffer
  const drBuffer = useRef(
    createDeadReckoningBuffer(ship.x, ship.y + 0.85, ship.z, ship.rotationY)
  );

  // Dedicated chase camera state for player ship
  const cameraState = useRef(createInitialCameraState());

  const [showNameplate, setShowNameplate] = useState(false);
  const frameCount = useRef(Math.floor(Math.random() * 6));
  const isInitialized = useRef(false);

  // Smooth interpolation with dead reckoning, distance culling, and 100% lockstep camera
  useFrame((state, delta) => {
    const { camera, clock } = state;
    if (!groupRef.current) return;

    // Always fetch latest real-time snapshot from store to prevent stale closure during memoization
    const store = useGameStore.getState();
    const curShip = store.ships.find((s) => s.id === ship.id) || ship;

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

      // 2. Nameplate Culling: Only mount Drei Html overlay when close (110m)
      if (!isSelf) {
        const shouldShow = inView && distSq <= NAMEPLATE_CULL_DISTANCE * NAMEPLATE_CULL_DISTANCE;
        if (showNameplate !== shouldShow) {
          setShowNameplate(shouldShow);
        }
      }
    }

    if (!groupRef.current.visible) return;

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
      />

      {/* Floating Health Bar and Nameplate (Culled beyond 110m for enemy vessels, hidden for player ship) */}
      {!isSelf && showNameplate && (
        <Html position={[0, nameplateY, 0]} center distanceFactor={45}>
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
    prev.isSelf === next.isSelf
  );
});
