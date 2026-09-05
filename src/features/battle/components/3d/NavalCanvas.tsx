import React, { useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { OceanWater } from './OceanWater';
import { ShipModel3D } from './ShipModel3D';
import { CannonSystem3D } from './CannonSystem3D';
import { Environment3D, FOG_COLOR, MAX_VIEW_DISTANCE, NAMEPLATE_CULL_DISTANCE } from './Environment3D';
import { Islands3D } from './Islands3D';
import { useGameStore } from '@/stores/useGameStore';
import { useBattleCamera } from '../../hooks/useBattleCamera';
import type { ShipSnapshot } from '@/types/game';

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

const ShipEntity: React.FC<ShipEntityProps> = ({ ship, isSelf }) => {
  const groupRef = useRef<THREE.Group>(null);
  const [showNameplate, setShowNameplate] = useState(isSelf);
  const frameCount = useRef(Math.floor(Math.random() * 6));

  // Smooth interpolation towards server snapshot with game dev distance culling
  useFrame(({ camera }, delta) => {
    if (!groupRef.current) return;

    // Throttled distance check once every 6 frames
    frameCount.current++;
    if (frameCount.current % 6 === 0) {
      const dx = camera.position.x - ship.x;
      const dz = camera.position.z - ship.z;
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
    const targetY = ship.isSunk ? ship.y : ship.y + 0.85;

    // Position interpolation (lerp)
    groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, ship.x, Math.min(1.0, 16 * delta));
    groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, targetY, Math.min(1.0, 16 * delta));
    groupRef.current.position.z = THREE.MathUtils.lerp(groupRef.current.position.z, ship.z, Math.min(1.0, 16 * delta));

    // Rotation interpolation with shortest-arc angle wrapping
    groupRef.current.rotation.y = lerpAngle(groupRef.current.rotation.y, ship.rotationY, Math.min(1.0, 14 * delta));
    groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, ship.pitch, Math.min(1.0, 10 * delta));
    groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, ship.roll, Math.min(1.0, 10 * delta));
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
};

const CameraRig: React.FC = () => {
  useBattleCamera();
  return null;
};

export const NavalCanvas: React.FC = () => {
  const ships = useGameStore((s) => s.ships);
  const cannonballs = useGameStore((s) => s.cannonballs);
  const selfId = useGameStore((s) => s.selfId);

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
        <CameraRig />

        {/* Render Ships */}
        {ships.map((ship) => (
          <ShipEntity key={ship.id} ship={ship} isSelf={ship.id === selfId} />
        ))}

        {/* Render Cannonballs */}
        <CannonSystem3D cannonballs={cannonballs} />
      </Canvas>
    </div>
  );
};

