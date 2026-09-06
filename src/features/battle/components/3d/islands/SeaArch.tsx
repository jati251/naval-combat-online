import { memo, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import type { IslandSettlement } from './types';
import { constructionMaterial } from '../textures/constructionMaterials';

function weather(geometry: THREE.BufferGeometry) {
  const p = geometry.getAttribute('position');
  const colors: number[] = [];
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const fractures = Math.sin(x * 0.71 + z * 0.53) * Math.cos(y * 0.8 - z * 0.4);
    const layers = Math.sin(y * 1.6 + x * 0.07) * 0.18;
    p.setXYZ(i, x + fractures * 0.55, y + fractures * 0.45, z + fractures * 0.8 + layers);
    const tint = new THREE.Color().lerpColors(new THREE.Color('#68735a'), new THREE.Color('#e0d0af'), THREE.MathUtils.smoothstep(y, 0, 5));
    tint.multiplyScalar(0.92 + fractures * 0.08);
    colors.push(tint.r, tint.g, tint.b);
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}

export const SeaArch = memo(function SeaArch({ settlement, isMobile = false }: { settlement: IslandSettlement; isMobile?: boolean }) {
  const geometry = useMemo(() => {
    const points = Array.from({ length: 19 }, (_, i) => {
      const t = i / 18, a = t * Math.PI;
      return new THREE.Vector3(Math.cos(a) * 19, Math.sin(a) * (22 + t * 3) + 0.3, Math.sin(a * 2) * 1.8);
    });
    const arch = weather(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 64, 4.3, 16, false));
    const west = weather(new THREE.IcosahedronGeometry(1, 3).scale(7.8, 12, 7).translate(-18, 7, 0));
    const east = weather(new THREE.IcosahedronGeometry(1, 3).scale(6.5, 10, 8).translate(19, 5.5, -0.6));
    const boulder = weather(new THREE.IcosahedronGeometry(1, 2).scale(2.7, 2.1, 3.2));
    return { arch, west, east, boulder };
  }, []);
  const material = useMemo(() => {
    const rock = constructionMaterial('rock', '#d1bd98', 6);
    rock.vertexColors = true;
    rock.bumpScale = 0.16;
    return rock;
  }, []);
  useEffect(() => () => { Object.values(geometry).forEach(g => g.dispose()); material.dispose(); }, [geometry, material]);
  return <group position={[settlement.x, 0, settlement.z]} rotation={[0, settlement.rotationY, 0]}>
    {[geometry.arch, geometry.west, geometry.east].map((g, i) => <mesh key={i} geometry={g} material={material} castShadow receiveShadow />)}
    {[-1, 1].flatMap(side => Array.from({ length: isMobile ? 2 : 4 }, (_, i) =>
      <mesh key={`${side}-${i}`} geometry={geometry.boulder} material={material}
        position={[side * (17 + i * 2.7), 0.3, Math.sin(i * 2.4) * 8]}
        rotation={[0.1, i * 1.7, 0.15]} castShadow={!isMobile} receiveShadow />
    ))}
  </group>;
});
