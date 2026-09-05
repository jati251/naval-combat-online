import React from 'react';

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
      <mesh castShadow receiveShadow>
        <boxGeometry args={[width, height, length]} />
        <meshStandardMaterial color="#3b1d0c" roughness={0.8} />
      </mesh>
      {/* Recessed wooden lattice grating */}
      <mesh position={[0, height * 0.45, 0]}>
        <boxGeometry args={[width * 0.86, height * 0.25, length * 0.86]} />
        <meshStandardMaterial color="#1a0e06" roughness={0.9} />
      </mesh>
      {/* Crossbar slats */}
      {[-width * 0.28, 0, width * 0.28].map((sx, idx) => (
        <mesh key={`slat-${idx}`} position={[sx, height * 0.52, 0]}>
          <boxGeometry args={[0.04, 0.03, length * 0.84]} />
          <meshStandardMaterial color="#78350f" />
        </mesh>
      ))}
      {[-length * 0.28, 0, length * 0.28].map((sz, idx) => (
        <mesh key={`slatz-${idx}`} position={[0, height * 0.53, sz]}>
          <boxGeometry args={[width * 0.84, 0.03, 0.04]} />
          <meshStandardMaterial color="#78350f" />
        </mesh>
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
      <mesh position={[0, 0.35, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.28, 0.65, 8]} />
        <meshStandardMaterial color="#451a03" roughness={0.7} />
      </mesh>
      {/* Iron whelps & banding */}
      <mesh position={[0, 0.35, 0]}>
        <cylinderGeometry args={[0.24, 0.24, 0.12, 8]} />
        <meshStandardMaterial color="#27272a" metalness={0.8} />
      </mesh>
      {/* Top capstan head */}
      <mesh position={[0, 0.7, 0]} castShadow>
        <cylinderGeometry args={[0.34, 0.32, 0.14, 8]} />
        <meshStandardMaterial color="#381a08" />
      </mesh>
      {/* 4 Radial Timber Bars */}
      {[0, 45, 90, 135].map((deg) => (
        <mesh key={`bar-${deg}`} position={[0, 0.7, 0]} rotation={[0, (deg * Math.PI) / 180, 0]}>
          <boxGeometry args={[1.3, 0.06, 0.06]} />
          <meshStandardMaterial color="#78350f" roughness={0.7} />
        </mesh>
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
        <mesh key={`bitt-${idx}`} position={[bx, 0.3, 0]} castShadow>
          <boxGeometry args={[0.12, 0.6, 0.12]} />
          <meshStandardMaterial color="#381a08" roughness={0.8} />
        </mesh>
      ))}
      <mesh position={[0, 0.45, 0]}>
        <boxGeometry args={[width + 0.22, 0.1, 0.1]} />
        <meshStandardMaterial color="#27272a" metalness={0.7} />
      </mesh>
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
      <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, 0.7, length]} />
        <meshStandardMaterial color="#3e2723" roughness={0.7} />
      </mesh>
      {/* Brass banded sliding hatch top */}
      <mesh position={[0, 0.77, 0]}>
        <boxGeometry args={[width * 0.85, 0.08, length * 0.85]} />
        <meshStandardMaterial color="#d97706" metalness={0.8} roughness={0.3} />
      </mesh>
      {/* Louvered doorway / entry */}
      <mesh position={[0, 0.35, length * 0.51]}>
        <planeGeometry args={[width * 0.6, 0.55]} />
        <meshStandardMaterial color="#1a0e06" roughness={0.9} />
      </mesh>
    </group>
  );
});
