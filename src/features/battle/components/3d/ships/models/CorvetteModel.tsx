import React, { useMemo } from 'react';
import * as THREE from 'three';
import type { SubModelProps } from '../types';
import {
  createCurvedHullGeometry,
  createCurvedDeckGeometry,
  createSheerRailGeometry,
  createBillowedSailGeometry,
  createJibSailGeometry,
} from '../common/shipGeometries';
import { RudderBlade } from '../common/RudderBlade';
import { BroadsideCannons } from '../common/BroadsideCannons';
import { BowCatheadAnchors } from '../common/BowCatheadAnchors';
import { ShipHelm } from '../common/ShipHelm';
import { ShipFlag } from '../common/ShipFlag';
import { ShipSail } from '../common/ShipSail';
import { StandingRigging } from '../common/StandingRigging';
import { CargoHatch, MooringBitts } from '../common/DeckDetails';

export const CorvetteModel: React.FC<SubModelProps> = React.memo(({
  config,
  sailState,
  rudderAngle,
  isEnemy,
  hullTexture,
  deckTexture,
  sailTexture,
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
        <meshStandardMaterial map={hullTexture} roughness={0.58} side={THREE.DoubleSide} />
      </mesh>

      {/* Royal Blue & Gold Sheer Strake Rails */}
      <mesh geometry={railGeo} castShadow>
        <meshStandardMaterial color={trimColor} roughness={0.3} metalness={0.5} side={THREE.DoubleSide} />
      </mesh>

      {/* Continuous Flush Weatherdeck */}
      <mesh geometry={deckGeo} receiveShadow>
        <meshStandardMaterial map={deckTexture} roughness={0.75} side={THREE.DoubleSide} />
      </mesh>

      {/* Clipper Cutwater Stem & Gilded Royal Eagle Figurehead */}
      <group position={[0, hullDepth + sheerBow * 0.55, length * 0.5 + 0.6]}>
        <mesh position={[0, -0.25, 0.45]} rotation={[0.42, 0, 0]} castShadow>
          <boxGeometry args={[0.22, 1.0, 1.3]} />
          <meshStandardMaterial color="#3e2723" roughness={0.65} />
        </mesh>
        <mesh position={[0, 0.4, 1.15]} rotation={[-0.35, 0, 0]} castShadow>
          <coneGeometry args={[0.35, 1.15, 6]} />
          <meshStandardMaterial color="#f59e0b" metalness={0.88} roughness={0.2} />
        </mesh>
      </group>

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
          <ShipHelm position={[0, hullDepth + sheerStern * 0.7 + 0.5, -length * 0.38]} rudderAngle={rudderAngle} />
          <BowCatheadAnchors width={width} z={length * 0.42} />
        </>
      )}

      <BroadsideCannons positions={cannonPositions} width={width * 0.95} y={hullDepth + 0.1} isEnemy={isEnemy} />

      {/* Bowsprit & Jib */}
      <mesh position={[0, hullDepth + sheerBow + 0.2, length * 0.5 + 2.5]} rotation={[0.32, 0, 0]} castShadow={!isEnemy}>
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
          <React.Fragment key={`rig-${mIdx}`}>
            <StandingRigging
              mastPosition={[0, hullDepth, mastZ]}
              mastHeight={mastHeight}
              hullWidth={width * 0.96}
              shroudSpread={1.9}
              includeRatlines={!isEnemy}
              isEnemy={isEnemy}
            />
            {/* 2 Raked Masts with Square Sails & Spanker */}
            <group position={[0, hullDepth, mastZ]} rotation={[0.05, 0, 0]}>
              <mesh position={[0, mastHeight * 0.5, 0]} castShadow={!isEnemy}>
                <cylinderGeometry args={[0.16, 0.28, mastHeight, 8]} />
                <meshStandardMaterial color="#382013" roughness={0.8} />
              </mesh>
              <group position={[0, mastHeight * 0.46, 0]}>
                <mesh rotation={[0, 0, Math.PI / 2]} castShadow={!isEnemy}>
                  <cylinderGeometry args={[0.07, 0.07, width * 1.4, 8]} />
                  <meshStandardMaterial color="#2d1c12" />
                </mesh>
                <ShipSail
                  geometry={lowerGeo}
                  texture={sailTexture}
                  sailState={sailState}
                  height={length * 0.26}
                  depthOffset={0.2}
                  type="square"
                  mastIndex={mIdx * 2}
                />
              </group>
              <group position={[0, mastHeight * 0.82, 0]}>
                <mesh rotation={[0, 0, Math.PI / 2]} castShadow={!isEnemy}>
                  <cylinderGeometry args={[0.05, 0.05, width * 1.1, 8]} />
                  <meshStandardMaterial color="#2d1c12" />
                </mesh>
                <ShipSail
                  geometry={upperGeo}
                  texture={sailTexture}
                  sailState={sailState}
                  height={length * 0.19}
                  depthOffset={0.15}
                  type="square"
                  mastIndex={mIdx * 2 + 1}
                />
              </group>
              <mesh position={[0, mastHeight * 0.65, 0]} castShadow={!isEnemy}>
                <cylinderGeometry args={[0.5, 0.4, 0.45, 8]} />
                <meshStandardMaterial color="#1a110a" />
              </mesh>
              {mIdx === 1 && <ShipFlag position={[0, mastHeight + 0.45, -0.6]} isEnemy={isEnemy} />}
            </group>
          </React.Fragment>
        );
      })}

      <RudderBlade length={length} rudderAngle={rudderAngle} isEnemy={isEnemy} />
    </group>
  );
});
