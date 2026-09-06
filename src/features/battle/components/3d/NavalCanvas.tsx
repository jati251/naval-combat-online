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
import { NavalPostProcessing } from './rendering/NavalPostProcessing';

import { useGraphicsQuality } from '@/features/settings';

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
  const { profile } = useGraphicsQuality();
  const activeIsMobile = profile ? profile.id === 'fast' : isMobile;

  const exposure = isNight ? profile.toneMappingExposureNight : profile.toneMappingExposureDay;

  return (
    <div className={`w-full h-full absolute inset-0 ${isNight ? 'bg-slate-950' : 'bg-sky-700'}`}>
      <Canvas
        camera={{ position: [0, 25, -45], fov: 55, near: 0.5, far: profile.id === 'performance' ? 1600 : 1400 }}
        shadows={profile.shadows}
        dpr={profile.dpr}

        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: exposure,
        }}
        onCreated={({ gl }) => {
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
        }}
      >
        <AdaptiveResolution isMobile={activeIsMobile} dprRange={profile.dpr} />
        <color attach="background" args={[bgColor]} />
        <Environment3D isMobile={activeIsMobile} profile={profile} />
        <OceanWater isMobile={activeIsMobile} profile={profile} />
        <Islands3D isMobile={activeIsMobile} />
        <Shipwrecks3D isMobile={activeIsMobile} />
        <NavigationBuoys3D isMobile={activeIsMobile} />
        <JumpingFish3D />
        <MapBoundary3D isMobile={activeIsMobile} />
        {!isNight && <CaribbeanSeabirds3D />}
        <OceanAtmosphereParticles3D isMobile={activeIsMobile} particleCount={profile.atmosphereParticles} />
        <FleetEntities isMobile={activeIsMobile} />
        <CannonEntities isMobile={activeIsMobile} />
        <NavalPostProcessing profile={profile} isNight={isNight} />
      </Canvas>
    </div>
  );
});
