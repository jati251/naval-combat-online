import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { FOG_FAR_DESKTOP } from './Environment3D';
import { StaticInstances, type InstanceTransform } from './shared/StaticInstances';
import { useGameStore } from '@/stores/useGameStore';
import { getMapConfig } from '../../maps';

export interface ShipwreckDefinition {
  id: string;
  name: string;
  x: number;
  z: number;
  radius: number;
  heading: number;
  roll: number;
  pitch: number;
  seed: number;
}

export const ARENA_SHIPWRECKS: ShipwreckDefinition[] = [
  {
    id: 'wreck-el-cazador',
    name: 'Wreck of El Cazador',
    x: 40,
    z: 110,
    radius: 14,
    heading: 0.65,
    roll: 0.42,
    pitch: -0.15,
    seed: 88,
  },
  {
    id: 'wreck-queen-anne',
    name: "Queen Anne's Pride",
    x: -140,
    z: -80,
    radius: 12,
    heading: 2.1,
    roll: -0.38,
    pitch: 0.22,
    seed: 142,
  },
  {
    id: 'wreck-royal-fortune',
    name: 'The Royal Fortune',
    x: 130,
    z: -100,
    radius: 13,
    heading: -1.2,
    roll: 0.48,
    pitch: 0.12,
    seed: 275,
  },
];

// Shared Static Geometries & Materials (AC: Black Flag Weathered Timbers)
const hullKeelGeo = new THREE.BoxGeometry(4.2, 5.0, 16.0);
const ribBeamGeo = new THREE.CylinderGeometry(0.22, 0.28, 6.5, 6);
const snappedMastGeo = new THREE.CylinderGeometry(0.35, 0.48, 14.0, 8);
const mastYardGeo = new THREE.CylinderGeometry(0.2, 0.25, 8.0, 6);
const deckPlankGeo = new THREE.BoxGeometry(0.4, 0.18, 3.8);
const rumBarrelGeo = new THREE.CylinderGeometry(0.65, 0.75, 1.4, 10);
const cargoCrateGeo = new THREE.BoxGeometry(1.2, 1.2, 1.2);

const wreckWoodMat = new THREE.MeshStandardMaterial({
  color: '#2a1a0d',
  roughness: 0.88,
  metalness: 0.05,
});

const ribWoodMat = new THREE.MeshStandardMaterial({
  color: '#3f2b1c',
  roughness: 0.92,
  metalness: 0.02,
});

const barnacleWoodMat = new THREE.MeshStandardMaterial({
  color: '#242f2b',
  roughness: 0.85,
  metalness: 0.08,
});

const barrelWoodMat = new THREE.MeshStandardMaterial({
  color: '#4a2f18',
  roughness: 0.8,
  metalness: 0.12,
});

const crateWoodMat = new THREE.MeshStandardMaterial({
  color: '#5a3d24',
  roughness: 0.85,
  metalness: 0.04,
});

const tatteredSailMat = new THREE.MeshStandardMaterial({
  color: '#d6d3d1',
  roughness: 0.95,
  side: THREE.DoubleSide,
  transparent: true,
  opacity: 0.75,
});

/**
 * Individual Floating Shipwreck with listing hull, snapped mast,
 * and drifting batched flotsam bobbing in the waves.
 */
const ShipwreckEntity: React.FC<{ wreck: ShipwreckDefinition }> = React.memo(({ wreck }) => {
  const rootRef = useRef<THREE.Group>(null);
  const groupRef = useRef<THREE.Group>(null);
  const flotsamRef = useRef<THREE.Group>(null);
  const frameCount = useRef(Math.floor(Math.random() * 6));

  // Instanced skeletal rib beams
  const ribInstances = useMemo<InstanceTransform[]>(() => {
    const list: InstanceTransform[] = [];
    for (let i = -6; i <= 6; i += 1.8) {
      list.push({ position: [-1.8, 1.6, i], rotation: [0, 0, -0.35] });
      list.push({ position: [1.8, 1.4, i], rotation: [0, 0, 0.45] });
    }
    return list;
  }, []);

  // Instanced deck planks
  const deckPlankInstances = useMemo<InstanceTransform[]>(() => {
    return [-3, -1, 1, 3].map((pz, idx): InstanceTransform => ({
      position: [idx % 2 ? 0.8 : -0.8, 2.7, pz],
      rotation: [0.1, idx * 0.7, 0.2],
    }));
  }, []);

  // Batched floating flotsam cargo clusters
  const { barrelInstances, crateInstances, floatingPlankInstances } = useMemo(() => {
    const barrels: InstanceTransform[] = [
      { position: [-4.5, 0.9, 3.2], rotation: [0.1, 0.3, 0.15], scale: [1.0, 1.0, 1.0] },
      { position: [-5.6, 0.9, 1.8], rotation: [0.1, 1.2, 0.15], scale: [0.9, 0.9, 0.9] },
      { position: [4.8, 0.9, -2.5], rotation: [0.1, 0.8, 0.15], scale: [1.05, 1.05, 1.05] },
    ];
    const crates: InstanceTransform[] = [
      { position: [5.2, 0.9, 2.1], rotation: [0.1, 0.4, 0.15], scale: [1.1, 1.1, 1.1] },
      { position: [-3.8, 0.9, -4.0], rotation: [0.1, 0.9, 0.15], scale: [0.8, 0.8, 0.8] },
      { position: [3.2, 0.9, -5.4], rotation: [0.1, 0.2, 0.15], scale: [0.95, 0.95, 0.95] },
    ];
    const planks: InstanceTransform[] = [
      { position: [-2.5, 0.9, 5.5], rotation: [0.1, 1.4, 0.15], scale: [1.4, 1.0, 1.6] },
      { position: [4.0, 0.9, 4.8], rotation: [0.1, -0.7, 0.15], scale: [1.3, 1.0, 1.5] },
    ];
    return { barrelInstances: barrels, crateInstances: crates, floatingPlankInstances: planks };
  }, []);

  useFrame((state) => {
    if (!rootRef.current) return;

    // Distance Culling: Skip rendering and animation when veiled in deep fog.
    // Preserves native Three.js GPU frustum culling so shadow maps never flicker.
    frameCount.current++;
    if (frameCount.current % 4 === 0) {
      const dx = state.camera.position.x - wreck.x;
      const dz = state.camera.position.z - wreck.z;
      const distSq = dx * dx + dz * dz;
      const cullDist = FOG_FAR_DESKTOP + 30;
      const withinDist = distSq <= cullDist * cullDist;
      if (rootRef.current.visible !== withinDist) {
        rootRef.current.visible = withinDist;
      }
    }

    if (!rootRef.current.visible || !groupRef.current) return;

    const t = state.clock.getElapsedTime();

    // Gentle ocean swell buoyancy bobbing
    const swell = Math.sin(t * 0.85 + wreck.seed * 0.2) * 0.35;
    const swellPitch = Math.sin(t * 0.6 + wreck.seed * 0.3) * 0.04;
    const swellRoll = Math.cos(t * 0.75 + wreck.seed * 0.4) * 0.05;

    groupRef.current.position.y = swell;
    groupRef.current.rotation.x = wreck.pitch + swellPitch;
    groupRef.current.rotation.z = wreck.roll + swellRoll;

    // Independent flotsam cargo bobbing
    if (flotsamRef.current) {
      flotsamRef.current.position.y = Math.sin(t * 1.2 + wreck.seed) * 0.18;
      flotsamRef.current.rotation.y = Math.sin(t * 0.3 + wreck.seed) * 0.08;
    }
  });

  return (
    <group ref={rootRef} position={[wreck.x, -0.8, wreck.z]} rotation={[0, wreck.heading, 0]}>
      {/* Main Shattered Hull and Skeletal Keel */}
      <group ref={groupRef}>
        {/* Submerged shattered lower hull */}
        <mesh position={[0, 0.4, 0]} geometry={hullKeelGeo} material={barnacleWoodMat} castShadow receiveShadow />

        {/* Broken deck timbers */}
        <mesh position={[0.4, 2.5, -2.0]} geometry={hullKeelGeo} scale={[0.8, 0.3, 0.5]} material={wreckWoodMat} castShadow />

        {/* Exposed skeletal rib beams (Instanced) */}
        <StaticInstances geometry={ribBeamGeo} material={ribWoodMat} instances={ribInstances} castShadow />

        {/* Snapped main mast sticking out into the sky and water */}
        <group position={[0.2, 1.8, 1.5]} rotation={[0.45, 0.2, -0.65]}>
          <mesh position={[0, 6.0, 0]} geometry={snappedMastGeo} material={wreckWoodMat} castShadow />
          {/* Tilted yardarm with dangling ragged sail */}
          <mesh position={[0, 8.5, 0]} rotation={[0, 0, Math.PI / 2]} geometry={mastYardGeo} material={ribWoodMat} castShadow />
          {/* Tattered sailcloth clinging to broken yard */}
          <mesh position={[0, 6.8, 0.2]} rotation={[0.2, 0, 0]}>
            <planeGeometry args={[6.5, 3.2, 4, 3]} />
            <primitive object={tatteredSailMat} attach="material" />
          </mesh>
        </group>

        {/* Snapped bowsprit / forward timber */}
        <mesh position={[0, 1.6, 7.8]} rotation={[-0.5, 0, 0.3]} geometry={snappedMastGeo} scale={[0.8, 0.6, 0.8]} material={wreckWoodMat} castShadow />

        {/* Shattered planks scattered along deck (Instanced) */}
        <StaticInstances geometry={deckPlankGeo} material={wreckWoodMat} instances={deckPlankInstances} castShadow />
      </group>

      {/* Floating flotsam cargo bobbing in ocean around wreck (Batched via InstancedMesh) */}
      <group ref={flotsamRef}>
        <StaticInstances geometry={rumBarrelGeo} material={barrelWoodMat} instances={barrelInstances} castShadow />
        <StaticInstances geometry={cargoCrateGeo} material={crateWoodMat} instances={crateInstances} castShadow />
        <StaticInstances geometry={deckPlankGeo} material={wreckWoodMat} instances={floatingPlankInstances} castShadow />
      </group>
    </group>
  );
});

export const Shipwrecks3D: React.FC<{ isMobile?: boolean }> = React.memo((_props) => {
  const currentMapId = useGameStore((s) => s.currentMapId || s.currentRoom?.mapId || 'caribbean');
  const activeMap = useMemo(() => getMapConfig(currentMapId), [currentMapId]);
  const shipwrecks = activeMap.shipwrecks;

  return (
    <group>
      {shipwrecks.map((wreck) => (
        <ShipwreckEntity key={wreck.id} wreck={wreck} />
      ))}
    </group>
  );
});
