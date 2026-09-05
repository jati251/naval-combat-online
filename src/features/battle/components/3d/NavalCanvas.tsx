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

const FleetEntities: React.FC<{ isMobile: boolean }> = React.memo(({ isMobile }) => {
  const ships = useGameStore((s) => s.ships);
  const selfId = useGameStore((s) => s.selfId);
  const hasSelfShip = useGameStore((s) => s.ships.some((ship) => ship.id === s.selfId && !ship.isSunk));

  return (
    <>
      {!hasSelfShip && <BattleCameraRig />}
      {ships.map((ship) => (
        <ShipEntity
          key={ship.id}
          ship={ship}
          isSelf={ship.id === selfId}
          isMobile={isMobile}
        />
      ))}
    </>
  );
});

const CannonEntities: React.FC<{ isMobile: boolean }> = React.memo(({ isMobile }) => {
  return (
    <>
      <CannonSystem3D />
      <CannonFX2D isMobile={isMobile} />
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
        camera={{ position: [0, 25, -45], fov: 55, near: 0.5, far: 1400 }}
        shadows={!isMobile}
        dpr={isMobile ? [1.5, 2.25] : [1.5, 2.0]}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: isNight ? 1.05 : 1.28,
        }}
      >
        <color attach="background" args={[bgColor]} />
        <Environment3D isMobile={isMobile} />
        <OceanWater isMobile={isMobile} />
        <Islands3D isMobile={isMobile} />
        <Shipwrecks3D isMobile={isMobile} />
        <JumpingFish3D />
        <MapBoundary3D isMobile={isMobile} />
        {!isNight && <CaribbeanSeabirds3D />}
        <OceanAtmosphereParticles3D isMobile={isMobile} />
        <FleetEntities isMobile={isMobile} />
        <CannonEntities isMobile={isMobile} />
      </Canvas>
    </div>
  );
});
