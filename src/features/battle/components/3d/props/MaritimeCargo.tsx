import { memo, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { StaticInstances, type InstanceTransform } from '../shared/StaticInstances';
import { createWoodPlankTexture } from '../textures/shipTextures';
import { getSurfaceBump } from '../textures/surfaceTextures';

const barrel = new THREE.LatheGeometry([
  new THREE.Vector2(0, 0), new THREE.Vector2(0.27, 0),
  new THREE.Vector2(0.32, 0.12), new THREE.Vector2(0.36, 0.43),
  new THREE.Vector2(0.32, 0.74), new THREE.Vector2(0.27, 0.86), new THREE.Vector2(0, 0.86),
], 12);
const ringParts = [0.13, 0.43, 0.73].map((y) =>
  new THREE.CylinderGeometry(y === 0.43 ? 0.365 : 0.33, y === 0.43 ? 0.365 : 0.33, 0.045, 12, 1, true).translate(0, y, 0));
const hoops = mergeGeometries(ringParts)!;
ringParts.forEach((geometry) => geometry.dispose());
const crate = new THREE.BoxGeometry(0.8, 0.7, 0.7).translate(0, 0.35, 0);
const braceParts = [-0.36, 0.36].flatMap((z) => [
  new THREE.BoxGeometry(0.88, 0.085, 0.055).translate(0, 0.08, z),
  new THREE.BoxGeometry(0.88, 0.085, 0.055).translate(0, 0.62, z),
  new THREE.BoxGeometry(0.88, 0.07, 0.055).rotateZ(0.6).translate(0, 0.35, z),
]);
const braces = mergeGeometries(braceParts)!;
braceParts.forEach((geometry) => geometry.dispose());
const coilParts = [0.13, 0.2, 0.27, 0.34].map((radius) =>
  new THREE.TorusGeometry(radius, 0.032, 5, 20).rotateX(Math.PI / 2).translate(0, 0.045, 0));
const coil = mergeGeometries(coilParts)!;
coilParts.forEach((geometry) => geometry.dispose());
const iron = new THREE.MeshStandardMaterial({ color: '#353a37', roughness: 0.61, metalness: 0.65 });
const edging = new THREE.MeshStandardMaterial({ color: '#876442', roughness: 0.9 });
const rope = new THREE.MeshStandardMaterial({ color: '#aa9270', roughness: 1 });
let wood: THREE.MeshStandardMaterial | undefined;
function getWood() {
  return wood ??= new THREE.MeshStandardMaterial({ map: createWoodPlankTexture('#796044', '#31251c', 8),
    bumpMap: getSurfaceBump('wood'), bumpScale: 0.035, roughness: 0.88 });
}

/** Five batches regardless of cargo count. Positions are the bottoms of the props. */
export const MaritimeCargo = memo(function MaritimeCargo({ placements, distance = 110 }: {
  placements: readonly InstanceTransform[]; distance?: number;
}) {
  const group = useRef<THREE.Group>(null);
  const world = useMemo(() => new THREE.Vector3(), []);
  const timer = useRef(0);
  const { barrels, crates, ropes } = useMemo(() => ({
    barrels: placements.filter((_, i) => i % 2 === 0),
    crates: placements.filter((_, i) => i % 2 !== 0),
    ropes: placements.map((p): InstanceTransform => ({ ...p,
      position: [p.position[0] + 0.75, p.position[1], p.position[2]] })),
  }), [placements]);
  useFrame(({ camera }, delta) => {
    timer.current += delta;
    if (!group.current || timer.current < 0.25) return;
    timer.current = 0;
    group.current.getWorldPosition(world);
    const cutoff = distance + (group.current.visible ? 12 : 0);
    group.current.visible = camera.position.distanceToSquared(world) < cutoff * cutoff;
  });
  return <group ref={group}>
    <StaticInstances geometry={barrel} material={getWood()} instances={barrels} castShadow />
    <StaticInstances geometry={hoops} material={iron} instances={barrels} />
    <StaticInstances geometry={crate} material={getWood()} instances={crates} castShadow />
    <StaticInstances geometry={braces} material={edging} instances={crates} />
    <StaticInstances geometry={coil} material={rope} instances={ropes} />
  </group>;
});
