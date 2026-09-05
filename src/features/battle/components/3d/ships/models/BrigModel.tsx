import React, { useMemo } from 'react';

import type { SubModelProps } from '../types';
import { createBillowedSailGeometry, createJibSailGeometry } from '../common/shipGeometries';
import { RudderBlade } from '../common/RudderBlade';
import { BroadsideCannons } from '../common/BroadsideCannons';
import { BowCatheadAnchors } from '../common/BowCatheadAnchors';
import { ShipHelm } from '../common/ShipHelm';
import { ShipFlag } from '../common/ShipFlag';
import { ShipSail } from '../common/ShipSail';

export const BrigModel: React.FC<SubModelProps> = React.memo(({
  config,
  sailState,
  rudderAngle,
  isEnemy,
  hullTexture,
  deckTexture,
  sailTexture,
}) => {
  const { length, width, cannonsPerSide, trimColor } = config;
  const mastPositions = useMemo(() => [-length * 0.24, length * 0.18], [length]);
  const cannonPositions = useMemo(() => {
    const arr = [];
    const span = length * 0.64;
    const step = span / (cannonsPerSide + 1);
    for (let i = 1; i <= cannonsPerSide; i++) arr.push(-span * 0.5 + i * step);
    return arr;
  }, [cannonsPerSide, length]);

  const lowerGeo = useMemo(() => createBillowedSailGeometry(width * 1.45, length * 0.26, 0.45), [width, length]);
  const upperGeo = useMemo(() => createBillowedSailGeometry(width * 1.15, length * 0.20, 0.35), [width, length]);
  const jibGeo = useMemo(() => createJibSailGeometry(length * 0.32, length * 0.28, 0.35), [length]);

  return (
    <group>
      {/* Sturdy Oak Hull with Black Iron Bands */}
      <mesh position={[0, 1.25, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, 3.6, length]} />
        <meshStandardMaterial map={hullTexture} roughness={0.65} />
      </mesh>
      {/* Iron Reinforcement Waist Strake */}
      <mesh position={[0, 2.2, 0]}>
        <boxGeometry args={[width + 0.35, 0.35, length + 0.38]} />
        <meshStandardMaterial color="#27272a" metalness={0.85} roughness={0.3} />
      </mesh>
      <mesh position={[0, 3.1, 0]}>
        <boxGeometry args={[width + 0.36, 0.38, length + 0.42]} />
        <meshStandardMaterial color={trimColor} roughness={0.35} metalness={0.45} />
      </mesh>

      {/* Bow Cutwater & Figurehead */}
      <mesh position={[0, 1.35, length * 0.5 + 1.2]} rotation={[Math.PI / 4, 0, 0]} castShadow>
        <coneGeometry args={[width * 0.5, 3.8, 4]} />
        <meshStandardMaterial map={hullTexture} roughness={0.65} />
      </mesh>
      <mesh position={[0, 2.7, length * 0.5 + 2.3]} rotation={[-0.4, 0, 0]} castShadow>
        <coneGeometry args={[0.38, 1.2, 5]} />
        <meshStandardMaterial color="#f59e0b" roughness={0.3} metalness={0.8} />
      </mesh>

      {/* Main Deck with Cargo Grating */}
      <mesh position={[0, 2.9, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[width * 0.88, length * 0.92]} />
        <meshStandardMaterial map={deckTexture} roughness={0.75} />
      </mesh>
      <group position={[0, 2.95, -length * 0.05]}>
        <mesh receiveShadow>
          <boxGeometry args={[width * 0.4, 0.12, length * 0.18]} />
          <meshStandardMaterial color="#2d170b" roughness={0.9} />
        </mesh>
      </group>

      {/* Raised Quarterdeck Captain's Cabin */}
      <group position={[0, 3.8, -length * 0.36]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[width * 0.92, 1.8, length * 0.28]} />
          <meshStandardMaterial color={isEnemy ? '#881337' : '#1e3a5f'} map={hullTexture} roughness={0.6} />
        </mesh>
        {[-width * 0.26, 0, width * 0.26].map((wx, wIdx) => (
          <mesh key={`win-${wIdx}`} position={[wx, 0.1, -length * 0.141]}>
            <planeGeometry args={[width * 0.16, 0.75]} />
            <meshStandardMaterial color="#fef08a" emissive="#f59e0b" emissiveIntensity={0.8} />
          </mesh>
        ))}
        {[-width * 0.28, width * 0.28].map((lx, lIdx) => (
          <group key={`lan-${lIdx}`} position={[lx, 0.9, -length * 0.15]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.12, 0.18, 0.45, 6]} />
              <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={1.3} metalness={0.8} />
            </mesh>
            <pointLight color="#f59e0b" intensity={0.6} distance={6} decay={2} />
          </group>
        ))}
        <ShipHelm position={[0, 1.25, length * 0.08]} rudderAngle={rudderAngle} />
      </group>

      <BowCatheadAnchors width={width} z={length * 0.42} />
      <BroadsideCannons positions={cannonPositions} width={width} y={2.7} />

      {/* Bowsprit & Jib */}
      <mesh position={[0, 3.3, length * 0.5 + 2.8]} rotation={[0.36, 0, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.2, 5.5, 8]} />
        <meshStandardMaterial color="#382013" roughness={0.8} />
      </mesh>
      <group position={[0, 3.4, length * 0.32]} rotation={[0, -Math.PI / 2, 0]}>
        <ShipSail
          geometry={jibGeo}
          texture={sailTexture}
          sailState={sailState}
          height={length * 0.28}
          type="jib"
        />
      </group>

      {/* 2 Stately Square-Rigged Masts */}
      {mastPositions.map((mastZ, mIdx) => {
        const mastHeight = length * 0.76 + (mIdx === 1 ? 2.2 : 0);
        return (
          <group key={`mast-${mIdx}`} position={[0, 2.9, mastZ]}>
            <mesh position={[0, mastHeight * 0.5, 0]} castShadow>
              <cylinderGeometry args={[0.18, 0.3, mastHeight, 8]} />
              <meshStandardMaterial color="#382013" roughness={0.8} />
            </mesh>
            <group position={[0, mastHeight * 0.46, 0]}>
              <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
                <cylinderGeometry args={[0.08, 0.08, width * 1.5, 8]} />
                <meshStandardMaterial color="#2d1c12" />
              </mesh>
              <ShipSail
                geometry={lowerGeo}
                texture={sailTexture}
                sailState={sailState}
                height={length * 0.26}
                depthOffset={0.22}
                type="square"
                mastIndex={mIdx * 2}
              />
            </group>
            <group position={[0, mastHeight * 0.83, 0]}>
              <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
                <cylinderGeometry args={[0.06, 0.06, width * 1.18, 8]} />
                <meshStandardMaterial color="#2d1c12" />
              </mesh>
              <ShipSail
                geometry={upperGeo}
                texture={sailTexture}
                sailState={sailState}
                height={length * 0.20}
                depthOffset={0.16}
                type="square"
                mastIndex={mIdx * 2 + 1}
              />
            </group>
            <mesh position={[0, mastHeight * 0.66, 0]} castShadow>
              <cylinderGeometry args={[0.55, 0.42, 0.48, 8]} />
              <meshStandardMaterial color="#1a110a" />
            </mesh>
            {mIdx === 1 && <ShipFlag position={[0, mastHeight + 0.48, -0.65]} isEnemy={isEnemy} />}
          </group>
        );
      })}

      <RudderBlade length={length} rudderAngle={rudderAngle} />
    </group>
  );
});
