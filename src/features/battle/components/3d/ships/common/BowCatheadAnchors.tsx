import React from 'react';

interface BowCatheadAnchorsProps {
  width: number;
  z: number;
}

export const BowCatheadAnchors: React.FC<BowCatheadAnchorsProps> = React.memo(({ width, z }) => {
  return (
    <>
      {[-width * 0.52, width * 0.52].map((ax, aIdx) => (
        <group key={`anchor-${aIdx}`} position={[ax, 2.2, z]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.04, 0.04, 1.3, 6]} />
            <meshStandardMaterial color="#27272a" metalness={0.85} roughness={0.3} />
          </mesh>
          <mesh position={[0, -0.6, 0]} rotation={[0, 0, Math.PI / 2]}>
            <torusGeometry args={[0.32, 0.04, 6, 12, Math.PI]} />
            <meshStandardMaterial color="#27272a" metalness={0.85} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 0.75, 6]} />
            <meshStandardMaterial color="#5c3317" roughness={0.8} />
          </mesh>
        </group>
      ))}
    </>
  );
});
