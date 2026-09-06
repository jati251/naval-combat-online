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

export const FrigateModel: React.FC<SubModelProps> = React.memo(({
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
  const mastPositions = useMemo(() => [-length * 0.32, 0, length * 0.28], [length]);

  const cannonPositions = useMemo(() => {
    const arr = [];
    const span = length * 0.68;
    const step = span / (cannonsPerSide + 1);
    for (let i = 1; i <= cannonsPerSide; i++) arr.push(-span * 0.5 + i * step);
    return arr;
  }, [cannonsPerSide, length]);

  const hullDepth = 3.8;
  const sheerBow = 1.3;
  const sheerStern = 1.4;

  const hullGeo = useMemo(() => createCurvedHullGeometry({
    length,
    width,
    depth: hullDepth,
    sheerBow,
    sheerStern,
    tumblehome: 0.11,
    transomWidthRatio: 0.66,
    segmentsZ: 36,
    segmentsGirth: 24,
  }), [length, width]);

  const deckGeo = useMemo(() => createCurvedDeckGeometry({
    length,
    width,
    depth: hullDepth,
    sheerBow,
    sheerStern,
    transomWidthRatio: 0.66,
    segmentsZ: 30,
  }), [length, width]);

  const railGeo = useMemo(() => createSheerRailGeometry({
    length,
    width,
    depth: hullDepth,
    sheerBow,
    sheerStern,
    transomWidthRatio: 0.66,
    segmentsZ: 30,
  }, 0.24, 0.32), [length, width]);

  const lowerGeo = useMemo(() => createBillowedSailGeometry(width * 1.48, length * 0.25, 0.45), [width, length]);
  const upperGeo = useMemo(() => createBillowedSailGeometry(width * 1.18, length * 0.19, 0.35), [width, length]);
  const jibGeo = useMemo(() => createJibSailGeometry(length * 0.34, length * 0.28, 0.35), [length]);

  return (
    <group>
      {/* Heavy Tumblehome Curved Naval Hull */}
      <mesh geometry={hullGeo} castShadow receiveShadow>
        <ShipWoodMaterial map={hullTexture} />
      </mesh>

      {/* Gold Naval Gunport Sheer Strake Rails */}
      <mesh geometry={railGeo} castShadow>
        <meshStandardMaterial color={trimColor} roughness={0.35} metalness={0.45} side={THREE.DoubleSide} />
      </mesh>

      {/* Cambered Continuous Battery Deck */}
      <mesh geometry={deckGeo} receiveShadow>
        <ShipWoodMaterial map={deckTexture} deck />
      </mesh>

      {/* Massive Battering Cutwater Stem & Neptune Lion Figurehead */}
      <BowCutwaterFigurehead
        position={[0, hullDepth + sheerBow * 0.55, length * 0.5 + 0.6]}
        stemScale={1.15}
        figureheadType="lion"
        figureheadColor="#f59e0b"
        timberColor="#382013"
        isEnemy={isEnemy}
      />

      {/* Stately Captain's Great Cabin at Stern with Double Tier Leaded Windows */}
      <SternCabinGallery
        position={[0, hullDepth + sheerStern * 0.72, -length * 0.38]}
        width={width * 0.88}
        height={1.9}
        depth={length * 0.26}
        tierCount={2}
        windowCount={5}
        trimColor={trimColor || '#f59e0b'}
        hullTexture={hullTexture}
        rudderAngle={rudderAngle}
        shipId={shipId}
        isSelf={isSelf}
        isEnemy={isEnemy}
        helmYOffset={0.3}
        helmZOffset={length * 0.08}
        lanternCount={2}
      />

      {/* Cargo Hatches & Deck Hardware (Player only) */}
      {!isEnemy && (
        <>
          <CargoHatch position={[0, hullDepth + 0.05, -length * 0.16]} width={width * 0.36} length={length * 0.14} />
          <CargoHatch position={[0, hullDepth + 0.05, length * 0.14]} width={width * 0.36} length={length * 0.14} />
          <NavalCapstan position={[0, hullDepth + sheerBow * 0.35, length * 0.38]} scale={1.05} />
          <MooringBitts position={[0, hullDepth + sheerBow * 0.55, length * 0.45]} width={0.7} />
          <BowCatheadAnchors width={width} z={length * 0.44} />
        </>
      )}

      <BroadsideCannons positions={cannonPositions} width={width * 0.95} y={hullDepth + 0.12} scale={1.05} isEnemy={isEnemy} />

      {/* Bowsprit with Flying Jib */}
      <mesh position={[0, hullDepth + sheerBow + 0.3, length * 0.5 + 2.8]} rotation={[Math.PI / 2 - 0.34, 0, 0]} castShadow={!isEnemy}>
        <cylinderGeometry args={[0.11, 0.22, 5.8, 8]} />
        <meshStandardMaterial color="#382013" roughness={0.8} />
      </mesh>
      <group position={[0, hullDepth + sheerBow + 0.4, length * 0.32]} rotation={[0, -Math.PI / 2, 0]}>
        <ShipSail
          geometry={jibGeo}
          texture={sailTexture}
          sailState={sailState}
          height={length * 0.28}
          type="jib"
        />
      </group>

      {/* 3 Massive Full-Rigged Masts with Standing Rigging & Ratlines */}
      {mastPositions.map((mastZ, mIdx) => {
        const mastHeight = length * 0.76 + (mIdx === 1 ? 2.6 : 0);
        return (
          <React.Fragment key={`frigate-mast-${mIdx}`}>
            <StandingRigging
              mastPosition={[0, hullDepth, mastZ]}
              mastHeight={mastHeight}
              hullWidth={width * 0.96}
              shroudSpread={2.3}
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
              includeFlag={mIdx === 2}
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
