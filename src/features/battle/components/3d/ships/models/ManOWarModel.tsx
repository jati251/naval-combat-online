import React, { useMemo } from 'react';

import type { SubModelProps } from '../types';
import { createBillowedSailGeometry, createJibSailGeometry } from '../common/shipGeometries';
import { RudderBlade } from '../common/RudderBlade';
import { BroadsideCannons } from '../common/BroadsideCannons';
import { BowCatheadAnchors } from '../common/BowCatheadAnchors';
import { ShipHelm } from '../common/ShipHelm';
import { ShipFlag } from '../common/ShipFlag';
import { ShipSail } from '../common/ShipSail';

export const ManOWarModel: React.FC<SubModelProps> = React.memo(({
  config,
  sailState,
  rudderAngle,
  isEnemy,
  hullTexture,
  deckTexture,
  sailTexture,
}) => {
  const { length, width, cannonsPerSide, trimColor } = config;
  const mastPositions = useMemo(() => [-length * 0.35, -length * 0.12, length * 0.12, length * 0.32], [length]);

  const cannonPositions = useMemo(() => {
    const arr = [];
    const span = length * 0.74;
    const step = span / (cannonsPerSide + 1);
    for (let i = 1; i <= cannonsPerSide; i++) arr.push(-span * 0.5 + i * step);
    return arr;
  }, [cannonsPerSide, length]);

  const lowerGeo = useMemo(() => createBillowedSailGeometry(width * 1.48, length * 0.24, 0.45), [width, length]);
  const upperGeo = useMemo(() => createBillowedSailGeometry(width * 1.18, length * 0.18, 0.35), [width, length]);
  const jibGeo = useMemo(() => createJibSailGeometry(length * 0.36, length * 0.28, 0.35), [length]);

  return (
    <group>
      {/* Colossal 28-Meter Naval Oak Hull */}
      <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, 4.4, length]} />
        <meshStandardMaterial map={hullTexture} roughness={0.65} />
      </mesh>

      {/* Iconic Nelson Chequer Double Gunport Strakes (Black + Yellow Stripes) */}
      <mesh position={[0, 2.1, 0]}>
        <boxGeometry args={[width + 0.38, 0.55, length + 0.42]} />
        <meshStandardMaterial color="#facc15" roughness={0.4} metalness={0.2} />
      </mesh>
      <mesh position={[0, 3.4, 0]}>
        <boxGeometry args={[width + 0.4, 0.42, length + 0.44]} />
        <meshStandardMaterial color={trimColor} roughness={0.35} metalness={0.5} />
      </mesh>

      {/* Colossal Stem & Gilded Royal Lion Figurehead */}
      <mesh position={[0, 1.6, length * 0.5 + 1.4]} rotation={[Math.PI / 4, 0, 0]} castShadow>
        <coneGeometry args={[width * 0.55, 4.4, 4]} />
        <meshStandardMaterial map={hullTexture} roughness={0.65} />
      </mesh>
      <mesh position={[0, 3.2, length * 0.5 + 2.7]} rotation={[-0.42, 0, 0]} castShadow>
        <coneGeometry args={[0.48, 1.5, 6]} />
        <meshStandardMaterial color="#f59e0b" roughness={0.25} metalness={0.88} />
      </mesh>

      {/* Main Gun Deck with Dual Cargo Skylight Hatches */}
      <mesh position={[0, 3.2, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[width * 0.88, length * 0.94]} />
        <meshStandardMaterial map={deckTexture} roughness={0.75} />
      </mesh>
      <group position={[0, 3.25, -length * 0.02]}>
        <mesh receiveShadow>
          <boxGeometry args={[width * 0.42, 0.15, length * 0.15]} />
          <meshStandardMaterial color="#2d170b" roughness={0.9} />
        </mesh>
      </group>
      <group position={[0, 3.25, length * 0.22]}>
        <mesh receiveShadow>
          <boxGeometry args={[width * 0.42, 0.15, length * 0.15]} />
          <meshStandardMaterial color="#2d170b" roughness={0.9} />
        </mesh>
      </group>

      {/* 3-Tier Sovereign Admiral's Stern Gallery */}
      <group position={[0, 4.2, -length * 0.38]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[width * 0.96, 2.4, length * 0.25]} />
          <meshStandardMaterial color={isEnemy ? '#881337' : '#1e3a5f'} map={hullTexture} />
        </mesh>
        {/* Upper Grand Poop Deck */}
        <group position={[0, 1.8, -length * 0.02]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[width * 0.86, 1.6, length * 0.18]} />
            <meshStandardMaterial color={trimColor} map={hullTexture} />
          </mesh>
        </group>

        {/* 3 Giant Admiral Lanterns on High Stern */}
        {[-width * 0.35, 0, width * 0.35].map((lx, lIdx) => (
          <group key={`lan-${lIdx}`} position={[lx, 3.0, -length * 0.14]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.16, 0.24, 0.6, 6]} />
              <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={1.5} metalness={0.9} />
            </mesh>
            <pointLight color="#fbbf24" intensity={1.1} distance={9} decay={2} />
          </group>
        ))}

        <ShipHelm position={[0, 1.45, length * 0.06]} rudderAngle={rudderAngle} isDouble />
      </group>

      <BowCatheadAnchors width={width} z={length * 0.45} />

      {/* 16 Heavy Cannons Total (8 per side!) with Double-Decker Ports */}
      <BroadsideCannons positions={cannonPositions} width={width} y={2.95} scale={1.1} isDoubleDecker />

      {/* Heavy Bowsprit */}
      <mesh position={[0, 3.6, length * 0.5 + 3.0]} rotation={[0.34, 0, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.24, 6.2, 8]} />
        <meshStandardMaterial color="#382013" roughness={0.8} />
      </mesh>
      <group position={[0, 3.7, length * 0.35]} rotation={[0, -Math.PI / 2, 0]}>
        <ShipSail
          geometry={jibGeo}
          texture={sailTexture}
          sailState={sailState}
          height={length * 0.28}
          type="jib"
        />
      </group>

      {/* 4 Towering Masts: Fore, Main, Mizzen, Bonaventure */}
      {mastPositions.map((mastZ, mIdx) => {
        const mastHeight = length * 0.74 + (mIdx === 1 ? 2.8 : mIdx === 2 ? 1.8 : 0);
        return (
          <group key={`mast-${mIdx}`} position={[0, 3.2, mastZ]}>
            <mesh position={[0, mastHeight * 0.5, 0]} castShadow>
              <cylinderGeometry args={[0.22, 0.35, mastHeight, 8]} />
              <meshStandardMaterial color="#382013" />
            </mesh>
            <group position={[0, mastHeight * 0.46, 0]}>
              <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
                <cylinderGeometry args={[0.09, 0.09, width * 1.5, 8]} />
                <meshStandardMaterial color="#2d1c12" />
              </mesh>
              <ShipSail
                geometry={lowerGeo}
                texture={sailTexture}
                sailState={sailState}
                height={length * 0.24}
                depthOffset={0.22}
                type="square"
                mastIndex={mIdx * 2}
              />
            </group>
            <group position={[0, mastHeight * 0.83, 0]}>
              <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
                <cylinderGeometry args={[0.07, 0.07, width * 1.2, 8]} />
                <meshStandardMaterial color="#2d1c12" />
              </mesh>
              <ShipSail
                geometry={upperGeo}
                texture={sailTexture}
                sailState={sailState}
                height={length * 0.18}
                depthOffset={0.16}
                type="square"
                mastIndex={mIdx * 2 + 1}
              />
            </group>
            <mesh position={[0, mastHeight * 0.66, 0]} castShadow>
              <cylinderGeometry args={[0.6, 0.45, 0.5, 8]} />
              <meshStandardMaterial color="#1a110a" />
            </mesh>
            {mIdx === 3 && <ShipFlag position={[0, mastHeight + 0.48, -0.65]} isEnemy={isEnemy} />}
          </group>
        );
      })}

      <RudderBlade length={length} rudderAngle={rudderAngle} />
    </group>
  );
});
