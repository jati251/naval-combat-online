import React, { useMemo } from 'react';
import * as THREE from 'three';
import type { SubModelProps } from '../types';
import {
  createCurvedHullGeometry,
  createCurvedDeckGeometry,
  createSheerRailGeometry,
  createBillowedSailGeometry,
  createLateenSailGeometry,
} from '../common/shipGeometries';
import { RudderBlade } from '../common/RudderBlade';
import { BroadsideCannons } from '../common/BroadsideCannons';
import { BowCatheadAnchors } from '../common/BowCatheadAnchors';
import { ShipHelm } from '../common/ShipHelm';
import { ShipFlag } from '../common/ShipFlag';
import { ShipSail } from '../common/ShipSail';
import { StandingRigging } from '../common/StandingRigging';
import { CargoHatch, NavalCapstan, MooringBitts } from '../common/DeckDetails';

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

  const hullDepth = 3.8;
  const sheerBow = 1.35;
  const sheerStern = 1.8;

  const hullGeo = useMemo(() => createCurvedHullGeometry({
    length,
    width,
    depth: hullDepth,
    sheerBow,
    sheerStern,
    tumblehome: 0.12,
    transomWidthRatio: 0.68,
    segmentsZ: 36,
    segmentsGirth: 24,
  }), [length, width]);

  const deckGeo = useMemo(() => createCurvedDeckGeometry({
    length,
    width,
    depth: hullDepth,
    sheerBow,
    sheerStern,
    transomWidthRatio: 0.68,
    segmentsZ: 30,
  }), [length, width]);

  const railGeo = useMemo(() => createSheerRailGeometry({
    length,
    width,
    depth: hullDepth,
    sheerBow,
    sheerStern,
    transomWidthRatio: 0.68,
    segmentsZ: 30,
  }, 0.24, 0.32), [length, width]);

  const lowerGeo = useMemo(() => createBillowedSailGeometry(width * 1.48, length * 0.25, 0.45), [width, length]);
  const upperGeo = useMemo(() => createBillowedSailGeometry(width * 1.18, length * 0.19, 0.35), [width, length]);
  const lateenMizzenGeo = useMemo(() => createLateenSailGeometry(length * 0.42, length * 0.52, 0.38), [length]);

  return (
    <group>
      {/* High-Sided Crimson & Mahogany Curved Hull */}
      <mesh geometry={hullGeo} castShadow receiveShadow>
        <meshStandardMaterial map={hullTexture} roughness={0.65} side={THREE.DoubleSide} />
      </mesh>

      {/* Gilded Spanish Gunwale Sheer Molding */}
      <mesh geometry={railGeo} castShadow>
        <meshStandardMaterial color={trimColor} roughness={0.3} metalness={0.6} side={THREE.DoubleSide} />
      </mesh>

      {/* Cambered Main Deck */}
      <mesh geometry={deckGeo} receiveShadow>
        <meshStandardMaterial map={deckTexture} roughness={0.75} side={THREE.DoubleSide} />
      </mesh>

      {/* Swept Up Forecastle Deck with Wooden Belfry */}
      <group position={[0, hullDepth + sheerBow * 0.7, length * 0.36]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[width * 0.8, 1.3, length * 0.24]} />
          <meshStandardMaterial color="#501e14" map={hullTexture} />
        </mesh>
        {/* Belfry with Bronze Ship's Bell */}
        <group position={[0, 1.1, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.25, 0.32, 0.65, 6]} />
            <meshStandardMaterial color="#451a03" />
          </mesh>
          <mesh position={[0, -0.1, 0]}>
            <sphereGeometry args={[0.16, 8, 8]} />
            <meshStandardMaterial color="#d97706" metalness={0.9} roughness={0.2} />
          </mesh>
        </group>
      </group>

      {/* Conquistador Golden Figurehead & Curved Beakhead */}
      <group position={[0, hullDepth + sheerBow * 0.6, length * 0.5 + 0.6]}>
        <mesh position={[0, -0.3, 0.55]} rotation={[0.45, 0, 0]} castShadow>
          <boxGeometry args={[0.28, 1.3, 1.6]} />
          <meshStandardMaterial color="#501e14" roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.55, 1.35]} rotation={[-0.4, 0, 0]} castShadow>
          <coneGeometry args={[0.42, 1.35, 6]} />
          <meshStandardMaterial color="#f59e0b" metalness={0.88} roughness={0.2} />
        </mesh>
      </group>

      {/* Towering 2-Tier Sterncastle with Quarter Galleries */}
      <group position={[0, hullDepth + sheerStern * 0.75, -length * 0.34]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[width * 0.9, 2.0, length * 0.32]} />
          <meshStandardMaterial color={isEnemy ? '#881337' : '#501e14'} map={hullTexture} />
        </mesh>

        {/* Side Quarter Galleries (Port & Starboard protruding balconies) */}
        {[-width * 0.46, width * 0.46].map((qx, qIdx) => (
          <mesh key={`qg-${qIdx}`} position={[qx, 0.2, 0]} castShadow>
            <boxGeometry args={[0.35, 1.2, length * 0.18]} />
            <meshStandardMaterial color="#f59e0b" metalness={0.75} roughness={0.3} />
          </mesh>
        ))}

        {/* Upper Poop Royal Deck */}
        <group position={[0, 1.7, -length * 0.04]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[width * 0.78, 1.5, length * 0.22]} />
            <meshStandardMaterial color={trimColor} map={hullTexture} />
          </mesh>
          <mesh position={[0, 0.85, -length * 0.11]}>
            <boxGeometry args={[width * 0.8, 0.25, 0.1]} />
            <meshStandardMaterial color="#f59e0b" metalness={0.8} />
          </mesh>
        </group>

        {/* Triple Ornate Gilded Lanterns */}
        {[-width * 0.3, 0, width * 0.3].map((lx, lIdx) => (
          <group key={`lan-${lIdx}`} position={[lx, 2.7, -length * 0.17]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.14, 0.2, 0.55, 6]} />
              <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={1.4} metalness={0.85} />
            </mesh>
            <pointLight color="#fbbf24" intensity={0.9} distance={8} decay={2} />
          </group>
        ))}

        <ShipHelm position={[0, 1.35, length * 0.1]} rudderAngle={rudderAngle} />
      </group>

      {/* Cargo Hatch & Naval Capstan */}
      <CargoHatch position={[0, hullDepth + 0.05, 0]} width={width * 0.36} length={length * 0.14} />
      <NavalCapstan position={[0, hullDepth + sheerBow * 0.35, length * 0.2]} scale={1.05} />
      <MooringBitts position={[0, hullDepth + sheerBow * 0.55, length * 0.44]} width={0.7} />

      <BowCatheadAnchors width={width} z={length * 0.44} />
      <BroadsideCannons positions={cannonPositions} width={width * 0.95} y={hullDepth + 0.12} scale={1.05} />

      {/* Bowsprit */}
      <mesh position={[0, hullDepth + sheerBow + 0.35, length * 0.5 + 2.8]} rotation={[0.36, 0, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.2, 5.6, 8]} />
        <meshStandardMaterial color="#382013" roughness={0.8} />
      </mesh>

      {/* 1. Foremast with Standing Rigging */}
      <StandingRigging
        mastPosition={[0, hullDepth, length * 0.26]}
        mastHeight={length * 0.76}
        hullWidth={width * 0.96}
        shroudSpread={2.2}
        includeRatlines={true}
      />
      <group position={[0, hullDepth, length * 0.26]}>
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

      {/* 2. Mainmast with Standing Rigging */}
      <StandingRigging
        mastPosition={[0, hullDepth, -length * 0.04]}
        mastHeight={length * 0.84}
        hullWidth={width * 0.96}
        shroudSpread={2.3}
        includeRatlines={true}
      />
      <group position={[0, hullDepth, -length * 0.04]}>
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

      {/* 3. Mizzenmast with Lateen Sail & Standing Rigging */}
      <StandingRigging
        mastPosition={[0, hullDepth + sheerStern * 0.7, -length * 0.32]}
        mastHeight={length * 0.64}
        hullWidth={width * 0.88}
        shroudSpread={1.8}
        includeRatlines={true}
      />
      <group position={[0, hullDepth + sheerStern * 0.7, -length * 0.32]}>
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
