import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { IslandDefinition } from './types';
import { createIslandTerrainGeometry, createBeachGeometry, getIslandElevation } from './islandGeometries';
import { PalmTree, JungleTree, TropicalBush } from './IslandVegetation';
import { RockFormation } from './RockFormation';
import { ISLAND_LOD_DISTANCE } from '../Environment3D';

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
}

/**
 * High-Detail Island Entity with procedural terrain, unique silhouette per type,
 * organic vegetation scatter, coastal rock formations, and smooth atmospheric fog integration.
 */
export const IslandEntity: React.FC<IslandEntityProps> = React.memo(({ island, materials }) => {
  const groupRef = useRef<THREE.Group>(null);
  const detailRef = useRef<THREE.Group>(null);
  const frameCount = useRef(Math.floor(Math.random() * 6));

  // Procedural terrain geometry (unique per island)
  const terrainGeo = useMemo(() => createIslandTerrainGeometry(island), [island]);
  const beachGeo = useMemo(() => createBeachGeometry(island), [island]);

  // Shallow lagoon ring (organic irregular shape)
  const shallowGeo = useMemo(() => {
    const segments = 64;
    const geo = new THREE.CylinderGeometry(
      island.sandRadius * 1.12,
      island.sandRadius * 1.3,
      0.8,
      segments,
      4,
      false
    );
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const angle = Math.atan2(z, x);
      const wobble = Math.sin(angle * 6 + island.seed) * island.sandRadius * 0.06 +
                     Math.sin(angle * 13 + island.seed * 2) * island.sandRadius * 0.03;
      pos.setXYZ(i, x + Math.cos(angle) * wobble, pos.getY(i), z + Math.sin(angle) * wobble);
    }
    geo.computeVertexNormals();
    return geo;
  }, [island]);

  // Islands emerge smoothly out of atmospheric fog (zero pop-in)
  useFrame(({ camera }) => {
    frameCount.current++;
    if (frameCount.current % 6 !== 0) return;

    const dx = camera.position.x - island.x;
    const dz = camera.position.z - island.z;
    const distSq = dx * dx + dz * dz;

    // Only cull fine pebble rock scatters deep in horizon fog (> 550m)
    const showDetail = distSq <= ISLAND_LOD_DISTANCE * ISLAND_LOD_DISTANCE;
    if (detailRef.current && detailRef.current.visible !== showDetail) {
      detailRef.current.visible = showDetail;
    }
  });

  const scaleX = island.elongation?.scaleX ?? 1;
  const scaleZ = island.elongation?.scaleZ ?? 1;
  const rotY = island.elongation?.angle ?? 0;

  return (
    <group ref={groupRef} position={[island.x, 0, island.z]} rotation={[0, rotY, 0]}>
      {/* Scaled Island Mass (Terrain, Beach, Shallows) */}
      <group scale={[scaleX, 1, scaleZ]}>
        {/* Shallow Turquoise Lagoon / Coral Reef Rim */}
        <mesh position={[0, -0.25, 0]} receiveShadow material={materials.shallows} geometry={shallowGeo} />

        {/* Organic Sandy Beach Shoreline */}
        <mesh position={[0, 0.6, 0]} receiveShadow material={materials.sand} geometry={beachGeo} />

        {/* Lush Tropical Vegetation Shelf */}
        <mesh position={[0, 2.0, 0]} receiveShadow material={materials.vegetation}>
          <cylinderGeometry args={[island.radius * 0.96, island.radius * 1.06, 2.2, 48]} />
        </mesh>

        {/* Main Terrain Mass */}
        <mesh
          position={[0, getIslandElevation(island) + 2.0, 0]}
          castShadow
          receiveShadow
          material={materials.rock}
          geometry={terrainGeo}
        />
      </group>

      {/* Secondary Rock Outcrops */}
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
      <group>
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
