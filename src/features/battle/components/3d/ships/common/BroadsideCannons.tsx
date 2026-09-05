import React from 'react';

interface BroadsideCannonsProps {
  positions: number[];
  width: number;
  y?: number;
  scale?: number;
  color?: string;
  isDoubleDecker?: boolean;
}

export const BroadsideCannons: React.FC<BroadsideCannonsProps> = React.memo(({
  positions,
  width,
  y = 2.65,
  scale = 1,
  color = '#18181b',
  isDoubleDecker = false,
}) => {
  return (
    <>
      {positions.map((posZ, idx) => (
        <group key={`gun-${idx}`} position={[0, y, posZ]} scale={[scale, scale, scale]}>
          {/* Port Gun */}
          <group position={[-width * 0.5 - 0.25, 0, 0]}>
            <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[0.12, 0.17, 1.2, 8]} />
              <meshStandardMaterial color={color} metalness={0.92} roughness={0.2} />
            </mesh>
            <mesh position={[0.26, -0.15, 0]}>
              <boxGeometry args={[0.36, 0.26, 0.45]} />
              <meshStandardMaterial color="#451a03" />
            </mesh>
          </group>

          {/* Starboard Gun */}
          <group position={[width * 0.5 + 0.25, 0, 0]}>
            <mesh rotation={[0, 0, -Math.PI / 2]} castShadow>
              <cylinderGeometry args={[0.12, 0.17, 1.2, 8]} />
              <meshStandardMaterial color={color} metalness={0.92} roughness={0.2} />
            </mesh>
            <mesh position={[-0.26, -0.15, 0]}>
              <boxGeometry args={[0.36, 0.26, 0.45]} />
              <meshStandardMaterial color="#451a03" />
            </mesh>
          </group>

          {/* Lower Gun Deck Ports (Man-o'-War double decker) */}
          {isDoubleDecker && (
            <>
              <group position={[-width * 0.5 - 0.25, -1.0, 0]}>
                <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
                  <cylinderGeometry args={[0.14, 0.19, 1.1, 8]} />
                  <meshStandardMaterial color="#09090b" metalness={0.9} />
                </mesh>
              </group>
              <group position={[width * 0.5 + 0.25, -1.0, 0]}>
                <mesh rotation={[0, 0, -Math.PI / 2]} castShadow>
                  <cylinderGeometry args={[0.14, 0.19, 1.1, 8]} />
                  <meshStandardMaterial color="#09090b" metalness={0.9} />
                </mesh>
              </group>
            </>
          )}
        </group>
      ))}
    </>
  );
});
