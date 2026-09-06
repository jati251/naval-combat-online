import { HullDetails } from '../common/HullDetails';
import React, { useMemo } from 'react';
import * as THREE from 'three';
import type { SubModelProps } from '../types';
import {
  ShipWoodMaterial,
  SternCabinGallery,
  BowCutwaterFigurehead,
  SquareRiggedMast,
  RudderBlade,
  BroadsideCannons,
  BowCatheadAnchors,
  ShipSail,
  StandingRigging,
  CargoHatch,
  NavalCapstan,
  MooringBitts,
} from '../common';
import {
  createCurvedHullGeometry,
  createCurvedDeckGeometry,
  createSheerRailGeometry,
  createBillowedSailGeometry,
  createLateenSailGeometry,
} from '../common/shipGeometries';

export const GalleonModel: React.FC<SubModelProps> = React.memo(({
  config,
  sailState,
  rudderAngle,
  isEnemy,
  hullTexture,
  deckTexture,
  sailTexture,
  shipId,
  isSelf,
  team,
  isFriendly,
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
      <HullDetails hull={hullGeo} trimColor={trimColor} />
      {/* High-Sided Crimson & Mahogany Curved Hull */}
      <mesh geometry={hullGeo} castShadow receiveShadow>
        <ShipWoodMaterial map={hullTexture} />
      </mesh>

      {/* Gilded Spanish Gunwale Sheer Molding */}
      <mesh geometry={railGeo} castShadow>
        <meshStandardMaterial color={trimColor} roughness={0.3} metalness={0.6} side={THREE.DoubleSide} />
      </mesh>

      {/* Cambered Main Deck */}
      <mesh geometry={deckGeo} receiveShadow>
        <ShipWoodMaterial map={deckTexture} deck />
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

      {/* Conquistador Golden Lion Figurehead & Curved Beakhead */}
      <BowCutwaterFigurehead
        position={[0, hullDepth + sheerBow * 0.6, length * 0.5 + 0.6]}
        stemScale={1.2}
        figureheadType="lion"
        figureheadColor="#f59e0b"
        timberColor="#501e14"
        isEnemy={isEnemy}
      />

      {/* Towering 2-Tier Sterncastle with Spanish Balcony & Leaded Windows */}
      <SternCabinGallery
        position={[0, hullDepth + sheerStern * 0.75, -length * 0.34]}
        width={width * 0.9}
        height={2.2}
        depth={length * 0.32}
        tierCount={2}
        windowCount={5}
        trimColor="#f59e0b"
        hullTexture={hullTexture}
        rudderAngle={rudderAngle}
        shipId={shipId}
        isSelf={isSelf}
        isEnemy={isEnemy}
        helmYOffset={0.35}
        helmZOffset={length * 0.1}
        lanternCount={3}
        hasBalcony={true}
      />

      {/* Cargo Hatch & Naval Capstan (Player only) */}
      {!isEnemy && (
        <>
          <CargoHatch position={[0, hullDepth + 0.05, 0]} width={width * 0.36} length={length * 0.14} />
          <NavalCapstan position={[0, hullDepth + sheerBow * 0.35, length * 0.2]} scale={1.05} />
          <MooringBitts position={[0, hullDepth + sheerBow * 0.55, length * 0.44]} width={0.7} />
          <BowCatheadAnchors width={width} z={length * 0.44} />
        </>
      )}

      <BroadsideCannons positions={cannonPositions} width={width * 0.95} y={hullDepth + 0.12} scale={1.05} isEnemy={isEnemy} />

      {/* Bowsprit */}
      <mesh position={[0, hullDepth + sheerBow + 0.35, length * 0.5 + 2.8]} rotation={[Math.PI / 2 - 0.36, 0, 0]} castShadow={!isEnemy}>
        <cylinderGeometry args={[0.1, 0.2, 5.6, 8]} />
        <meshStandardMaterial color="#382013" roughness={0.8} />
      </mesh>

      {/* 1. Foremast with Standing Rigging */}
      <StandingRigging
        mastPosition={[0, hullDepth, length * 0.24]}
        mastHeight={length * 0.75}
        hullWidth={width * 0.94}
        shroudSpread={2.2}
        includeRatlines={!isEnemy}
        isEnemy={isEnemy}
      />
      <SquareRiggedMast
        position={[0, hullDepth, length * 0.24]}
        mastHeight={length * 0.75}
        yardWidthLower={width * 1.45}
        yardWidthUpper={width * 1.15}
        lowerGeo={lowerGeo}
        upperGeo={upperGeo}
        sailTexture={sailTexture}
        sailState={sailState}
        mastIndex={0}
        isEnemy={isEnemy}
      />

      {/* 2. Mainmast with Standing Rigging & Flag */}
      <StandingRigging
        mastPosition={[0, hullDepth, -length * 0.04]}
        mastHeight={length * 0.85}
        hullWidth={width * 0.98}
        shroudSpread={2.4}
        includeRatlines={!isEnemy}
        isEnemy={isEnemy}
      />
      <SquareRiggedMast
        position={[0, hullDepth, -length * 0.04]}
        mastHeight={length * 0.85}
        yardWidthLower={width * 1.55}
        yardWidthUpper={width * 1.22}
        lowerGeo={lowerGeo}
        upperGeo={upperGeo}
        sailTexture={sailTexture}
        sailState={sailState}
        mastIndex={1}
        includeFlag={true}
        isEnemy={isEnemy}
        team={team}
        isFriendly={isFriendly}
        shipId={shipId}
      />

      {/* 3. Mizzenmast with Lateen Sail & Standing Rigging */}
      <StandingRigging
        mastPosition={[0, hullDepth + sheerStern * 0.7, -length * 0.32]}
        mastHeight={length * 0.64}
        hullWidth={width * 0.88}
        shroudSpread={1.8}
        includeRatlines={!isEnemy}
        isEnemy={isEnemy}
      />
      <group position={[0, hullDepth + sheerStern * 0.7, -length * 0.32]}>
        <mesh position={[0, length * 0.32, 0]} castShadow={!isEnemy}>
          <cylinderGeometry args={[0.14, 0.22, length * 0.64, 8]} />
          <meshStandardMaterial color="#382013" />
        </mesh>
        <group position={[0, length * 0.34, 0.1]} rotation={[-0.42, 0, 0]}>
          <mesh castShadow={!isEnemy}>
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

      <RudderBlade
        length={length}
        rudderAngle={rudderAngle}
        isEnemy={isEnemy}
        shipId={shipId}
        isSelf={isSelf}
      />
    </group>
  );
});
