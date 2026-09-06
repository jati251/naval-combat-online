import React from "react";
import {
  EffectComposer,
  Bloom,
  Vignette,
  BrightnessContrast,
  HueSaturation,
  ToneMapping,
} from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import type { GraphicProfile } from "@/features/settings";

interface NavalPostProcessingProps {
  profile: GraphicProfile;
  isNight: boolean;
}

/**
 * Lightweight Cinematic Post-Processing Pipeline.
 * Features optimized Bloom with clamped luminance threshold and ACES Filmic Tone Mapping
 * to eliminate HDR blowout / glare flickering on ocean waves and ship surfaces.
 */
export const NavalPostProcessing: React.FC<NavalPostProcessingProps> = React.memo(({ profile, isNight }) => {
  // Disable post-processing on Fast/Mobile to preserve battery and maximum framerate
  if (profile.id === "fast") {
    return null;
  }

  const isUltra = profile.id === "performance";

  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      {/* Cinematic Photorealistic Bloom: Specular sun glints, lanterns, wave crest highlights */}
      <Bloom
        luminanceThreshold={isNight ? 0.65 : 0.82}
        luminanceSmoothing={0.3}
        mipmapBlur
        levels={isUltra ? 3 : 2}
        intensity={isUltra ? (isNight ? 0.9 : 0.75) : 0.45}
        radius={isUltra ? 0.4 : 0.3}
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
    </EffectComposer>
  );
});
