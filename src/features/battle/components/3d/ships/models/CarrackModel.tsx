import React, { useMemo } from 'react';
import * as THREE from 'three';
import type { SubModelProps } from '../types';
import { createBillowedSailGeometry } from '../common/shipGeometries';
import { RudderBlade } from '../common/RudderBlade';
import { BroadsideCannons } from '../common/BroadsideCannons';
import { ShipHelm } from '../common/ShipHelm';
import { ShipFlag } from '../common/ShipFlag';

export const CarrackModel: React.FC<SubModelProps> = React.memo(({
  config,
  sailState,
  rudderAngle,
  isEnemy,
  hullTexture,
  deckTexture,
  sailTexture,
}) => {
  const { length, width } = config;
  const sailScale = sailState === 'ANCHOR' ? 0.18 : sailState === 'HALF_SAIL' ? 0.65 : 1.0;
  const mastPositions = useMemo(() => [-length * 0.32, 0, length * 0.26], [length]);
  const cannonPositions = useMemo(() => [-length * 0.24, -length * 0.08, length * 0.08, length * 0.24], [length]);

  const lowerGeo = useMemo(() => createBillowedSailGeometry(width * 1.4, length * 0.25, 0.45), [width, length]);
  const upperGeo = useMemo(() => createBillowedSailGeometry(width * 1.1, length * 0.18, 0.35), [width, length]);

  return (
    <group>
      {/* Charred Dark Timber Hull */}
      <mesh position={[0, 1.35, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, 3.8, length]} />
        <meshStandardMaterial color="#090d16" map={hullTexture} roughness={0.88} />
      </mesh>
      {/* Spectral Jade Trim Strake */}
      <mesh position={[0, 3.2, 0]}>
        <boxGeometry args={[width + 0.35, 0.36, length + 0.4]} />
        <meshStandardMaterial color="#10b981" emissive="#059669" emissiveIntensity={0.5} roughness={0.4} />
      </mesh>
      {/* Curved Gothic Beakhead & Skeletal Dragon Figurehead */}
      <mesh position={[0, 1.5, length * 0.5 + 1.4]} rotation={[Math.PI * 0.32, 0, 0]} castShadow>
        <coneGeometry args={[width * 0.52, 4.2, 4]} />
        <meshStandardMaterial color="#090d16" map={hullTexture} roughness={0.85} />
      </mesh>
      <mesh position={[0, 3.0, length * 0.5 + 2.5]} rotation={[-0.55, 0, 0]} castShadow>
        <coneGeometry args={[0.42, 1.4, 5]} />
        <meshStandardMaterial color="#10b981" emissive="#047857" emissiveIntensity={0.8} roughness={0.3} metalness={0.7} />
      </mesh>

      {/* Dark Deck Planks */}
      <mesh position={[0, 3.0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[width * 0.88, length * 0.92]} />
        <meshStandardMaterial color="#1c1917" map={deckTexture} roughness={0.9} />
      </mesh>

      {/* Gothic Arched Sterncastle with Cathedral Windows */}
      <group position={[0, 4.2, -length * 0.35]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[width * 0.95, 2.4, length * 0.3]} />
          <meshStandardMaterial color="#0f172a" map={hullTexture} roughness={0.8} />
        </mesh>
        {/* Spectral Emerald Windows */}
        {[-width * 0.28, -width * 0.1, width * 0.1, width * 0.28].map((wx, wIdx) => (
          <mesh key={`win-${wIdx}`} position={[wx, 0.2, -length * 0.151]}>
            <planeGeometry args={[width * 0.14, 1.1]} />
            <meshStandardMaterial color="#6ee7b7" emissive="#10b981" emissiveIntensity={1.4} roughness={0.2} />
          </mesh>
        ))}
        {/* Dual Gargoyle Emerald Lanterns */}
        {[-width * 0.32, width * 0.32].map((lx, lIdx) => (
          <group key={`lan-${lIdx}`} position={[lx, 1.4, -length * 0.16]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.14, 0.2, 0.5, 6]} />
              <meshStandardMaterial color="#34d399" emissive="#10b981" emissiveIntensity={2.0} metalness={0.8} />
            </mesh>
            <pointLight color="#34d399" intensity={1.5} distance={9} decay={2} />
          </group>
        ))}
        <ShipHelm position={[0, 1.5, length * 0.08]} rudderAngle={rudderAngle} />
      </group>

      <BroadsideCannons positions={cannonPositions} width={width} y={2.8} color="#052e16" />

      {/* Bowsprit */}
      <mesh position={[0, 3.4, length * 0.5 + 2.8]} rotation={[0.38, 0, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.22, 5.6, 8]} />
        <meshStandardMaterial color="#1e1b18" roughness={0.9} />
      </mesh>

      {/* 3 Masts with Tattered Charcoal Sails */}
      {mastPositions.map((mastZ, mIdx) => {
        const mastHeight = length * 0.78 + (mIdx === 1 ? 2.5 : 0);
        return (
          <group key={`mast-${mIdx}`} position={[0, 3.0, mastZ]}>
            <mesh position={[0, mastHeight * 0.5, 0]} castShadow>
              <cylinderGeometry args={[0.18, 0.3, mastHeight, 8]} />
              <meshStandardMaterial color="#1e1b18" roughness={0.9} />
            </mesh>
            <group position={[0, mastHeight * 0.46, 0]}>
              <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
                <cylinderGeometry args={[0.08, 0.08, width * 1.42, 8]} />
                <meshStandardMaterial color="#18181b" />
              </mesh>
              <mesh
                geometry={lowerGeo}
                position={[0, -length * 0.12 * sailScale, 0.22]}
                scale={[1, sailScale, 1]}
                castShadow
                receiveShadow
              >
                <meshStandardMaterial color="#1e293b" map={sailTexture} side={THREE.DoubleSide} roughness={0.9} />
              </mesh>
            </group>
            <group position={[0, mastHeight * 0.83, 0]}>
              <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
                <cylinderGeometry args={[0.06, 0.06, width * 1.15, 8]} />
                <meshStandardMaterial color="#18181b" />
              </mesh>
              <mesh
                geometry={upperGeo}
                position={[0, -length * 0.09 * sailScale, 0.16]}
                scale={[1, sailScale, 1]}
                castShadow
                receiveShadow
              >
                <meshStandardMaterial color="#1e293b" map={sailTexture} side={THREE.DoubleSide} roughness={0.9} />
              </mesh>
            </group>
            <mesh position={[0, mastHeight * 0.65, 0]} castShadow>
              <cylinderGeometry args={[0.55, 0.42, 0.48, 8]} />
              <meshStandardMaterial color="#09090b" />
            </mesh>
            {mIdx === 2 && <ShipFlag position={[0, mastHeight + 0.48, -0.65]} isEnemy={isEnemy} isGhost />}
          </group>
        );
      })}

      <RudderBlade length={length} rudderAngle={rudderAngle} />
    </group>
  );
});
