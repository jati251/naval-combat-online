import React, { useMemo } from 'react';
import * as THREE from 'three';
import type { SubModelProps } from '../types';
import {
  createCurvedHullGeometry,
  createCurvedDeckGeometry,
  createSheerRailGeometry,
  createBillowedSailGeometry,
} from '../common/shipGeometries';
import { RudderBlade } from '../common/RudderBlade';
import { BroadsideCannons } from '../common/BroadsideCannons';
import { ShipHelm } from '../common/ShipHelm';
import { ShipFlag } from '../common/ShipFlag';
import { ShipSail } from '../common/ShipSail';
import { StandingRigging } from '../common/StandingRigging';
import { CargoHatch, NavalCapstan, MooringBitts } from '../common/DeckDetails';

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
  const mastPositions = useMemo(() => [-length * 0.32, 0, length * 0.26], [length]);
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

  const lowerGeo = useMemo(() => createBillowedSailGeometry(width * 1.4, length * 0.25, 0.45), [width, length]);
  const upperGeo = useMemo(() => createBillowedSailGeometry(width * 1.1, length * 0.18, 0.35), [width, length]);

  return (
    <group>
      {/* Charred Dark Timber Curved Hull */}
      <mesh geometry={hullGeo} castShadow receiveShadow>
        <meshStandardMaterial color="#090d16" map={hullTexture} roughness={0.88} side={THREE.DoubleSide} />
      </mesh>

      {/* Spectral Jade Sheer Molding */}
      <mesh geometry={railGeo} castShadow>
        <meshStandardMaterial color="#10b981" emissive="#059669" emissiveIntensity={0.6} roughness={0.4} side={THREE.DoubleSide} />
      </mesh>

      {/* Weathered Dark Deck Planks */}
      <mesh geometry={deckGeo} receiveShadow>
        <meshStandardMaterial color="#1c1917" map={deckTexture} roughness={0.9} side={THREE.DoubleSide} />
      </mesh>

      {/* Curved Gothic Beakhead & Skeletal Dragon Figurehead */}
      <group position={[0, hullDepth + sheerBow * 0.55, length * 0.5 + 0.6]}>
        <mesh position={[0, -0.28, 0.45]} rotation={[0.45, 0, 0]} castShadow>
          <boxGeometry args={[0.26, 1.2, 1.4]} />
          <meshStandardMaterial color="#090d16" roughness={0.85} />
        </mesh>
        <mesh position={[0, 0.48, 1.25]} rotation={[-0.45, 0, 0]} castShadow>
          <coneGeometry args={[0.42, 1.4, 6]} />
          <meshStandardMaterial color="#10b981" emissive="#047857" emissiveIntensity={0.8} roughness={0.3} metalness={0.7} />
        </mesh>
      </group>

      {/* Gothic Arched Sterncastle with Cathedral Windows */}
      <group position={[0, hullDepth + sheerStern * 0.7, -length * 0.35]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[width * 0.86, 2.2, length * 0.28]} />
          <meshStandardMaterial color="#1e293b" roughness={0.7} />
        </mesh>
        {/* Iron Transom Molding */}
        <mesh position={[0, 1.12, -length * 0.141]} castShadow>
          <boxGeometry args={[width * 0.88, 0.12, 0.08]} />
          <meshStandardMaterial color="#047857" emissive="#065f46" emissiveIntensity={0.6} metalness={0.8} />
        </mesh>
        {/* Spectral Emerald Windows */}
        {[-width * 0.26, -width * 0.09, width * 0.09, width * 0.26].map((wx, wIdx) => (
          <group key={`win-${wIdx}`} position={[wx, 0.2, -length * 0.142]}>
            <mesh rotation={[0, Math.PI, 0]}>
              <planeGeometry args={[width * 0.13, 1.1]} />
              <meshStandardMaterial
                color="#6ee7b7"
                emissive="#10b981"
                emissiveIntensity={1.5}
                roughness={0.2}
                side={THREE.DoubleSide}
              />
            </mesh>
            <mesh position={[0, 0, -0.01]}>
              <boxGeometry args={[width * 0.145, 1.15, 0.02]} />
              <meshStandardMaterial color="#022c22" roughness={0.9} />
            </mesh>
          </group>
        ))}
        {/* Dual Gargoyle Emerald Lanterns */}
        {[-width * 0.32, width * 0.32].map((lx, lIdx) => (
          <group key={`lan-${lIdx}`} position={[lx, 1.3, -length * 0.15]}>
            <mesh castShadow={!isEnemy}>
              <cylinderGeometry args={[0.14, 0.2, 0.5, 6]} />
              <meshStandardMaterial color="#34d399" emissive="#10b981" emissiveIntensity={2.0} metalness={0.8} />
            </mesh>
          </group>
        ))}
        {!isEnemy && (
          <ShipHelm
            position={[0, 1.4, length * 0.08]}
            rudderAngle={rudderAngle}
            shipId={shipId}
            isSelf={isSelf}
          />
        )}
      </group>

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
      <mesh position={[0, hullDepth + sheerBow + 0.25, length * 0.5 + 2.7]} rotation={[0.36, 0, 0]} castShadow={!isEnemy}>
        <cylinderGeometry args={[0.1, 0.22, 5.6, 8]} />
        <meshStandardMaterial color="#1e1b18" roughness={0.9} />
      </mesh>

      {/* 3 Masts with Standing Rigging & Tattered Charcoal Sails */}
      {mastPositions.map((mastZ, mIdx) => {
        const mastHeight = length * 0.78 + (mIdx === 1 ? 2.5 : 0);
        return (
          <React.Fragment key={`carrack-mast-${mIdx}`}>
            <StandingRigging
              mastPosition={[0, hullDepth, mastZ]}
              mastHeight={mastHeight}
              hullWidth={width * 0.96}
              shroudSpread={2.1}
              includeRatlines={!isEnemy}
              isEnemy={isEnemy}
              color="#18181b"
            />
            <group position={[0, hullDepth, mastZ]}>
              <mesh position={[0, mastHeight * 0.5, 0]} castShadow={!isEnemy}>
                <cylinderGeometry args={[0.18, 0.3, mastHeight, 8]} />
                <meshStandardMaterial color="#1e1b18" roughness={0.9} />
              </mesh>
              <group position={[0, mastHeight * 0.46, 0]}>
                <mesh rotation={[0, 0, Math.PI / 2]} castShadow={!isEnemy}>
                  <cylinderGeometry args={[0.08, 0.08, width * 1.42, 8]} />
                  <meshStandardMaterial color="#18181b" />
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
                <mesh rotation={[0, 0, Math.PI / 2]} castShadow={!isEnemy}>
                  <cylinderGeometry args={[0.06, 0.06, width * 1.15, 8]} />
                  <meshStandardMaterial color="#18181b" />
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
                <cylinderGeometry args={[0.55, 0.42, 0.48, 8]} />
                <meshStandardMaterial color="#0c0a09" />
              </mesh>
              {mIdx === 2 && <ShipFlag position={[0, mastHeight + 0.45, -0.6]} isEnemy={isEnemy} />}
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
