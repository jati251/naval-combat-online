import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { IslandDefinition } from './types';
import { createIslandTerrainGeometry, createBeachGeometry, getIslandElevation } from './islandGeometries';
import { PalmTree, JungleTree, TropicalBush } from './IslandVegetation';
import { RockFormation } from './RockFormation';

export interface IslandMaterials {
  sand: THREE.Material;
  rock: THREE.Material;
  vegetation: THREE.Material;
  shallows: THREE.Material;
  darkRock: THREE.Material;
  lushVeg: THREE.Material;
}

interface IslandEntityProps {
  island: IslandDefinition;
  materials: IslandMaterials;
  isMobile?: boolean;
}

/**
 * High-Detail Island Entity with procedural terrain, unique silhouette per type,
 * organic vegetation scatter, coastal rock formations, and smooth atmospheric fog integration.
 */
export const IslandEntity: React.FC<IslandEntityProps> = React.memo(({ island, materials, isMobile = false }) => {
  const beachRef = useRef<THREE.Group>(null);
  const secondaryRef = useRef<THREE.Group>(null);
  const treesRef = useRef<THREE.Group>(null);
  const detailRef = useRef<THREE.Group>(null);

  // Procedural terrain geometry (unique per island)
  const terrainGeo = useMemo(() => createIslandTerrainGeometry(island), [island]);
  const beachGeo = useMemo(() => createBeachGeometry(island), [island]);

  // AAA Staged Level-of-Detail (LOD) Emergence:
  // 1. Mountain terrain is ALWAYS visible as a distant horizon landmark through soft sea haze (ZERO pop-in).
  // 2. Beach & shoreline emerge at 350m (desktop) / 200m (mobile).
  // 3. Tree canopy smoothly emerges from 230m down to 140m via scale interpolation.
  // 4. Coastal boulders & bushes smoothly emerge from 130m down to 75m via scale interpolation.
  useFrame(({ camera }) => {
    const dx = camera.position.x - island.x;
    const dz = camera.position.z - island.z;
    const distSq = dx * dx + dz * dz;
    const dist = Math.sqrt(distSq);

    const islandRadius = island.radius;

    // 1. Beach & Shoreline Staging
    const beachFar = (isMobile ? 200 : 350) + islandRadius * 0.5;
    const beachNear = (isMobile ? 130 : 220) + islandRadius * 0.5;
    const beachT = THREE.MathUtils.clamp((beachFar - dist) / (beachFar - beachNear), 0, 1);
    if (beachRef.current) {
      const showBeach = beachT > 0.005;
      if (beachRef.current.visible !== showBeach) beachRef.current.visible = showBeach;
      if (showBeach) beachRef.current.scale.set(1, beachT, 1);
    }

    // 2. Secondary Peaks & Sea-Stack Cones Staging
    const secFar = (isMobile ? 180 : 280) + islandRadius * 0.4;
    const secNear = (isMobile ? 110 : 170) + islandRadius * 0.4;
    const secT = THREE.MathUtils.clamp((secFar - dist) / (secFar - secNear), 0, 1);
    if (secondaryRef.current) {
      const showSec = secT > 0.005;
      if (secondaryRef.current.visible !== showSec) secondaryRef.current.visible = showSec;
      if (showSec) secondaryRef.current.scale.set(secT, secT, secT);
    }

    // 3. Tree Canopy Foliage Staging (Smoothly scales up from canopy - ZERO pop-in)
    const treeFar = (isMobile ? 140 : 230) + islandRadius * 0.4;
    const treeNear = (isMobile ? 80 : 140) + islandRadius * 0.4;
    const treeT = THREE.MathUtils.clamp((treeFar - dist) / (treeFar - treeNear), 0, 1);
    if (treesRef.current) {
      const showTrees = treeT > 0.005;
      if (treesRef.current.visible !== showTrees) treesRef.current.visible = showTrees;
      if (showTrees) treesRef.current.scale.set(treeT, treeT, treeT);
    }

    // 4. Coastal Boulders, Rocks & Undergrowth Bushes Staging (Smoothly scales up - ZERO pop-in)
    const detailFar = (isMobile ? 75 : 130) + islandRadius * 0.3;
    const detailNear = (isMobile ? 40 : 75) + islandRadius * 0.3;
    const detailT = THREE.MathUtils.clamp((detailFar - dist) / (detailFar - detailNear), 0, 1);
    if (detailRef.current) {
      const showDetail = detailT > 0.005;
      if (detailRef.current.visible !== showDetail) detailRef.current.visible = showDetail;
      if (showDetail) detailRef.current.scale.set(detailT, detailT, detailT);
    }
  });

  const scaleX = island.elongation?.scaleX ?? 1;
  const scaleZ = island.elongation?.scaleZ ?? 1;
  const rotY = island.elongation?.angle ?? 0;

  return (
    <group position={[island.x, 0, island.z]} rotation={[0, rotY, 0]}>
      {/* Scaled Island Mass (Terrain, Beach, Shallows) */}
      <group scale={[scaleX, 1, scaleZ]}>
        {/* Tier 1: Core Geological Mountain Mass (Always rendered as horizon landmark) */}
        <mesh position={[0, 2.0, 0]} receiveShadow material={materials.vegetation}>
          <cylinderGeometry args={[island.radius * 0.96, island.radius * 1.06, 2.2, 48]} />
        </mesh>
        <mesh
          position={[0, getIslandElevation(island) + 2.0, 0]}
          castShadow
          receiveShadow
          material={materials.rock}
          geometry={terrainGeo}
        />

        {/* Tier 2: Organic Sandy Beach Shoreline (Staged LOD) */}
        <group ref={beachRef}>
          <mesh position={[0, 0.6, 0]} receiveShadow material={materials.sand} geometry={beachGeo} />
        </group>
      </group>

      {/* Tier 3: Secondary Rock Outcrops & Corals (Staged LOD) */}
      <group ref={secondaryRef}>
        {island.type === 'volcanic' && (
          <>
            <mesh
              position={[island.radius * 0.3, island.height * 0.3 + 1.5, -island.radius * 0.2]}
              castShadow
              receiveShadow
              material={materials.darkRock}
            >
              <dodecahedronGeometry args={[island.radius * 0.22, 3]} />
            </mesh>
            <mesh
              position={[-island.radius * 0.35, island.height * 0.25, island.radius * 0.3]}
              castShadow
              receiveShadow
              material={materials.darkRock}
            >
              <dodecahedronGeometry args={[island.radius * 0.18, 3]} />
            </mesh>
          </>
        )}

      {island.type === 'sea-stack' && (
        <>
          <mesh
            position={[island.radius * 0.4, island.height * 0.5, -island.radius * 0.3]}
            castShadow
            receiveShadow
            material={materials.darkRock}
          >
            <coneGeometry args={[island.radius * 0.2, island.height * 0.6, 32]} />
          </mesh>
          <mesh
            position={[-island.radius * 0.5, 2.0, island.radius * 0.4]}
            castShadow
            receiveShadow
            material={materials.rock}
          >
            <dodecahedronGeometry args={[island.radius * 0.15, 3]} />
          </mesh>
        </>
      )}

      {island.type === 'atoll' && (
        <>
          <mesh position={[0, 1.2, 0]} material={materials.shallows}>
            <cylinderGeometry args={[island.radius * 0.4, island.radius * 0.45, 0.5, 48]} />
          </mesh>
          {[0, 1, 2, 3, 4].map((i) => {
            const a = (i / 5) * Math.PI * 2 + island.seed * 0.3;
            const d = island.radius * 0.55 + Math.sin(a + island.seed) * island.radius * 0.1;
            return (
              <mesh
                key={`coral-${i}`}
                position={[Math.cos(a) * d, 1.8, Math.sin(a) * d]}
                castShadow
                material={materials.lushVeg}
              >
                <dodecahedronGeometry args={[1.2 + Math.sin(i * 2.3) * 0.4, 2]} />
              </mesh>
            );
          })}
        </>
      )}

      {island.type === 'lush-flat' && (
        <mesh position={[0, 2.6, 0]} material={materials.lushVeg}>
          <cylinderGeometry args={[island.radius * 0.8, island.radius * 0.9, 1.0, 48]} />
        </mesh>
      )}
      </group>

      {/* Coastal Rock Formations (High-Detail LOD) */}
      <group ref={detailRef}>
        {island.rocks.map(([rx, rz, rScale, rRot], rIdx) => (
          <RockFormation
            key={`rock-${rIdx}`}
            position={[rx, 1.8, rz]}
            scale={rScale}
            rotation={rRot}
          />
        ))}

        {/* Tropical Undergrowth Bushes */}
        {island.bushes.map(([bx, bz, bScale], bIdx) => (
          <TropicalBush
            key={`bush-${bIdx}`}
            position={[bx, 2.8, bz]}
            scale={bScale}
            seed={bIdx + island.seed}
          />
        ))}
      </group>

      {/* Scattered Coconut Palms & Jungle Canopy Trees */}
      <group ref={treesRef}>
        {island.palms.map(([px, pz, pScale], pIdx) => (
          <PalmTree
            key={`palm-${pIdx}`}
            position={[px, 2.6, pz]}
            scale={pScale}
            seed={pIdx + island.seed}
          />
        ))}

        {island.jungleTrees?.map(([jx, jz, jScale], jIdx) => (
          <JungleTree
            key={`jtree-${jIdx}`}
            position={[jx, 2.8, jz]}
            scale={jScale}
            seed={jIdx + island.seed * 3}
          />
        ))}
      </group>
    </group>
  );
});
