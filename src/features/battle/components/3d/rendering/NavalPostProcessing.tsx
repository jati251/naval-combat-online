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

  if (!isExtreme) {
    // Balanced Tier: Web-optimized single-pass post-processing pipeline with FXAA
    return (
      <EffectComposer multisampling={0} enableNormalPass={false}>
        <Bloom
          luminanceThreshold={isNight ? 0.74 : 0.84}
          luminanceSmoothing={0.35}
          resolutionScale={0.5}
          mipmapBlur
          levels={4}
          intensity={isNight ? 0.30 : 0.20}
          radius={0.50}
        />
        <HueSaturation saturation={0.07} hue={0} />
        <Vignette
          eskil={false}
          offset={0.36}
          darkness={isNight ? 0.44 : 0.25}
        />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        <FXAA />
      </EffectComposer>
    );
  }

  // Max Tier (Black Flag Resynced): MSAA + Full HDR Mipmap Bloom + Anamorphic Lens Dispersion
  return (
    <EffectComposer
      multisampling={4}
      enableNormalPass={false}
    >
      {/* Cinematic Maritime Bloom: vibrant cannon fire, explosions, diamond sun glints, lanterns */}
      <Bloom
        luminanceThreshold={isNight ? 0.70 : 0.80}
        luminanceSmoothing={0.32}
        resolutionScale={0.5}
        mipmapBlur
        levels={5}
        intensity={isNight ? 0.42 : 0.30}
        radius={0.56}
      />

      {/* Cinematic Color Grading & Vibrant Contrast */}
      <HueSaturation saturation={0.09} hue={0} />

      {/* Subtle Anamorphic Camera Lens Dispersion at Screen Edges */}
      <ChromaticAberration
        offset={chromaticOffset}
        radialModulation
        modulationOffset={0.34}
      />

      {/* 35mm Filmic Vignette Framing the Epic Naval Battle */}
      <Vignette
        eskil={false}
        offset={0.36}
        darkness={isNight ? 0.46 : 0.27}
      />

      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  );
});
