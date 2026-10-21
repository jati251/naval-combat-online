import React, { useEffect } from 'react';
import * as THREE from 'three';
import { EffectComposer, Bloom, ToneMapping, FXAA } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import type { GraphicProfile } from '@/features/settings';
import { useThree } from '@react-three/fiber';

export const NavalPostProcessing = React.memo(function NavalPostProcessing({profile,isNight}: {
  profile: GraphicProfile; isNight: boolean;
}) {
  const gl = useThree(state => state.gl);
  const isFast = profile.id === 'fast';
  useEffect(() => {
    gl.toneMapping = isFast ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping;
    gl.toneMappingExposure = isNight ? profile.toneMappingExposureNight : profile.toneMappingExposureDay;
    return () => {
      gl.toneMapping = THREE.ACESFilmicToneMapping;
    };
  }, [gl, isFast, isNight, profile]);

  if (isFast) return null;

  return <EffectComposer multisampling={profile.id === 'performance' ? 4 : 0} enableNormalPass={false}>
    <Bloom luminanceThreshold={1.4} luminanceSmoothing={0.4}
      resolutionScale={0.5} mipmapBlur levels={profile.id==='performance'?4:3}
      intensity={isNight?0.18:0.09} radius={0.45} />
    <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    {profile.id === 'performance' ? <></> : <FXAA />}
  </EffectComposer>;
});
