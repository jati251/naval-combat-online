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
  createJibSailGeometry,
} from '../common/shipGeometries';

export const BrigModel: React.FC<SubModelProps> = React.memo(({
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
  const { length, width, cannonsPerSide, trimColor } = config;
  const mastPositions = useMemo(() => [-length * 0.24, length * 0.18], [length]);
  const cannonPositions = useMemo(() => {
    const arr = [];
    const span = length * 0.64;
    const step = span / (cannonsPerSide + 1);
    for (let i = 1; i <= cannonsPerSide; i++) arr.push(-span * 0.5 + i * step);
    return arr;
  }, [cannonsPerSide, length]);

  const hullDepth = 3.3;
  const sheerBow = 1.0;
  const sheerStern = 1.15;

  const hullGeo = useMemo(() => createCurvedHullGeometry({
    length,
    width,
    depth: hullDepth,
    sheerBow,
    sheerStern,
    tumblehome: 0.08,
    transomWidthRatio: 0.62,
    segmentsZ: 32,
    segmentsGirth: 22,
  }), [length, width]);

  const deckGeo = useMemo(() => createCurvedDeckGeometry({
    length,
    width,
    depth: hullDepth,
    sheerBow,
    sheerStern,
    transomWidthRatio: 0.62,
    segmentsZ: 28,
  }), [length, width]);

  const railGeo = useMemo(() => createSheerRailGeometry({
    length,
    width,
    depth: hullDepth,
    sheerBow,
    sheerStern,
    transomWidthRatio: 0.62,
    segmentsZ: 28,
  }, 0.22, 0.28), [length, width]);

  const lowerGeo = useMemo(() => createBillowedSailGeometry(width * 1.45, length * 0.26, 0.45), [width, length]);
  const upperGeo = useMemo(() => createBillowedSailGeometry(width * 1.15, length * 0.20, 0.35), [width, length]);
  const jibGeo = useMemo(() => createJibSailGeometry(length * 0.32, length * 0.28, 0.35), [length]);

  return (
    <group>
      {/* Sturdy Curved Oak Hull */}
      <mesh geometry={hullGeo} castShadow receiveShadow>
        <ShipWoodMaterial map={hullTexture} />
      </mesh>

      {/* Gold Gunwale Sheer Molding */}
      <mesh geometry={railGeo} castShadow>
        <meshStandardMaterial color={trimColor} roughness={0.35} metalness={0.45} side={THREE.DoubleSide} />
      </mesh>

      {/* Cambered Main Deck */}
      <mesh geometry={deckGeo} receiveShadow>
        <ShipWoodMaterial map={deckTexture} deck />
      </mesh>

      {/* Bow Cutwater Stem & Golden Lion Figurehead */}
      <BowCutwaterFigurehead
        position={[0, hullDepth + sheerBow * 0.55, length * 0.5 + 0.6]}
        figureheadType="lion"
        figureheadColor="#f59e0b"
        timberColor="#4a2511"
        isEnemy={isEnemy}
      />

      {/* Micro Deck Hardware: Cargo Hatches, Capstan, Bitts, Anchors (Player only) */}
      {!isEnemy && (
        <>
          <CargoHatch position={[0, hullDepth + 0.05, -length * 0.04]} width={width * 0.38} length={length * 0.16} />
          <NavalCapstan position={[0, hullDepth + sheerBow * 0.4, length * 0.35]} scale={0.9} />
          <MooringBitts position={[0, hullDepth + sheerBow * 0.6, length * 0.44]} width={0.6} />
          <BowCatheadAnchors width={width} z={length * 0.42} />
        </>
      )}

      {/* Raised Quarterdeck Captain's Cabin with Leaded Stern Windows */}
      <SternCabinGallery
        position={[0, hullDepth + sheerStern * 0.7, -length * 0.36]}
        width={width * 0.82}
        height={1.6}
        depth={length * 0.26}
        tierCount={1}
        windowCount={3}
        trimColor={trimColor || '#f59e0b'}
        hullTexture={hullTexture}
        rudderAngle={rudderAngle}
        shipId={shipId}
        isSelf={isSelf}
        isEnemy={isEnemy}
        helmYOffset={0.25}
        helmZOffset={length * 0.08}
        lanternCount={2}
      />

      <BroadsideCannons positions={cannonPositions} width={width * 0.95} y={hullDepth + 0.12} isEnemy={isEnemy} />

      {/* Bowsprit & Jib */}
      <mesh position={[0, hullDepth + sheerBow + 0.25, length * 0.5 + 2.6]} rotation={[Math.PI / 2 - 0.34, 0, 0]} castShadow={!isEnemy}>
        <cylinderGeometry args={[0.1, 0.2, 5.5, 8]} />
        <meshStandardMaterial color="#382013" roughness={0.8} />
      </mesh>
      <group position={[0, hullDepth + sheerBow + 0.35, length * 0.32]} rotation={[0, -Math.PI / 2, 0]}>
        <ShipSail
          geometry={jibGeo}
          texture={sailTexture}
          sailState={sailState}
          height={length * 0.28}
          type="jib"
        />
      </group>

      {/* 2 Stately Square-Rigged Masts with Standing Rigging & Ratlines */}
      {mastPositions.map((mastZ, mIdx) => {
        const mastHeight = length * 0.76 + (mIdx === 1 ? 2.2 : 0);
        return (
          <React.Fragment key={`brig-mast-${mIdx}`}>
            <StandingRigging
              mastPosition={[0, hullDepth, mastZ]}
              mastHeight={mastHeight}
              hullWidth={width * 0.96}
              shroudSpread={2.1}
              includeRatlines={!isEnemy}
              isEnemy={isEnemy}
            />
            <SquareRiggedMast
              position={[0, hullDepth, mastZ]}
              mastHeight={mastHeight}
              yardWidthLower={width * 1.5}
              yardWidthUpper={width * 1.18}
              lowerGeo={lowerGeo}
              upperGeo={upperGeo}
              sailTexture={sailTexture}
              sailState={sailState}
              mastIndex={mIdx}
              includeFlag={mIdx === 1}
              isEnemy={isEnemy}
            />
          </React.Fragment>
        );
      })}

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
