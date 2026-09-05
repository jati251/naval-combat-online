import React, { useMemo } from 'react';
import * as THREE from 'three';
import type { IslandSettlement } from './types';

interface MayanPyramidProps {
  settlement: IslandSettlement;
  isMobile?: boolean;
}

/**
 * Ancient Mayan Pyramid & Ceremonial Ruins (Yucatan / Mexico Coastal Theater):
 * - Stepped limestone Mesoamerican Pyramid (talud-tablero tiers)
 * - Four monumental ceremonial staircases leading to the summit
 * - Summit Sanctuary Shrine (Chamber of the Feathered Serpent)
 * - Ceremonial fire braziers with glowing amber flame
 * - Carved stone stelae (monoliths) and sacrificial altar court
 * - Ancient ruined colonnades overgrown with coastal jungle vines
 */
export const MayanPyramid: React.FC<MayanPyramidProps> = React.memo(({ settlement, isMobile = false }) => {
  const mats = useMemo(() => {
    return {
      limestoneBase: new THREE.MeshStandardMaterial({
        color: '#a8a29e', // Weathered Mesoamerican limestone
        roughness: 0.95,
        metalness: 0.02,
      }),
      limestoneCarved: new THREE.MeshStandardMaterial({
        color: '#78716c',
        roughness: 0.92,
      }),
      ancientMoss: new THREE.MeshStandardMaterial({
        color: '#4d7c0f', // Jungle moss and lichen patina
        roughness: 0.88,
      }),
      fireGlow: new THREE.MeshStandardMaterial({
        color: '#f97316',
        emissive: '#ea580c',
        emissiveIntensity: 3.5,
        roughness: 0.1,
      }),
      darkBasalt: new THREE.MeshStandardMaterial({
        color: '#292524',
        roughness: 0.96,
      }),
      goldAltar: new THREE.MeshStandardMaterial({
        color: '#eab308',
        metalness: 0.5,
        roughness: 0.4,
      }),
    };
  }, []);

  return (
    <group position={[settlement.x, 0, settlement.z]} rotation={[0, settlement.rotationY, 0]}>
      {/* =========================================================================
          1. STEPPED PYRAMID OF KUKULCÁN (4 Terraced Tiers)
          ========================================================================= */}
      <group position={[0, 0, 0]}>
        {/* Tier 1 (Base Platform) */}
        <mesh position={[0, 2.5, 0]} material={mats.limestoneBase} castShadow receiveShadow>
          <boxGeometry args={[32, 5.0, 32]} />
        </mesh>
        {/* Tier 1 Cornice */}
        <mesh position={[0, 5.2, 0]} material={mats.limestoneCarved}>
          <boxGeometry args={[32.8, 0.6, 32.8]} />
        </mesh>

        {/* Tier 2 */}
        <mesh position={[0, 7.8, 0]} material={mats.limestoneBase} castShadow receiveShadow>
          <boxGeometry args={[25, 4.8, 25]} />
        </mesh>
        {/* Tier 2 Cornice */}
        <mesh position={[0, 10.4, 0]} material={mats.limestoneCarved}>
          <boxGeometry args={[25.6, 0.6, 25.6]} />
        </mesh>

        {/* Tier 3 */}
        <mesh position={[0, 12.8, 0]} material={mats.limestoneBase} castShadow receiveShadow>
          <boxGeometry args={[18, 4.4, 18]} />
        </mesh>
        {/* Tier 3 Cornice */}
        <mesh position={[0, 15.2, 0]} material={mats.limestoneCarved}>
          <boxGeometry args={[18.6, 0.6, 18.6]} />
        </mesh>

        {/* Tier 4 (Upper Terrace) */}
        <mesh position={[0, 17.2, 0]} material={mats.limestoneBase} castShadow receiveShadow>
          <boxGeometry args={[12, 3.8, 12]} />
        </mesh>

        {/* =========================================================================
            2. MONUMENTAL CEREMONIAL STAIRWAYS (Four Cardinal Faces)
            ========================================================================= */}
        {/* Front Stairway (Z+) */}
        <group position={[0, 9.5, 12]}>
          <mesh rotation={[-Math.PI * 0.28, 0, 0]} material={mats.limestoneCarved} castShadow>
            <boxGeometry args={[6.5, 23.5, 1.8]} />
          </mesh>
          {/* Stairway Balustrades (Serpent ramps) */}
          {[-3.6, 3.6].map((bx, i) => (
            <mesh key={`bal-front-${i}`} position={[bx, 0, 0]} rotation={[-Math.PI * 0.28, 0, 0]} material={mats.darkBasalt}>
              <boxGeometry args={[0.8, 24, 2.2]} />
            </mesh>
          ))}
        </group>

        {/* Back Stairway (Z-) */}
        <group position={[0, 9.5, -12]}>
          <mesh rotation={[Math.PI * 0.28, 0, 0]} material={mats.limestoneCarved} castShadow>
            <boxGeometry args={[5.5, 23.5, 1.8]} />
          </mesh>
        </group>

        {/* Left Stairway (X-) */}
        <group position={[-12, 9.5, 0]}>
          <mesh rotation={[0, 0, -Math.PI * 0.28]} material={mats.limestoneCarved} castShadow>
            <boxGeometry args={[1.8, 23.5, 5.5]} />
          </mesh>
        </group>

        {/* Right Stairway (X+) */}
        <group position={[12, 9.5, 0]}>
          <mesh rotation={[0, 0, Math.PI * 0.28]} material={mats.limestoneCarved} castShadow>
            <boxGeometry args={[1.8, 23.5, 5.5]} />
          </mesh>
        </group>

        {/* =========================================================================
            3. SUMMIT SANCTUARY SHRINE (Temple of the Sun)
            ========================================================================= */}
        <group position={[0, 19.1, 0]}>
          {/* Temple Chamber Base */}
          <mesh position={[0, 2.4, 0]} material={mats.limestoneCarved} castShadow receiveShadow>
            <boxGeometry args={[8.0, 4.8, 8.0]} />
          </mesh>

          {/* Entrance Portico Columns */}
          {[-2.0, 2.0].map((cx) => (
            <mesh key={`temple-col-${cx}`} position={[cx, 2.2, 4.2]} material={mats.limestoneCarved}>
              <boxGeometry args={[1.0, 4.4, 1.0]} />
            </mesh>
          ))}
          {/* Lintel Beam above entrance */}
          <mesh position={[0, 4.5, 4.2]} material={mats.limestoneCarved}>
            <boxGeometry args={[6.8, 0.8, 1.4]} />
          </mesh>

          {/* Stepped Frieze & Sloped Temple Roof */}
          <mesh position={[0, 5.4, 0]} material={mats.ancientMoss}>
            <boxGeometry args={[9.0, 1.2, 9.0]} />
          </mesh>
          <mesh position={[0, 6.6, 0]} material={mats.limestoneBase}>
            <boxGeometry args={[7.4, 1.4, 7.4]} />
          </mesh>
          {/* Sacred Crest Comb (Roof Lattice) */}
          <mesh position={[0, 8.2, 0]} material={mats.limestoneCarved}>
            <boxGeometry args={[5.2, 2.0, 1.2]} />
          </mesh>
        </group>
      </group>

      {/* =========================================================================
          4. CEREMONIAL BRAZIERS (Eternal Sacrificial Torches)
          ========================================================================= */}
      {/* Front steps left & right braziers */}
      {[-4.5, 4.5].map((bx, i) => (
        <group key={`pyramid-fire-${i}`} position={[bx, 0.5, 18]}>
          {/* Stone altar pedestal */}
          <mesh position={[0, 1.2, 0]} material={mats.darkBasalt}>
            <cylinderGeometry args={[0.9, 1.2, 2.4, 6]} />
          </mesh>
          {/* Stone bowl */}
          <mesh position={[0, 2.6, 0]} material={mats.darkBasalt}>
            <cylinderGeometry args={[1.4, 0.8, 0.8, 8]} />
          </mesh>
          {/* Fire Flame Core */}
          <mesh position={[0, 3.2, 0]} material={mats.fireGlow}>
            <dodecahedronGeometry args={[0.7, 1]} />
          </mesh>
          {!isMobile && (
            <pointLight color="#f97316" intensity={3.5} distance={22} decay={2} position={[0, 3.4, 0]} />
          )}
        </group>
      ))}

      {/* Summit Shrine Sacred Flame */}
      <group position={[0, 20.5, 2.5]}>
        <mesh position={[0, 0.8, 0]} material={mats.fireGlow}>
          <dodecahedronGeometry args={[0.6, 1]} />
        </mesh>
        {!isMobile && (
          <pointLight color="#ea580c" intensity={4.5} distance={30} decay={2} position={[0, 1.2, 0]} />
        )}
      </group>

      {/* =========================================================================
          5. CEREMONIAL PLAZA: ANCIENT MAYAN STELAE & PILLARS
          ========================================================================= */}
      <group position={[0, 0, 24]}>
        {/* Central Sun Disk Altar */}
        <mesh position={[0, 0.6, 0]} material={mats.goldAltar} receiveShadow>
          <cylinderGeometry args={[3.2, 3.6, 1.2, 12]} />
        </mesh>

        {/* Ring of 6 Carved Stelae Monoliths */}
        {[0, 1, 2, 3, 4, 5].map((idx) => {
          const angle = (idx / 6) * Math.PI * 2;
          const dist = 8.5;
          const mx = Math.cos(angle) * dist;
          const mz = Math.sin(angle) * dist;
          return (
            <group key={`stela-${idx}`} position={[mx, 0, mz]} rotation={[0, -angle, 0]}>
              <mesh position={[0, 2.4, 0]} material={mats.limestoneCarved} castShadow>
                <boxGeometry args={[1.2, 4.8, 0.8]} />
              </mesh>
              {/* Stele round capstone */}
              <mesh position={[0, 5.0, 0]} material={mats.ancientMoss}>
                <dodecahedronGeometry args={[0.6, 1]} />
              </mesh>
            </group>
          );
        })}
      </group>

      {/* =========================================================================
          6. JUNGLE-OVERGROWN RUINED COLONNADE
          ========================================================================= */}
      <group position={[-20, 0, 8]} rotation={[0, 0.4, 0]}>
        {[-8, -4, 0, 4, 8].map((px) => (
          <mesh key={`col-ruin-${px}`} position={[px, 2.2, 0]} material={mats.limestoneCarved} castShadow>
            <cylinderGeometry args={[0.6, 0.7, 4.4, 8]} />
          </mesh>
        ))}
        {/* Broken entablature beam */}
        <mesh position={[0, 4.6, 0]} material={mats.ancientMoss}>
          <boxGeometry args={[18, 0.7, 1.4]} />
        </mesh>
      </group>
    </group>
  );
});
