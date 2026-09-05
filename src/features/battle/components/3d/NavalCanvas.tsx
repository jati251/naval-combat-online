import React, { useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { OceanWater } from './OceanWater';
import { ShipModel3D } from './ShipModel3D';
import { CannonSystem3D } from './CannonSystem3D';
import { Environment3D, FOG_COLOR, MAX_VIEW_DISTANCE, NAMEPLATE_CULL_DISTANCE } from './Environment3D';
import { Islands3D } from './Islands3D';
import { MapBoundary3D } from './MapBoundary3D';
import { CaribbeanSeabirds3D } from './CaribbeanSeabirds3D';
import { OceanAtmosphereParticles3D } from './OceanAtmosphereParticles3D';
import { useGameStore } from '@/stores/useGameStore';
import { useBattleCamera } from '../../hooks/useBattleCamera';
import { CONTROL_CONFIG } from '../../utils/controls';
import type { ShipSnapshot } from '@/types/game';

function shortestAngleDiff(from: number, to: number): number {
  const diff = (to - from) % (Math.PI * 2);
  return ((diff + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
}

function lerpAngle(current: number, target: number, alpha: number): number {
  return current + shortestAngleDiff(current, target) * alpha;
}

interface ShipEntityProps {
  ship: ShipSnapshot;
  isSelf: boolean;
}

const ShipEntity: React.FC<ShipEntityProps> = React.memo(
  ({ ship, isSelf }) => {
    const groupRef = useRef<THREE.Group>(null);
    const shipRef = useRef(ship);
    shipRef.current = ship;

    const [showNameplate, setShowNameplate] = useState(isSelf);
    const frameCount = useRef(Math.floor(Math.random() * 6));
    const isInitialized = useRef(false);

    const aimDirection = useGameStore((s) => s.aimDirection);
    const currentAimSide = useRef(0);
    const currentAimFwd = useRef(0);

    // Smooth interpolation towards server snapshot with game dev distance culling
    useFrame(({ camera }, delta) => {
      if (!groupRef.current) return;
      const curShip = shipRef.current;

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

      // Natural ship draft seating with proud freeboard above ocean swells
      const targetY = curShip.isSunk ? curShip.y : curShip.y + 0.85;

      // First frame initialization (snap without initial lerp sweep)
      if (!isInitialized.current) {
        groupRef.current.position.set(curShip.x, targetY, curShip.z);
        groupRef.current.rotation.y = curShip.rotationY;
        groupRef.current.rotation.x = curShip.pitch;
        groupRef.current.rotation.z = curShip.roll;
        isInitialized.current = true;
      } else {
        // High-precision smooth transform interpolation
        groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, curShip.x, Math.min(1.0, 16 * delta));
        groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, targetY, Math.min(1.0, 16 * delta));
        groupRef.current.position.z = THREE.MathUtils.lerp(groupRef.current.position.z, curShip.z, Math.min(1.0, 16 * delta));

        // Continuous shortest-arc angle wrapping
        groupRef.current.rotation.y = lerpAngle(groupRef.current.rotation.y, curShip.rotationY, Math.min(1.0, 14 * delta));
        groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, curShip.pitch, Math.min(1.0, 10 * delta));
        groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, curShip.roll, Math.min(1.0, 10 * delta));
      }

      // 100% Lockstep Chase Camera: Eliminates all 30Hz server tick snapping & rotational jitter
      if (isSelf) {
        const heading = groupRef.current.rotation.y;
        const sinH = Math.sin(heading);
        const cosH = Math.cos(heading);

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

        const sOffset = currentAimSide.current;
        const fOffset = currentAimFwd.current;

        const posX = groupRef.current.position.x;
        const posY = groupRef.current.position.y;
        const posZ = groupRef.current.position.z;

        camera.position.x = posX - sinH * CONTROL_CONFIG.CAMERA_DISTANCE + cosH * sOffset + sinH * fOffset;
        camera.position.y = posY + CONTROL_CONFIG.CAMERA_HEIGHT;
        camera.position.z = posZ - cosH * CONTROL_CONFIG.CAMERA_DISTANCE - sinH * sOffset + cosH * fOffset;

        camera.lookAt(posX + sinH * 6, posY + 3.5, posZ + cosH * 6);
      }
    });

    const hpPercent = Math.max(0, Math.min(100, (ship.health / ship.maxHealth) * 100));

    return (
      <group ref={groupRef} position={[ship.x, ship.y + 0.85, ship.z]}>
        <ShipModel3D
          shipClass={ship.shipClass}
          sailState={ship.sail}
          rudderAngle={ship.rudder}
          isEnemy={!isSelf}
        />

        {/* Floating Health Bar and Nameplate (Culled beyond 110m for enemy ships) */}
        {showNameplate && (
          <Html position={[0, 14.5, 0]} center distanceFactor={45}>
            <div className="flex flex-col items-center pointer-events-none select-none">
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-900/90 border border-slate-700/80 shadow text-[10px] font-bold tracking-wide text-slate-200 uppercase">
                <span className={isSelf ? 'text-cyan-400 font-extrabold' : 'text-amber-400'}>
                  {ship.name}
                </span>
                {isSelf && <span className="text-[8px] bg-cyan-950 text-cyan-300 px-1 py-0.2 rounded border border-cyan-800">YOU</span>}
              </div>

              <div className="w-24 h-1.5 bg-slate-950/80 border border-slate-700 rounded-full overflow-hidden mt-1 p-0.2">
                <div
                  className={`h-full rounded-full transition-all duration-150 ${
                    hpPercent > 50 ? 'bg-emerald-500' : hpPercent > 25 ? 'bg-amber-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${hpPercent}%` }}
                />
              </div>
            </div>
          </Html>
        )}
      </group>
    );
  },
  (prev, next) => {
    // Only re-render if visual state changes (pure position updates are handled at 120 FPS by shipRef & useFrame)
    return (
      prev.ship.id === next.ship.id &&
      prev.ship.health === next.ship.health &&
      prev.ship.maxHealth === next.ship.maxHealth &&
      prev.ship.isSunk === next.ship.isSunk &&
      prev.ship.sail === next.ship.sail &&
      prev.ship.rudder === next.ship.rudder &&
      prev.ship.name === next.ship.name &&
      prev.ship.shipClass === next.ship.shipClass &&
      prev.isSelf === next.isSelf
    );
  }
);

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
  return <CannonSystem3D cannonballs={cannonballs} />;
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
        <MapBoundary3D />
        <CaribbeanSeabirds3D />
        <OceanAtmosphereParticles3D />
        <FleetEntities />
        <CannonEntities />
      </Canvas>
    </div>
  );
});

