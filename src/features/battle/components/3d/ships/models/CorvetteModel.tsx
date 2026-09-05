import React, { useMemo } from 'react';
import * as THREE from 'three';
import type { SubModelProps } from '../types';
import { createBillowedSailGeometry, createJibSailGeometry } from '../common/shipGeometries';
import { RudderBlade } from '../common/RudderBlade';
import { BroadsideCannons } from '../common/BroadsideCannons';
import { BowCatheadAnchors } from '../common/BowCatheadAnchors';
import { ShipHelm } from '../common/ShipHelm';
import { ShipFlag } from '../common/ShipFlag';

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
  const sailScale = sailState === 'ANCHOR' ? 0.18 : sailState === 'HALF_SAIL' ? 0.65 : 1.0;
  const mastPositions = useMemo(() => [-length * 0.22, length * 0.20], [length]);
  const cannonPositions = useMemo(() => [-length * 0.22, 0, length * 0.22], [length]);

  const lowerGeo = useMemo(() => createBillowedSailGeometry(width * 1.35, length * 0.26, 0.42), [width, length]);
  const upperGeo = useMemo(() => createBillowedSailGeometry(width * 1.08, length * 0.19, 0.32), [width, length]);
  const jibGeo = useMemo(() => createJibSailGeometry(length * 0.32, length * 0.26, 0.35), [length]);

  return (
    <group>
      {/* Rich Polished Mahogany Hull */}
      <mesh position={[0, 1.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, 3.4, length]} />
        <meshStandardMaterial map={hullTexture} roughness={0.58} />
      </mesh>
      {/* Royal Blue & Gold Sheer Strake */}
      <mesh position={[0, 2.95, 0]}>
        <boxGeometry args={[width + 0.34, 0.34, length + 0.38]} />
        <meshStandardMaterial color={trimColor} roughness={0.3} metalness={0.5} />
      </mesh>

      {/* Clipper Cutwater Bow */}
      <mesh position={[0, 1.3, length * 0.5 + 1.2]} rotation={[Math.PI * 0.28, 0, 0]} castShadow>
        <coneGeometry args={[width * 0.48, 3.6, 4]} />
        <meshStandardMaterial map={hullTexture} roughness={0.6} />
      </mesh>
      {/* Royal Crown / Eagle Figurehead */}
      <mesh position={[0, 2.65, length * 0.5 + 2.2]} rotation={[-0.35, 0, 0]} castShadow>
        <coneGeometry args={[0.35, 1.15, 6]} />
        <meshStandardMaterial color="#f59e0b" metalness={0.85} roughness={0.2} />
      </mesh>

      {/* Flush Weatherdeck (Zero obstructive cabins) */}
      <mesh position={[0, 2.8, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[width * 0.88, length * 0.94]} />
        <meshStandardMaterial map={deckTexture} roughness={0.75} />
      </mesh>

      {/* Polished Brass Stanchion Railings along perimeter */}
      {[-width * 0.45, width * 0.45].map((rx, rIdx) => (
        <mesh key={`rail-${rIdx}`} position={[rx, 3.25, 0]}>
          <cylinderGeometry args={[0.03, 0.03, length * 0.85, 6]} />
          <meshStandardMaterial color="#d97706" metalness={0.8} roughness={0.25} />
        </mesh>
      ))}

      {/* Dual Wooden Jolly Boats / Rowboats Lashed Amidships on Deck Chocks */}
      {[-width * 0.22, width * 0.22].map((bx, bIdx) => (
        <group key={`boat-${bIdx}`} position={[bx, 3.05, -length * 0.02]}>
          <mesh castShadow>
            <boxGeometry args={[0.65, 0.42, 2.6]} />
            <meshStandardMaterial color="#5c3317" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.15, 0]}>
            <boxGeometry args={[0.5, 0.18, 2.3]} />
            <meshStandardMaterial color="#2d170b" />
          </mesh>
        </group>
      ))}

      {/* Brass Binnacle & Helm */}
      <ShipHelm position={[0, 3.65, -length * 0.38]} rudderAngle={rudderAngle} />

      <BowCatheadAnchors width={width} z={length * 0.42} />
      <BroadsideCannons positions={cannonPositions} width={width} y={2.55} />

      {/* Bowsprit & Jib */}
      <mesh position={[0, 3.1, length * 0.5 + 2.6]} rotation={[0.34, 0, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.18, 5.2, 8]} />
        <meshStandardMaterial color="#382013" roughness={0.8} />
      </mesh>
      <group position={[0, 3.2, length * 0.32]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh geometry={jibGeo} scale={[1, sailScale, 1]} castShadow receiveShadow>
          <meshStandardMaterial map={sailTexture} side={THREE.DoubleSide} roughness={0.85} />
        </mesh>
      </group>

      {/* 2 Raked Masts with Square Sails & Spanker Sail */}
      {mastPositions.map((mastZ, mIdx) => {
        const mastHeight = length * 0.74 + (mIdx === 1 ? 2.0 : 0);
        return (
          <group key={`mast-${mIdx}`} position={[0, 2.8, mastZ]} rotation={[0.06, 0, 0]}>
            <mesh position={[0, mastHeight * 0.5, 0]} castShadow>
              <cylinderGeometry args={[0.16, 0.28, mastHeight, 8]} />
              <meshStandardMaterial color="#382013" roughness={0.8} />
            </mesh>
            <group position={[0, mastHeight * 0.46, 0]}>
              <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
                <cylinderGeometry args={[0.07, 0.07, width * 1.4, 8]} />
                <meshStandardMaterial color="#2d1c12" />
              </mesh>
              <mesh
                geometry={lowerGeo}
                position={[0, -length * 0.12 * sailScale, 0.2]}
                scale={[1, sailScale, 1]}
                castShadow
                receiveShadow
              >
                <meshStandardMaterial map={sailTexture} side={THREE.DoubleSide} roughness={0.85} />
              </mesh>
            </group>
            <group position={[0, mastHeight * 0.82, 0]}>
              <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
                <cylinderGeometry args={[0.05, 0.05, width * 1.1, 8]} />
                <meshStandardMaterial color="#2d1c12" />
              </mesh>
              <mesh
                geometry={upperGeo}
                position={[0, -length * 0.09 * sailScale, 0.15]}
                scale={[1, sailScale, 1]}
                castShadow
                receiveShadow
              >
                <meshStandardMaterial map={sailTexture} side={THREE.DoubleSide} roughness={0.85} />
              </mesh>
            </group>
            <mesh position={[0, mastHeight * 0.65, 0]} castShadow>
              <cylinderGeometry args={[0.5, 0.4, 0.45, 8]} />
              <meshStandardMaterial color="#1a110a" />
            </mesh>
            {mIdx === 1 && <ShipFlag position={[0, mastHeight + 0.45, -0.6]} isEnemy={isEnemy} />}
          </group>
        );
      })}

      <RudderBlade length={length} rudderAngle={rudderAngle} />
    </group>
  );
});
