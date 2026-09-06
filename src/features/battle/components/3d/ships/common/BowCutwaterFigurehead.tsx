import React from 'react';

interface BowCutwaterFigureheadProps {
  position: [number, number, number];
  stemScale?: number;
  figureheadType?: 'lion' | 'dolphin' | 'eagle' | 'dragon';
  figureheadColor?: string;
  timberColor?: string;
  isEnemy?: boolean;
}

export const BowCutwaterFigurehead: React.FC<BowCutwaterFigureheadProps> = React.memo(({
  position,
  stemScale = 1,
  figureheadType = 'lion',
  figureheadColor = '#f59e0b',
  timberColor = '#4a2511',
  isEnemy = false,
}) => {
  return (
    <group position={position} scale={[stemScale, stemScale, stemScale]}>
      {/* Cutwater stem knee timber */}
      <mesh position={[0, -0.26, 0.48]} rotation={[0.42, 0, 0]} castShadow={!isEnemy}>
        <boxGeometry args={[0.24, 1.15, 1.4]} />
        <meshStandardMaterial color={timberColor} roughness={0.75} />
      </mesh>

      {/* Carved Naval Figurehead */}
      <group position={[0, 0.44, 1.25]} rotation={[-0.38, 0, 0]}>
        {figureheadType === 'lion' && (
          <mesh castShadow={!isEnemy}>
            <coneGeometry args={[0.36, 1.25, 6]} />
            <meshStandardMaterial color={figureheadColor} roughness={0.25} metalness={0.85} />
          </mesh>
        )}
        {figureheadType === 'dolphin' && (
          <mesh castShadow={!isEnemy}>
            <coneGeometry args={[0.28, 1.1, 6]} />
            <meshStandardMaterial color={figureheadColor} roughness={0.2} metalness={0.88} />
          </mesh>
        )}
        {figureheadType === 'eagle' && (
          <group>
            <mesh castShadow={!isEnemy}>
              <coneGeometry args={[0.32, 1.2, 5]} />
              <meshStandardMaterial color={figureheadColor} roughness={0.25} metalness={0.82} />
            </mesh>
            {/* Eagle beak hook */}
            <mesh position={[0, -0.15, 0.22]} rotation={[0.5, 0, 0]}>
              <coneGeometry args={[0.12, 0.4, 4]} />
              <meshStandardMaterial color="#ca8a04" roughness={0.3} metalness={0.6} />
            </mesh>
          </group>
        )}
        {figureheadType === 'dragon' && (
          <mesh castShadow={!isEnemy}>
            <coneGeometry args={[0.38, 1.35, 7]} />
            <meshStandardMaterial color={figureheadColor} roughness={0.25} metalness={0.8} />
          </mesh>
        )}
      </group>
    </group>
  );
});
