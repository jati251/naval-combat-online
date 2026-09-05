import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Sky } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';

/**
 * Atmospheric Caribbean Cumulus Clouds
 * Procedurally grouped cloud puffs that drift slowly across the ocean sky.
 */
const CaribbeanClouds: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);

  // Generate randomized positions for Caribbean cloud formations
  const cloudClusters = useMemo(() => {
    const clusters: Array<{
      id: number;
      x: number;
      y: number;
      z: number;
      scale: number;
      puffs: Array<[number, number, number, number]>;
    }> = [];

    const numClouds = 16;
    for (let i = 0; i < numClouds; i++) {
      const angle = (i / numClouds) * Math.PI * 2 + (Math.random() * 0.4 - 0.2);
      const dist = 600 + Math.random() * 700;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      const y = 220 + Math.random() * 90;
      const scale = 1.6 + Math.random() * 1.8;

      // 5 overlapping puffs per cloud cluster, flattened horizontally
      const puffs: Array<[number, number, number, number]> = [];
      const puffCount = 5;
      for (let p = 0; p < puffCount; p++) {
        puffs.push([
          (Math.random() - 0.5) * 45,
          (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 40,
          14 + Math.random() * 16,
        ]);
      }

      clusters.push({ id: i, x, y, z, scale, puffs });
    }

    return clusters;
  }, []);

  useFrame((_, delta) => {
    if (groupRef.current) {
      // Gentle wind drift
      groupRef.current.position.x += delta * 1.4;
      if (groupRef.current.position.x > 400) {
        groupRef.current.position.x = -400;
      }
    }
  });

  return (
    <group ref={groupRef}>
      {cloudClusters.map((c) => (
        <group
          key={c.id}
          position={[c.x, c.y, c.z]}
          scale={[c.scale * 2.2, c.scale * 0.45, c.scale * 1.8]}
        >
          {c.puffs.map(([px, py, pz, radius], pIdx) => (
            <mesh key={pIdx} position={[px, py, pz]}>
              <sphereGeometry args={[radius, 8, 6]} />
              <meshStandardMaterial
                color="#f4faff"
                roughness={0.98}
                metalness={0.02}
                transparent
                opacity={0.62}
                depthWrite={false}
              />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
};

export const Environment3D: React.FC = () => {
  const sunPos: [number, number, number] = [140, 65, 110];

  return (
    <>
      {/* Deep Caribbean Azure Blue Sky */}
      <Sky
        distance={450000}
        sunPosition={sunPos}
        inclination={0.48}
        azimuth={0.25}
        mieCoefficient={0.003}
        mieDirectionalG={0.88}
        rayleigh={2.2}
        turbidity={1.6}
      />

      {/* Atmospheric Horizon Ocean Fog */}
      <fog attach="fog" args={['#5ca2d2', 400, 1800]} />

      {/* Main Caribbean Sunlight with Balanced Intensity & Soft Shadows */}
      <directionalLight
        position={sunPos}
        intensity={1.4}
        color="#fff5e0"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={10}
        shadow-camera-far={450}
        shadow-camera-left={-90}
        shadow-camera-right={90}
        shadow-camera-top={90}
        shadow-camera-bottom={-90}
        shadow-bias={-0.0003}
      />

      {/* Balanced Sky & Ocean Ambient Lighting */}
      <ambientLight intensity={0.35} color="#dbeafe" />
      <hemisphereLight args={['#bfdbfe', '#004c59', 0.55]} />

      {/* Drifting Caribbean Cumulus Clouds */}
      <CaribbeanClouds />
    </>
  );
};


