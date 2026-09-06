import { memo, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

function merge(parts: THREE.BufferGeometry[]) {
  const geometry = mergeGeometries(parts)!;
  parts.forEach(part => part.dispose());
  return geometry;
}

/** Bands follow the actual hull mesh, so each class keeps its beam and sheer. */
export const HullDetails = memo(function HullDetails({ hull, trimColor, isEnemy = false }: {
  hull: THREE.BufferGeometry; trimColor: string; isEnemy?: boolean;
}) {
  if (isEnemy) return null;

  const details = useMemo(() => {
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
    return { bands: merge(bands), caps: merge(caps), posts: merge(posts) };
  }, [hull]);
  useEffect(() => () => Object.values(details).forEach(geo => geo.dispose()), [details]);
  return <group>
    <mesh geometry={details.bands} castShadow receiveShadow><meshStandardMaterial color="#30251d" roughness={0.82} /></mesh>
    <mesh geometry={details.caps} castShadow><meshStandardMaterial color={trimColor} roughness={0.5} metalness={0.25} /></mesh>
    <mesh geometry={details.posts} castShadow><meshStandardMaterial color="#54402c" roughness={0.8} /></mesh>
  </group>;
});
