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

export const ManOWarModel: React.FC<SubModelProps> = React.memo(({
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
    const span = length * 0.7;
    const step = span / (cannonsPerSide + 1);
    for (let i = 1; i <= cannonsPerSide; i++) arr.push(-span * 0.5 + i * step);
    return arr;
  }, [cannonsPerSide, length]);

  const hullDepth = 4.2;
  const sheerBow = 1.45;
  const sheerStern = 1.65;

  const hullGeo = useMemo(() => createCurvedHullGeometry({
    length,
    width,
    depth: hullDepth,
    sheerBow,
    sheerStern,
    tumblehome: 0.14,
    transomWidthRatio: 0.70,
    segmentsZ: 38,
    segmentsGirth: 26,
  }), [length, width]);

  const deckGeo = useMemo(() => createCurvedDeckGeometry({
    length,
    width,
    depth: hullDepth,
    sheerBow,
    sheerStern,
    transomWidthRatio: 0.70,
    segmentsZ: 32,
  }), [length, width]);

  const railGeo = useMemo(() => createSheerRailGeometry({
    length,
    width,
    depth: hullDepth,
    sheerBow,
    sheerStern,
    transomWidthRatio: 0.70,
    segmentsZ: 32,
  }, 0.26, 0.36), [length, width]);

  const lowerGeo = useMemo(() => createBillowedSailGeometry(width * 1.52, length * 0.25, 0.48), [width, length]);
  const upperGeo = useMemo(() => createBillowedSailGeometry(width * 1.22, length * 0.19, 0.38), [width, length]);
  const jibGeo = useMemo(() => createJibSailGeometry(length * 0.36, length * 0.28, 0.36), [length]);

  return (
    <group>
      {/* Colossal 28-Meter Naval Oak Curved Hull */}
      <mesh geometry={hullGeo} castShadow receiveShadow>
        <ShipWoodMaterial map={hullTexture} />
      </mesh>

      {/* Iconic Nelson Chequer Golden Sheer Rail */}
      <mesh geometry={railGeo} castShadow>
        <meshStandardMaterial color={trimColor} roughness={0.35} metalness={0.45} side={THREE.DoubleSide} />
      </mesh>

      {/* Cambered Main Gun Deck */}
      <mesh geometry={deckGeo} receiveShadow>
        <ShipWoodMaterial map={deckTexture} deck />
      </mesh>

      {/* Colossal Cutwater Stem & Gilded Royal Lion Figurehead */}
      <BowCutwaterFigurehead
        position={[0, hullDepth + sheerBow * 0.55, length * 0.5 + 0.7]}
        stemScale={1.3}
        figureheadType="lion"
        figureheadColor="#f59e0b"
        timberColor="#18181b"
        isEnemy={isEnemy}
      />

      {/* 3-Tier Sovereign Admiral's Stern Gallery */}
      <SternCabinGallery
        position={[0, hullDepth + sheerStern * 0.75, -length * 0.38]}
        width={width * 0.92}
        height={2.6}
        depth={length * 0.28}
        tierCount={3}
        windowCount={7}
        trimColor={trimColor || '#f59e0b'}
        hullTexture={hullTexture}
        rudderAngle={rudderAngle}
        shipId={shipId}
        isSelf={isSelf}
        isEnemy={isEnemy}
        helmYOffset={0.35}
        helmZOffset={length * 0.08}
        lanternCount={3}
        hasBalcony={true}
      />

      {/* Heavy Deck Hardware (Player only) */}
      {!isEnemy && (
        <>
          <CargoHatch position={[0, hullDepth + 0.05, -length * 0.02]} width={width * 0.38} length={length * 0.13} />
          <CargoHatch position={[0, hullDepth + 0.05, length * 0.22]} width={width * 0.38} length={length * 0.13} />
          <NavalCapstan position={[0, hullDepth + sheerBow * 0.35, length * 0.38]} scale={1.15} />
          <MooringBitts position={[0, hullDepth + sheerBow * 0.6, length * 0.46]} width={0.8} />
          <BowCatheadAnchors width={width} z={length * 0.45} />
        </>
      )}

      {/* 16 Heavy Cannons Total with Double-Decker Ports */}
      <BroadsideCannons positions={cannonPositions} width={width * 0.95} y={hullDepth + 0.15} scale={1.1} isDoubleDecker isEnemy={isEnemy} />

      {/* Heavy Bowsprit */}
      <mesh position={[0, hullDepth + sheerBow + 0.35, length * 0.5 + 3.0]} rotation={[Math.PI / 2 - 0.34, 0, 0]} castShadow={!isEnemy}>
        <cylinderGeometry args={[0.12, 0.24, 6.2, 8]} />
        <meshStandardMaterial color="#382013" roughness={0.8} />
      </mesh>
      <group position={[0, hullDepth + sheerBow + 0.45, length * 0.35]} rotation={[0, -Math.PI / 2, 0]}>
        <ShipSail
          geometry={jibGeo}
          texture={sailTexture}
          sailState={sailState}
          height={length * 0.28}
          type="jib"
        />
      </group>

      {/* 3 Colossal Naval Oak Masts with Triple Fighting Tops & Stately Rigging */}
      {mastPositions.map((mastZ, mIdx) => {
        const mastHeight = length * 0.82 + (mIdx === 1 ? 2.8 : 0);
        return (
          <React.Fragment key={`mow-mast-${mIdx}`}>
            <StandingRigging
              mastPosition={[0, hullDepth, mastZ]}
              mastHeight={mastHeight}
              hullWidth={width * 0.98}
              shroudSpread={2.4}
              includeRatlines={!isEnemy}
              isEnemy={isEnemy}
            />
            <SquareRiggedMast
              position={[0, hullDepth, mastZ]}
              mastHeight={mastHeight}
              yardWidthLower={width * 1.55}
              yardWidthUpper={width * 1.25}
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
