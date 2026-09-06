import { createGableRoof, ShutterWindow } from './BuildingDetails';
import { constructionMaterial } from '../textures/constructionMaterials';
import React, { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import type { IslandSettlement } from './types';
import { MaritimeCargo } from '../props/MaritimeCargo';
import type { InstanceTransform } from '../shared/StaticInstances';

const dockCargo: InstanceTransform[] = [
  { position: [-3.6, 1.575, 25.4] },
  { position: [-4.5, 1.575, 26.4], rotation: [0, 0.2, 0] },
  { position: [3.3, 1.575, 26.8] },
  { position: [4.4, 1.575, 25.6], rotation: [0, -0.15, 0] },
  { position: [2.5, 0.6, 4] },
  { position: [3.2, 0.6, 4.2], rotation: [0, 0.5, 0] },
  { position: [1.5, 0.6, 4.1] },
];

interface CoastalSettlementProps {
  settlement: IslandSettlement;
  isMobile?: boolean;
}

/**
 * 17th-Century Caribbean Coastal Settlement 3D Architecture:
 * - Sturdy timber piers & docking jetties extending into shallows
 * - Stone watchtower / harbor lighthouse with warm glowing lantern
 * - Pirate taverns, seaside cottages, and cargo warehouses
 * - Coastal cannon redoubts facing the sea
 * - Rum barrels, cargo crates, and dockside mooring bollards
 */
export const CoastalSettlement: React.FC<CoastalSettlementProps> = React.memo(({ settlement, isMobile = false }) => {
  const roofs = useMemo(() => [createGableRoof(9.5, 7.6, 3.2), createGableRoof(5.9, 4.9, 2), createGableRoof(7.9, 5.5, 2.5)], []);
  useEffect(() => () => roofs.forEach(roof => roof.dispose()), [roofs]);
  const isPirate = settlement.type === 'pirate-haven';

  // Shared optimized materials
  const mats = useMemo(() => {
    return {
      woodDark: constructionMaterial('wood', '#3e2723', 4),
      woodDeck: constructionMaterial('wood', '#5d4037', 4),
      woodPost: constructionMaterial('wood', '#271c19', 4),
      stoneWall: constructionMaterial('stone', isPirate ? '#78716c' : '#a8a29e', 4),
      roofTile: constructionMaterial('tile', isPirate ? '#7c2d12' : '#991b1b', 4),
      thatchRoof: constructionMaterial('wood', '#854d0e', 4),
      whitewash: constructionMaterial('plaster', '#e2e8f0', 4),
      cannonBrass: new THREE.MeshStandardMaterial({ color: '#ca8a04', metalness: 0.6, roughness: 0.4 }),
      lanternGlow: new THREE.MeshStandardMaterial({
        color: '#fef08a',
        emissive: '#f59e0b',
        emissiveIntensity: 2.2,
        roughness: 0.2,
      }),
      barrelWood: constructionMaterial('wood', '#451a03', 4),
    };
  }, [isPirate]);
  useEffect(() => () => Object.values(mats).forEach((material) => material.dispose()), [mats]);

  return (
    <group position={[settlement.x, 0, settlement.z]} rotation={[0, settlement.rotationY, 0]}>
      <MaritimeCargo placements={dockCargo} distance={isMobile ? 90 : 150} />
      {/* =========================================================================
          1. TIMBER PIER & JETTY (Extending towards the bay)
          ========================================================================= */}
      <group position={[0, 0, 0]}>
        {/* Main pier walkway planking */}
        <mesh position={[0, 1.4, 14]} material={mats.woodDeck} castShadow receiveShadow>
          <boxGeometry args={[4.2, 0.35, 24]} />
        </mesh>

        {/* Pier T-head cross platform */}
        <mesh position={[0, 1.4, 26]} material={mats.woodDeck} castShadow receiveShadow>
          <boxGeometry args={[11, 0.35, 4.5]} />
        </mesh>

        {/* Pier support pilings (timber stilts driven deep into seabed) */}
        {[-1.8, 1.8].map((xOffset) =>
          [4, 10, 16, 22].map((zOffset) => (
            <mesh key={`pile-${xOffset}-${zOffset}`} position={[xOffset, -1.0, zOffset]} material={mats.woodPost}>
              <cylinderGeometry args={[0.22, 0.26, 5.2, 6]} />
            </mesh>
          ))
        )}
        {[-4.8, 0, 4.8].map((xOffset, idx) => (
          <mesh key={`tpile-${idx}`} position={[xOffset, -1.0, 27.5]} material={mats.woodPost}>
            <cylinderGeometry args={[0.24, 0.28, 5.2, 6]} />
          </mesh>
        ))}

        {/* Mooring bollards on pier */}
        {[-1.9, 1.9].map((bx) => (
          <mesh key={`bollard-${bx}`} position={[bx, 1.8, 25.5]} material={mats.woodDark}>
            <cylinderGeometry args={[0.18, 0.18, 0.7, 8]} />
          </mesh>
        ))}

        {/* Pier lantern post */}
        <group position={[1.8, 1.5, 26.5]}>
          <mesh position={[0, 1.2, 0]} material={mats.woodPost}>
            <cylinderGeometry args={[0.08, 0.1, 2.4, 6]} />
          </mesh>
          <mesh position={[0, 2.5, 0]} material={mats.lanternGlow}>
            <boxGeometry args={[0.3, 0.4, 0.3]} />
          </mesh>
          {!isMobile && (
            <pointLight color="#f59e0b" intensity={2.5} distance={18} decay={2} position={[0, 2.6, 0]} />
          )}
        </group>
      </group>

      {/* =========================================================================
          2. WATCHTOWER & LIGHTHOUSE BEACON (Promontory Landmark)
          ========================================================================= */}
      <group position={[-11, 0, -4]}>
        {/* Stone foundation base */}
        <mesh position={[0, 3.2, 0]} material={mats.stoneWall} castShadow receiveShadow>
          <cylinderGeometry args={[2.8, 3.4, 6.4, 8]} />
        </mesh>

        {/* Upper timber observation platform */}
        <mesh position={[0, 6.6, 0]} material={mats.woodDeck}>
          <cylinderGeometry args={[3.3, 3.1, 0.4, 8]} />
        </mesh>
        <mesh position={[0, 7.1, 0]} material={mats.woodDark}>
          <cylinderGeometry args={[3.2, 3.2, 0.6, 8, 1, true]} />
        </mesh>

        {/* Beacon lantern cupola */}
        <mesh position={[0, 7.8, 0]} material={mats.lanternGlow}>
          <cylinderGeometry args={[0.8, 0.8, 1.0, 8]} />
        </mesh>
        {!isMobile && (
          <pointLight color="#fbbf24" intensity={4} distance={38} decay={2} position={[0, 8.2, 0]} />
        )}

        {/* Conical beacon roof */}
        <mesh position={[0, 9.1, 0]} material={mats.roofTile}>
          <coneGeometry args={[2.2, 1.8, 8]} />
        </mesh>

        {/* Watchtower Flagpole & Pennant */}
        <mesh position={[0, 10.8, 0]} material={mats.woodPost}>
          <cylinderGeometry args={[0.06, 0.08, 2.2, 6]} />
        </mesh>
        <mesh position={[0.55, 11.2, 0]} material={mats.roofTile}>
          <boxGeometry args={[1.0, 0.5, 0.04]} />
        </mesh>
      </group>

      {/* =========================================================================
          3. MAIN TAVERN / GOVERNOR'S RESIDENCE (Centerpiece Building)
          ========================================================================= */}
      <group position={[3, 0, -6]}>
        {/* Ground floor masonry */}
        <mesh position={[0, 2.2, 0]} material={isPirate ? mats.woodDark : mats.whitewash} castShadow receiveShadow>
          <boxGeometry args={[8.5, 4.4, 6.8]} />
        </mesh>

        {/* Second floor timber framing */}
        <mesh position={[0, 5.4, 0]} material={mats.woodDark} castShadow receiveShadow>
          <boxGeometry args={[8.9, 2.2, 7.2]} />
        </mesh>

        {/* Pitched shingled gable roof */}
        <mesh position={[0, 6.5, 0]} geometry={roofs[0]} material={mats.roofTile} castShadow />
        {[-2.7, 0, 2.7].map(x => <ShutterWindow key={x} position={[x, 5.35, 3.65]} />)}
        {[-2.7, 2.7].map(x => <ShutterWindow key={x} position={[x, 2.4, 3.45]} />)}

        {/* Stone chimney */}
        <mesh position={[3.2, 6.8, 1.8]} material={mats.stoneWall}>
          <boxGeometry args={[1.2, 4.8, 1.2]} />
        </mesh>

        {/* Tavern Entrance Canopy */}
        <mesh position={[0, 2.6, 3.8]} material={mats.thatchRoof}>
          <boxGeometry args={[3.2, 0.2, 1.4]} />
        </mesh>
        <mesh position={[0, 1.4, 3.42]} material={mats.woodDark}>
          <boxGeometry args={[1.4, 2.4, 0.1]} />
        </mesh>
      </group>

      {/* =========================================================================
          4. SEASIDE COTTAGES & HARBOR BOATHOUSE
          ========================================================================= */}
      {/* Cottage 1 (Right Shoreline) */}
      <group position={[12, 0, -2]} rotation={[0, -0.2, 0]}>
        <mesh position={[0, 1.8, 0]} material={mats.woodDark} castShadow receiveShadow>
          <boxGeometry args={[5.2, 3.6, 4.5]} />
        </mesh>
        <mesh position={[0, 3.6, 0]} geometry={roofs[1]} material={mats.thatchRoof} castShadow />
        <ShutterWindow position={[0, 2.1, 2.3]} />
      </group>

      {/* Cottage 2 / Boathouse (Behind Tavern) */}
      <group position={[-3, 0, -15]} rotation={[0, 0.15, 0]}>
        <mesh position={[0, 2.0, 0]} material={mats.stoneWall} castShadow receiveShadow>
          <boxGeometry args={[7.2, 4.0, 5.0]} />
        </mesh>
        <mesh position={[0, 4, 0]} geometry={roofs[2]} material={mats.roofTile} castShadow />
        {[-2, 2].map(x => <ShutterWindow key={x} position={[x, 2.3, 2.55]} />)}
      </group>

      {/* =========================================================================
          5. COASTAL CANNON REDOUBT (Shore Defense Battery)
          ========================================================================= */}
      <group position={[-8, 0, 8]} rotation={[0, 0.35, 0]}>
        {/* Low stone embrasure fortification */}
        <mesh position={[0, 1.0, 0]} material={mats.stoneWall}>
          <boxGeometry args={[7.0, 2.0, 1.4]} />
        </mesh>

        {/* 2 Coastal Artillery Cannons facing the sea */}
        {[-2.0, 2.0].map((cx) => (
          <group key={`gun-${cx}`} position={[cx, 1.2, -0.4]}>
            {/* Wooden carriage */}
            <mesh position={[0, 0.2, 0]} material={mats.woodDark}>
              <boxGeometry args={[0.9, 0.45, 1.4]} />
            </mesh>
            {/* Brass barrel */}
            <mesh position={[0, 0.45, 0.5]} rotation={[Math.PI * 0.48, 0, 0]} material={mats.cannonBrass}>
              <cylinderGeometry args={[0.16, 0.22, 2.0, 8]} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
});
