import React, { useMemo } from 'react';
import * as THREE from 'three';
import type { IslandSettlement } from './types';

interface KingstonCityProps {
  settlement: IslandSettlement;
  isMobile?: boolean;
}

/**
 * Kingston / Port Royal 17th-Century Colonial Naval Metropolis:
 * - Fort Charles Citadel with stone ramparts, corner bartizan turrets, and gun embrasures
 * - Grand St. Peter's Colonial Church with tall square bell tower and copper/slate spire
 * - Royal Governor's Admiralty Mansion with white portico pillars and red tile hipped roof
 * - Colonial Merchant Waterfront Row (multi-story brick & timber buildings)
 * - Massive Deep-Water Stone Harbor Wharf with wooden cargo crane, rum hogsheads, and lanterns
 * - Shore artillery defense battery with brass naval cannons
 */
export const KingstonCity: React.FC<KingstonCityProps> = React.memo(({ settlement, isMobile = false }) => {
  // Shared materials for colonial city architecture
  const mats = useMemo(() => {
    return {
      fortStone: new THREE.MeshStandardMaterial({
        color: '#8c857b',
        roughness: 0.92,
        metalness: 0.05,
      }),
      darkStone: new THREE.MeshStandardMaterial({
        color: '#57534e',
        roughness: 0.95,
      }),
      wharfStone: new THREE.MeshStandardMaterial({
        color: '#78716c',
        roughness: 0.88,
      }),
      brickWall: new THREE.MeshStandardMaterial({
        color: '#9a3412',
        roughness: 0.85,
      }),
      whiteStucco: new THREE.MeshStandardMaterial({
        color: '#f1f5f9',
        roughness: 0.75,
      }),
      timberDeck: new THREE.MeshStandardMaterial({
        color: '#451a03',
        roughness: 0.82,
      }),
      terracottaRoof: new THREE.MeshStandardMaterial({
        color: '#c2410c',
        roughness: 0.7,
      }),
      slateRoof: new THREE.MeshStandardMaterial({
        color: '#334155',
        roughness: 0.65,
      }),
      copperRoof: new THREE.MeshStandardMaterial({
        color: '#0d9488',
        roughness: 0.5,
        metalness: 0.2,
      }),
      cannonBrass: new THREE.MeshStandardMaterial({
        color: '#ca8a04',
        metalness: 0.65,
        roughness: 0.35,
      }),
      lanternGlow: new THREE.MeshStandardMaterial({
        color: '#fef08a',
        emissive: '#f59e0b',
        emissiveIntensity: 2.5,
        roughness: 0.2,
      }),
      woodCrane: new THREE.MeshStandardMaterial({
        color: '#3e2723',
        roughness: 0.88,
      }),
      flagRed: new THREE.MeshStandardMaterial({
        color: '#dc2626',
        roughness: 0.7,
      }),
    };
  }, []);

  return (
    <group position={[settlement.x, 0, settlement.z]} rotation={[0, settlement.rotationY, 0]}>
      {/* =========================================================================
          1. FORT CHARLES STONE CITADEL & RAMPARTS
          ========================================================================= */}
      <group position={[-16, 0, 4]}>
        {/* Main rampart wall terrace */}
        <mesh position={[0, 3.5, 0]} material={mats.fortStone} castShadow receiveShadow>
          <boxGeometry args={[18, 7.0, 14]} />
        </mesh>

        {/* Parapet embrasure battlements */}
        <mesh position={[0, 7.5, 6.4]} material={mats.darkStone}>
          <boxGeometry args={[18.2, 1.2, 1.4]} />
        </mesh>
        <mesh position={[-8.4, 7.5, 0]} material={mats.darkStone}>
          <boxGeometry args={[1.4, 1.2, 14.2]} />
        </mesh>

        {/* Projecting Star Bastion (Seaward corner) */}
        <mesh position={[8, 3.5, 6]} rotation={[0, Math.PI * 0.25, 0]} material={mats.fortStone} castShadow receiveShadow>
          <boxGeometry args={[10, 7.0, 10]} />
        </mesh>

        {/* Sentry Turrets / Bartizans (Overhanging stone watch-boxes) */}
        {[-8.5, 8.5].map((bx, i) => (
          <group key={`sentry-${i}`} position={[bx, 7.5, 6.5]}>
            <mesh position={[0, 0.8, 0]} material={mats.fortStone}>
              <cylinderGeometry args={[1.0, 0.7, 1.8, 6]} />
            </mesh>
            <mesh position={[0, 2.1, 0]} material={mats.slateRoof}>
              <coneGeometry args={[1.2, 1.4, 6]} />
            </mesh>
          </group>
        ))}

        {/* Coastal Artillery Cannons facing the straits */}
        {[-5, 0, 5].map((cx) => (
          <group key={`fort-gun-${cx}`} position={[cx, 7.3, 5.8]}>
            <mesh position={[0, 0.25, 0]} material={mats.timberDeck}>
              <boxGeometry args={[1.0, 0.5, 1.6]} />
            </mesh>
            <mesh position={[0, 0.55, 0.6]} rotation={[Math.PI * 0.48, 0, 0]} material={mats.cannonBrass}>
              <cylinderGeometry args={[0.2, 0.26, 2.4, 8]} />
            </mesh>
          </group>
        ))}

        {/* Fortress Signal Mast & British Ensign Pennant */}
        <mesh position={[0, 11, -2]} material={mats.timberDeck}>
          <cylinderGeometry args={[0.1, 0.14, 8, 6]} />
        </mesh>
        <mesh position={[1.4, 13.5, -2]} material={mats.flagRed}>
          <boxGeometry args={[2.4, 1.4, 0.04]} />
        </mesh>
      </group>

      {/* =========================================================================
          2. ST. PETER'S COLONIAL CHURCH & SQUARE BELL TOWER
          ========================================================================= */}
      <group position={[8, 0, -18]}>
        {/* Main church nave hall */}
        <mesh position={[0, 3.6, 0]} material={mats.brickWall} castShadow receiveShadow>
          <boxGeometry args={[11, 7.2, 18]} />
        </mesh>
        {/* Steep church roof */}
        <mesh position={[0, 8.8, 0]} rotation={[0, 0, Math.PI * 0.25]} material={mats.slateRoof}>
          <boxGeometry args={[8.2, 8.2, 18.4]} />
        </mesh>

        {/* Tall square clock & bell tower */}
        <group position={[0, 0, 9.5]}>
          <mesh position={[0, 8.5, 0]} material={mats.fortStone} castShadow receiveShadow>
            <boxGeometry args={[5.5, 17, 5.5]} />
          </mesh>
          {/* Belfry arched openings level */}
          <mesh position={[0, 18, 0]} material={mats.darkStone}>
            <boxGeometry args={[5.2, 3, 5.2]} />
          </mesh>
          {/* Tower copper spire */}
          <mesh position={[0, 22.5, 0]} material={mats.copperRoof}>
            <coneGeometry args={[3.2, 7.5, 4]} />
          </mesh>
        </group>
      </group>

      {/* =========================================================================
          3. ADMIRALTY HOUSE / GOVERNOR'S MANSION
          ========================================================================= */}
      <group position={[4, 0, 0]}>
        {/* Main Georgian mansion wing */}
        <mesh position={[0, 4.0, 0]} material={mats.whiteStucco} castShadow receiveShadow>
          <boxGeometry args={[14, 8.0, 10]} />
        </mesh>
        {/* Terracotta tiled hipped roof */}
        <mesh position={[0, 9.2, 0]} rotation={[0, 0, Math.PI * 0.25]} material={mats.terracottaRoof}>
          <boxGeometry args={[8.8, 8.8, 10.6]} />
        </mesh>

        {/* Portico Entrance with classical columns */}
        <group position={[0, 0, 5.5]}>
          {[-4, -1.5, 1.5, 4].map((colX) => (
            <mesh key={`col-${colX}`} position={[colX, 2.5, 0]} material={mats.whiteStucco}>
              <cylinderGeometry args={[0.3, 0.35, 5.0, 8]} />
            </mesh>
          ))}
          <mesh position={[0, 5.2, 0]} material={mats.whiteStucco}>
            <boxGeometry args={[10, 0.6, 2.2]} />
          </mesh>
        </group>

        {/* Mansion Roof Cupola / Belvedere */}
        <mesh position={[0, 13.8, 0]} material={mats.whiteStucco}>
          <cylinderGeometry args={[1.5, 1.7, 2.2, 8]} />
        </mesh>
        <mesh position={[0, 15.6, 0]} material={mats.copperRoof}>
          <coneGeometry args={[1.8, 1.6, 8]} />
        </mesh>
      </group>

      {/* =========================================================================
          4. WATERFRONT COLONIAL MERCHANT ROW & HOUSES
          ========================================================================= */}
      {/* Merchant House 1 (Left) */}
      <group position={[18, 0, 2]}>
        <mesh position={[0, 3.5, 0]} material={mats.brickWall} castShadow receiveShadow>
          <boxGeometry args={[7.5, 7.0, 8.0]} />
        </mesh>
        <mesh position={[0, 8.2, 0]} rotation={[0, 0, Math.PI * 0.25]} material={mats.terracottaRoof}>
          <boxGeometry args={[6.0, 6.0, 8.4]} />
        </mesh>
      </group>

      {/* Merchant House 2 / Customs House (Right) */}
      <group position={[26, 0, 1]}>
        <mesh position={[0, 3.8, 0]} material={mats.whiteStucco} castShadow receiveShadow>
          <boxGeometry args={[8.0, 7.6, 7.5]} />
        </mesh>
        <mesh position={[0, 8.8, 0]} rotation={[0, 0, Math.PI * 0.25]} material={mats.slateRoof}>
          <boxGeometry args={[6.2, 6.2, 8.0]} />
        </mesh>
      </group>

      {/* Warehouse 3 (Rear Quay) */}
      <group position={[-2, 0, -18]}>
        <mesh position={[0, 3.2, 0]} material={mats.brickWall} castShadow receiveShadow>
          <boxGeometry args={[12, 6.4, 7.0]} />
        </mesh>
        <mesh position={[0, 7.4, 0]} rotation={[0, 0, Math.PI * 0.25]} material={mats.terracottaRoof}>
          <boxGeometry args={[5.6, 5.6, 7.4]} />
        </mesh>
      </group>

      {/* =========================================================================
          5. DEEP-WATER STONE HARBOR QUAY & WORKING DOCKS
          ========================================================================= */}
      <group position={[8, 0, 14]}>
        {/* Massive stone harbor sea-wall (extending down into water) */}
        <mesh position={[0, 0.4, 0]} material={mats.wharfStone} castShadow receiveShadow>
          <boxGeometry args={[38, 5.0, 12]} />
        </mesh>

        {/* Timber jetty extension jutting into deep channel */}
        <mesh position={[0, 1.6, 12]} material={mats.timberDeck} castShadow receiveShadow>
          <boxGeometry args={[9, 0.5, 16]} />
        </mesh>

        {/* Timber jetty support pilings (stilts) anchoring into the seabed */}
        {[-3.8, 3.8].map((px) =>
          [6, 11, 16, 19].map((pz) => (
            <mesh key={`piling-${px}-${pz}`} position={[px, -1.0, pz]} material={mats.woodCrane}>
              <cylinderGeometry args={[0.22, 0.28, 5.5, 8]} />
            </mesh>
          ))
        )}

        {/* Stone steps descending into the harbor water */}
        {[0, 1, 2, 3].map((step) => (
          <mesh key={`step-${step}`} position={[-14, 1.2 - step * 0.4, 6.5 + step * 0.9]} material={mats.wharfStone}>
            <boxGeometry args={[4.5, 0.4, 1.0]} />
          </mesh>
        ))}

        {/* Harbor Timber Crane (Cargo Derrick) */}
        <group position={[-3, 1.8, 14]}>
          <mesh position={[0, 3.2, 0]} material={mats.woodCrane}>
            <cylinderGeometry args={[0.22, 0.28, 6.4, 6]} />
          </mesh>
          <mesh position={[2.2, 5.8, 0]} rotation={[0, 0, -Math.PI * 0.28]} material={mats.woodCrane}>
            <boxGeometry args={[6.0, 0.32, 0.32]} />
          </mesh>
        </group>

        {/* Iron Mooring Bollards along quay */}
        {[-16, -9, 0, 9, 16].map((bx) => (
          <mesh key={`bollard-${bx}`} position={[bx, 3.1, 5.6]} material={mats.darkStone}>
            <cylinderGeometry args={[0.18, 0.22, 0.6, 8]} />
          </mesh>
        ))}

        {/* Colonial Harbor Street Lamps */}
        {[-16, 0, 16].map((lx) => (
          <group key={`lamp-${lx}`} position={[lx, 2.9, 4.5]}>
            <mesh position={[0, 1.2, 0]} material={mats.fortStone}>
              <cylinderGeometry args={[0.08, 0.12, 2.4, 6]} />
            </mesh>
            <mesh position={[0, 2.5, 0]} material={mats.lanternGlow}>
              <boxGeometry args={[0.35, 0.45, 0.35]} />
            </mesh>
            {!isMobile && (
              <pointLight color="#fbbf24" intensity={2.8} distance={20} decay={2} position={[0, 2.6, 0]} />
            )}
          </group>
        ))}

        {/* Cargo Barrels & Crates on Quay */}
        {[-6, 4, 8].map((cx, idx) => (
          <mesh key={`crate-cluster-${idx}`} position={[cx, 3.2, 2]} material={mats.timberDeck}>
            <boxGeometry args={[1.2, 1.0, 1.2]} />
          </mesh>
        ))}
      </group>
    </group>
  );
});
