import React, { useMemo } from 'react';
import * as THREE from 'three';
import type { SubModelProps } from '../types';
import {
  ShipWoodMaterial,
  BowCutwaterFigurehead,
  SquareRiggedMast,
  RudderBlade,
  BroadsideCannons,
  BowCatheadAnchors,
  ShipHelm,
  ShipSail,
  StandingRigging,
  CargoHatch,
  MooringBitts,
} from '../common';
import {
  createCurvedHullGeometry,
  createCurvedDeckGeometry,
  createSheerRailGeometry,
  createBillowedSailGeometry,
  createJibSailGeometry,
} from '../common/shipGeometries';

export const CorvetteModel: React.FC<SubModelProps> = React.memo(({
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
  const { length, width, trimColor } = config;
  const mastPositions = useMemo(() => [-length * 0.22, length * 0.20], [length]);
  const cannonPositions = useMemo(() => [-length * 0.22, 0, length * 0.22], [length]);

  const hullDepth = 3.0;
  const sheerBow = 0.9;
  const sheerStern = 0.85;

  const hullGeo = useMemo(() => createCurvedHullGeometry({
    length,
    width,
    depth: hullDepth,
    sheerBow,
    sheerStern,
    tumblehome: 0.07,
    transomWidthRatio: 0.60,
    segmentsZ: 32,
    segmentsGirth: 22,
  }), [length, width]);

  const deckGeo = useMemo(() => createCurvedDeckGeometry({
    length,
    width,
    depth: hullDepth,
    sheerBow,
    sheerStern,
    transomWidthRatio: 0.60,
    segmentsZ: 28,
  }), [length, width]);

  const railGeo = useMemo(() => createSheerRailGeometry({
    length,
    width,
    depth: hullDepth,
    sheerBow,
    sheerStern,
    transomWidthRatio: 0.60,
    segmentsZ: 28,
  }, 0.2, 0.26), [length, width]);

  const lowerGeo = useMemo(() => createBillowedSailGeometry(width * 1.35, length * 0.26, 0.42), [width, length]);
  const upperGeo = useMemo(() => createBillowedSailGeometry(width * 1.08, length * 0.19, 0.32), [width, length]);
  const jibGeo = useMemo(() => createJibSailGeometry(length * 0.32, length * 0.26, 0.35), [length]);

  return (
    <group>
      {/* Rich Polished Mahogany Curved Naval Hull */}
      <mesh geometry={hullGeo} castShadow receiveShadow>
        <ShipWoodMaterial map={hullTexture} />
      </mesh>

      {/* Royal Blue & Gold Sheer Strake Rails */}
      <mesh geometry={railGeo} castShadow>
        <meshStandardMaterial color={trimColor} roughness={0.3} metalness={0.5} side={THREE.DoubleSide} />
      </mesh>

      {/* Continuous Flush Weatherdeck */}
      <mesh geometry={deckGeo} receiveShadow>
        <ShipWoodMaterial map={deckTexture} deck />
      </mesh>

      {/* Clipper Cutwater Stem & Gilded Royal Eagle Figurehead */}
      <BowCutwaterFigurehead
        position={[0, hullDepth + sheerBow * 0.55, length * 0.5 + 0.6]}
        stemScale={0.95}
        figureheadType="eagle"
        figureheadColor="#f59e0b"
        timberColor="#3e2723"
        isEnemy={isEnemy}
      />

      {/* Micro Deck Hardware & Jolly Boats (Player only) */}
      {!isEnemy && (
        <>
          {/* Polished Brass Stanchion Handrails */}
          {[-width * 0.44, width * 0.44].map((rx, rIdx) => (
            <mesh key={`rail-${rIdx}`} position={[rx, hullDepth + 0.5, 0]}>
              <cylinderGeometry args={[0.03, 0.03, length * 0.8, 6]} />
              <meshStandardMaterial color="#d97706" metalness={0.85} roughness={0.25} />
            </mesh>
          ))}

          {/* Dual Wooden Jolly Boats Lashed Amidships */}
          {[-width * 0.22, width * 0.22].map((bx, bIdx) => (
            <group key={`boat-${bIdx}`} position={[bx, hullDepth + 0.25, -length * 0.02]}>
              <mesh castShadow>
                <boxGeometry args={[0.65, 0.42, 2.6]} />
                <meshStandardMaterial color="#5c3317" roughness={0.8} />
              </mesh>
              <mesh position={[0, 0.16, 0]}>
                <boxGeometry args={[0.5, 0.18, 2.3]} />
                <meshStandardMaterial color="#2d170b" />
              </mesh>
            </group>
          ))}

          {/* Cargo Grating Hatch Forward */}
          <CargoHatch position={[0, hullDepth + 0.05, length * 0.32]} width={width * 0.32} length={length * 0.12} />

          {/* Mooring Bitts Fore and Aft */}
          <MooringBitts position={[0, hullDepth + sheerBow * 0.6, length * 0.42]} width={0.55} />
          <MooringBitts position={[0, hullDepth + sheerStern * 0.6, -length * 0.42]} width={0.55} />

          {/* Brass Binnacle & Helm at Aft Quarterdeck */}
          <ShipHelm
            position={[0, hullDepth + sheerStern * 0.7 + 0.5, -length * 0.38]}
            rudderAngle={rudderAngle}
            shipId={shipId}
            isSelf={isSelf}
          />
          <BowCatheadAnchors width={width} z={length * 0.42} />
        </>
      )}

      <BroadsideCannons positions={cannonPositions} width={width * 0.95} y={hullDepth + 0.1} isEnemy={isEnemy} />

      {/* Bowsprit & Jib */}
      <mesh position={[0, hullDepth + sheerBow + 0.2, length * 0.5 + 2.5]} rotation={[Math.PI / 2 - 0.32, 0, 0]} castShadow={!isEnemy}>
        <cylinderGeometry args={[0.09, 0.18, 5.2, 8]} />
        <meshStandardMaterial color="#382013" roughness={0.8} />
      </mesh>
      <group position={[0, hullDepth + sheerBow + 0.3, length * 0.32]} rotation={[0, -Math.PI / 2, 0]}>
        <ShipSail
          geometry={jibGeo}
          texture={sailTexture}
          sailState={sailState}
          height={length * 0.26}
          type="jib"
        />
      </group>

      {/* Standing Rigging & Shrouds on both masts */}
      {mastPositions.map((mastZ, mIdx) => {
        const mastHeight = length * 0.74 + (mIdx === 1 ? 2.0 : 0);
        return (
          <React.Fragment key={`corvette-mast-${mIdx}`}>
            <StandingRigging
              mastPosition={[0, hullDepth, mastZ]}
              mastHeight={mastHeight}
              hullWidth={width * 0.96}
              shroudSpread={1.9}
              includeRatlines={!isEnemy}
              isEnemy={isEnemy}
            />
            <SquareRiggedMast
              position={[0, hullDepth, mastZ]}
              mastHeight={mastHeight}
              yardWidthLower={width * 1.4}
              yardWidthUpper={width * 1.1}
              lowerGeo={lowerGeo}
              upperGeo={upperGeo}
              sailTexture={sailTexture}
              sailState={sailState}
              mastIndex={mIdx}
              includeFlag={mIdx === 1}
              isEnemy={isEnemy}
              team={team}
              isFriendly={isFriendly}
              shipId={shipId}
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
