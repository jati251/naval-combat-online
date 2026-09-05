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

export const FrigateModel: React.FC<SubModelProps> = React.memo(({
  config,
  sailState,
  rudderAngle,
  isEnemy,
  hullTexture,
  deckTexture,
  sailTexture,
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
        <meshStandardMaterial map={hullTexture} roughness={0.65} side={THREE.DoubleSide} />
      </mesh>

      {/* Gold Naval Gunport Sheer Strake Rails */}
      <mesh geometry={railGeo} castShadow>
        <meshStandardMaterial color={trimColor} roughness={0.35} metalness={0.45} side={THREE.DoubleSide} />
      </mesh>

      {/* Cambered Continuous Battery Deck */}
      <mesh geometry={deckGeo} receiveShadow>
        <meshStandardMaterial map={deckTexture} roughness={0.75} side={THREE.DoubleSide} />
      </mesh>

      {/* Massive Battering Cutwater Stem & Neptune Figurehead */}
      <group position={[0, hullDepth + sheerBow * 0.55, length * 0.5 + 0.6]}>
        <mesh position={[0, -0.3, 0.5]} rotation={[0.42, 0, 0]} castShadow>
          <boxGeometry args={[0.28, 1.25, 1.5]} />
          <meshStandardMaterial color="#382013" roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.5, 1.3]} rotation={[-0.4, 0, 0]} castShadow>
          <coneGeometry args={[0.42, 1.3, 6]} />
          <meshStandardMaterial color="#f59e0b" roughness={0.25} metalness={0.85} />
        </mesh>
      </group>

      {/* Stately Captain's Great Cabin at Stern */}
      <group position={[0, hullDepth + sheerStern * 0.72, -length * 0.38]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[width * 0.88, 1.9, length * 0.26]} />
          <meshStandardMaterial map={hullTexture} roughness={0.65} />
        </mesh>
        {/* Gilded Transom Arch Molding along Top */}
        <mesh position={[0, 0.98, -length * 0.131]} castShadow>
          <boxGeometry args={[width * 0.9, 0.14, 0.08]} />
          <meshStandardMaterial color={trimColor || '#f59e0b'} metalness={0.8} roughness={0.25} />
        </mesh>
        {/* Lower Transom Counter Strake */}
        <mesh position={[0, -0.9, -length * 0.131]} castShadow>
          <boxGeometry args={[width * 0.88, 0.14, 0.08]} />
          <meshStandardMaterial color="#2d170b" roughness={0.7} />
        </mesh>
        {/* Row of 6 Leaded Windows */}
        {[-width * 0.32, -width * 0.19, -width * 0.06, width * 0.06, width * 0.19, width * 0.32].map((wx, wIdx) => (
          <group key={`win-${wIdx}`} position={[wx, 0.1, -length * 0.132]}>
            <mesh rotation={[0, Math.PI, 0]}>
              <planeGeometry args={[width * 0.09, 0.75]} />
              <meshStandardMaterial
                color="#fef08a"
                emissive="#f59e0b"
                emissiveIntensity={1.1}
                roughness={0.15}
                side={THREE.DoubleSide}
              />
            </mesh>
            <mesh position={[0, 0, -0.01]}>
              <boxGeometry args={[width * 0.105, 0.8, 0.02]} />
              <meshStandardMaterial color="#1a0e06" roughness={0.9} />
            </mesh>
          </group>
        ))}
        {/* Dual Heavy Admiral Lanterns */}
        {[-width * 0.3, width * 0.3].map((lx, lIdx) => (
          <group key={`lan-${lIdx}`} position={[lx, 1.0, -length * 0.14]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.13, 0.19, 0.48, 6]} />
              <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={1.3} metalness={0.85} />
            </mesh>
            <pointLight color="#f59e0b" intensity={0.7} distance={7} decay={2} />
          </group>
        ))}
        <ShipHelm position={[0, 1.3, length * 0.08]} rudderAngle={rudderAngle} isDouble />
      </group>

      {/* Cargo Hatches & Deck Hardware */}
      <CargoHatch position={[0, hullDepth + 0.05, -length * 0.16]} width={width * 0.36} length={length * 0.14} />
      <CargoHatch position={[0, hullDepth + 0.05, length * 0.14]} width={width * 0.36} length={length * 0.14} />
      <NavalCapstan position={[0, hullDepth + sheerBow * 0.35, length * 0.38]} scale={1.05} />
      <MooringBitts position={[0, hullDepth + sheerBow * 0.55, length * 0.45]} width={0.7} />

      <BowCatheadAnchors width={width} z={length * 0.44} />
      <BroadsideCannons positions={cannonPositions} width={width * 0.95} y={hullDepth + 0.12} scale={1.05} />

      {/* Bowsprit with Flying Jib */}
      <mesh position={[0, hullDepth + sheerBow + 0.3, length * 0.5 + 2.8]} rotation={[0.34, 0, 0]} castShadow>
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
            />
            <group position={[0, hullDepth, mastZ]}>
              <mesh position={[0, mastHeight * 0.5, 0]} castShadow>
                <cylinderGeometry args={[0.2, 0.32, mastHeight, 8]} />
                <meshStandardMaterial color="#382013" />
              </mesh>
              <group position={[0, mastHeight * 0.46, 0]}>
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
                  mastIndex={mIdx * 2}
                />
              </group>
              <group position={[0, mastHeight * 0.83, 0]}>
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
                  mastIndex={mIdx * 2 + 1}
                />
              </group>
              <mesh position={[0, mastHeight * 0.66, 0]} castShadow>
                <cylinderGeometry args={[0.55, 0.42, 0.48, 8]} />
                <meshStandardMaterial color="#1a110a" />
              </mesh>
              {mIdx === 2 && <ShipFlag position={[0, mastHeight + 0.48, -0.65]} isEnemy={isEnemy} />}
            </group>
          </React.Fragment>
        );
      })}

      <RudderBlade length={length} rudderAngle={rudderAngle} />
    </group>
  );
});
