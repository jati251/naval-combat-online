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
  StandingRigging,
  CargoHatch,
  NavalCapstan,
  MooringBitts,
  ShipSail,
} from '../common';
import {
  createCurvedHullGeometry,
  createCurvedDeckGeometry,
  createSheerRailGeometry,
  createBillowedSailGeometry,
  createLateenSailGeometry,
} from '../common/shipGeometries';

export const CarrackModel: React.FC<SubModelProps> = React.memo(({
  config,
  sailState,
  rudderAngle,
  isEnemy,
  hullTexture,
  deckTexture,
  sailTexture,
  shipId,
  isSelf,
}) => {
  const { length, width } = config;
  const cannonPositions = useMemo(() => [-length * 0.24, -length * 0.08, length * 0.08, length * 0.24], [length]);

  const hullDepth = 3.6;
  const sheerBow = 1.25;
  const sheerStern = 1.45;

  const hullGeo = useMemo(() => createCurvedHullGeometry({
    length,
    width,
    depth: hullDepth,
    sheerBow,
    sheerStern,
    tumblehome: 0.10,
    transomWidthRatio: 0.65,
    segmentsZ: 32,
    segmentsGirth: 22,
  }), [length, width]);

  const deckGeo = useMemo(() => createCurvedDeckGeometry({
    length,
    width,
    depth: hullDepth,
    sheerBow,
    sheerStern,
    transomWidthRatio: 0.65,
    segmentsZ: 28,
  }), [length, width]);

  const railGeo = useMemo(() => createSheerRailGeometry({
    length,
    width,
    depth: hullDepth,
    sheerBow,
    sheerStern,
    transomWidthRatio: 0.65,
    segmentsZ: 28,
  }, 0.22, 0.28), [length, width]);

  const foreLowerGeo = useMemo(() => createBillowedSailGeometry(width * 1.35, length * 0.23, 0.42), [width, length]);
  const foreUpperGeo = useMemo(() => createBillowedSailGeometry(width * 1.05, length * 0.17, 0.32), [width, length]);
  const mainLowerGeo = useMemo(() => createBillowedSailGeometry(width * 1.45, length * 0.26, 0.46), [width, length]);
  const mainUpperGeo = useMemo(() => createBillowedSailGeometry(width * 1.15, length * 0.19, 0.35), [width, length]);
  const lateenMizzenGeo = useMemo(() => createLateenSailGeometry(length * 0.40, length * 0.50, 0.36), [length]);

  return (
    <group>
      {/* Charred Dark Timber Curved Hull */}
      <mesh geometry={hullGeo} castShadow receiveShadow>
        <ShipWoodMaterial map={hullTexture} color="#6b6460" />
      </mesh>

      {/* Spectral Jade Sheer Molding */}
      <mesh geometry={railGeo} castShadow>
        <meshStandardMaterial color="#10b981" emissive="#059669" emissiveIntensity={0.6} roughness={0.4} side={THREE.DoubleSide} />
      </mesh>

      {/* Weathered Dark Deck Planks */}
      <mesh geometry={deckGeo} receiveShadow>
        <ShipWoodMaterial map={deckTexture} deck />
      </mesh>

      {/* Curved Gothic Beakhead & Skeletal Dragon Figurehead */}
      <BowCutwaterFigurehead
        position={[0, hullDepth + sheerBow * 0.55, length * 0.5 + 0.6]}
        stemScale={1.1}
        figureheadType="dragon"
        figureheadColor="#10b981"
        timberColor="#090d16"
        isEnemy={isEnemy}
      />

      {/* Elevated Forecastle Fortification Timber Bracing */}
      <group position={[0, hullDepth + sheerBow * 0.75, length * 0.38]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[width * 0.82, 1.4, length * 0.18]} />
          <meshStandardMaterial color="#1e293b" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.75, length * 0.09]}>
          <boxGeometry args={[width * 0.84, 0.14, 0.08]} />
          <meshStandardMaterial color="#10b981" metalness={0.7} roughness={0.3} />
        </mesh>
      </group>

      {/* Gothic Arched Sterncastle with Cathedral Windows */}
      <SternCabinGallery
        position={[0, hullDepth + sheerStern * 0.7, -length * 0.35]}
        width={width * 0.86}
        height={2.2}
        depth={length * 0.28}
        tierCount={2}
        windowCount={4}
        trimColor="#10b981"
        hullTexture={hullTexture}
        rudderAngle={rudderAngle}
        shipId={shipId}
        isSelf={isSelf}
        isEnemy={isEnemy}
        helmYOffset={0.35}
        helmZOffset={length * 0.08}
        lanternCount={2}
      />

      {/* Deck Hardware: Cargo Hatches & Capstan (Player only) */}
      {!isEnemy && (
        <>
          <CargoHatch position={[0, hullDepth + 0.05, length * 0.12]} width={width * 0.36} length={length * 0.14} />
          <NavalCapstan position={[0, hullDepth + sheerBow * 0.45, length * 0.38]} scale={0.95} />
          <MooringBitts position={[0, hullDepth + sheerBow * 0.65, length * 0.44]} width={0.65} />
        </>
      )}

      <BroadsideCannons positions={cannonPositions} width={width * 0.95} y={hullDepth + 0.12} color="#052e16" isEnemy={isEnemy} />

      {/* Bowsprit */}
      <mesh position={[0, hullDepth + sheerBow + 0.25, length * 0.5 + 2.7]} rotation={[Math.PI / 2 - 0.36, 0, 0]} castShadow={!isEnemy}>
        <cylinderGeometry args={[0.1, 0.22, 5.6, 8]} />
        <meshStandardMaterial color="#1e1b18" roughness={0.9} />
      </mesh>

      {/* 1. Fore Mast (Square-Rigged) */}
      <StandingRigging
        mastPosition={[0, hullDepth, length * 0.26]}
        mastHeight={length * 0.75}
        hullWidth={width * 0.94}
        shroudSpread={1.9}
        includeRatlines={!isEnemy}
        isEnemy={isEnemy}
        color="#18181b"
      />
      <SquareRiggedMast
        position={[0, hullDepth, length * 0.26]}
        mastHeight={length * 0.75}
        yardWidthLower={width * 1.35}
        yardWidthUpper={width * 1.05}
        lowerGeo={foreLowerGeo}
        upperGeo={foreUpperGeo}
        sailTexture={sailTexture}
        sailState={sailState}
        mastIndex={0}
        mastColor="#1e1b18"
        yardColor="#18181b"
        isEnemy={isEnemy}
      />

      {/* 2. Main Mast (Square-Rigged with Battle Flag) */}
      <StandingRigging
        mastPosition={[0, hullDepth, 0]}
        mastHeight={length * 0.88}
        hullWidth={width * 0.98}
        shroudSpread={2.2}
        includeRatlines={!isEnemy}
        isEnemy={isEnemy}
        color="#18181b"
      />
      <SquareRiggedMast
        position={[0, hullDepth, 0]}
        mastHeight={length * 0.88}
        yardWidthLower={width * 1.48}
        yardWidthUpper={width * 1.18}
        lowerGeo={mainLowerGeo}
        upperGeo={mainUpperGeo}
        sailTexture={sailTexture}
        sailState={sailState}
        mastIndex={1}
        mastColor="#1e1b18"
        yardColor="#18181b"
        includeFlag={true}
        isEnemy={isEnemy}
      />

      {/* 3. Authentic Lateen Mizzenmast (Age of Discovery Nao / Carrack rig) */}
      <StandingRigging
        mastPosition={[0, hullDepth + sheerStern * 0.7, -length * 0.32]}
        mastHeight={length * 0.62}
        hullWidth={width * 0.88}
        shroudSpread={1.8}
        includeRatlines={!isEnemy}
        isEnemy={isEnemy}
        color="#18181b"
      />
      <group position={[0, hullDepth + sheerStern * 0.7, -length * 0.32]}>
        <mesh position={[0, length * 0.31, 0]} castShadow={!isEnemy}>
          <cylinderGeometry args={[0.13, 0.2, length * 0.62, 8]} />
          <meshStandardMaterial color="#1e1b18" roughness={0.9} />
        </mesh>
        <group position={[0, length * 0.32, 0.1]} rotation={[-0.42, 0, 0]}>
          <mesh castShadow={!isEnemy}>
            <cylinderGeometry args={[0.06, 0.06, length * 0.72, 8]} />
            <meshStandardMaterial color="#18181b" />
          </mesh>
          <ShipSail
            geometry={lateenMizzenGeo}
            texture={sailTexture}
            sailState={sailState}
            height={length * 0.50}
            depthOffset={0.15}
            type="lateen"
            rotation={[0, Math.PI / 2, 0]}
            mastIndex={4}
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
