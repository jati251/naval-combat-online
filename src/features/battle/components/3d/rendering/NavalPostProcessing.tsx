import React from "react";
import {
  EffectComposer,
  Bloom,
  Vignette,
  BrightnessContrast,
  HueSaturation,
  ToneMapping,
  FXAA,
} from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import type { GraphicProfile } from "@/features/settings";

interface NavalPostProcessingProps {
  profile: GraphicProfile;
  isNight: boolean;
}

/**
 * Cinematic Post-Processing Pipeline with Unified FXAA Anti-Aliasing.
 * - Fast profile: Lightweight EffectComposer with 0 overhead and pure FXAA pass.
 * - Balanced & Performance profiles: Full cinematic suite (Bloom, Color Grade, Vignette, ToneMapping) + FXAA.
 */
export const NavalPostProcessing: React.FC<NavalPostProcessingProps> = React.memo(({ profile, isNight }) => {
  // Lightweight standalone FXAA on Fast/Mobile to preserve battery and framerate while removing jagged edges
  if (profile.id === "fast") {
    return (
      <EffectComposer multisampling={0} enableNormalPass={false}>
        <FXAA />
      </EffectComposer>
    );
  }

  const isUltra = profile.id === "performance";

  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      {/* Cinematic Photorealistic Bloom: Specular sun glints, lanterns, cannon fire, explosions */}
      <Bloom
        luminanceThreshold={isNight ? 0.85 : 1.05}
        luminanceSmoothing={0.15}
        mipmapBlur
        levels={isUltra ? 3 : 2}
        intensity={isUltra ? (isNight ? 0.85 : 0.55) : 0.35}
        radius={isUltra ? 0.35 : 0.28}
      />

      {/* Cinematic Contrast & Color Grading */}
      <BrightnessContrast
        brightness={isNight ? 0.01 : 0.02}
        contrast={isUltra ? 0.05 : 0.03}
      />

      {/* Oceanic Vibrancy & Saturation */}
      <HueSaturation
        saturation={isUltra ? 0.05 : 0.03}
      />

      {/* Subtle Maritime Lens Vignette */}
      <Vignette
        darkness={isNight ? 0.46 : (isUltra ? 0.36 : 0.28)}
        offset={0.35}
      />

      {/* ACES Filmic Tone Mapping to compress HDR luminance smoothly */}
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />

      {/* Unified Fast Approximate Anti-Aliasing (FXAA) to eliminate all jaggies and wireframe shimmer */}
      <FXAA />
    </EffectComposer>
  );
});

