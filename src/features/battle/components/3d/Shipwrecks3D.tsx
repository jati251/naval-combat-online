import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

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

// ────────────────────────────────────────────────────────────────────────────
// Shared Static Geometries & Materials (AC: Black Flag Weathered Timbers)
// ────────────────────────────────────────────────────────────────────────────
const hullKeelGeo = new THREE.BoxGeometry(4.2, 5.0, 16.0);
const ribBeamGeo = new THREE.CylinderGeometry(0.22, 0.28, 6.5, 6);
const snappedMastGeo = new THREE.CylinderGeometry(0.35, 0.48, 14.0, 8);
const mastYardGeo = new THREE.CylinderGeometry(0.2, 0.25, 8.0, 6);
const deckPlankGeo = new THREE.BoxGeometry(0.4, 0.18, 3.8);
const rumBarrelGeo = new THREE.CylinderGeometry(0.65, 0.75, 1.4, 10);
const cargoCrateGeo = new THREE.BoxGeometry(1.2, 1.2, 1.2);
const cargoCrateSmallGeo = new THREE.BoxGeometry(0.85, 0.85, 0.85);

const wreckWoodMat = new THREE.MeshStandardMaterial({
  color: '#2a1a0d', // dark waterlogged oak
  roughness: 0.88,
  metalness: 0.05,
});

const ribWoodMat = new THREE.MeshStandardMaterial({
  color: '#3f2b1c',
  roughness: 0.92,
  metalness: 0.02,
});

const barnacleWoodMat = new THREE.MeshStandardMaterial({
  color: '#242f2b', // seaweed & barnacle encrusted timber
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
 * and drifting flotsam (cargo barrels & crates) bobbing in the waves.
 */
const ShipwreckEntity: React.FC<{ wreck: ShipwreckDefinition }> = React.memo(({ wreck }) => {
  const groupRef = useRef<THREE.Group>(null);
  const flotsamRef = useRef<THREE.Group>(null);

  // Rib beams array for exposed skeletal hull
  const ribs = useMemo(() => {
    const list: Array<[number, number, number, number]> = []; // [x, y, z, rotZ]
    for (let i = -6; i <= 6; i += 1.8) {
      list.push([-1.8, 1.6, i, -0.35]);
      list.push([1.8, 1.4, i, 0.45]);
    }
    return list;
  }, []);

  // Floating cargo cluster (barrels, crates, planks)
  const flotsamItems = useMemo(() => {
    return [
      { type: 'barrel', x: -4.5, z: 3.2, rot: 0.3, scale: 1.0 },
      { type: 'barrel', x: -5.6, z: 1.8, rot: 1.2, scale: 0.9 },
      { type: 'barrel', x: 4.8, z: -2.5, rot: 0.8, scale: 1.05 },
      { type: 'crate', x: 5.2, z: 2.1, rot: 0.4, scale: 1.1 },
      { type: 'crateSmall', x: -3.8, z: -4.0, rot: 0.9, scale: 1.0 },
      { type: 'crate', x: 3.2, z: -5.4, rot: 0.2, scale: 0.95 },
      { type: 'plank', x: -2.5, z: 5.5, rot: 1.4, scale: 1.2 },
      { type: 'plank', x: 4.0, z: 4.8, rot: -0.7, scale: 1.0 },
    ];
  }, []);

  useFrame((state) => {
    if (!groupRef.current) return;
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
    <group position={[wreck.x, -0.8, wreck.z]} rotation={[0, wreck.heading, 0]}>
      {/* Main Shattered Hull and Skeletal Keel */}
      <group ref={groupRef}>
        {/* Submerged shattered lower hull */}
        <mesh position={[0, 0.4, 0]} geometry={hullKeelGeo} material={barnacleWoodMat} castShadow receiveShadow />

        {/* Broken deck timbers */}
        <mesh position={[0.4, 2.5, -2.0]} geometry={hullKeelGeo} scale={[0.8, 0.3, 0.5]} material={wreckWoodMat} castShadow />

        {/* Exposed skeletal rib beams */}
        {ribs.map(([rx, ry, rz, rotZ], idx) => (
          <mesh
            key={`rib-${idx}`}
            position={[rx, ry, rz]}
            rotation={[0, 0, rotZ]}
            geometry={ribBeamGeo}
            material={ribWoodMat}
            castShadow
          />
        ))}

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

        {/* Shattered planks scattered along deck */}
        {[-3, -1, 1, 3].map((pz, pIdx) => (
          <mesh
            key={`plank-${pIdx}`}
            position={[(pIdx % 2 ? 0.8 : -0.8), 2.7, pz]}
            rotation={[0.1, (pIdx * 0.7), 0.2]}
            geometry={deckPlankGeo}
            material={wreckWoodMat}
            castShadow
          />
        ))}
      </group>

      {/* Floating flotsam cargo bobbing in ocean around wreck */}
      <group ref={flotsamRef}>
        {flotsamItems.map((item, fIdx) => (
          <group key={`flotsam-${fIdx}`} position={[item.x, 0.9, item.z]} rotation={[0.1, item.rot, 0.15]} scale={item.scale}>
            {item.type === 'barrel' && (
              <mesh geometry={rumBarrelGeo} material={barrelWoodMat} castShadow />
            )}
            {item.type === 'crate' && (
              <mesh geometry={cargoCrateGeo} material={crateWoodMat} castShadow />
            )}
            {item.type === 'crateSmall' && (
              <mesh geometry={cargoCrateSmallGeo} material={crateWoodMat} castShadow />
            )}
            {item.type === 'plank' && (
              <mesh geometry={deckPlankGeo} scale={[1.4, 1.0, 1.6]} material={wreckWoodMat} castShadow />
            )}
          </group>
        ))}
      </group>
    </group>
  );
});

/**
 * Shipwrecks3D Component: Renders the Caribbean floating shipwrecks and flotsam
 * with collision matching server physics.
 */
export const Shipwrecks3D: React.FC = React.memo(() => {
  return (
    <group>
      {ARENA_SHIPWRECKS.map((wreck) => (
        <ShipwreckEntity key={wreck.id} wreck={wreck} />
      ))}
    </group>
  );
});
