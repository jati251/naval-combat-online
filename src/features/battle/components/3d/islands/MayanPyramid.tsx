import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { constructionMaterial } from '../textures/constructionMaterials';
import React, { useMemo, useEffect } from 'react';
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
  const stairs = useMemo(() => {
    const parts: THREE.BufferGeometry[] = [];
    for (let side = 0; side < 4; side++) for (let step = 0; step < 36; step++) {
      const height = (step + 1) * 19.1 / 36;
      parts.push(new THREE.BoxGeometry(5.5, height, 0.43)
        .translate(0, height / 2, 20.5 - step * 0.4).rotateY(side * Math.PI / 2));
    }
    for (let side = 0; side < 4; side++) parts.push(new THREE.BoxGeometry(5.5, 0.4, 1.5).translate(0, 18.9, 6).rotateY(side * Math.PI / 2));
    const geometry = mergeGeometries(parts)!;
    parts.forEach(g => g.dispose());
    return geometry;
  }, []);
  useEffect(() => () => stairs.dispose(), [stairs]);
  const mats = useMemo(() => {
    return {
      limestoneBase: constructionMaterial('stone', '#a8a29e', 4),
      limestoneCarved: constructionMaterial('stone', '#78716c', 4),
      ancientMoss: constructionMaterial('rock', '#697057', 8),
      fireGlow: new THREE.MeshStandardMaterial({
        color: '#f97316',
        emissive: '#ea580c',
        emissiveIntensity: 3.5,
        roughness: 0.1,
      }),
      darkBasalt: constructionMaterial('rock', '#292524', 8),
      goldAltar: new THREE.MeshStandardMaterial({
        color: '#eab308',
        metalness: 0.5,
        roughness: 0.4,
      }),
    };
  }, []);
  useEffect(() => () => Object.values(mats).forEach((material) => material.dispose()), [mats]);

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
        <mesh geometry={stairs} material={mats.limestoneCarved} castShadow receiveShadow />

        {/* =========================================================================
            3. SUMMIT SANCTUARY SHRINE (Temple of the Sun)
            ========================================================================= */}
        <group position={[0, 19.1, 0]}>
          {/* Temple Chamber Base */}
          <mesh position={[0, 2.4, 0]} material={mats.limestoneCarved} castShadow receiveShadow>
            <boxGeometry args={[8.0, 4.8, 8.0]} />
          </mesh>

          <mesh position={[0, 1.9, 4.02]} material={mats.darkBasalt}><boxGeometry args={[2.2, 3.8, 0.08]} /></mesh>
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
