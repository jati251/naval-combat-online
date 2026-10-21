import React from 'react';
import * as THREE from 'three';

const unitBoxGeo = new THREE.BoxGeometry(1, 1, 1);
const unitPlaneGeo = new THREE.PlaneGeometry(1, 1);

const hatchRimMat = new THREE.MeshStandardMaterial({ color: '#3b1d0c', roughness: 0.8 });
const hatchGratingMat = new THREE.MeshStandardMaterial({ color: '#1a0e06', roughness: 0.9 });
const hatchSlatMat = new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.7 });

const capstanDrumGeo = new THREE.CylinderGeometry(0.22, 0.28, 0.65, 8);
const capstanDrumMat = new THREE.MeshStandardMaterial({ color: '#451a03', roughness: 0.7 });
const capstanBandingGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.12, 8);
const capstanBandingMat = new THREE.MeshStandardMaterial({ color: '#27272a', metalness: 0.8 });
const capstanHeadGeo = new THREE.CylinderGeometry(0.34, 0.32, 0.14, 8);
const capstanHeadMat = new THREE.MeshStandardMaterial({ color: '#381a08' });
const capstanBarGeo = new THREE.BoxGeometry(1.3, 0.06, 0.06);
const CAPSTAN_BAR_DEGS = [0, 45, 90, 135] as const;

const bittPostGeo = new THREE.BoxGeometry(0.12, 0.6, 0.12);
const bittPostMat = new THREE.MeshStandardMaterial({ color: '#381a08', roughness: 0.8 });
const bittCrossMat = new THREE.MeshStandardMaterial({ color: '#27272a', metalness: 0.7 });

const companionHoodMat = new THREE.MeshStandardMaterial({ color: '#3e2723', roughness: 0.7 });
const companionBrassMat = new THREE.MeshStandardMaterial({ color: '#d97706', metalness: 0.8, roughness: 0.3 });

/**
 * Wooden Cargo Hatch with authentic criss-cross wooden lattice grating
 */
export const CargoHatch: React.FC<{
  position: [number, number, number];
  width: number;
  length: number;
  height?: number;
}> = React.memo(({ position, width, length, height = 0.22 }) => {
  return (
    <group position={position}>
      {/* Outer raised coaming rim */}
      <mesh geometry={unitBoxGeo} material={hatchRimMat} scale={[width, height, length]} castShadow receiveShadow />
      {/* Recessed wooden lattice grating */}
      <mesh position={[0, height * 0.45, 0]} geometry={unitBoxGeo} material={hatchGratingMat} scale={[width * 0.86, height * 0.25, length * 0.86]} />
      {/* Crossbar slats */}
      {[-width * 0.28, 0, width * 0.28].map((sx, idx) => (
        <mesh key={`slat-${idx}`} position={[sx, height * 0.52, 0]} geometry={unitBoxGeo} material={hatchSlatMat} scale={[0.04, 0.03, length * 0.84]} />
      ))}
      {[-length * 0.28, 0, length * 0.28].map((sz, idx) => (
        <mesh key={`slatz-${idx}`} position={[0, height * 0.53, sz]} geometry={unitBoxGeo} material={hatchSlatMat} scale={[width * 0.84, 0.03, 0.04]} />
      ))}
    </group>
  );
});

/**
 * Traditional Naval Capstan (Anchor/Sail Winch with radial turning bars)
 */
export const NavalCapstan: React.FC<{
  position: [number, number, number];
  scale?: number;
}> = React.memo(({ position, scale = 1.0 }) => {
  return (
    <group position={position} scale={[scale, scale, scale]}>
      {/* Central barrel/drum */}
      <mesh position={[0, 0.35, 0]} geometry={capstanDrumGeo} material={capstanDrumMat} castShadow />
      {/* Iron whelps & banding */}
      <mesh position={[0, 0.35, 0]} geometry={capstanBandingGeo} material={capstanBandingMat} />
      {/* Top capstan head */}
      <mesh position={[0, 0.7, 0]} geometry={capstanHeadGeo} material={capstanHeadMat} castShadow />
      {/* 4 Radial Timber Bars */}
      {CAPSTAN_BAR_DEGS.map((deg) => (
        <mesh key={`bar-${deg}`} position={[0, 0.7, 0]} rotation={[0, (deg * Math.PI) / 180, 0]} geometry={capstanBarGeo} material={hatchSlatMat} />
      ))}
    </group>
  );
});

/**
 * Mooring Bitts (Pairs of timber posts for securing heavy lines)
 */
export const MooringBitts: React.FC<{
  position: [number, number, number];
  width?: number;
}> = React.memo(({ position, width = 0.55 }) => {
  return (
    <group position={position}>
      {[-width * 0.5, width * 0.5].map((bx, idx) => (
        <mesh key={`bitt-${idx}`} position={[bx, 0.3, 0]} geometry={bittPostGeo} material={bittPostMat} castShadow />
      ))}
      <mesh position={[0, 0.45, 0]} geometry={unitBoxGeo} material={bittCrossMat} scale={[width + 0.22, 0.1, 0.1]} />
    </group>
  );
});

/**
 * Raised Wooden Companionway Hatch (Access to below-decks)
 */
export const CompanionwayHatch: React.FC<{
  position: [number, number, number];
  width?: number;
  length?: number;
}> = React.memo(({ position, width = 1.0, length = 1.2 }) => {
  return (
    <group position={position}>
      {/* Slanted wooden companionway hood */}
      <mesh position={[0, 0.4, 0]} geometry={unitBoxGeo} material={companionHoodMat} scale={[width, 0.7, length]} castShadow receiveShadow />
      {/* Brass banded sliding hatch top */}
      <mesh position={[0, 0.77, 0]} geometry={unitBoxGeo} material={companionBrassMat} scale={[width * 0.85, 0.08, length * 0.85]} />
      {/* Louvered doorway / entry */}
      <mesh position={[0, 0.35, length * 0.51]} geometry={unitPlaneGeo} material={hatchGratingMat} scale={[width * 0.6, 0.55, 1]} />
    </group>
  );
});
