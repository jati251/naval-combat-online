import React, { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import type { IslandSettlement } from './types';

interface SeaArchProps {
  settlement: IslandSettlement;
  isMobile?: boolean;
}

/**
 * Monumental Natural Sea Arch ("El Arco de Piedra" - Gulf of Mexico):
 * Inspired by the natural granite and limestone sea arches of Mexico (Cabo San Lucas / Yucatan Karst):
 * - Weathered golden-ochre and deep earth limestone rock strata
 * - Massive western sea-stack massif with terraced cliff ledges and wave-eroded base
 * - Towering eastern karst pinnacle stack with jagged summit crags
 * - Rugged, natural weathered stone arch bridge with wide navigable sea opening
 * - Fallen tidal boulders and wave-breakers clustered at the water level
 */
export const SeaArch: React.FC<SeaArchProps> = React.memo(({ settlement, isMobile = false }) => {
  const mats = useMemo(() => {
    return {
      sunlitRock: new THREE.MeshStandardMaterial({
        color: '#8d7557', // Warm weathered Mexican coastal granite/limestone
        roughness: 0.94,
        metalness: 0.04,
      }),
      darkStrata: new THREE.MeshStandardMaterial({
        color: '#5c4a36', // Layered shadow rock strata
        roughness: 0.96,
      }),
      rockHighlight: new THREE.MeshStandardMaterial({
        color: '#aa9272', // Sun-bleached upper crags
        roughness: 0.9,
      }),
      waterlineMoss: new THREE.MeshStandardMaterial({
        color: '#2e3b22', // Dark sea-algae and wave-washed tidal rock
        roughness: 0.88,
      }),
      deepBase: new THREE.MeshStandardMaterial({
        color: '#1e2817', // Submerged marine base
        roughness: 0.85,
      }),
    };
  }, []);
  useEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats]);

  return (
    <group position={[settlement.x, 0, settlement.z]}>
      {/* =========================================================================
          1. WESTERN SEA-CLIFF MASSIF (Main Anchoring Karst Ridge)
          ========================================================================= */}
      <group position={[-18, 0, 0]}>
        {/* Submerged tidal base extending into seabed */}
        <mesh position={[0, -2.5, 0]} material={mats.deepBase} receiveShadow>
          <cylinderGeometry args={[11, 14, 8, 12]} />
        </mesh>
        {/* Wave-cut surge shelf & moss waterline */}
        <mesh position={[0, 2, 0]} material={mats.waterlineMoss} receiveShadow>
          <cylinderGeometry args={[9.5, 11.5, 4.5, 12]} />
        </mesh>
        {/* Main lower cliff body */}
        <mesh position={[0, 8.5, 0]} material={mats.sunlitRock} castShadow receiveShadow>
          <cylinderGeometry args={[7.5, 9.5, 11, 10]} />
        </mesh>
        {/* Secondary strata ledge */}
        <mesh position={[-2, 14, 1]} material={mats.darkStrata} castShadow receiveShadow>
          <boxGeometry args={[12, 4.5, 11]} />
        </mesh>
        {/* Upper spire column */}
        <mesh position={[-1, 19, 0]} material={mats.sunlitRock} castShadow receiveShadow>
          <cylinderGeometry args={[4.5, 6.5, 9, 8]} />
        </mesh>
        {/* Summit rocky horn */}
        <mesh position={[-1, 24.5, 0]} material={mats.rockHighlight} castShadow>
          <dodecahedronGeometry args={[4.2, 1]} />
        </mesh>
        {/* Seaward rugged buttress spurs */}
        <mesh position={[-6, 6, 4]} rotation={[0.2, 0.4, -0.2]} material={mats.darkStrata} castShadow>
          <boxGeometry args={[6, 12, 6]} />
        </mesh>
        <mesh position={[-5, 4, -4]} rotation={[-0.1, -0.3, -0.15]} material={mats.sunlitRock} castShadow>
          <coneGeometry args={[4.5, 10, 7]} />
        </mesh>
      </group>

      {/* =========================================================================
          2. EASTERN KARST PINNACLE STACK
          ========================================================================= */}
      <group position={[18, 0, 0]}>
        {/* Submerged tidal base */}
        <mesh position={[0, -2.5, 0]} material={mats.deepBase} receiveShadow>
          <cylinderGeometry args={[9.5, 12, 8, 12]} />
        </mesh>
        {/* Tidal waterline */}
        <mesh position={[0, 2, 0]} material={mats.waterlineMoss} receiveShadow>
          <cylinderGeometry args={[8, 10, 4.5, 12]} />
        </mesh>
        {/* Main spire body */}
        <mesh position={[0, 9, 0]} material={mats.sunlitRock} castShadow receiveShadow>
          <cylinderGeometry args={[6, 8, 12, 10]} />
        </mesh>
        {/* Upper jagged strata */}
        <mesh position={[1, 16.5, -0.5]} material={mats.darkStrata} castShadow receiveShadow>
          <boxGeometry args={[9.5, 6, 8.5]} />
        </mesh>
        {/* Pinnacle crag summit */}
        <mesh position={[1, 22.5, -0.5]} material={mats.rockHighlight} castShadow>
          <coneGeometry args={[4.8, 8, 7]} />
        </mesh>
        {/* Flanking sea spur */}
        <mesh position={[5, 5, -3]} rotation={[0.1, -0.4, 0.2]} material={mats.sunlitRock} castShadow>
          <cylinderGeometry args={[3, 4.5, 10, 6]} />
        </mesh>
      </group>

      {/* =========================================================================
          3. MONUMENTAL NATURAL STONE ARCH SPAN
          ========================================================================= */}
      {/* Arch Bridge Main Keystone & Massive Rock Slabs */}
      <group position={[0, 18, 0]}>
        {/* Heavy central upper stone beam */}
        <mesh position={[0, 3.2, 0]} material={mats.sunlitRock} castShadow receiveShadow>
          <boxGeometry args={[38, 4.8, 8.5]} />
        </mesh>

        {/* Natural arched underside springers (angled rock blocks forming the vaulted arch) */}
        {/* Left arch springer */}
        <mesh position={[-10.5, -2.5, 0]} rotation={[0, 0, -Math.PI * 0.22]} material={mats.darkStrata} castShadow receiveShadow>
          <boxGeometry args={[11, 4.5, 7.8]} />
        </mesh>
        {/* Right arch springer */}
        <mesh position={[10.5, -2.5, 0]} rotation={[0, 0, Math.PI * 0.22]} material={mats.darkStrata} castShadow receiveShadow>
          <boxGeometry args={[11, 4.5, 7.8]} />
        </mesh>
        {/* Central keystone vault */}
        <mesh position={[0, -0.8, 0]} material={mats.sunlitRock} castShadow receiveShadow>
          <boxGeometry args={[14, 3.8, 8.2]} />
        </mesh>

        {/* Upper rugged crest ridges and natural crags */}
        {[-10, -4, 3, 10].map((cx, idx) => (
          <mesh
            key={`crest-rock-${idx}`}
            position={[cx, 6.2, (idx % 2 === 0 ? 0.8 : -0.8)]}
            rotation={[0.2 * idx, 0.4 * idx, 0.1 * (idx - 2)]}
            material={mats.rockHighlight}
            castShadow
          >
            <dodecahedronGeometry args={[2.5 + (idx === 1 ? 0.8 : 0), 1]} />
          </mesh>
        ))}
      </group>

      {/* =========================================================================
          4. FALLEN TIDAL BOULDERS & WAVE-BREAKERS
          ========================================================================= */}
      {/* Clusters of natural boulders resting in the water around the arch bases */}
      {[
        [-11, 1.2, 7, 3.2, 0.6],
        [-13, 0.8, -8, 2.8, 1.4],
        [-24, 1.5, 2, 3.6, 2.2],
        [12, 1.1, 6, 3.0, 0.9],
        [14, 0.9, -7, 2.6, 2.5],
        [23, 1.4, -2, 3.4, 1.8],
      ].map(([bx, by, bz, bRadius, bRot], bIdx) => (
        <mesh
          key={`tidal-boulder-${bIdx}`}
          position={[bx, by, bz]}
          rotation={[0.3, bRot, 0.2]}
          material={mats.darkStrata}
          castShadow
          receiveShadow
        >
          <dodecahedronGeometry args={[bRadius, 1]} />
        </mesh>
      ))}

      {/* Low wave-cut rock platform between the spires at water level */}
      {!isMobile && (
        <mesh position={[0, 0.3, -5]} rotation={[0, 0.3, 0]} material={mats.waterlineMoss} receiveShadow>
          <cylinderGeometry args={[3.5, 4.5, 1.2, 8]} />
        </mesh>
      )}
    </group>
  );
});
