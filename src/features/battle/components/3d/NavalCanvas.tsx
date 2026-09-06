import React, { useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { OceanWater } from "./OceanWater";
import { CannonSystem3D } from "./CannonSystem3D";
import { CannonFX2D } from "./CannonFX2D";
import { Environment3D } from "./Environment3D";
import { Islands3D } from "./Islands3D";
import { Shipwrecks3D } from "./Shipwrecks3D";
import { JumpingFish3D } from "./JumpingFish3D";
import { MapBoundary3D } from "./MapBoundary3D";
import { CaribbeanSeabirds3D } from "./CaribbeanSeabirds3D";
import { OceanAtmosphereParticles3D } from "./OceanAtmosphereParticles3D";
import { ShipEntity } from "./ShipEntity";
import { useGameStore } from "@/stores/useGameStore";
import { useShallow } from "zustand/react/shallow";
import { useBattleCamera } from "../../hooks/useBattleCamera";
import { useMobileViewport } from "@/hooks/useMobileViewport";
import { AdaptiveResolution } from "./rendering/AdaptiveResolution";
import { NavigationBuoys3D } from "./props/NavigationBuoys3D";
import { NavalPostProcessing } from "./rendering/NavalPostProcessing";
import { setFrameId } from "../../utils/frustumCuller";
import { getMapConfig } from "../../maps";

import { useGraphicsQuality } from "@/features/settings";

/**
 * Syncs the frustum culler's frame counter at the very start of each render frame.
 * Runs at priority -100 (before all other useFrame hooks) so that all entity
 * frustum checks within the same frame reuse the same cached frustum planes.
 */
const FrustumFrameSync: React.FC = () => {
  const frameCounter = useRef(0);
  useFrame(() => {
    setFrameId(++frameCounter.current);
  }, -100); // Priority -100: runs before all other useFrame callbacks
  return null;
};

const BattleCameraRig: React.FC = () => {
  useBattleCamera();
  return null;
};

const FleetEntities: React.FC<{ isMobile: boolean }> = React.memo(
  ({ isMobile }) => {
    const shipIds = useGameStore(
      useShallow((s) => s.ships.map((ship) => ship.id)),
    );
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
  },
);

const CannonEntities: React.FC<{ isMobile: boolean }> = React.memo(
  ({ isMobile }) => {
    return (
      <>
        <CannonSystem3D />
        <CannonFX2D isMobile={isMobile} />
      </>
    );
  },
);

export const NavalCanvas: React.FC = React.memo(() => {
  const timeOfDay = useGameStore((s) => s.timeOfDay);
  const isNight = timeOfDay === "NIGHT";
  const currentMapId = useGameStore(
    (s) => s.currentMapId || s.currentRoom?.mapId || "caribbean",
  );
  const activeMap = useMemo(() => getMapConfig(currentMapId), [currentMapId]);
  const skyClearColor = isNight
    ? activeMap.atmosphere.skyTopNight
    : activeMap.atmosphere.skyTopDay;

  const isMobile = useMobileViewport();
  const { profile } = useGraphicsQuality();
  const activeIsMobile = profile ? profile.id === "fast" : isMobile;

  const exposure = isNight
    ? profile.toneMappingExposureNight
    : profile.toneMappingExposureDay;

  return (
    <div
      className={`w-full h-full absolute inset-0 ${isNight ? "bg-slate-950" : "bg-sky-700"}`}
    >
      <Canvas
        camera={{ position: [0, 25, -45], fov: 55, near: 1.0, far: 2000 }}
        shadows={profile.shadows}
        dpr={profile.dpr}
        gl={{
          antialias: false,
          alpha: false,
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: exposure,
        }}
        onCreated={({ gl }) => {
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
        }}
      >
        <FrustumFrameSync />
        <AdaptiveResolution isMobile={activeIsMobile} dprRange={profile.dpr} />
        <color attach="background" args={[skyClearColor]} />
        <Environment3D isMobile={activeIsMobile} profile={profile} />
        <OceanWater isMobile={activeIsMobile} profile={profile} />
        <Islands3D isMobile={activeIsMobile} />
        <Shipwrecks3D isMobile={activeIsMobile} />
        <NavigationBuoys3D isMobile={activeIsMobile} />
        <JumpingFish3D />
        <MapBoundary3D isMobile={activeIsMobile} />
        {!isNight && <CaribbeanSeabirds3D />}
        <OceanAtmosphereParticles3D
          isMobile={activeIsMobile}
          particleCount={profile.atmosphereParticles}
        />
        <FleetEntities isMobile={activeIsMobile} />
        <CannonEntities isMobile={activeIsMobile} />
        <NavalPostProcessing profile={profile} isNight={isNight} />
      </Canvas>
    </div>
  );
});
