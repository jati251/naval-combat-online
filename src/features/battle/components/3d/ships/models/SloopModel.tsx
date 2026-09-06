import { HullDetails } from '../common/HullDetails';
import React, { useMemo } from 'react';
import * as THREE from 'three';
import type { SubModelProps } from '../types';
import {
  ShipWoodMaterial,
  SternCabinGallery,
  BowCutwaterFigurehead,
  RudderBlade,
  BroadsideCannons,
  BowCatheadAnchors,
  ShipSail,
  StandingRigging,
  CargoHatch,
  MooringBitts,
  ShipFlag,
} from '../common';
import {
  createCurvedHullGeometry,
  createCurvedDeckGeometry,
  createSheerRailGeometry,
  createBillowedSailGeometry,
  createJibSailGeometry,
} from '../common/shipGeometries';

export const SloopModel: React.FC<SubModelProps> = React.memo(({
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
  const mastHeight = length * 0.92;

  const hullDepth = 2.8;
  const sheerBow = 0.85;
  const sheerStern = 0.95;

  const hullGeo = useMemo(() => createCurvedHullGeometry({
    length,
    width,
    depth: hullDepth,
    sheerBow,
    sheerStern,
    tumblehome: 0.06,
    transomWidthRatio: 0.58,
    segmentsZ: 32,
    segmentsGirth: 22,
  }), [length, width]);

  const deckGeo = useMemo(() => createCurvedDeckGeometry({
    length,
    width,
    depth: hullDepth,
    sheerBow,
    sheerStern,
    transomWidthRatio: 0.58,
    segmentsZ: 28,
  }), [length, width]);

  const railGeo = useMemo(() => createSheerRailGeometry({
    length,
    width,
    depth: hullDepth,
    sheerBow,
    sheerStern,
    transomWidthRatio: 0.58,
    segmentsZ: 28,
  }, 0.2, 0.25), [length, width]);

  const gaffSailGeo = useMemo(() => createBillowedSailGeometry(width * 1.35, mastHeight * 0.38, 0.4), [width, mastHeight]);
  const topsailGeo = useMemo(() => createBillowedSailGeometry(width * 1.05, mastHeight * 0.24, 0.3), [width, mastHeight]);
  const jibGeo = useMemo(() => createJibSailGeometry(length * 0.38, mastHeight * 0.34, 0.35), [length, mastHeight]);

  const cannonZ = useMemo(() => [-length * 0.12, length * 0.12], [length]);
  const mastZ = length * 0.04;

  return (
    <group>
      <HullDetails hull={hullGeo} trimColor={trimColor} isEnemy={isEnemy} />
      {/* Sleek Curved Naval Hull */}
      <mesh geometry={hullGeo} castShadow={!isEnemy} receiveShadow>
        <ShipWoodMaterial map={hullTexture} />
      </mesh>

      {/* Gold Gunwale Sheer Molding */}
      <mesh geometry={railGeo} castShadow={!isEnemy}>
        <meshStandardMaterial color={trimColor} roughness={0.35} metalness={0.45} side={THREE.DoubleSide} />
      </mesh>

      {/* Cambered Weatherdeck */}
      <mesh geometry={deckGeo} receiveShadow>
        <ShipWoodMaterial map={deckTexture} deck />
      </mesh>

      {/* Clipper Cutwater Stem & Golden Dolphin Figurehead */}
      <BowCutwaterFigurehead
        position={[0, hullDepth + sheerBow * 0.5, length * 0.5 + 0.5]}
        stemScale={0.9}
        figureheadType="dolphin"
        figureheadColor={trimColor || '#eab308'}
        timberColor="#451a03"
        isEnemy={isEnemy}
      />

      {/* Bowsprit with Martingale (Dolphin Striker) */}
      <mesh position={[0, hullDepth + sheerBow + 0.2, length * 0.5 + 2.2]} rotation={[Math.PI / 2 - 0.28, 0, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.16, 5.0, 8]} />
        <meshStandardMaterial color="#382013" roughness={0.8} />
      </mesh>
      {/* Dolphin striker downward spar */}
      <mesh position={[0, hullDepth + sheerBow - 0.2, length * 0.5 + 2.0]} rotation={[-0.8, 0, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.9, 6]} />
        <meshStandardMaterial color="#2d1c12" />
      </mesh>

      {/* Flying Jib Staysail */}
      <group position={[0, hullDepth + sheerBow + 0.3, length * 0.35]} rotation={[0, -Math.PI / 2, 0]}>
        <ShipSail
          geometry={jibGeo}
          texture={sailTexture}
          sailState={sailState}
          height={mastHeight * 0.34}
          type="jib"
        />
      </group>

      {/* Micro Deck Hardware: Cargo Hatches, Bitts, Anchors (Player only) */}
      {!isEnemy && (
        <>
          <CargoHatch position={[0, hullDepth + 0.05, length * 0.22]} width={width * 0.35} length={length * 0.14} />
          <MooringBitts position={[0, hullDepth + sheerBow * 0.5, length * 0.4]} width={0.5} />
          <BowCatheadAnchors width={width} z={length * 0.38} />
        </>
      )}

      {/* Compact Companionway Cabin at Stern with Leaded Windows */}
      <SternCabinGallery
        position={[0, hullDepth + sheerStern * 0.6, -length * 0.36]}
        width={width * 0.72}
        height={1.25}
        depth={length * 0.22}
        tierCount={1}
        windowCount={2}
        trimColor={trimColor || '#eab308'}
        hullTexture={hullTexture}
        rudderAngle={rudderAngle}
        shipId={shipId}
        isSelf={isSelf}
        isEnemy={isEnemy}
        helmYOffset={0.2}
        helmZOffset={length * 0.06}
        lanternCount={2}
      />

      <BroadsideCannons positions={cannonZ} width={width * 0.94} y={hullDepth + 0.1} isEnemy={isEnemy} />

      {/* Tall Mast Standing Rigging with Ratlines */}
      <StandingRigging
        mastPosition={[0, hullDepth, mastZ]}
        mastHeight={mastHeight}
        hullWidth={width * 0.96}
        shroudSpread={1.8}
        includeRatlines={!isEnemy}
        isEnemy={isEnemy}
      />

      {/* Tall Single Mast with Gaff Rig & Square Topsail */}
      <group position={[0, hullDepth, mastZ]}>
        <mesh position={[0, mastHeight * 0.5, 0]} castShadow={!isEnemy}>
          <cylinderGeometry args={[0.15, 0.25, mastHeight, 8]} />
          <meshStandardMaterial color="#382013" roughness={0.8} />
        </mesh>
        {/* Gaff Boom */}
        <group position={[0, mastHeight * 0.44, 0]}>
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow={!isEnemy}>
            <cylinderGeometry args={[0.07, 0.07, width * 1.35, 8]} />
            <meshStandardMaterial color="#2d1c12" />
          </mesh>
          <ShipSail
            geometry={gaffSailGeo}
            texture={sailTexture}
            sailState={sailState}
            height={mastHeight * 0.38}
            depthOffset={0.2}
            type="square"
            mastIndex={1}
          />
        </group>
        {/* Square Topsail */}
        <group position={[0, mastHeight * 0.82, 0]}>
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow={!isEnemy}>
            <cylinderGeometry args={[0.06, 0.06, width * 1.05, 8]} />
            <meshStandardMaterial color="#2d1c12" />
          </mesh>
          <ShipSail
            geometry={topsailGeo}
            texture={sailTexture}
            sailState={sailState}
            height={mastHeight * 0.24}
            depthOffset={0.15}
            type="square"
            mastIndex={2}
          />
        </group>
        {/* Mast Top / Crow's Nest Platform */}
        <mesh position={[0, mastHeight * 0.65, 0]} castShadow={!isEnemy}>
          <cylinderGeometry args={[0.45, 0.36, 0.38, 8]} />
          <meshStandardMaterial color="#1a110a" />
        </mesh>
        <ShipFlag
          position={[0, mastHeight + 0.45, -0.6]}
          isEnemy={isEnemy}
          team={team}
          isFriendly={isFriendly}
          shipId={shipId}
        />
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
