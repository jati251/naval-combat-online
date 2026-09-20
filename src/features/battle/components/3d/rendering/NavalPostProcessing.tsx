import React from 'react';
import { EffectComposer, Bloom, ToneMapping, FXAA } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import type { GraphicProfile } from '@/features/settings';

export const NavalPostProcessing = React.memo(function NavalPostProcessing({profile,isNight}: {
  profile: GraphicProfile; isNight: boolean;
}) {
  return <EffectComposer multisampling={0} enableNormalPass={false}>
    {profile.id !== 'fast' ? <Bloom luminanceThreshold={1.4} luminanceSmoothing={0.4}
      mipmapBlur levels={profile.id==='performance'?4:3} intensity={isNight?0.22:0.12} radius={0.45} /> : <></>}
    <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    <FXAA />
  </EffectComposer>;
});
