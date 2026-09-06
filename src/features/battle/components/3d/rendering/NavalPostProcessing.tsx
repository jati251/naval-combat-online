import React from 'react';
import {
  EffectComposer,
  Bloom,
  Vignette,
  BrightnessContrast,
  HueSaturation,
} from '@react-three/postprocessing';
import type { GraphicProfile } from '@/features/settings';

interface NavalPostProcessingProps {
  profile: GraphicProfile;
  isNight: boolean;
}

/**
 * Lightweight Cinematic Post-Processing Pipeline.
 * Deliberately avoids heavy full-screen passes (N8AO/SSAO, SMAA)
 * which cause catastrophic frame drops in WebGL.
 * Canvas-level antialias + ACES tone mapping handle the rest.
 */
export const NavalPostProcessing: React.FC<NavalPostProcessingProps> = React.memo(({ profile, isNight }) => {
  // Disable post-processing on Fast/Mobile to preserve battery and maximum framerate
  if (profile.id === 'fast') {
    return null;
  }

  const isUltra = profile.id === 'performance';

  return (
    <EffectComposer multisampling={0}>
      {/* Cinematic Photorealistic Bloom: Specular sun glints, lanterns, wave crest highlights */}
      <Bloom
        luminanceThreshold={isNight ? 0.62 : 0.78}
        luminanceSmoothing={0.25}
        mipmapBlur
        levels={isUltra ? 4 : 3}
        intensity={isUltra ? (isNight ? 1.0 : 0.85) : 0.5}
        radius={isUltra ? 0.45 : 0.35}
      />

      {/* Cinematic Contrast & Color Grading */}
      <BrightnessContrast
        brightness={isNight ? 0.01 : 0.02}
        contrast={isUltra ? 0.06 : 0.04}
      />

      {/* Oceanic Vibrancy & Saturation */}
      <HueSaturation
        saturation={isUltra ? 0.06 : 0.03}
      />

      {/* Subtle Maritime Lens Vignette */}
      <Vignette
        darkness={isNight ? 0.48 : (isUltra ? 0.38 : 0.30)}
        offset={0.32}
      />
    </EffectComposer>
  );
});
