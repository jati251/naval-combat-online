import { memo, useMemo } from 'react';
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
const riggingMaterialCache = new Map<string, THREE.MeshStandardMaterial>();

function getRiggingMaterial(color: string): THREE.MeshStandardMaterial {
  let mat = riggingMaterialCache.get(color);
  if (!mat) {
    mat = new THREE.MeshStandardMaterial({ color, roughness: 0.95 });
    riggingMaterialCache.set(color, mat);
  }
  return mat;
}

const _up = new THREE.Vector3(0, 1, 0);
const _top = new THREE.Vector3();
const _base = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _mid = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _euler = new THREE.Euler();

export const StandingRigging = memo(function StandingRigging({
  mastPosition: [x, y, z], mastHeight, hullWidth, shroudSpread = 1.6,
  includeRatlines = true, isEnemy = false, color = '#27201c',
}: StandingRiggingProps) {
  const material = useMemo(() => getRiggingMaterial(color), [color]);
  const { ropes, deadeyes } = useMemo(() => {
    const ropes: InstanceTransform[] = [];
    const deadeyes: InstanceTransform[] = [];
    _top.set(x, y + mastHeight * 0.65, z);
    for (const side of [-1, 1]) {
      const baseX = side * hullWidth * 0.52;
      for (const offset of [-0.5, 0, 0.5]) {
        _base.set(baseX, y + 0.2, z + offset * shroudSpread);
        _dir.subVectors(_top, _base);
        const length = _dir.length();
        _quat.setFromUnitVectors(_up, _dir.normalize());
        _euler.setFromQuaternion(_quat);
        _mid.addVectors(_base, _top).multiplyScalar(0.5);
        ropes.push({ position: [_mid.x, _mid.y, _mid.z],
          rotation: [_euler.x, _euler.y, _euler.z], scale: [0.02, length, 0.02] });
        deadeyes.push({ position: [_base.x, _base.y, _base.z] });
      }
      if (includeRatlines && !isEnemy) {
        for (let rung = 1; rung <= 10; rung++) {
          const t = rung / 12;
          ropes.push({ position: [THREE.MathUtils.lerp(baseX, x, t),
            THREE.MathUtils.lerp(y + 0.2, _top.y, t), z],
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
