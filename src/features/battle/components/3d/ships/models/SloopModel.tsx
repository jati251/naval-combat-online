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

export const SloopModel: React.FC<SubModelProps> = React.memo(({
  config,
  sailState,
  rudderAngle,
  isEnemy,
  hullTexture,
  deckTexture,
  sailTexture,
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
      {/* Sleek Curved Naval Hull */}
      <mesh geometry={hullGeo} castShadow receiveShadow>
        <meshStandardMaterial map={hullTexture} roughness={0.65} side={THREE.DoubleSide} />
      </mesh>

      {/* Gold Gunwale Sheer Molding */}
      <mesh geometry={railGeo} castShadow>
        <meshStandardMaterial color={trimColor} roughness={0.35} metalness={0.45} side={THREE.DoubleSide} />
      </mesh>

      {/* Cambered Weatherdeck */}
      <mesh geometry={deckGeo} receiveShadow>
        <meshStandardMaterial map={deckTexture} roughness={0.75} side={THREE.DoubleSide} />
      </mesh>

      {/* Clipper Cutwater Stem & Golden Dolphin Figurehead */}
      <group position={[0, hullDepth + sheerBow * 0.5, length * 0.5 + 0.5]}>
        <mesh position={[0, -0.2, 0.4]} rotation={[0.4, 0, 0]} castShadow>
          <boxGeometry args={[0.2, 0.9, 1.2]} />
          <meshStandardMaterial color="#451a03" roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.35, 1.1]} rotation={[-0.35, 0, 0]} castShadow>
          <coneGeometry args={[0.28, 1.1, 6]} />
          <meshStandardMaterial color="#eab308" metalness={0.85} roughness={0.2} />
        </mesh>
      </group>

      {/* Bowsprit with Martingale (Dolphin Striker) */}
      <mesh position={[0, hullDepth + sheerBow + 0.2, length * 0.5 + 2.2]} rotation={[0.28, 0, 0]} castShadow>
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

      {/* Cargo Grating Hatch Amidships */}
      <CargoHatch position={[0, hullDepth + 0.05, length * 0.22]} width={width * 0.35} length={length * 0.14} />

      {/* Mooring Bitts Fore and Aft */}
      <MooringBitts position={[0, hullDepth + sheerBow * 0.5, length * 0.4]} width={0.5} />

      {/* Compact Companionway Cabin at Stern */}
      <group position={[0, hullDepth + sheerStern * 0.6, -length * 0.36]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[width * 0.72, 1.25, length * 0.22]} />
          <meshStandardMaterial color={isEnemy ? '#881337' : '#1e3a5f'} map={hullTexture} />
        </mesh>
        {/* Cabin arched windows */}
        {[-width * 0.22, width * 0.22].map((wx, idx) => (
          <mesh key={`win-${idx}`} position={[wx, 0.12, -length * 0.112]}>
            <planeGeometry args={[width * 0.18, 0.55]} />
            <meshStandardMaterial color="#fef08a" emissive="#f59e0b" emissiveIntensity={0.85} />
          </mesh>
        ))}
        {/* Brass Stern Lantern */}
        <mesh position={[0, 0.8, -length * 0.12]} castShadow>
          <cylinderGeometry args={[0.1, 0.15, 0.4, 6]} />
          <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={1.3} metalness={0.85} />
        </mesh>
        <ShipHelm position={[0, 0.85, length * 0.06]} rudderAngle={rudderAngle} />
      </group>

      <BowCatheadAnchors width={width} z={length * 0.38} />
      <BroadsideCannons positions={cannonZ} width={width * 0.94} y={hullDepth + 0.1} />

      {/* Tall Mast Standing Rigging with Ratlines */}
      <StandingRigging
        mastPosition={[0, hullDepth, mastZ]}
        mastHeight={mastHeight}
        hullWidth={width * 0.96}
        shroudSpread={1.8}
        includeRatlines={true}
      />

      {/* Tall Single Mast with Gaff Rig & Square Topsail */}
      <group position={[0, hullDepth, mastZ]}>
        <mesh position={[0, mastHeight * 0.5, 0]} castShadow>
          <cylinderGeometry args={[0.15, 0.25, mastHeight, 8]} />
          <meshStandardMaterial color="#382013" roughness={0.8} />
        </mesh>
        {/* Gaff Boom */}
        <group position={[0, mastHeight * 0.44, 0]}>
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
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
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
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
        <mesh position={[0, mastHeight * 0.65, 0]} castShadow>
          <cylinderGeometry args={[0.45, 0.36, 0.38, 8]} />
          <meshStandardMaterial color="#1a110a" />
        </mesh>
        <ShipFlag position={[0, mastHeight + 0.45, -0.6]} isEnemy={isEnemy} />
      </group>

      <RudderBlade length={length} rudderAngle={rudderAngle} />
    </group>
  );
});
