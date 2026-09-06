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
import { useShallow } from 'zustand/react/shallow';
import { useBattleCamera } from '../../hooks/useBattleCamera';
import { useMobileViewport } from '@/hooks/useMobileViewport';
import { AdaptiveResolution } from './rendering/AdaptiveResolution';
import { NavigationBuoys3D } from './props/NavigationBuoys3D';

const BattleCameraRig: React.FC = () => {
  useBattleCamera();
  return null;
};

const FleetEntities: React.FC<{ isMobile: boolean }> = React.memo(({ isMobile }) => {
  const shipIds = useGameStore(useShallow((s) => s.ships.map((ship) => ship.id)));
  const selfId = useGameStore((s) => s.selfId);
  const isSelfAlive = useGameStore((s) => {
    const self = s.ships.find((ship) => ship.id === s.selfId);
    return Boolean(self && !self.isSunk);
  });

  return (
    <>
      {!isSelfAlive && <BattleCameraRig />}
      {shipIds.map((id) => (
        <ShipEntity
          key={id}
          shipId={id}
          isSelf={id === selfId}
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

  const isMobile = useMobileViewport();

  return (
    <div className={`w-full h-full absolute inset-0 ${isNight ? 'bg-slate-950' : 'bg-sky-700'}`}>
      <Canvas
        camera={{ position: [0, 25, -45], fov: 55, near: 0.5, far: 1400 }}
        shadows={!isMobile}
        dpr={isMobile ? [1, 1.5] : [1, 2]}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: isNight ? 1.24 : 1.28,
        }}
      >
        <AdaptiveResolution isMobile={isMobile} />
        <color attach="background" args={[bgColor]} />
        <Environment3D isMobile={isMobile} />
        <OceanWater isMobile={isMobile} />
        <Islands3D isMobile={isMobile} />
        <Shipwrecks3D isMobile={isMobile} />
        <NavigationBuoys3D isMobile={isMobile} />
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
