import React, { useMemo } from 'react';
import * as THREE from 'three';
import type { SubModelProps } from '../types';
import { createBillowedSailGeometry, createJibSailGeometry } from '../common/shipGeometries';
import { RudderBlade } from '../common/RudderBlade';
import { BroadsideCannons } from '../common/BroadsideCannons';
import { BowCatheadAnchors } from '../common/BowCatheadAnchors';
import { ShipHelm } from '../common/ShipHelm';
import { ShipFlag } from '../common/ShipFlag';

export const FrigateModel: React.FC<SubModelProps> = React.memo(({
  config,
  sailState,
  rudderAngle,
  isEnemy,
  hullTexture,
  deckTexture,
  sailTexture,
}) => {
  const { length, width, cannonsPerSide, trimColor } = config;
  const sailScale = sailState === 'ANCHOR' ? 0.18 : sailState === 'HALF_SAIL' ? 0.65 : 1.0;
  const mastPositions = useMemo(() => [-length * 0.32, 0, length * 0.28], [length]);

  const cannonPositions = useMemo(() => {
    const arr = [];
    const span = length * 0.68;
    const step = span / (cannonsPerSide + 1);
    for (let i = 1; i <= cannonsPerSide; i++) arr.push(-span * 0.5 + i * step);
    return arr;
  }, [cannonsPerSide, length]);

  const lowerGeo = useMemo(() => createBillowedSailGeometry(width * 1.48, length * 0.25, 0.45), [width, length]);
  const upperGeo = useMemo(() => createBillowedSailGeometry(width * 1.18, length * 0.19, 0.35), [width, length]);
  const jibGeo = useMemo(() => createJibSailGeometry(length * 0.34, length * 0.28, 0.35), [length]);

  return (
    <group>
      {/* Heavy Tumblehome Naval Hull */}
      <mesh position={[0, 1.35, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, 3.8, length]} />
        <meshStandardMaterial map={hullTexture} roughness={0.65} />
      </mesh>
      {/* Gold Naval Gunport Strake */}
      <mesh position={[0, 3.15, 0]}>
        <boxGeometry args={[width + 0.36, 0.38, length + 0.42]} />
        <meshStandardMaterial color={trimColor} roughness={0.35} metalness={0.45} />
      </mesh>

      {/* Massive Battering Stem & Neptune Figurehead */}
      <mesh position={[0, 1.45, length * 0.5 + 1.2]} rotation={[Math.PI / 4, 0, 0]} castShadow>
        <coneGeometry args={[width * 0.52, 4.0, 4]} />
        <meshStandardMaterial map={hullTexture} roughness={0.65} />
      </mesh>
      <mesh position={[0, 2.9, length * 0.5 + 2.4]} rotation={[-0.4, 0, 0]} castShadow>
        <coneGeometry args={[0.42, 1.3, 5]} />
        <meshStandardMaterial color="#f59e0b" roughness={0.3} metalness={0.8} />
      </mesh>

      {/* Continuous Battery Deck */}
      <mesh position={[0, 2.95, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[width * 0.88, length * 0.94]} />
        <meshStandardMaterial map={deckTexture} roughness={0.75} />
      </mesh>

      {/* Stately Captain's Great Cabin */}
      <group position={[0, 3.9, -length * 0.38]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[width * 0.94, 1.9, length * 0.26]} />
          <meshStandardMaterial color={isEnemy ? '#881337' : '#1e3a5f'} map={hullTexture} roughness={0.6} />
        </mesh>
        {/* Row of 6 Leaded Windows */}
        {[-width * 0.35, -width * 0.21, -width * 0.07, width * 0.07, width * 0.21, width * 0.35].map((wx, wIdx) => (
          <mesh key={`win-${wIdx}`} position={[wx, 0.1, -length * 0.131]}>
            <planeGeometry args={[width * 0.1, 0.75]} />
            <meshStandardMaterial color="#fef08a" emissive="#f59e0b" emissiveIntensity={0.8} />
          </mesh>
        ))}
        {/* Dual Heavy Admiral Lanterns */}
        {[-width * 0.32, width * 0.32].map((lx, lIdx) => (
          <group key={`lan-${lIdx}`} position={[lx, 1.1, -length * 0.14]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.13, 0.19, 0.48, 6]} />
              <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={1.3} metalness={0.85} />
            </mesh>
            <pointLight color="#f59e0b" intensity={0.7} distance={7} decay={2} />
          </group>
        ))}
        <ShipHelm position={[0, 1.35, length * 0.08]} rudderAngle={rudderAngle} isDouble />
      </group>

      <BowCatheadAnchors width={width} z={length * 0.44} />
      <BroadsideCannons positions={cannonPositions} width={width} y={2.75} scale={1.05} />

      {/* Bowsprit with Flying Jib */}
      <mesh position={[0, 3.4, length * 0.5 + 2.8]} rotation={[0.36, 0, 0]} castShadow>
        <cylinderGeometry args={[0.11, 0.22, 5.8, 8]} />
        <meshStandardMaterial color="#382013" roughness={0.8} />
      </mesh>
      <group position={[0, 3.5, length * 0.32]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh geometry={jibGeo} scale={[1, sailScale, 1]} castShadow receiveShadow>
          <meshStandardMaterial map={sailTexture} side={THREE.DoubleSide} roughness={0.85} />
        </mesh>
      </group>

      {/* 3 Massive Full-Rigged Masts */}
      {mastPositions.map((mastZ, mIdx) => {
        const mastHeight = length * 0.76 + (mIdx === 1 ? 2.6 : 0);
        return (
          <group key={`mast-${mIdx}`} position={[0, 2.95, mastZ]}>
            <mesh position={[0, mastHeight * 0.5, 0]} castShadow>
              <cylinderGeometry args={[0.2, 0.32, mastHeight, 8]} />
              <meshStandardMaterial color="#382013" />
            </mesh>
            <group position={[0, mastHeight * 0.46, 0]}>
              <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
                <cylinderGeometry args={[0.08, 0.08, width * 1.5, 8]} />
                <meshStandardMaterial color="#2d1c12" />
              </mesh>
              <mesh geometry={lowerGeo} position={[0, -length * 0.12 * sailScale, 0.22]} scale={[1, sailScale, 1]} castShadow receiveShadow>
                <meshStandardMaterial map={sailTexture} side={THREE.DoubleSide} roughness={0.85} />
              </mesh>
            </group>
            <group position={[0, mastHeight * 0.83, 0]}>
              <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
                <cylinderGeometry args={[0.06, 0.06, width * 1.18, 8]} />
                <meshStandardMaterial color="#2d1c12" />
              </mesh>
              <mesh geometry={upperGeo} position={[0, -length * 0.09 * sailScale, 0.16]} scale={[1, sailScale, 1]} castShadow receiveShadow>
                <meshStandardMaterial map={sailTexture} side={THREE.DoubleSide} roughness={0.85} />
              </mesh>
            </group>
            <mesh position={[0, mastHeight * 0.66, 0]} castShadow>
              <cylinderGeometry args={[0.55, 0.42, 0.48, 8]} />
              <meshStandardMaterial color="#1a110a" />
            </mesh>
            {mIdx === 2 && <ShipFlag position={[0, mastHeight + 0.48, -0.65]} isEnemy={isEnemy} />}
          </group>
        );
      })}

      <RudderBlade length={length} rudderAngle={rudderAngle} />
    </group>
  );
});
