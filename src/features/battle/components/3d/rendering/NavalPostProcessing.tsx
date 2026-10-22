import React, { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import {
  EffectComposer,
  Bloom,
  ToneMapping,
  FXAA,
  Vignette,
  ChromaticAberration,
  HueSaturation,
} from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import type { GraphicProfile } from '@/features/settings';
import { useThree } from '@react-three/fiber';

export const NavalPostProcessing = React.memo(function NavalPostProcessing({
  profile,
  isNight,
}: {
  profile: GraphicProfile;
  isNight: boolean;
}) {
  const gl = useThree((state) => state.gl);
  const isFast = profile.id === 'fast';
  const isExtreme = profile.id === 'performance';

  const chromaticOffset = useMemo(
    () => new THREE.Vector2(0.0008, 0.0008),
    []
  );

  useEffect(() => {
    gl.toneMapping = isFast ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping;
    gl.toneMappingExposure = isNight
      ? profile.toneMappingExposureNight
      : profile.toneMappingExposureDay;
    return () => {
      gl.toneMapping = THREE.ACESFilmicToneMapping;
    };
  }, [gl, isFast, isNight, profile]);

  if (isFast) return null;

  return (
    <EffectComposer
      multisampling={isExtreme ? 4 : 0}
      enableNormalPass={false}
    >
      {/* Cinematic Maritime Bloom: vibrant cannon fire, explosions, sun glints, lanterns */}
      <Bloom
        luminanceThreshold={isNight ? 0.72 : 0.85}
        luminanceSmoothing={0.35}
        resolutionScale={0.5}
        mipmapBlur
        levels={isExtreme ? 5 : 4}
        intensity={isNight ? (isExtreme ? 0.38 : 0.28) : (isExtreme ? 0.26 : 0.18)}
        radius={0.52}
      />

      {/* Cinematic Color Grading & Vibrant Contrast */}
      <HueSaturation saturation={0.06} hue={0} />

      {/* Subtle Anamorphic Camera Lens Dispersion at Screen Edges */}
      <ChromaticAberration
        offset={chromaticOffset}
        radialModulation
        modulationOffset={0.32}
      />

      {/* 35mm Filmic Vignette Framing the Epic Naval Battle */}
      <Vignette
        eskil={false}
        offset={0.36}
        darkness={isNight ? 0.45 : 0.26}
      />

      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />

      {!isExtreme && <FXAA />}
    </EffectComposer>
  );
});
