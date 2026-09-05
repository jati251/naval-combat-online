import React from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { OceanWater } from './OceanWater';
import { CannonSystem3D } from './CannonSystem3D';
import { CannonFX2D } from './CannonFX2D';
import { Environment3D, FOG_COLOR } from './Environment3D';
import { Islands3D } from './Islands3D';
import { Shipwrecks3D } from './Shipwrecks3D';
import { JumpingFish3D } from './JumpingFish3D';
import { MapBoundary3D } from './MapBoundary3D';
import { CaribbeanSeabirds3D } from './CaribbeanSeabirds3D';
import { OceanAtmosphereParticles3D } from './OceanAtmosphereParticles3D';
import { ShipEntity } from './ShipEntity';
import { useGameStore } from '@/stores/useGameStore';
import { useBattleCamera } from '../../hooks/useBattleCamera';

const BattleCameraRig: React.FC = () => {
  useBattleCamera();
  return null;
};

const FleetEntities: React.FC = React.memo(() => {
  const ships = useGameStore((s) => s.ships);
  const selfId = useGameStore((s) => s.selfId);

  return (
    <>
      <BattleCameraRig />
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
