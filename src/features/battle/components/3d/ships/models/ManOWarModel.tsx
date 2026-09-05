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

export const ManOWarModel: React.FC<SubModelProps> = React.memo(({
  config,
  sailState,
  rudderAngle,
  isEnemy,
  hullTexture,
  deckTexture,
  sailTexture,
}) => {
  const { length, width, cannonsPerSide, trimColor } = config;
  const mastPositions = useMemo(() => [-length * 0.35, -length * 0.12, length * 0.12, length * 0.32], [length]);

  const cannonPositions = useMemo(() => {
    const arr = [];
    const span = length * 0.74;
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
    tumblehome: 0.12,
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
  }, 0.26, 0.35), [length, width]);

  const lowerGeo = useMemo(() => createBillowedSailGeometry(width * 1.48, length * 0.24, 0.45), [width, length]);
  const upperGeo = useMemo(() => createBillowedSailGeometry(width * 1.18, length * 0.18, 0.35), [width, length]);
  const jibGeo = useMemo(() => createJibSailGeometry(length * 0.36, length * 0.28, 0.35), [length]);

  return (
    <group>
      {/* Colossal 28-Meter Naval Oak Curved Hull */}
      <mesh geometry={hullGeo} castShadow receiveShadow>
        <meshStandardMaterial map={hullTexture} roughness={0.65} side={THREE.DoubleSide} />
      </mesh>

      {/* Iconic Nelson Chequer Golden Sheer Rail */}
      <mesh geometry={railGeo} castShadow>
        <meshStandardMaterial color={trimColor || '#eab308'} roughness={0.35} metalness={0.5} side={THREE.DoubleSide} />
      </mesh>

      {/* Cambered Main Gun Deck */}
      <mesh geometry={deckGeo} receiveShadow>
        <meshStandardMaterial map={deckTexture} roughness={0.75} side={THREE.DoubleSide} />
      </mesh>

      {/* Colossal Cutwater Stem & Gilded Royal Lion Figurehead */}
      <group position={[0, hullDepth + sheerBow * 0.55, length * 0.5 + 0.7]}>
        <mesh position={[0, -0.32, 0.55]} rotation={[0.44, 0, 0]} castShadow>
          <boxGeometry args={[0.3, 1.4, 1.7]} />
          <meshStandardMaterial color="#18181b" roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.55, 1.4]} rotation={[-0.4, 0, 0]} castShadow>
          <coneGeometry args={[0.48, 1.5, 6]} />
          <meshStandardMaterial color="#f59e0b" roughness={0.25} metalness={0.88} />
        </mesh>
      </group>

      {/* Dual Cargo Gratings Amidships */}
      <CargoHatch position={[0, hullDepth + 0.05, -length * 0.02]} width={width * 0.38} length={length * 0.13} />
      <CargoHatch position={[0, hullDepth + 0.05, length * 0.22]} width={width * 0.38} length={length * 0.13} />

      {/* Heavy Naval Capstan & Mooring Bitts */}
      <NavalCapstan position={[0, hullDepth + sheerBow * 0.35, length * 0.38]} scale={1.15} />
      <MooringBitts position={[0, hullDepth + sheerBow * 0.6, length * 0.46]} width={0.8} />

      {/* 3-Tier Sovereign Admiral's Stern Gallery */}
      <group position={[0, hullDepth + sheerStern * 0.75, -length * 0.38]}>
        {/* Main Admiral's Great Cabin */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[width * 0.92, 2.3, length * 0.25]} />
          <meshStandardMaterial map={hullTexture} roughness={0.65} />
        </mesh>
        {/* Heavy Gold Transom Molding */}
        <mesh position={[0, 1.18, -length * 0.126]} castShadow>
          <boxGeometry args={[width * 0.94, 0.14, 0.08]} />
          <meshStandardMaterial color={trimColor || '#f59e0b'} metalness={0.88} roughness={0.2} />
        </mesh>
        {/* Lower Gallery: 7 Leaded Admiral Windows */}
        {[-width * 0.36, -width * 0.24, -width * 0.12, 0, width * 0.12, width * 0.24, width * 0.36].map((wx, wIdx) => (
          <group key={`m-win-${wIdx}`} position={[wx, 0.15, -length * 0.128]}>
            <mesh rotation={[0, Math.PI, 0]}>
              <planeGeometry args={[width * 0.085, 0.9]} />
              <meshStandardMaterial
                color="#fef08a"
                emissive="#f59e0b"
                emissiveIntensity={1.1}
                roughness={0.15}
                side={THREE.DoubleSide}
              />
            </mesh>
            <mesh position={[0, 0, -0.01]}>
              <boxGeometry args={[width * 0.098, 0.95, 0.02]} />
              <meshStandardMaterial color="#1a0e06" roughness={0.9} />
            </mesh>
          </group>
        ))}

        {/* Upper Grand Poop Deck */}
        <group position={[0, 1.8, -length * 0.02]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[width * 0.82, 1.5, length * 0.18]} />
            <meshStandardMaterial map={hullTexture} roughness={0.65} />
          </mesh>
          {/* Upper Gallery: 5 Leaded Windows */}
          {[-width * 0.28, -width * 0.14, 0, width * 0.14, width * 0.28].map((ux, uIdx) => (
            <group key={`mu-win-${uIdx}`} position={[ux, 0.1, -length * 0.092]}>
              <mesh rotation={[0, Math.PI, 0]}>
                <planeGeometry args={[width * 0.085, 0.65]} />
                <meshStandardMaterial
                  color="#fef08a"
                  emissive="#f59e0b"
                  emissiveIntensity={1.2}
                  roughness={0.15}
                  side={THREE.DoubleSide}
                />
              </mesh>
              <mesh position={[0, 0, -0.01]}>
                <boxGeometry args={[width * 0.098, 0.7, 0.02]} />
                <meshStandardMaterial color="#1a0e06" roughness={0.9} />
              </mesh>
            </group>
          ))}
          <mesh position={[0, 0.78, -length * 0.091]} castShadow>
            <boxGeometry args={[width * 0.84, 0.12, 0.06]} />
            <meshStandardMaterial color={trimColor || '#f59e0b'} metalness={0.88} roughness={0.2} />
          </mesh>
        </group>

        {/* 3 Giant Admiral Lanterns on High Stern */}
        {[-width * 0.35, 0, width * 0.35].map((lx, lIdx) => (
          <group key={`lan-${lIdx}`} position={[lx, 2.9, -length * 0.14]}>
            <mesh castShadow={!isEnemy}>
              <cylinderGeometry args={[0.16, 0.24, 0.6, 6]} />
              <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={1.5} metalness={0.9} />
            </mesh>
            {!isEnemy && <pointLight color="#fbbf24" intensity={1.1} distance={9} decay={2} />}
          </group>
        ))}

        {!isEnemy && <ShipHelm position={[0, 1.45, length * 0.06]} rudderAngle={rudderAngle} isDouble />}
      </group>

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
      <mesh position={[0, hullDepth + sheerBow + 0.35, length * 0.5 + 3.0]} rotation={[0.34, 0, 0]} castShadow={!isEnemy}>
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

      {/* 4 Towering Masts: Fore, Main, Mizzen, Bonaventure with Standing Rigging & Ratlines */}
      {mastPositions.map((mastZ, mIdx) => {
        const mastHeight = length * 0.74 + (mIdx === 1 ? 2.8 : mIdx === 2 ? 1.8 : 0);
        return (
          <React.Fragment key={`manowar-mast-${mIdx}`}>
            <StandingRigging
              mastPosition={[0, hullDepth, mastZ]}
              mastHeight={mastHeight}
              hullWidth={width * 0.96}
              shroudSpread={2.4}
              includeRatlines={!isEnemy}
              isEnemy={isEnemy}
            />
            <group position={[0, hullDepth, mastZ]}>
              <mesh position={[0, mastHeight * 0.5, 0]} castShadow={!isEnemy}>
                <cylinderGeometry args={[0.22, 0.35, mastHeight, 8]} />
                <meshStandardMaterial color="#382013" />
              </mesh>
              <group position={[0, mastHeight * 0.46, 0]}>
                <mesh rotation={[0, 0, Math.PI / 2]} castShadow={!isEnemy}>
                  <cylinderGeometry args={[0.09, 0.09, width * 1.5, 8]} />
                  <meshStandardMaterial color="#2d1c12" />
                </mesh>
                <ShipSail
                  geometry={lowerGeo}
                  texture={sailTexture}
                  sailState={sailState}
                  height={length * 0.24}
                  depthOffset={0.22}
                  type="square"
                  mastIndex={mIdx * 2}
                />
              </group>
              <group position={[0, mastHeight * 0.83, 0]}>
                <mesh rotation={[0, 0, Math.PI / 2]} castShadow={!isEnemy}>
                  <cylinderGeometry args={[0.07, 0.07, width * 1.2, 8]} />
                  <meshStandardMaterial color="#2d1c12" />
                </mesh>
                <ShipSail
                  geometry={upperGeo}
                  texture={sailTexture}
                  sailState={sailState}
                  height={length * 0.18}
                  depthOffset={0.16}
                  type="square"
                  mastIndex={mIdx * 2 + 1}
                />
              </group>
              <mesh position={[0, mastHeight * 0.66, 0]} castShadow={!isEnemy}>
                <cylinderGeometry args={[0.6, 0.45, 0.5, 8]} />
                <meshStandardMaterial color="#1a110a" />
              </mesh>
              {mIdx === 3 && <ShipFlag position={[0, mastHeight + 0.48, -0.65]} isEnemy={isEnemy} />}
            </group>
          </React.Fragment>
        );
      })}

      <RudderBlade length={length} rudderAngle={rudderAngle} isEnemy={isEnemy} />
    </group>
  );
});
