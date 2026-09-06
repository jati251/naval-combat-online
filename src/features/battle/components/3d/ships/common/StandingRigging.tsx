import { memo, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { StaticInstances, type InstanceTransform } from '../../shared/StaticInstances';

interface StandingRiggingProps {
  mastPosition: [number, number, number];
  mastHeight: number;
  hullWidth: number;
  shroudSpread?: number;
  includeRatlines?: boolean;
  isEnemy?: boolean;
  color?: string;
}

const ropeGeometry = new THREE.CylinderGeometry(1, 1, 1, 5);
const deadeyeGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.08, 8).rotateZ(Math.PI / 2);
const deadeyeMaterial = new THREE.MeshStandardMaterial({ color: '#493321', roughness: 0.83 });

export const StandingRigging = memo(function StandingRigging({
  mastPosition: [x, y, z], mastHeight, hullWidth, shroudSpread = 1.6,
  includeRatlines = true, isEnemy = false, color = '#27201c',
}: StandingRiggingProps) {
  const material = useMemo(() => new THREE.MeshStandardMaterial({ color, roughness: 0.95 }), [color]);
  useEffect(() => () => material.dispose(), [material]);
  const { ropes, deadeyes } = useMemo(() => {
    const ropes: InstanceTransform[] = [];
    const deadeyes: InstanceTransform[] = [];
    const top = new THREE.Vector3(x, y + mastHeight * 0.65, z);
    const up = new THREE.Vector3(0, 1, 0);
    for (const side of [-1, 1]) {
      const baseX = side * hullWidth * 0.52;
      for (const offset of [-0.5, 0, 0.5]) {
        const base = new THREE.Vector3(baseX, y + 0.2, z + offset * shroudSpread);
        const direction = top.clone().sub(base);
        const length = direction.length();
        const euler = new THREE.Euler().setFromQuaternion(new THREE.Quaternion()
          .setFromUnitVectors(up, direction.normalize()));
        const midpoint = base.clone().add(top).multiplyScalar(0.5);
        ropes.push({ position: [midpoint.x, midpoint.y, midpoint.z],
          rotation: [euler.x, euler.y, euler.z], scale: [0.02, length, 0.02] });
        deadeyes.push({ position: [base.x, base.y, base.z] });
      }
      if (includeRatlines && !isEnemy) {
        for (let rung = 1; rung <= 10; rung++) {
          const t = rung / 12;
          ropes.push({ position: [THREE.MathUtils.lerp(baseX, x, t),
            THREE.MathUtils.lerp(y + 0.2, top.y, t), z],
          rotation: [Math.PI / 2, 0, 0], scale: [0.012, shroudSpread * (1 - t), 0.012] });
        }
      }
    }
    return { ropes, deadeyes };
  }, [x, y, z, mastHeight, hullWidth, shroudSpread, includeRatlines, isEnemy]);

  return <group>
    <StaticInstances geometry={ropeGeometry} material={material} instances={ropes} />
    {!isEnemy && <StaticInstances geometry={deadeyeGeometry} material={deadeyeMaterial} instances={deadeyes} />}
  </group>;
});
