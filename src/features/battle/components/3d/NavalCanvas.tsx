import React from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { OceanWater } from './OceanWater';
import { CannonSystem3D } from './CannonSystem3D';
import { CannonFX2D } from './CannonFX2D';
import { Environment3D, FOG_COLOR, NIGHT_FOG_COLOR } from './Environment3D';
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
  const hasSelfShip = ships.some((s) => s.id === selfId && !s.isSunk);

  return (
    <>
      {!hasSelfShip && <BattleCameraRig />}
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
  const timeOfDay = useGameStore((s) => s.timeOfDay);
  const isNight = timeOfDay === 'NIGHT';
  const bgColor = isNight ? NIGHT_FOG_COLOR : FOG_COLOR;

  // Detect mobile device or touch viewport
  const isMobile = typeof window !== 'undefined' && (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    window.innerWidth <= 1024
  );

  return (
    <div className={`w-full h-full absolute inset-0 ${isNight ? 'bg-slate-950' : 'bg-sky-700'}`}>
      <Canvas
        camera={{ position: [0, 25, -45], fov: 55, near: 0.5, far: 1200 }}
        shadows={!isMobile}
        dpr={isMobile ? 1 : [1, 1.5]}
        gl={{
          antialias: !isMobile,
          alpha: false,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: isNight ? 1.05 : 1.15,
        }}
      >
        <color attach="background" args={[bgColor]} />
        <Environment3D />
        <OceanWater isMobile={isMobile} />
        <Islands3D />
        <Shipwrecks3D />
        {!isMobile && <JumpingFish3D />}
        <MapBoundary3D />
        {!isMobile && !isNight && <CaribbeanSeabirds3D />}
        {!isMobile && <OceanAtmosphereParticles3D />}
        <FleetEntities />
        <CannonEntities />
      </Canvas>
    </div>
  );
});
