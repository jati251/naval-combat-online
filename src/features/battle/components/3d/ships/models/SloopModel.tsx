import React, { useMemo } from 'react';
import * as THREE from 'three';
import type { SubModelProps } from '../types';
import { createBillowedSailGeometry, createJibSailGeometry } from '../common/shipGeometries';
import { RudderBlade } from '../common/RudderBlade';
import { BroadsideCannons } from '../common/BroadsideCannons';
import { BowCatheadAnchors } from '../common/BowCatheadAnchors';
import { ShipHelm } from '../common/ShipHelm';
import { ShipFlag } from '../common/ShipFlag';

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
  const sailScale = sailState === 'ANCHOR' ? 0.18 : sailState === 'HALF_SAIL' ? 0.65 : 1.0;
  const mastHeight = length * 0.88;

  const gaffSailGeo = useMemo(() => createBillowedSailGeometry(width * 1.35, mastHeight * 0.38, 0.4), [width, mastHeight]);
  const topsailGeo = useMemo(() => createBillowedSailGeometry(width * 1.05, mastHeight * 0.24, 0.3), [width, mastHeight]);
  const jibGeo = useMemo(() => createJibSailGeometry(length * 0.38, mastHeight * 0.34, 0.35), [length, mastHeight]);

  const cannonZ = useMemo(() => [-length * 0.12, length * 0.12], [length]);

  return (
    <group>
      {/* Sleek Golden Teak Hull */}
      <mesh position={[0, 1.15, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, 3.2, length]} />
        <meshStandardMaterial map={hullTexture} roughness={0.65} />
      </mesh>
      <mesh position={[0, 2.8, 0]}>
        <boxGeometry args={[width + 0.32, 0.32, length + 0.36]} />
        <meshStandardMaterial color={trimColor} roughness={0.35} metalness={0.4} />
      </mesh>

      {/* Sculpted Clipper Stem & Golden Dolphin Figurehead */}
      <mesh position={[0, 1.25, length * 0.5 + 1.2]} rotation={[Math.PI / 4, 0, 0]} castShadow>
        <coneGeometry args={[width * 0.48, 3.4, 4]} />
        <meshStandardMaterial map={hullTexture} roughness={0.65} />
      </mesh>
      <mesh position={[0, 2.5, length * 0.5 + 2.0]} rotation={[-0.35, 0, 0]} castShadow>
        <coneGeometry args={[0.32, 1.1, 5]} />
        <meshStandardMaterial color="#eab308" metalness={0.8} roughness={0.25} />
      </mesh>

      {/* Main Deck */}
      <mesh position={[0, 2.65, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[width * 0.88, length * 0.92]} />
        <meshStandardMaterial map={deckTexture} roughness={0.75} />
      </mesh>

      {/* Bowsprit & Jib */}
      <mesh position={[0, 2.9, length * 0.5 + 2.4]} rotation={[0.32, 0, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.16, 5.0, 8]} />
        <meshStandardMaterial color="#382013" roughness={0.8} />
      </mesh>
      <group position={[0, 3.0, length * 0.35]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh geometry={jibGeo} scale={[1, sailScale, 1]} castShadow receiveShadow>
          <meshStandardMaterial map={sailTexture} side={THREE.DoubleSide} roughness={0.85} />
        </mesh>
      </group>

      {/* Compact Companionway Cabin at Stern */}
      <group position={[0, 3.2, -length * 0.38]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[width * 0.85, 1.3, length * 0.22]} />
          <meshStandardMaterial color={isEnemy ? '#881337' : '#1e3a5f'} map={hullTexture} />
        </mesh>
        <mesh position={[0, 0.1, -length * 0.115]}>
          <planeGeometry args={[width * 0.4, 0.6]} />
          <meshStandardMaterial color="#fef08a" emissive="#f59e0b" emissiveIntensity={0.8} />
        </mesh>
        <mesh position={[0, 0.7, -length * 0.12]} castShadow>
          <cylinderGeometry args={[0.1, 0.15, 0.38, 6]} />
          <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={1.2} />
        </mesh>
        <ShipHelm position={[0, 0.85, length * 0.06]} rudderAngle={rudderAngle} />
      </group>

      <BowCatheadAnchors width={width} z={length * 0.38} />
      <BroadsideCannons positions={cannonZ} width={width} y={2.45} />

      {/* Tall Single Mast with Gaff Rig & Square Topsail */}
      <group position={[0, 2.65, length * 0.04]}>
        <mesh position={[0, mastHeight * 0.5, 0]} castShadow>
          <cylinderGeometry args={[0.16, 0.26, mastHeight, 8]} />
          <meshStandardMaterial color="#382013" roughness={0.8} />
        </mesh>
        {/* Gaff Boom */}
        <group position={[0, mastHeight * 0.44, 0]}>
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.07, 0.07, width * 1.35, 8]} />
            <meshStandardMaterial color="#2d1c12" />
          </mesh>
          <mesh
            geometry={gaffSailGeo}
            position={[0, -mastHeight * 0.18 * sailScale, 0.2]}
            scale={[1, sailScale, 1]}
            castShadow
            receiveShadow
          >
            <meshStandardMaterial map={sailTexture} side={THREE.DoubleSide} roughness={0.85} />
          </mesh>
        </group>
        {/* Square Topsail */}
        <group position={[0, mastHeight * 0.82, 0]}>
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.06, 0.06, width * 1.05, 8]} />
            <meshStandardMaterial color="#2d1c12" />
          </mesh>
          <mesh
            geometry={topsailGeo}
            position={[0, -mastHeight * 0.11 * sailScale, 0.15]}
            scale={[1, sailScale, 1]}
            castShadow
            receiveShadow
          >
            <meshStandardMaterial map={sailTexture} side={THREE.DoubleSide} roughness={0.85} />
          </mesh>
        </group>
        <mesh position={[0, mastHeight * 0.65, 0]} castShadow>
          <cylinderGeometry args={[0.48, 0.38, 0.42, 8]} />
          <meshStandardMaterial color="#1a110a" />
        </mesh>
        <ShipFlag position={[0, mastHeight + 0.45, -0.6]} isEnemy={isEnemy} />
      </group>

      <RudderBlade length={length} rudderAngle={rudderAngle} />
    </group>
  );
});
