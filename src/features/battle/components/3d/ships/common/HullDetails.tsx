import { memo, useMemo } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

interface CachedHullDetails {
  bands: THREE.BufferGeometry;
  caps: THREE.BufferGeometry;
  posts: THREE.BufferGeometry;
}

const hullDetailsCache = new WeakMap<THREE.BufferGeometry, CachedHullDetails>();
const bandsMaterial = new THREE.MeshStandardMaterial({ color: '#30251d', roughness: 0.82 });
const postsMaterial = new THREE.MeshStandardMaterial({ color: '#54402c', roughness: 0.8 });
const capsMaterialCache = new Map<string, THREE.MeshStandardMaterial>();

function getCapsMaterial(trimColor: string): THREE.MeshStandardMaterial {
  let mat = capsMaterialCache.get(trimColor);
  if (!mat) {
    mat = new THREE.MeshStandardMaterial({ color: trimColor, roughness: 0.5, metalness: 0.25 });
    capsMaterialCache.set(trimColor, mat);
  }
  return mat;
}

function merge(parts: THREE.BufferGeometry[]) {
  const geometry = mergeGeometries(parts)!;
  parts.forEach(part => part.dispose());
  return geometry;
}

function getOrCreateHullDetails(hull: THREE.BufferGeometry): CachedHullDetails {
  const cached = hullDetailsCache.get(hull);
  if (cached) return cached;

  const p = hull.getAttribute('position');
  // The first row is the complete stern cross-section, before the next Z station.
  let stride = 1;
  while (stride < p.count && Math.abs(p.getZ(stride) - p.getZ(0)) < 0.0001) stride++;
  const stations = Math.round((p.count - 2 * (stride + 1)) / stride);
  const bands: THREE.BufferGeometry[] = [], caps: THREE.BufferGeometry[] = [], posts: THREE.BufferGeometry[] = [];
  for (const side of [-1, 1]) {
    for (const level of [0.73, 0.88, 1]) {
      const j = Math.round((side < 0 ? 1 - level : 1 + level) * (stride - 1) / 2);
      const points: THREE.Vector3[] = [];
      for (let row = 0; row < stations; row++) {
        const i = row * stride + j;
        points.push(new THREE.Vector3(p.getX(i) * 1.014, p.getY(i) + (level === 1 ? 0.53 : 0), p.getZ(i)));
      }
      const path = new THREE.CatmullRomCurve3(points);
      (level === 1 ? caps : bands).push(new THREE.TubeGeometry(path, stations * 2, level === 1 ? 0.075 : 0.095, 5, false));
      if (level === 1) for (let row = 1; row < stations - 1; row += 2) {
        const point = points[row];
        posts.push(new THREE.CylinderGeometry(0.045, 0.06, 0.5, 5).translate(point.x, point.y - 0.25, point.z));
      }
    }
  }
  const built = { bands: merge(bands), caps: merge(caps), posts: merge(posts) };
  hullDetailsCache.set(hull, built);
  return built;
}

/** Bands follow the actual hull mesh, so each class keeps its beam and sheer. */
export const HullDetails = memo(function HullDetails({ hull, trimColor, isEnemy = false }: {
  hull: THREE.BufferGeometry; trimColor: string; isEnemy?: boolean;
}) {
  const details = useMemo(() => (isEnemy ? null : getOrCreateHullDetails(hull)), [hull, isEnemy]);
  const capsMaterial = useMemo(() => getCapsMaterial(trimColor), [trimColor]);

  if (!details) return null;

  return <group>
    <mesh geometry={details.bands} material={bandsMaterial} castShadow receiveShadow />
    <mesh geometry={details.caps} material={capsMaterial} castShadow />
    <mesh geometry={details.posts} material={postsMaterial} castShadow />
  </group>;
});
