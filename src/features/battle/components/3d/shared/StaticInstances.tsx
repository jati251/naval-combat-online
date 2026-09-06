import { memo, useLayoutEffect, useRef } from 'react';
import { InstancedMesh, Object3D, type BufferGeometry, type Material } from 'three';

export interface InstanceTransform {
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
}

interface Props {
  geometry: BufferGeometry;
  material: Material;
  instances: readonly InstanceTransform[];
  castShadow?: boolean;
  receiveShadow?: boolean;
}

/** Geometry and material belong to the caller; only the instance buffer is local. */
export const StaticInstances = memo(function StaticInstances({
  geometry, material, instances, castShadow = false, receiveShadow = true,
}: Props) {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const transform = new Object3D();
    instances.forEach((instance, index) => {
      transform.position.set(...instance.position);
      transform.rotation.set(...(instance.rotation ?? [0, 0, 0]));
      transform.scale.set(...(instance.scale ?? [1, 1, 1]));
      transform.updateMatrix();
      mesh.setMatrixAt(index, transform.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    mesh.computeBoundingBox();
  }, [geometry, material, instances]);

  return <instancedMesh ref={ref} args={[geometry, material, instances.length]}
    castShadow={castShadow} receiveShadow={receiveShadow} />;
});
