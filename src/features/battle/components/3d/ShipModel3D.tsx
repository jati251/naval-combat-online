import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { type ShipConfig, type SailState, SHIP_PRESETS } from '@/types/game';

interface ShipModel3DProps {
  config?: ShipConfig;
  shipClass?: string;
  sailState?: SailState;
  rudderAngle?: number;
  isEnemy?: boolean;
}

export const ShipModel3D: React.FC<ShipModel3DProps> = ({
  config: propConfig,
  shipClass = 'brig',
  sailState = 'HALF_SAIL',
  rudderAngle = 0,
  isEnemy = false,
}) => {
  const config = propConfig || SHIP_PRESETS[(shipClass as 'sloop' | 'brig' | 'frigate')] || SHIP_PRESETS.brig;

  const flagRef = useRef<THREE.Mesh>(null);
  const rudderMeshRef = useRef<THREE.Mesh>(null);

  const { hullColor, trimColor, sailColor, length, width, cannonsPerSide, id } = config;

  const mastCount = id === 'sloop' ? 1 : id === 'brig' ? 2 : 3;

  const mastPositions = useMemo(() => {
    if (mastCount === 1) return [0];
    if (mastCount === 2) return [-length * 0.22, length * 0.18];
    return [-length * 0.3, 0, length * 0.28];
  }, [mastCount, length]);

  const cannonPositions = useMemo(() => {
    const positions: number[] = [];
    const span = length * 0.65;
    const step = span / (cannonsPerSide + 1);
    for (let i = 1; i <= cannonsPerSide; i++) {
      positions.push(-span * 0.5 + i * step);
    }
    return positions;
  }, [cannonsPerSide, length]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (flagRef.current) {
      flagRef.current.rotation.y = Math.sin(t * 8) * 0.2;
      flagRef.current.rotation.z = Math.cos(t * 6) * 0.12;
    }
    if (rudderMeshRef.current) {
      rudderMeshRef.current.rotation.y = -rudderAngle * 0.55;
    }
  });

  const sailScaleY = sailState === 'ANCHOR' ? 0.2 : sailState === 'HALF_SAIL' ? 0.6 : 1.0;

  return (
    <group>
      {/* Main Wood Hull */}
      <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, 2.2, length]} />
        <meshStandardMaterial color={hullColor} roughness={0.7} metalness={0.1} />
      </mesh>

      {/* Gold/Wood Trim Gunwale */}
      <mesh position={[0, 1.55, 0]}>
        <boxGeometry args={[width + 0.3, 0.25, length + 0.4]} />
        <meshStandardMaterial color={trimColor} roughness={0.4} metalness={0.5} />
      </mesh>

      {/* Pointed Bow / Front Protrusion */}
      <mesh position={[0, 0.6, length * 0.5 + 1.2]} rotation={[Math.PI / 4, 0, 0]}>
        <coneGeometry args={[width * 0.5, 2.8, 4]} />
        <meshStandardMaterial color={hullColor} roughness={0.7} />
      </mesh>

      {/* Bowsprit Spar Pole */}
      <mesh position={[0, 1.8, length * 0.5 + 2.5]} rotation={[0.4, 0, 0]}>
        <cylinderGeometry args={[0.1, 0.15, 4.5, 8]} />
        <meshStandardMaterial color="#2d1c12" roughness={0.8} />
      </mesh>

      {/* Deck Planks */}
      <mesh position={[0, 1.45, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width * 0.88, length * 0.92]} />
        <meshStandardMaterial color="#8a5a36" roughness={0.9} />
      </mesh>

      {/* Stern Cabin (Raised quarterdeck) */}
      <mesh position={[0, 2.1, -length * 0.38]}>
        <boxGeometry args={[width * 0.9, 1.4, length * 0.24]} />
        <meshStandardMaterial color={isEnemy ? '#4a1515' : '#1e293b'} roughness={0.6} />
      </mesh>

      {/* Rudder */}
      <group position={[0, 0.2, -length * 0.5]}>
        <mesh ref={rudderMeshRef} position={[0, 0, -0.4]}>
          <boxGeometry args={[0.18, 1.8, 0.9]} />
          <meshStandardMaterial color="#1a110a" />
        </mesh>
      </group>

      {/* Cannons on Port and Starboard Sides */}
      {cannonPositions.map((posZ, idx) => (
        <group key={`cannons-${idx}`}>
          {/* Port cannon barrel */}
          <mesh position={[-width * 0.5 - 0.3, 1.25, posZ]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.12, 0.16, 1.1, 8]} />
            <meshStandardMaterial color="#1a1c23" metalness={0.8} roughness={0.3} />
          </mesh>
          {/* Starboard cannon barrel */}
          <mesh position={[width * 0.5 + 0.3, 1.25, posZ]} rotation={[0, 0, -Math.PI / 2]}>
            <cylinderGeometry args={[0.12, 0.16, 1.1, 8]} />
            <meshStandardMaterial color="#1a1c23" metalness={0.8} roughness={0.3} />
          </mesh>
        </group>
      ))}

      {/* Masts and Sails */}
      {mastPositions.map((mastZ, mIdx) => {
        const mastHeight = length * 0.75 + (mIdx === 1 ? 2 : 0);
        return (
          <group key={`mast-${mIdx}`} position={[0, 1.5, mastZ]}>
            {/* Mast Pole */}
            <mesh position={[0, mastHeight * 0.5, 0]}>
              <cylinderGeometry args={[0.16, 0.28, mastHeight, 8]} />
              <meshStandardMaterial color="#2d1c12" roughness={0.8} />
            </mesh>

            {/* Lower Yardarm & Sail */}
            <group position={[0, mastHeight * 0.45, 0]}>
              <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.08, 0.08, width * 1.5, 8]} />
                <meshStandardMaterial color="#2d1c12" />
              </mesh>
              <mesh position={[0, -mastHeight * 0.16 * sailScaleY, 0.2]} scale={[1, sailScaleY, 1]}>
                <planeGeometry args={[width * 1.4, mastHeight * 0.32]} />
                <meshStandardMaterial color={sailColor} side={THREE.DoubleSide} roughness={0.9} />
              </mesh>
            </group>

            {/* Upper Yardarm & Top Sail */}
            <group position={[0, mastHeight * 0.82, 0]}>
              <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.06, 0.06, width * 1.1, 8]} />
                <meshStandardMaterial color="#2d1c12" />
              </mesh>
              <mesh position={[0, -mastHeight * 0.12 * sailScaleY, 0.15]} scale={[1, sailScaleY, 1]}>
                <planeGeometry args={[width * 1.0, mastHeight * 0.24]} />
                <meshStandardMaterial color={sailColor} side={THREE.DoubleSide} roughness={0.9} />
              </mesh>
            </group>

            {/* Crow's Nest Platform */}
            <mesh position={[0, mastHeight * 0.65, 0]}>
              <cylinderGeometry args={[0.5, 0.4, 0.4, 8]} />
              <meshStandardMaterial color="#1a110a" />
            </mesh>

            {/* Masthead Flag */}
            {mIdx === mastPositions.length - 1 && (
              <mesh ref={flagRef} position={[0, mastHeight + 0.4, -0.6]} rotation={[0, 0, 0]}>
                <planeGeometry args={[1.2, 0.65]} />
                <meshStandardMaterial
                  color={isEnemy ? '#b91c1c' : '#1e3a8a'}
                  side={THREE.DoubleSide}
                  roughness={0.7}
                />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
};
