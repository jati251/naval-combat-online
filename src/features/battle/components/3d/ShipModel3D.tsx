import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { type ShipConfig, type SailState, SHIP_PRESETS } from '@/types/game';

import { createWoodPlankTexture, createSailClothTexture } from './textures/proceduralTextures';

interface ShipModel3DProps {
  config?: ShipConfig;
  shipClass?: string;
  sailState?: SailState;
  rudderAngle?: number;
  isEnemy?: boolean;
}

export const ShipModel3D: React.FC<ShipModel3DProps> = React.memo(({
  config: propConfig,
  shipClass = 'brig',
  sailState = 'HALF_SAIL',
  rudderAngle = 0,
  isEnemy = false,
}) => {
  const config = propConfig || SHIP_PRESETS[(shipClass as 'sloop' | 'brig' | 'frigate')] || SHIP_PRESETS.brig;

  const flagRef = useRef<THREE.Mesh>(null);
  const rudderMeshRef = useRef<THREE.Mesh>(null);
  const rudderAngleRef = useRef(rudderAngle);
  rudderAngleRef.current = rudderAngle;

  const { hullColor, trimColor, sailColor, length, width, cannonsPerSide, id } = config;

  const mastCount = id === 'sloop' ? 1 : id === 'brig' ? 2 : 3;

  // Procedural Canvas Textures for High-Fidelity Naval Materials
  const hullTexture = useMemo(() => createWoodPlankTexture(hullColor, '#1f130b', 8), [hullColor]);
  const deckTexture = useMemo(() => createWoodPlankTexture('#a16207', '#451a03', 10), []);
  const sailTexture = useMemo(() => createSailClothTexture(sailColor), [sailColor]);

  const mastPositions = useMemo(() => {
    if (mastCount === 1) return [0];
    if (mastCount === 2) return [-length * 0.22, length * 0.18];
    return [-length * 0.3, 0, length * 0.28];
  }, [mastCount, length]);

  const cannonPositions = useMemo(() => {
    const positions: number[] = [];
    const span = length * 0.65;
    const step = span / (cannonsPerSide + 1);
    for (let i = 1; i <= cannonsPerSide; i++) {
      positions.push(-span * 0.5 + i * step);
    }
    return positions;
  }, [cannonsPerSide, length]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (flagRef.current) {
      flagRef.current.rotation.y = Math.sin(t * 8) * 0.22;
      flagRef.current.rotation.z = Math.cos(t * 6) * 0.14;
    }
    if (rudderMeshRef.current) {
      rudderMeshRef.current.rotation.y = -rudderAngleRef.current * 0.55;
    }
  });

  const sailScaleY = sailState === 'ANCHOR' ? 0.2 : sailState === 'HALF_SAIL' ? 0.65 : 1.0;

  return (
    <group>
      {/* 1. Main Wood Hull with Procedural Timber Planks */}
      <mesh position={[0, 1.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, 3.6, length]} />
        <meshStandardMaterial map={hullTexture} roughness={0.65} metalness={0.08} />
      </mesh>

      {/* 2. Gilded Trim Gunwale Bulwarks */}
      <mesh position={[0, 3.05, 0]} castShadow receiveShadow>
        <boxGeometry args={[width + 0.35, 0.35, length + 0.4]} />
        <meshStandardMaterial color={trimColor} roughness={0.35} metalness={0.45} />
      </mesh>

      {/* 3. Sculpted Bow / Raked Stem */}
      <mesh position={[0, 1.3, length * 0.5 + 1.2]} rotation={[Math.PI / 4, 0, 0]} castShadow receiveShadow>
        <coneGeometry args={[width * 0.5, 3.6, 4]} />
        <meshStandardMaterial map={hullTexture} roughness={0.65} />
      </mesh>

      {/* 4. Carved Gilded Bow Figurehead */}
      <mesh position={[0, 2.6, length * 0.5 + 2.2]} rotation={[-0.4, 0, 0]} castShadow>
        <coneGeometry args={[0.35, 1.1, 5]} />
        <meshStandardMaterial color="#f59e0b" roughness={0.3} metalness={0.8} />
      </mesh>

      {/* 5. Bowsprit Spar Pole */}
      <mesh position={[0, 3.2, length * 0.5 + 2.8]} rotation={[0.38, 0, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.18, 5.2, 8]} />
        <meshStandardMaterial color="#382013" roughness={0.8} />
      </mesh>

      {/* 6. Main Deck Planks with Real Woodgrain */}
      <mesh position={[0, 2.86, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[width * 0.88, length * 0.92]} />
        <meshStandardMaterial map={deckTexture} roughness={0.75} />
      </mesh>

      {/* 7. Raised Quarterdeck Captain's Cabin */}
      <group position={[0, 3.7, -length * 0.38]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[width * 0.92, 1.7, length * 0.25]} />
          <meshStandardMaterial color={isEnemy ? '#881337' : '#1e3a5f'} map={hullTexture} roughness={0.6} />
        </mesh>

        {/* Leaded-Glass Cabin Windows on Stern */}
        {[-width * 0.28, -width * 0.1, width * 0.1, width * 0.28].map((wx, wIdx) => (
          <mesh key={`win-${wIdx}`} position={[wx, 0.1, -length * 0.126]}>
            <planeGeometry args={[width * 0.14, 0.7]} />
            <meshStandardMaterial
              color="#fef08a"
              emissive="#f59e0b"
              emissiveIntensity={0.7}
              roughness={0.2}
            />
          </mesh>
        ))}

        {/* Ornate Stern Brass Lantern */}
        <group position={[0, 0.9, -length * 0.14]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.12, 0.18, 0.45, 6]} />
            <meshStandardMaterial
              color="#fbbf24"
              emissive="#f59e0b"
              emissiveIntensity={1.2}
              metalness={0.8}
            />
          </mesh>
          <pointLight color="#f59e0b" intensity={0.6} distance={6} decay={2} />
        </group>
      </group>

      {/* 8. Steerable Rudder Blade */}
      <group position={[0, 0.6, -length * 0.5]}>
        <mesh ref={rudderMeshRef} position={[0, 0, -0.4]} castShadow>
          <boxGeometry args={[0.18, 2.4, 0.9]} />
          <meshStandardMaterial color="#2d170b" roughness={0.85} />
        </mesh>
      </group>

      {/* 9. Broadside Cannons with Wooden Carriages */}
      {cannonPositions.map((posZ, idx) => (
        <group key={`cannons-${idx}`}>
          {/* Port cannon barrel */}
          <group position={[-width * 0.5 - 0.25, 2.65, posZ]}>
            <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[0.12, 0.17, 1.2, 8]} />
              <meshStandardMaterial color="#18181b" metalness={0.9} roughness={0.2} />
            </mesh>
            {/* Wooden gun carriage block */}
            <mesh position={[0.25, -0.15, 0]}>
              <boxGeometry args={[0.35, 0.25, 0.45]} />
              <meshStandardMaterial color="#451a03" />
            </mesh>
          </group>

          {/* Starboard cannon barrel */}
          <group position={[width * 0.5 + 0.25, 2.65, posZ]}>
            <mesh rotation={[0, 0, -Math.PI / 2]} castShadow>
              <cylinderGeometry args={[0.12, 0.17, 1.2, 8]} />
              <meshStandardMaterial color="#18181b" metalness={0.9} roughness={0.2} />
            </mesh>
            {/* Wooden gun carriage block */}
            <mesh position={[-0.25, -0.15, 0]}>
              <boxGeometry args={[0.35, 0.25, 0.45]} />
              <meshStandardMaterial color="#451a03" />
            </mesh>
          </group>
        </group>
      ))}

      {/* 10. Masts, Rigging Lines, and Textured Sails */}
      {mastPositions.map((mastZ, mIdx) => {
        const mastHeight = length * 0.75 + (mIdx === 1 ? 2.2 : 0);
        return (
          <group key={`mast-${mIdx}`} position={[0, 2.9, mastZ]}>
            {/* Wooden Mast Trunk */}
            <mesh position={[0, mastHeight * 0.5, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[0.16, 0.28, mastHeight, 8]} />
              <meshStandardMaterial color="#382013" roughness={0.8} />
            </mesh>

            {/* Standing Rigging Shrouds (Rope Stays to Port & Starboard Gunwales) */}
            <mesh position={[-width * 0.38, mastHeight * 0.45, 0]} rotation={[0, 0, -0.18]}>
              <cylinderGeometry args={[0.02, 0.02, mastHeight * 0.95, 4]} />
              <meshBasicMaterial color="#1c1917" />
            </mesh>
            <mesh position={[width * 0.38, mastHeight * 0.45, 0]} rotation={[0, 0, 0.18]}>
              <cylinderGeometry args={[0.02, 0.02, mastHeight * 0.95, 4]} />
              <meshBasicMaterial color="#1c1917" />
            </mesh>

            {/* Lower Yardarm & Sail */}
            <group position={[0, mastHeight * 0.45, 0]}>
              <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
                <cylinderGeometry args={[0.08, 0.08, width * 1.5, 8]} />
                <meshStandardMaterial color="#2d1c12" roughness={0.8} />
              </mesh>
              <mesh
                position={[0, -mastHeight * 0.16 * sailScaleY, 0.2]}
                scale={[1, sailScaleY, 1]}
                castShadow
                receiveShadow
              >
                <planeGeometry args={[width * 1.4, mastHeight * 0.32]} />
                <meshStandardMaterial map={sailTexture} side={THREE.DoubleSide} roughness={0.85} />
              </mesh>
            </group>

            {/* Upper Yardarm & Top Sail */}
            <group position={[0, mastHeight * 0.82, 0]}>
              <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
                <cylinderGeometry args={[0.06, 0.06, width * 1.1, 8]} />
                <meshStandardMaterial color="#2d1c12" roughness={0.8} />
              </mesh>
              <mesh
                position={[0, -mastHeight * 0.12 * sailScaleY, 0.15]}
                scale={[1, sailScaleY, 1]}
                castShadow
                receiveShadow
              >
                <planeGeometry args={[width * 1.0, mastHeight * 0.24]} />
                <meshStandardMaterial map={sailTexture} side={THREE.DoubleSide} roughness={0.85} />
              </mesh>
            </group>

            {/* Crow's Nest Lookout Platform */}
            <mesh position={[0, mastHeight * 0.65, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[0.5, 0.4, 0.45, 8]} />
              <meshStandardMaterial color="#1a110a" roughness={0.85} />
            </mesh>

            {/* Masthead Banner Flag */}
            {mIdx === mastPositions.length - 1 && (
              <mesh ref={flagRef} position={[0, mastHeight + 0.45, -0.6]} castShadow>
                <planeGeometry args={[1.3, 0.7]} />
                <meshStandardMaterial
                  color={isEnemy ? '#dc2626' : '#2563eb'}
                  side={THREE.DoubleSide}
                  roughness={0.65}
                />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}, (prev, next) => {
  return (
    prev.shipClass === next.shipClass &&
    prev.sailState === next.sailState &&
    prev.isEnemy === next.isEnemy
  );
});
