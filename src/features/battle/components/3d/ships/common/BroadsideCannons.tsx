import { memo, useMemo } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { StaticInstances, type InstanceTransform } from '../../shared/StaticInstances';

interface BroadsideCannonsProps {
  positions: number[];
  width: number;
  y?: number;
  scale?: number;
  color?: string;
  isDoubleDecker?: boolean;
  isEnemy?: boolean;
}

function buildBarrel() {
  // The muzzle folds inward to a recessed bore rather than a solid cap.
  const profile = [
    [0, -0.76], [0.06, -0.75], [0.08, -0.68], [0.17, -0.65],
    [0.19, -0.59], [0.17, -0.52], [0.15, -0.15], [0.165, -0.1],
    [0.165, -0.04], [0.14, 0], [0.105, 0.52], [0.14, 0.57],
    [0.14, 0.67], [0.075, 0.67], [0.075, 0.38], [0, 0.38],
  ];
  const geometry = new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), 12);
  geometry.rotateZ(-Math.PI / 2);
  return geometry;
}

const barrel = buildBarrel();
const carriage = new THREE.BoxGeometry(0.42, 0.28, 0.38).translate(0, -0.16, 0);
const wheelParts = [-0.19, 0.19].flatMap((x) => [-0.16, 0.16].map((z) =>
  new THREE.CylinderGeometry(0.09, 0.09, 0.06, 8).rotateX(Math.PI / 2).translate(x, -0.22, z)));
const wheels = mergeGeometries(wheelParts)!;
wheelParts.forEach((geometry) => geometry.dispose());
const iron = new THREE.MeshStandardMaterial({ color: '#242728', metalness: 0.72, roughness: 0.43 });
const darkIron = new THREE.MeshStandardMaterial({ color: '#111416', metalness: 0.72, roughness: 0.43 });
const timber = new THREE.MeshStandardMaterial({ color: '#693b27', roughness: 0.84 });
const endgrain = new THREE.MeshStandardMaterial({ color: '#372519', roughness: 0.9 });

export const BroadsideCannons = memo(function BroadsideCannons({
  positions, width, y = 2.65, scale = 1, color = '#18181b',
  isDoubleDecker = false, isEnemy = false,
}: BroadsideCannonsProps) {
  const { upper, lower, all } = useMemo(() => {
    const upper: InstanceTransform[] = [];
    const lower: InstanceTransform[] = [];
    for (const z of positions) {
      for (const side of [-1, 1]) {
        upper.push({ position: [side * (width * 0.5 + 0.22) * scale, y, z],
          rotation: [0, side === -1 ? Math.PI : 0, 0], scale: [scale, scale, scale] });
        if (isDoubleDecker) lower.push({
          position: [side * (width * 0.5 + 0.25) * scale, y - scale, z],
          rotation: [0, side === -1 ? Math.PI : 0, 0],
          scale: [scale * 1.1, scale * 1.1, scale * 1.1],
        });
      }
    }
    return { upper, lower, all: [...upper, ...lower] };
  }, [positions, width, y, scale, isDoubleDecker]);

  return <group>
    <StaticInstances geometry={barrel} material={color === '#09090b' ? darkIron : iron}
      instances={upper} castShadow={!isEnemy} />
    {lower.length > 0 && <StaticInstances geometry={barrel} material={darkIron} instances={lower} castShadow={!isEnemy} />}
    {!isEnemy && <>
      <StaticInstances geometry={carriage} material={timber} instances={all} />
      <StaticInstances geometry={wheels} material={endgrain} instances={all} />
    </>}
  </group>;
});
