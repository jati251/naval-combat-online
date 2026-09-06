import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '@/stores/useGameStore';

export interface BuoyDefinition {
  id: string;
  x: number;
  z: number;
  color: 'amber' | 'emerald' | 'ruby';
  phase: number;
}

// Strategic channel and reef navigation buoys per map
export const MAP_BUOYS: Record<string, BuoyDefinition[]> = {
  kingston: [
    { id: 'k-buoy-1', x: 2, z: 88, color: 'emerald', phase: 0 },
    { id: 'k-buoy-2', x: -18, z: 88, color: 'ruby', phase: 1.2 },
    { id: 'k-buoy-3', x: 28, z: 124, color: 'amber', phase: 2.4 },
    { id: 'k-buoy-4', x: -35, z: 124, color: 'amber', phase: 3.6 },
    { id: 'k-buoy-5', x: 75, z: 30, color: 'emerald', phase: 4.8 },
  ],
  caribbean: [
    { id: 'c-buoy-1', x: -60, z: 45, color: 'amber', phase: 0 },
    { id: 'c-buoy-2', x: 50, z: -35, color: 'emerald', phase: 1.5 },
    { id: 'c-buoy-3', x: 25, z: 80, color: 'ruby', phase: 3.0 },
    { id: 'c-buoy-4', x: -110, z: -40, color: 'amber', phase: 4.5 },
  ],
  gulf: [
    { id: 'g-buoy-1', x: 10, z: -60, color: 'emerald', phase: 0.5 },
    { id: 'g-buoy-2', x: -20, z: 50, color: 'ruby', phase: 2.0 },
    { id: 'g-buoy-3', x: 65, z: 20, color: 'amber', phase: 3.5 },
  ],
};

const barrelGeo = new THREE.CylinderGeometry(0.7, 0.55, 1.4, 10);
const cageGeo = new THREE.CylinderGeometry(0.4, 0.72, 1.6, 6, 1, true);
const lanternGeo = new THREE.BoxGeometry(0.35, 0.45, 0.35);
const postGeo = new THREE.CylinderGeometry(0.06, 0.08, 2.2, 6);

const buoyWoodMat = new THREE.MeshStandardMaterial({
  color: '#422a1d',
  roughness: 0.85,
  metalness: 0.1,
});

const ironCageMat = new THREE.MeshStandardMaterial({
  color: '#27272a',
  roughness: 0.6,
  metalness: 0.8,
});

interface SingleBuoyProps {
  buoy: BuoyDefinition;
  isMobile?: boolean;
}

const SingleBuoy: React.FC<SingleBuoyProps> = React.memo(({ buoy, isMobile = false }) => {
  const groupRef = useRef<THREE.Group>(null);
  const lanternRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  const glowColor = buoy.color === 'emerald' ? '#34d399' : buoy.color === 'ruby' ? '#f87171' : '#fbbf24';
  const emissiveColor = buoy.color === 'emerald' ? '#059669' : buoy.color === 'ruby' ? '#dc2626' : '#d97706';

  const lanternMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: glowColor,
    emissive: emissiveColor,
    emissiveIntensity: 2.5,
    roughness: 0.2,
  }), [glowColor, emissiveColor]);
  useEffect(() => () => lanternMat.dispose(), [lanternMat]);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.getElapsedTime();

    // Ocean swell buoyancy bobbing with gentle roll & pitch
    const swellY = Math.sin(t * 1.6 + buoy.phase) * 0.22;
    const rollZ = Math.sin(t * 1.2 + buoy.phase) * 0.12;
    const pitchX = Math.cos(t * 1.4 + buoy.phase) * 0.08;

    groupRef.current.position.y = swellY;
    groupRef.current.rotation.z = rollZ;
    groupRef.current.rotation.x = pitchX;

    // Subtle beacon breathing pulse
    const pulse = 2.0 + Math.sin(t * 3.0 + buoy.phase) * 0.8;
    lanternMat.emissiveIntensity = pulse;
    if (lightRef.current) {
      lightRef.current.intensity = pulse * 0.8;
    }
  });

  return (
    <group position={[buoy.x, 0.4, buoy.z]}>
      <group ref={groupRef}>
        {/* Floating Heavy Wood Buoy Keg */}
        <mesh position={[0, 0.2, 0]} geometry={barrelGeo} material={buoyWoodMat} castShadow={!isMobile} receiveShadow />

        {/* Pyramidal Iron Lattice Cage */}
        <mesh position={[0, 1.2, 0]} geometry={cageGeo} material={ironCageMat} castShadow={!isMobile} />

        {/* Central Mast Post */}
        <mesh position={[0, 1.3, 0]} geometry={postGeo} material={ironCageMat} />

        {/* Beacon Lantern Box */}
        <mesh ref={lanternRef} position={[0, 2.2, 0]} geometry={lanternGeo} material={lanternMat} />

        {/* Night / Twilight Beacon Glow */}
        {!isMobile && (
          <pointLight
            ref={lightRef}
            color={emissiveColor}
            intensity={2.2}
            distance={18}
            decay={2}
            position={[0, 2.3, 0]}
          />
        )}
      </group>
    </group>
  );
});

export const NavigationBuoys3D: React.FC<{ isMobile?: boolean }> = React.memo(({ isMobile = false }) => {
  const currentMapId = useGameStore((s) => s.currentMapId || s.currentRoom?.mapId || 'caribbean');
  const buoys = useMemo(() => MAP_BUOYS[currentMapId] || MAP_BUOYS.caribbean, [currentMapId]);

  return (
    <group>
      {buoys.map((buoy) => (
        <SingleBuoy key={buoy.id} buoy={buoy} isMobile={isMobile} />
      ))}
    </group>
  );
});
