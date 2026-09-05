import React, { useMemo } from 'react';
import * as THREE from 'three';

export interface IslandDefinition {
  id: string;
  name: string;
  x: number;
  z: number;
  radius: number;
  height: number;
  sandRadius: number;
  palms: Array<[number, number, number]>; // [relX, relZ, scale]
}

export const ARENA_ISLANDS: IslandDefinition[] = [
  {
    id: 'dead-mans-cay',
    name: "Dead Man's Cay",
    x: -150,
    z: 140,
    radius: 38,
    height: 22,
    sandRadius: 52,
    palms: [
      [-12, 10, 1.2],
      [14, -8, 1.0],
      [-5, -16, 1.3],
      [18, 12, 0.9],
      [6, 18, 1.1],
    ],
  },
  {
    id: 'isla-de-la-muerte',
    name: 'Isla de la Muerte',
    x: 160,
    z: -130,
    radius: 46,
    height: 28,
    sandRadius: 62,
    palms: [
      [-18, -12, 1.3],
      [16, 14, 1.1],
      [-10, 20, 1.4],
      [22, -10, 1.0],
      [0, -22, 1.2],
      [-22, 5, 0.9],
    ],
  },
  {
    id: 'smugglers-reef',
    name: "Smuggler's Reef",
    x: 130,
    z: 80,
    radius: 26,
    height: 16,
    sandRadius: 38,
    palms: [
      [-8, 6, 1.1],
      [10, -5, 1.0],
      [2, 12, 1.2],
    ],
  },
  {
    id: 'tortuga-atoll',
    name: 'Tortuga Atoll',
    x: -140,
    z: -120,
    radius: 32,
    height: 18,
    sandRadius: 45,
    palms: [
      [-10, -8, 1.2],
      [12, 9, 1.1],
      [-6, 14, 1.3],
      [14, -12, 0.9],
    ],
  },
];

/**
 * Procedural Caribbean Palm Tree
 */
const PalmTree: React.FC<{ position: [number, number, number]; scale?: number }> = ({
  position,
  scale = 1,
}) => {
  return (
    <group position={position} scale={scale}>
      {/* Curved Wood Trunk */}
      <mesh position={[0, 3.2, 0]} rotation={[0.08, 0, 0.12]} castShadow>
        <cylinderGeometry args={[0.22, 0.45, 6.8, 6]} />
        <meshStandardMaterial color="#4a2e18" roughness={0.9} />
      </mesh>

      {/* Palm Crown Fronds */}
      <group position={[0.4, 6.6, 0.3]}>
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const angle = (i / 6) * Math.PI * 2;
          return (
            <mesh
              key={i}
              position={[Math.cos(angle) * 1.5, -0.2, Math.sin(angle) * 1.5]}
              rotation={[0.35, angle, 0]}
              castShadow
            >
              <coneGeometry args={[1.4, 3.6, 4]} />
              <meshStandardMaterial color="#1b6336" roughness={0.8} side={THREE.DoubleSide} />
            </mesh>
          );
        })}
      </group>
    </group>
  );
};

export const Islands3D: React.FC = () => {
  const materials = useMemo(() => {
    return {
      sand: new THREE.MeshStandardMaterial({
        color: '#d6a86c',
        roughness: 0.95,
        metalness: 0.02,
      }),
      rock: new THREE.MeshStandardMaterial({
        color: '#475569',
        roughness: 0.88,
        metalness: 0.08,
      }),
      vegetation: new THREE.MeshStandardMaterial({
        color: '#155e37',
        roughness: 0.85,
      }),
    };
  }, []);

  return (
    <group>
      {ARENA_ISLANDS.map((island) => (
        <group key={island.id} position={[island.x, 0, island.z]}>
          {/* Low Sandy Beach Shoal / Perimeter */}
          <mesh position={[0, 0.8, 0]} receiveShadow material={materials.sand}>
            <cylinderGeometry args={[island.radius * 1.1, island.sandRadius, 2.4, 20]} />
          </mesh>

          {/* Tropical Vegetation Shelf */}
          <mesh position={[0, 2.2, 0]} receiveShadow material={materials.vegetation}>
            <cylinderGeometry args={[island.radius * 0.92, island.radius * 1.05, 1.8, 16]} />
          </mesh>

          {/* Main Limestone Sea Cliff Peak */}
          <mesh
            position={[0, island.height * 0.45 + 1.5, 0]}
            castShadow
            receiveShadow
            material={materials.rock}
          >
            <coneGeometry args={[island.radius * 0.75, island.height, 10]} />
          </mesh>

          {/* Secondary Crag Peak */}
          <mesh
            position={[island.radius * 0.35, island.height * 0.35 + 1, -island.radius * 0.25]}
            castShadow
            receiveShadow
            material={materials.rock}
          >
            <coneGeometry args={[island.radius * 0.55, island.height * 0.75, 8]} />
          </mesh>

          {/* Scattered Coconut Palms */}
          {island.palms.map(([px, pz, pScale], pIdx) => (
            <PalmTree key={pIdx} position={[px, 2.6, pz]} scale={pScale} />
          ))}
        </group>
      ))}
    </group>
  );
};
