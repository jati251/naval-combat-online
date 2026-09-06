import React from 'react';
import {
  EffectComposer,
  Bloom,
  Vignette,
  BrightnessContrast,
  HueSaturation,
  SMAA,
  N8AO,
} from '@react-three/postprocessing';
import type { GraphicProfile } from '@/features/settings';

interface NavalPostProcessingProps {
  profile: GraphicProfile;
  isNight: boolean;
}

export const NavalPostProcessing: React.FC<NavalPostProcessingProps> = React.memo(({ profile, isNight }) => {
  // Disable post-processing on Fast/Mobile to preserve battery and maximum framerate
  if (profile.id === 'fast') {
    return null;
  }

  const isUltra = profile.id === 'performance';

  return (
    <EffectComposer multisampling={isUltra ? 0 : 2}>
      {/* AAA Screen-Space Ambient Occlusion (N8AO): contact shadows under hull, cannons, and rigging */}
      {isUltra && (
        <N8AO
          halfRes
          depthAwareUpsampling
          aoSamples={10}
          denoiseSamples={4}
          denoiseRadius={12}
          aoRadius={2.4}
          distanceFalloff={1.2}
          intensity={1.5}
          color="#020617"
        />
      )}

      {/* Cinematic Photorealistic Bloom: Specular sun glints, lanterns, wave crest highlights */}
      <Bloom
        luminanceThreshold={isNight ? 0.62 : 0.78}
        luminanceSmoothing={0.25}
        mipmapBlur
        levels={5}
        intensity={isUltra ? (isNight ? 1.35 : 1.1) : 0.6}
        radius={isUltra ? 0.65 : 0.4}
      />

      {/* Cinematic Contrast & Color Grading */}
      <BrightnessContrast
        brightness={isNight ? 0.01 : 0.02}
        contrast={isUltra ? 0.08 : 0.04}
      />

      {/* Oceanic Vibrancy & Saturation */}
      <HueSaturation
        saturation={isUltra ? 0.08 : 0.03}
      />

      {/* Subtle Maritime Lens Vignette */}
      <Vignette
        darkness={isNight ? 0.52 : (isUltra ? 0.42 : 0.32)}
        offset={0.32}
      />

      {/* Ultra Subpixel Morphological Antialiasing (SMAA) for crisp ship rigging and wave facets */}
      {isUltra && <SMAA />}
    </EffectComposer>
  );
});
