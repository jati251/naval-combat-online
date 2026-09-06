import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { SubModelProps } from '../types';
import { ShipWoodMaterial } from '../common/ShipWoodMaterial';
import { useGameStore } from '@/stores/useGameStore';
import { findShip } from '@/stores/selectors/shipLookup';
import {
  createCurvedHullGeometry,
  createCurvedDeckGeometry,
  createSheerRailGeometry,
  createLateenSailGeometry,
} from '../common/shipGeometries';
import { RudderBlade } from '../common/RudderBlade';
import { BroadsideCannons } from '../common/BroadsideCannons';
import { ShipFlag } from '../common/ShipFlag';
import { ShipSail } from '../common/ShipSail';
import { StandingRigging } from '../common/StandingRigging';
import { MooringBitts } from '../common/DeckDetails';

export const GunboatModel: React.FC<SubModelProps> = React.memo(({
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
  const tillerRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (tillerRef.current) {
      let targetAngle = rudderAngle;
      const store = useGameStore.getState();
      if (isSelf) {
        targetAngle = store.localRudder;
      } else if (shipId) {
        const ship = findShip(store.ships, shipId);
        if (ship) targetAngle = ship.rudder;
      }
      tillerRef.current.rotation.y = THREE.MathUtils.damp(
        tillerRef.current.rotation.y,
        targetAngle * 0.75,
        14,
        delta
      );
    }
  });

  const hullDepth = 2.1;
  const sheerBow = 0.65;
  const sheerStern = 0.45;

  const hullGeo = useMemo(() => createCurvedHullGeometry({
    length,
    width,
    depth: hullDepth,
    sheerBow,
    sheerStern,
    tumblehome: 0.04,
    transomWidthRatio: 0.52,
    segmentsZ: 28,
    segmentsGirth: 20,
  }), [length, width]);

  const deckGeo = useMemo(() => createCurvedDeckGeometry({
    length,
    width,
    depth: hullDepth,
    sheerBow,
    sheerStern,
    transomWidthRatio: 0.52,
    segmentsZ: 26,
  }, 0.1), [length, width]);

  const railGeo = useMemo(() => createSheerRailGeometry({
    length,
    width,
    depth: hullDepth,
    sheerBow,
    sheerStern,
    transomWidthRatio: 0.52,
    segmentsZ: 26,
  }, 0.16, 0.2), [length, width]);

  const lateenGeo = useMemo(() => createLateenSailGeometry(length * 0.85, length * 0.65, 0.4), [length]);
  const mastZ = length * 0.08;
  const mastH = length * 0.85;

  return (
    <group>
      {/* Hydrodynamic Curved Skiff Hull */}
      <mesh geometry={hullGeo} castShadow receiveShadow>
        <ShipWoodMaterial map={hullTexture} />
      </mesh>

      {/* Vibrant Cyan Gunwale Sheer Trim Rail */}
      <mesh geometry={railGeo} castShadow>
        <meshStandardMaterial color={trimColor || '#0ea5e9'} metalness={0.45} roughness={0.35} side={THREE.DoubleSide} />
      </mesh>

      {/* Curved Open Weatherdeck */}
      <mesh geometry={deckGeo} receiveShadow>
        <ShipWoodMaterial map={deckTexture} deck />
      </mesh>

      {/* Lashed Naval Sweeps / Oars along Gunwales (Classic Armed Skiff/Gunboat) */}
      {[-1, 1].map((side) => (
        <group key={`oar-rack-${side}`} position={[side * (width * 0.46), hullDepth + 0.18, 0]}>
          <mesh rotation={[0, 0, side * 0.1]} castShadow={!isEnemy}>
            <cylinderGeometry args={[0.03, 0.04, length * 0.55, 6]} />
            <meshStandardMaterial color="#854d0e" roughness={0.8} />
          </mesh>
          <mesh position={[0, -0.04, -length * 0.25]} rotation={[Math.PI / 2, 0, 0]}>
            <boxGeometry args={[0.12, 0.02, 0.45]} />
            <meshStandardMaterial color="#713f12" roughness={0.85} />
          </mesh>
        </group>
      ))}

      {/* Coiled Hawser Rope at Bow */}
      <mesh position={[0, hullDepth + 0.1, length * 0.42]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.22, 0.05, 5, 16]} />
        <meshStandardMaterial color="#aa9270" roughness={0.95} />
      </mesh>

      {/* Raised Centerline Bow Swivel Cannon on Bronze Turntable with Aiming Tiller */}
      <group position={[0, hullDepth + 0.55, length * 0.38]}>
        {/* Swivel Gun Barrel */}
        <mesh rotation={[0, 0, 0]} castShadow>
          <cylinderGeometry args={[0.12, 0.18, 1.6, 8]} />
          <meshStandardMaterial color="#18181b" metalness={0.92} roughness={0.2} />
        </mesh>
        {/* Bronze swivel mount and pintle */}
        <mesh position={[0, -0.22, 0]}>
          <cylinderGeometry args={[0.32, 0.36, 0.35, 8]} />
          <meshStandardMaterial color="#d97706" metalness={0.85} roughness={0.25} />
        </mesh>
        {/* Aiming cascabel / tiller handle extending aft */}
        <mesh position={[0, -0.06, -0.75]} rotation={[-0.3, 0, 0]}>
          <cylinderGeometry args={[0.025, 0.03, 0.65, 6]} />
          <meshStandardMaterial color="#78350f" roughness={0.7} />
        </mesh>
      </group>

      {/* Mooring Bitts at Fore and Aft (Player only) */}
      {!isEnemy && <MooringBitts position={[0, hullDepth + 0.15, length * 0.28]} width={0.4} />}

      {/* 1 Broadside Swivel per Side */}
      <BroadsideCannons positions={[0]} width={width * 0.95} y={hullDepth + 0.05} scale={0.85} isEnemy={isEnemy} />

      {/* Standing Rigging & Shrouds for Raked Mast */}
      <StandingRigging
        mastPosition={[0, hullDepth, mastZ]}
        mastHeight={mastH}
        hullWidth={width * 0.96}
        shroudSpread={1.2}
        includeRatlines={false}
        isEnemy={isEnemy}
      />

      {/* Mediterranean Raked Mast & Lateen Yardarm */}
      <group position={[0, hullDepth, mastZ]} rotation={[0.12, 0, 0]}>
        <mesh position={[0, mastH * 0.42, 0]} castShadow={!isEnemy}>
          <cylinderGeometry args={[0.11, 0.2, mastH * 0.88, 8]} />
          <meshStandardMaterial color="#382013" roughness={0.8} />
        </mesh>
        <group position={[0, mastH * 0.48, 0.1]} rotation={[-0.48, 0, 0]}>
          <mesh castShadow={!isEnemy}>
            <cylinderGeometry args={[0.07, 0.07, length * 1.1, 8]} />
            <meshStandardMaterial color="#2d1c12" roughness={0.8} />
          </mesh>
          <ShipSail
            geometry={lateenGeo}
            texture={sailTexture}
            sailState={sailState}
            height={length * 0.65}
            depthOffset={0.15}
            type="lateen"
            rotation={[0, Math.PI / 2, 0]}
          />
        </group>
        <ShipFlag
          position={[0, mastH * 0.88, -0.4]}
          isEnemy={isEnemy}
          team={team}
          isFriendly={isFriendly}
          shipId={shipId}
        />
      </group>

      {/* Wooden Tiller Bar on Open Aft Cockpit */}
      <group position={[0, hullDepth + 0.35, -length * 0.42]}>
        <mesh ref={tillerRef} position={[0, 0, 0.35]} rotation={[0.18, 0, 0]}>
          <cylinderGeometry args={[0.04, 0.06, 1.1, 6]} />
          <meshStandardMaterial color="#d97706" />
        </mesh>
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
