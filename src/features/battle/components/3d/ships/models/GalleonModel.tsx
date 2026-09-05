import React, { useMemo } from 'react';

import type { SubModelProps } from '../types';
import { createBillowedSailGeometry, createLateenSailGeometry } from '../common/shipGeometries';
import { RudderBlade } from '../common/RudderBlade';
import { BroadsideCannons } from '../common/BroadsideCannons';
import { BowCatheadAnchors } from '../common/BowCatheadAnchors';
import { ShipHelm } from '../common/ShipHelm';
import { ShipFlag } from '../common/ShipFlag';
import { ShipSail } from '../common/ShipSail';

export const GalleonModel: React.FC<SubModelProps> = React.memo(({
  config,
  sailState,
  rudderAngle,
  isEnemy,
  hullTexture,
  deckTexture,
  sailTexture,
}) => {
  const { length, width, cannonsPerSide, trimColor } = config;

  const cannonPositions = useMemo(() => {
    const arr = [];
    const span = length * 0.66;
    const step = span / (cannonsPerSide + 1);
    for (let i = 1; i <= cannonsPerSide; i++) arr.push(-span * 0.5 + i * step);
    return arr;
  }, [cannonsPerSide, length]);

  const lowerGeo = useMemo(() => createBillowedSailGeometry(width * 1.48, length * 0.25, 0.45), [width, length]);
  const upperGeo = useMemo(() => createBillowedSailGeometry(width * 1.18, length * 0.19, 0.35), [width, length]);
  const lateenMizzenGeo = useMemo(() => createLateenSailGeometry(length * 0.42, length * 0.52, 0.38), [length]);

  return (
    <group>
      {/* High-Sided Crimson & Mahogany Hull */}
      <mesh position={[0, 1.4, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, 4.0, length]} />
        <meshStandardMaterial map={hullTexture} roughness={0.65} />
      </mesh>
      {/* Gilded Waist Trim & Spanish Gunwale */}
      <mesh position={[0, 3.3, 0]}>
        <boxGeometry args={[width + 0.38, 0.42, length + 0.44]} />
        <meshStandardMaterial color={trimColor} roughness={0.3} metalness={0.6} />
      </mesh>

      {/* Swept Up High Forecastle */}
      <group position={[0, 3.2, length * 0.36]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[width * 0.86, 1.2, length * 0.24]} />
          <meshStandardMaterial color="#501e14" map={hullTexture} />
        </mesh>
        {/* Wooden Belfry with Bronze Ship's Bell */}
        <group position={[0, 1.0, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.25, 0.32, 0.65, 6]} />
            <meshStandardMaterial color="#451a03" />
          </mesh>
          <mesh position={[0, -0.1, 0]}>
            <sphereGeometry args={[0.15, 8, 8]} />
            <meshStandardMaterial color="#d97706" metalness={0.9} roughness={0.2} />
          </mesh>
        </group>
      </group>

      {/* Conquistador Golden Figurehead & Beak */}
      <mesh position={[0, 1.5, length * 0.5 + 1.4]} rotation={[Math.PI * 0.26, 0, 0]} castShadow>
        <coneGeometry args={[width * 0.5, 4.0, 4]} />
        <meshStandardMaterial map={hullTexture} roughness={0.65} />
      </mesh>
      <mesh position={[0, 3.1, length * 0.5 + 2.5]} rotation={[-0.4, 0, 0]} castShadow>
        <coneGeometry args={[0.42, 1.35, 6]} />
        <meshStandardMaterial color="#f59e0b" metalness={0.88} roughness={0.2} />
      </mesh>

      {/* Main Deck */}
      <mesh position={[0, 3.1, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[width * 0.88, length * 0.92]} />
        <meshStandardMaterial map={deckTexture} roughness={0.75} />
      </mesh>

      {/* Towering 2-Tier Sterncastle (Quarterdeck + Poop Royal) */}
      <group position={[0, 4.0, -length * 0.34]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[width * 0.94, 2.0, length * 0.32]} />
          <meshStandardMaterial color={isEnemy ? '#881337' : '#501e14'} map={hullTexture} />
        </mesh>
        <group position={[0, 1.8, -length * 0.04]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[width * 0.82, 1.6, length * 0.22]} />
            <meshStandardMaterial color={trimColor} map={hullTexture} />
          </mesh>
          <mesh position={[0, 0.9, -length * 0.11]}>
            <boxGeometry args={[width * 0.84, 0.26, 0.1]} />
            <meshStandardMaterial color="#f59e0b" metalness={0.8} />
          </mesh>
        </group>

        {/* Triple Ornate Gilded Lanterns */}
        {[-width * 0.32, 0, width * 0.32].map((lx, lIdx) => (
          <group key={`lan-${lIdx}`} position={[lx, 2.8, -length * 0.18]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.14, 0.2, 0.55, 6]} />
              <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={1.4} metalness={0.85} />
            </mesh>
            <pointLight color="#fbbf24" intensity={0.9} distance={8} decay={2} />
          </group>
        ))}

        <ShipHelm position={[0, 1.35, length * 0.1]} rudderAngle={rudderAngle} />
      </group>

      <BowCatheadAnchors width={width} z={length * 0.44} />
      <BroadsideCannons positions={cannonPositions} width={width} y={2.85} scale={1.05} />

      {/* Bowsprit */}
      <mesh position={[0, 3.5, length * 0.5 + 2.8]} rotation={[0.36, 0, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.2, 5.6, 8]} />
        <meshStandardMaterial color="#382013" roughness={0.8} />
      </mesh>

      {/* 1. Foremast */}
      <group position={[0, 3.1, length * 0.26]}>
        <mesh position={[0, length * 0.38, 0]} castShadow>
          <cylinderGeometry args={[0.16, 0.28, length * 0.76, 8]} />
          <meshStandardMaterial color="#382013" />
        </mesh>
        <group position={[0, length * 0.36, 0]}>
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.08, 0.08, width * 1.45, 8]} />
            <meshStandardMaterial color="#2d1c12" />
          </mesh>
          <ShipSail
            geometry={lowerGeo}
            texture={sailTexture}
            sailState={sailState}
            height={length * 0.25}
            depthOffset={0.22}
            type="square"
            mastIndex={0}
          />
        </group>
      </group>

      {/* 2. Mainmast */}
      <group position={[0, 3.1, -length * 0.04]}>
        <mesh position={[0, length * 0.42, 0]} castShadow>
          <cylinderGeometry args={[0.18, 0.3, length * 0.84, 8]} />
          <meshStandardMaterial color="#382013" />
        </mesh>
        <group position={[0, length * 0.40, 0]}>
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.08, 0.08, width * 1.5, 8]} />
            <meshStandardMaterial color="#2d1c12" />
          </mesh>
          <ShipSail
            geometry={lowerGeo}
            texture={sailTexture}
            sailState={sailState}
            height={length * 0.25}
            depthOffset={0.22}
            type="square"
            mastIndex={1}
          />
        </group>
        <group position={[0, length * 0.72, 0]}>
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.06, 0.06, width * 1.18, 8]} />
            <meshStandardMaterial color="#2d1c12" />
          </mesh>
          <ShipSail
            geometry={upperGeo}
            texture={sailTexture}
            sailState={sailState}
            height={length * 0.19}
            depthOffset={0.16}
            type="square"
            mastIndex={2}
          />
        </group>
        <ShipFlag position={[0, length * 0.85, -0.6]} isEnemy={isEnemy} />
      </group>

      {/* 3. Mizzenmast with Lateen Sail */}
      <group position={[0, 4.0, -length * 0.32]}>
        <mesh position={[0, length * 0.32, 0]} castShadow>
          <cylinderGeometry args={[0.14, 0.22, length * 0.64, 8]} />
          <meshStandardMaterial color="#382013" />
        </mesh>
        <group position={[0, length * 0.34, 0.1]} rotation={[-0.42, 0, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.06, 0.06, length * 0.75, 8]} />
            <meshStandardMaterial color="#2d1c12" />
          </mesh>
          <ShipSail
            geometry={lateenMizzenGeo}
            texture={sailTexture}
            sailState={sailState}
            height={length * 0.52}
            depthOffset={0.15}
            type="lateen"
            rotation={[0, Math.PI / 2, 0]}
            mastIndex={3}
          />
        </group>
      </group>

      <RudderBlade length={length} rudderAngle={rudderAngle} />
    </group>
  );
});
