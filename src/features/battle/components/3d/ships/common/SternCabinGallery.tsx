import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { ShipHelm } from './ShipHelm';
import { useGameStore } from '@/stores/useGameStore';

interface SternCabinGalleryProps {
  position: [number, number, number];
  width: number;
  depth: number;
  height: number;
  tierCount?: 1 | 2 | 3;
  windowCount?: number;
  trimColor?: string;
  hullTexture: THREE.CanvasTexture;
  rudderAngle?: number;
  shipId?: string;
  isSelf?: boolean;
  isEnemy?: boolean;
  includeHelm?: boolean;
  helmZOffset?: number;
  helmYOffset?: number;
  lanternCount?: 2 | 3;
  hasBalcony?: boolean;
}

interface CabinArchitecture {
  body: THREE.BufferGeometry;
  roof: THREE.BufferGeometry;
  windows: THREE.BufferGeometry;
  framing: THREE.BufferGeometry;
}

const architectureCache = new Map<string, CabinArchitecture>();

function getOrCreateCabinArchitecture(width: number, height: number, depth: number): CabinArchitecture {
  const key = `${width.toFixed(3)}_${height.toFixed(3)}_${depth.toFixed(3)}`;
  const cached = architectureCache.get(key);
  if (cached) return cached;

  const panes: THREE.BufferGeometry[] = [], frames: THREE.BufferGeometry[] = [];
  const paneWidth = Math.min(0.65, depth * 0.2), paneHeight = height * 0.5;
  for (const side of [-1, 1]) for (const z of [-depth * 0.25, depth * 0.25]) {
    const x = side * (width * 0.5 + 0.025);
    panes.push(new THREE.BoxGeometry(0.035, paneHeight, paneWidth).translate(x, 0, z));
    for (const dz of [-paneWidth * 0.5, 0, paneWidth * 0.5]) frames.push(new THREE.BoxGeometry(0.09, paneHeight + 0.1, 0.045).translate(x, 0, z + dz));
    for (const y of [-paneHeight * 0.5, paneHeight * 0.5]) frames.push(new THREE.BoxGeometry(0.09, 0.06, paneWidth + 0.1).translate(x, y, z));
  }
  const windows = mergeGeometries(panes)!, framing = mergeGeometries(frames)!;
  [...panes, ...frames].forEach(g => g.dispose());
  const arch: CabinArchitecture = {
    body: new RoundedBoxGeometry(width, height, depth, 2, Math.min(0.14, height * 0.08)),
    roof: new RoundedBoxGeometry(width + 0.18, 0.14, depth + 0.18, 2, 0.045).translate(0, height * 0.5 + 0.04, 0),
    windows,
    framing,
  };
  architectureCache.set(key, arch);
  return arch;
}

const unitBoxGeo = new THREE.BoxGeometry(1, 1, 1);
const unitPlaneGeo = new THREE.PlaneGeometry(1, 1);
const lanternBodyGeo = new THREE.CylinderGeometry(0.12, 0.18, 0.46, 6);
const lanternBracketGeo = new THREE.CylinderGeometry(0.03, 0.04, 0.28, 4);

const sideWindowGlassMat = new THREE.MeshStandardMaterial({ color: '#527271', roughness: 0.28, metalness: 0.25 });
const counterStrakeMat = new THREE.MeshStandardMaterial({ color: '#2d170b', roughness: 0.75 });
const balconyDeckMat = new THREE.MeshStandardMaterial({ color: '#2b1a11', roughness: 0.8 });
const mullionMat = new THREE.MeshStandardMaterial({ color: '#1a0e06', roughness: 0.9 });
const lanternBracketMat = new THREE.MeshStandardMaterial({ color: '#2d1c12', roughness: 0.9 });

const sternGlassDayMat = new THREE.MeshStandardMaterial({
  color: '#2b3846',
  emissive: '#000000',
  emissiveIntensity: 0,
  roughness: 0.2,
  metalness: 0.1,
  side: THREE.DoubleSide,
});
const sternGlassNightMat = new THREE.MeshStandardMaterial({
  color: '#fef08a',
  emissive: '#f59e0b',
  emissiveIntensity: 1.4,
  roughness: 0.2,
  metalness: 0.1,
  side: THREE.DoubleSide,
});

const lanternDayMat = new THREE.MeshStandardMaterial({
  color: '#4a3820',
  emissive: '#000000',
  emissiveIntensity: 0,
  metalness: 0.85,
  roughness: 0.3,
});
const lanternNightMat = new THREE.MeshStandardMaterial({
  color: '#ffb703',
  emissive: '#f59e0b',
  emissiveIntensity: 1.8,
  metalness: 0.7,
  roughness: 0.3,
});

const trimMatCache = new Map<string, { framing: THREE.MeshStandardMaterial; molding: THREE.MeshStandardMaterial }>();
function getTrimMaterials(trimColor: string) {
  let cached = trimMatCache.get(trimColor);
  if (!cached) {
    cached = {
      framing: new THREE.MeshStandardMaterial({ color: trimColor, roughness: 0.5, metalness: 0.3 }),
      molding: new THREE.MeshStandardMaterial({ color: trimColor, metalness: 0.72, roughness: 0.3 }),
    };
    trimMatCache.set(trimColor, cached);
  }
  return cached;
}

export const SternCabinGallery: React.FC<SternCabinGalleryProps> = React.memo(({
  position,
  width,
  depth,
  height,
  tierCount = 1,
  windowCount = 3,
  trimColor = '#f59e0b',
  hullTexture,
  rudderAngle = 0,
  shipId,
  isSelf = false,
  isEnemy = false,
  includeHelm = true,
  helmZOffset = 0.08,
  helmYOffset = 0.25,
  lanternCount = 3,
  hasBalcony = false,
}) => {
  const isNight = useGameStore((s) => s.timeOfDay === 'NIGHT');
  const windowPositions = useMemo(() => {
    const list: number[] = [];
    if (windowCount === 1) return [0];
    const span = width * 0.58;
    const step = span / (windowCount - 1);
    for (let i = 0; i < windowCount; i++) {
      list.push(-span * 0.5 + i * step);
    }
    return list;
  }, [width, windowCount]);

  const architecture = useMemo(() => getOrCreateCabinArchitecture(width, height, depth), [width, height, depth]);
  const trimMats = useMemo(() => getTrimMaterials(trimColor), [trimColor]);

  const windowWidth = (width * 0.45) / Math.max(1, windowCount);
  const sternGlassMat = isNight ? sternGlassNightMat : sternGlassDayMat;
  const lanternMat = isNight ? lanternNightMat : lanternDayMat;

  return (
    <group position={position}>
      {/* Main Cabin Bulkhead */}
      <mesh geometry={architecture.body} castShadow={!isEnemy} receiveShadow>
        <meshStandardMaterial map={hullTexture} roughness={0.68} />
      </mesh>

      <mesh geometry={architecture.roof} castShadow={!isEnemy} receiveShadow>
        <meshStandardMaterial map={hullTexture} roughness={0.8} />
      </mesh>
      <mesh geometry={architecture.windows} material={sideWindowGlassMat} />
      <mesh geometry={architecture.framing} material={trimMats.framing} />

      {/* Gilded Transom Arch Molding along Top */}
      <mesh
        position={[0, height * 0.5 + 0.06, -depth * 0.505]}
        scale={[width * 1.02, 0.12, 0.08]}
        geometry={unitBoxGeo}
        material={trimMats.molding}
        castShadow={!isEnemy}
      />

      {/* Lower Transom Counter Strake */}
      <mesh
        position={[0, -height * 0.5 + 0.07, -depth * 0.505]}
        scale={[width, 0.14, 0.08]}
        geometry={unitBoxGeo}
        material={counterStrakeMat}
        castShadow={!isEnemy}
      />

      {/* Stern Balcony / Walkway if enabled */}
      {hasBalcony && (
        <group position={[0, -height * 0.35, -depth * 0.5 - 0.45]}>
          <mesh
            scale={[width * 0.96, 0.16, 0.9]}
            geometry={unitBoxGeo}
            material={balconyDeckMat}
            castShadow={!isEnemy}
            receiveShadow
          />
          {/* Balustrade railing */}
          <mesh
            position={[0, 0.4, -0.42]}
            scale={[width * 0.96, 0.65, 0.06]}
            geometry={unitBoxGeo}
            material={trimMats.molding}
            castShadow={!isEnemy}
          />
        </group>
      )}

      {/* Leaded Stern Windows across tiers */}
      {Array.from({ length: tierCount }).map((_, tierIdx) => {
        const tierY = tierCount === 1
          ? 0.1
          : tierCount === 2
            ? -height * 0.2 + tierIdx * (height * 0.45)
            : -height * 0.28 + tierIdx * (height * 0.32);
        const tierHeight = (height * 0.5) / tierCount;

        return (
          <React.Fragment key={`tier-${tierIdx}`}>
            {/* Mid-tier separator trim */}
            {tierIdx > 0 && (
              <mesh
                position={[0, tierY - tierHeight * 0.55, -depth * 0.505]}
                scale={[width * 0.98, 0.08, 0.06]}
                geometry={unitBoxGeo}
                material={trimMats.molding}
              />
            )}

            {windowPositions.map((wx, wIdx) => (
              <group key={`win-${tierIdx}-${wIdx}`} position={[wx, tierY, -depth * 0.508]}>
                {/* Leaded Window Glass Pane (illuminated warm cabin glow at night, antique leaded glass in day) */}
                <mesh
                  rotation={[0, Math.PI, 0]}
                  scale={[windowWidth, tierHeight, 1]}
                  geometry={unitPlaneGeo}
                  material={sternGlassMat}
                />
                {/* Mullion frame border (Player only for LOD) */}
                {!isEnemy && (
                  <mesh
                    position={[0, 0, -0.01]}
                    scale={[windowWidth * 1.12, tierHeight * 1.08, 0.025]}
                    geometry={unitBoxGeo}
                    material={mullionMat}
                  />
                )}
              </group>
            ))}
          </React.Fragment>
        );
      })}

      {/* Heavy Ornamental Stern Lanterns (Antique brass by day, warm amber fire at night) */}
      {(lanternCount === 3 ? [-width * 0.36, 0, width * 0.36] : [-width * 0.34, width * 0.34]).map((lx, lIdx) => (
        <group key={`lan-${lIdx}`} position={[lx, height * 0.5 + 0.15, -depth * 0.52]}>
          <mesh geometry={lanternBodyGeo} material={lanternMat} castShadow={!isEnemy} />
          <mesh position={[0, -0.24, 0.05]} rotation={[0.4, 0, 0]} geometry={lanternBracketGeo} material={lanternBracketMat} />
        </group>
      ))}

      {/* Steering Helm (Player/Self only) */}
      {includeHelm && !isEnemy && (
        <ShipHelm
          position={[0, height * 0.5 + helmYOffset, helmZOffset]}
          rudderAngle={rudderAngle}
          shipId={shipId}
          isSelf={isSelf}
        />
      )}
    </group>
  );
});
