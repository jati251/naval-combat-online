import React from 'react';
import { Sky } from '@react-three/drei';

export const Environment3D: React.FC = () => {
  return (
    <>
      {/* Realistic Sea Sky with Low Sun */}
      <Sky
        distance={450000}
        sunPosition={[150, 45, 120]}
        inclination={0.4}
        azimuth={0.25}
        mieCoefficient={0.005}
        mieDirectionalG={0.8}
        rayleigh={0.6}
        turbidity={8}
      />

      {/* Atmospheric Horizon Ocean Fog */}
      <fog attach="fog" args={['#071a2c', 80, 500]} />

      {/* Sunlight */}
      <directionalLight
        position={[150, 100, 120]}
        intensity={2.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0001}
      />

      {/* Ambient Sea Light */}
      <ambientLight intensity={0.45} color="#60a5fa" />
      <hemisphereLight args={['#bfdbfe', '#064e3b', 0.6]} />
    </>
  );
};
