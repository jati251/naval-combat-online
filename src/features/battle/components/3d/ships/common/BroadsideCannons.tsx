import React from 'react';

interface BroadsideCannonsProps {
  positions: number[];
  width: number;
  y?: number;
  scale?: number;
  color?: string;
  isDoubleDecker?: boolean;
}

const SingleCannonUnit: React.FC<{
  isPort: boolean;
  color: string;
  barrelScale?: number;
}> = React.memo(({ isPort, color, barrelScale = 1.0 }) => {
  const dir = isPort ? -1 : 1;

  return (
    <group scale={[barrelScale, barrelScale, barrelScale]}>
      {/* Naval Cannon Barrel */}
      <group rotation={[0, 0, dir * Math.PI / 2]}>
        {/* Main tapered tube */}
        <mesh castShadow>
          <cylinderGeometry args={[0.11, 0.17, 1.35, 10]} />
          <meshStandardMaterial color={color} metalness={0.92} roughness={0.25} />
        </mesh>
        {/* Muzzle swell ring */}
        <mesh position={[0, 0.64, 0]}>
          <cylinderGeometry args={[0.13, 0.13, 0.08, 10]} />
          <meshStandardMaterial color={color} metalness={0.95} roughness={0.2} />
        </mesh>
        {/* Breech ring & Cascabel button */}
        <mesh position={[0, -0.66, 0]}>
          <cylinderGeometry args={[0.18, 0.18, 0.1, 10]} />
          <meshStandardMaterial color={color} metalness={0.9} roughness={0.3} />
        </mesh>
        <mesh position={[0, -0.74, 0]}>
          <sphereGeometry args={[0.07, 8, 8]} />
          <meshStandardMaterial color={color} metalness={0.9} roughness={0.3} />
        </mesh>
        {/* Trunnions (side pivot cylinders) */}
        <mesh position={[0, 0.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.38, 8]} />
          <meshStandardMaterial color={color} metalness={0.9} />
        </mesh>
      </group>

      {/* Wheeled Naval Truck Carriage */}
      <group position={[-dir * 0.28, -0.16, 0]}>
        {/* Carriage wooden cheeks */}
        <mesh castShadow position={[0, 0.06, 0]}>
          <boxGeometry args={[0.42, 0.28, 0.38]} />
          <meshStandardMaterial color="#831843" roughness={0.7} />
        </mesh>
        {/* 4 Wooden Truck Wheels with Iron Hubs */}
        {[-0.14, 0.14].map((wx, xIdx) => (
          <React.Fragment key={`wh-${xIdx}`}>
            {[-0.18, 0.18].map((wz, zIdx) => (
              <mesh key={`w-${xIdx}-${zIdx}`} position={[wx, -0.06, wz]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.09, 0.09, 0.06, 8]} />
                <meshStandardMaterial color="#381a08" roughness={0.8} />
              </mesh>
            ))}
          </React.Fragment>
        ))}
      </group>
    </group>
  );
});

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
          <group position={[-width * 0.5 - 0.22, 0, 0]}>
            <SingleCannonUnit isPort={true} color={color} />
          </group>

          {/* Starboard Gun */}
          <group position={[width * 0.5 + 0.22, 0, 0]}>
            <SingleCannonUnit isPort={false} color={color} />
          </group>

          {/* Lower Gun Deck Ports (Man-o'-War double decker) */}
          {isDoubleDecker && (
            <>
              <group position={[-width * 0.5 - 0.25, -1.0, 0]}>
                <SingleCannonUnit isPort={true} color="#09090b" barrelScale={1.1} />
              </group>
              <group position={[width * 0.5 + 0.25, -1.0, 0]}>
                <SingleCannonUnit isPort={false} color="#09090b" barrelScale={1.1} />
              </group>
            </>
          )}
        </group>
      ))}
    </>
  );
});
