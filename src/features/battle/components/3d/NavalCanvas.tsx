import React, { useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { OceanWater } from './OceanWater';
import { ShipModel3D } from './ShipModel3D';
import { CannonSystem3D } from './CannonSystem3D';
import { Environment3D } from './Environment3D';
import { Islands3D } from './Islands3D';
import { PostProcessing3D } from './PostProcessing3D';
import { useGameStore } from '@/stores/useGameStore';
import { useBattleCamera } from '../../hooks/useBattleCamera';
import type { ShipSnapshot } from '@/types/game';

interface ShipEntityProps {
  ship: ShipSnapshot;
  isSelf: boolean;
}

const ShipEntity: React.FC<ShipEntityProps> = ({ ship, isSelf }) => {
  const groupRef = useRef<THREE.Group>(null);

  // Smooth interpolation towards server snapshot
  useFrame((_, delta) => {
    if (!groupRef.current) return;

    // Adjust ship buoyancy height so deck stays dry above ocean swells
    const targetY = ship.isSunk ? ship.y : ship.y + 0.95;

    // Position interpolation (lerp)
    groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, ship.x, Math.min(1.0, 15 * delta));
    groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, targetY, Math.min(1.0, 15 * delta));
    groupRef.current.position.z = THREE.MathUtils.lerp(groupRef.current.position.z, ship.z, Math.min(1.0, 15 * delta));

    // Rotation interpolation
    groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, ship.rotationY, Math.min(1.0, 12 * delta));
    groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, ship.pitch, Math.min(1.0, 10 * delta));
    groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, ship.roll, Math.min(1.0, 10 * delta));
  });

  const hpPercent = Math.max(0, Math.min(100, (ship.health / ship.maxHealth) * 100));

  return (
    <group ref={groupRef} position={[ship.x, ship.y + 0.95, ship.z]}>
      <ShipModel3D
        shipClass={ship.shipClass}
        sailState={ship.sail}
        rudderAngle={ship.rudder}
        isEnemy={!isSelf}
      />

      {/* Floating Health Bar and Nameplate */}
      <Html position={[0, 9.5, 0]} center distanceFactor={45}>
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
    <div className="w-full h-full absolute inset-0 bg-slate-950">
      <Canvas
        camera={{ position: [0, 25, -45], fov: 55, near: 0.5, far: 2000 }}
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

        {/* Subtle Bloom Post-processing on bright highlights */}
        <PostProcessing3D />
      </Canvas>
    </div>
  );
};

