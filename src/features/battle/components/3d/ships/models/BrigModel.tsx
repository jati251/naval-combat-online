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
import { CargoHatch, NavalCapstan, MooringBitts } from '../common/DeckDetails';

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
        <meshStandardMaterial map={hullTexture} roughness={0.65} side={THREE.DoubleSide} />
      </mesh>

      {/* Gold Gunwale Sheer Molding */}
      <mesh geometry={railGeo} castShadow>
        <meshStandardMaterial color={trimColor} roughness={0.35} metalness={0.45} side={THREE.DoubleSide} />
      </mesh>

      {/* Cambered Main Deck */}
      <mesh geometry={deckGeo} receiveShadow>
        <meshStandardMaterial map={deckTexture} roughness={0.75} side={THREE.DoubleSide} />
      </mesh>

      {/* Bow Cutwater Stem & Golden Lion Figurehead */}
      <group position={[0, hullDepth + sheerBow * 0.55, length * 0.5 + 0.6]}>
        <mesh position={[0, -0.28, 0.48]} rotation={[0.42, 0, 0]} castShadow>
          <boxGeometry args={[0.24, 1.15, 1.4]} />
          <meshStandardMaterial color="#4a2511" roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.45, 1.25]} rotation={[-0.38, 0, 0]} castShadow>
          <coneGeometry args={[0.38, 1.25, 6]} />
          <meshStandardMaterial color="#f59e0b" roughness={0.25} metalness={0.85} />
        </mesh>
      </group>

      {/* Micro Deck Hardware: Cargo Hatches, Capstan, Bitts, Anchors, Helm (Player only) */}
      {!isEnemy && (
        <>
          <CargoHatch position={[0, hullDepth + 0.05, -length * 0.04]} width={width * 0.38} length={length * 0.16} />
          <NavalCapstan position={[0, hullDepth + sheerBow * 0.4, length * 0.35]} scale={0.9} />
          <MooringBitts position={[0, hullDepth + sheerBow * 0.6, length * 0.44]} width={0.6} />
          <BowCatheadAnchors width={width} z={length * 0.42} />
        </>
      )}

      {/* Raised Quarterdeck Captain's Cabin */}
      <group position={[0, hullDepth + sheerStern * 0.7, -length * 0.36]}>
        {/* Main Cabin Bulkhead */}
        <mesh castShadow={!isEnemy} receiveShadow>
          <boxGeometry args={[width * 0.82, 1.6, length * 0.26]} />
          <meshStandardMaterial map={hullTexture} roughness={0.65} />
        </mesh>
        {/* Gilded Transom Arch Molding along Top */}
        <mesh position={[0, 0.82, -length * 0.131]} castShadow={!isEnemy}>
          <boxGeometry args={[width * 0.84, 0.12, 0.08]} />
          <meshStandardMaterial color={trimColor || '#f59e0b'} metalness={0.8} roughness={0.25} />
        </mesh>
        {/* Lower Transom Counter Strake */}
        <mesh position={[0, -0.75, -length * 0.131]} castShadow={!isEnemy}>
          <boxGeometry args={[width * 0.82, 0.14, 0.08]} />
          <meshStandardMaterial color="#2d170b" roughness={0.7} />
        </mesh>
        {/* Leaded Stern Gallery Windows */}
        {[-width * 0.24, 0, width * 0.24].map((wx, wIdx) => (
          <group key={`win-${wIdx}`} position={[wx, 0.1, -length * 0.132]}>
            {/* Window Glass Pane facing Aft (-Z) */}
            <mesh rotation={[0, Math.PI, 0]}>
              <planeGeometry args={[width * 0.16, 0.75]} />
              <meshStandardMaterial
                color="#fef08a"
                emissive="#f59e0b"
                emissiveIntensity={1.1}
                roughness={0.15}
                side={THREE.DoubleSide}
              />
            </mesh>
            {/* Window Frame Mullion (Player only) */}
            {!isEnemy && (
              <mesh position={[0, 0, -0.01]}>
                <boxGeometry args={[width * 0.18, 0.79, 0.03]} />
                <meshStandardMaterial color="#1a0e06" roughness={0.9} />
              </mesh>
            )}
          </group>
        ))}
        {/* Dual Heavy Stern Lanterns */}
        {[-width * 0.28, width * 0.28].map((lx, lIdx) => (
          <group key={`lan-${lIdx}`} position={[lx, 0.8, -length * 0.14]}>
            <mesh castShadow={!isEnemy}>
              <cylinderGeometry args={[0.12, 0.18, 0.45, 6]} />
              <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={1.3} metalness={0.8} />
            </mesh>
            {!isEnemy && <pointLight color="#f59e0b" intensity={0.6} distance={6} decay={2} />}
          </group>
        ))}
        {!isEnemy && (
          <ShipHelm
            position={[0, 1.05, length * 0.08]}
            rudderAngle={rudderAngle}
            shipId={shipId}
            isSelf={isSelf}
          />
        )}
      </group>

      <BroadsideCannons positions={cannonPositions} width={width * 0.95} y={hullDepth + 0.12} isEnemy={isEnemy} />

      {/* Bowsprit & Jib */}
      <mesh position={[0, hullDepth + sheerBow + 0.25, length * 0.5 + 2.6]} rotation={[0.34, 0, 0]} castShadow={!isEnemy}>
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
            <group position={[0, hullDepth, mastZ]}>
              <mesh position={[0, mastHeight * 0.5, 0]} castShadow={!isEnemy}>
                <cylinderGeometry args={[0.18, 0.3, mastHeight, 8]} />
                <meshStandardMaterial color="#382013" roughness={0.8} />
              </mesh>
              <group position={[0, mastHeight * 0.46, 0]}>
                <mesh rotation={[0, 0, Math.PI / 2]} castShadow={!isEnemy}>
                  <cylinderGeometry args={[0.08, 0.08, width * 1.5, 8]} />
                  <meshStandardMaterial color="#2d1c12" />
                </mesh>
                <ShipSail
                  geometry={lowerGeo}
                  texture={sailTexture}
                  sailState={sailState}
                  height={length * 0.26}
                  depthOffset={0.22}
                  type="square"
                  mastIndex={mIdx * 2}
                />
              </group>
              <group position={[0, mastHeight * 0.83, 0]}>
                <mesh rotation={[0, 0, Math.PI / 2]} castShadow={!isEnemy}>
                  <cylinderGeometry args={[0.06, 0.06, width * 1.18, 8]} />
                  <meshStandardMaterial color="#2d1c12" />
                </mesh>
                <ShipSail
                  geometry={upperGeo}
                  texture={sailTexture}
                  sailState={sailState}
                  height={length * 0.20}
                  depthOffset={0.16}
                  type="square"
                  mastIndex={mIdx * 2 + 1}
                />
              </group>
              <mesh position={[0, mastHeight * 0.66, 0]} castShadow={!isEnemy}>
                <cylinderGeometry args={[0.55, 0.42, 0.48, 8]} />
                <meshStandardMaterial color="#1a110a" />
              </mesh>
              {mIdx === 1 && <ShipFlag position={[0, mastHeight + 0.48, -0.65]} isEnemy={isEnemy} />}
            </group>
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
