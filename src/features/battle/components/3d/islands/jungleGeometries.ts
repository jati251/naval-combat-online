import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const trunkParts: THREE.BufferGeometry[] = [new THREE.CylinderGeometry(0.13, 0.34, 4.8, 7).translate(0, 2.4, 0)];
const crownParts: THREE.BufferGeometry[] = [];
for (let branch = 0; branch < 7; branch++) {
  const angle = branch * 2.39996;
  const spread = branch === 0 ? 0 : 1.5 + (branch % 2) * 0.5;
  const tip = new THREE.Vector3(Math.cos(angle) * spread, 4.4 + (branch % 3) * 0.7, Math.sin(angle) * spread);
  trunkParts.push(new THREE.TubeGeometry(new THREE.LineCurve3(new THREE.Vector3(0, 2.4, 0), tip), 1, 0.095, 5, false));
  const crown = new THREE.IcosahedronGeometry(1, 2);
  const p = crown.getAttribute('position');
  const colors: number[] = [];
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const ragged = 1 + Math.sin(x * 18 + y * 11) * Math.cos(z * 17 - x * 8) * 0.13;
    p.setXYZ(i, x * ragged * 1.65 + tip.x, y * ragged * 1.3 + tip.y, z * ragged * 1.6 + tip.z);
    const color = new THREE.Color().lerpColors(new THREE.Color('#29402b'), new THREE.Color('#849451'), (y + 1) * 0.4 + (branch % 3) * 0.08);
    colors.push(color.r, color.g, color.b);
  }
  crown.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  crown.computeVertexNormals();
  crownParts.push(crown);
}
export const jungleTrunkGeometry = mergeGeometries(trunkParts)!;
export const jungleCrownGeometry = mergeGeometries(crownParts)!;
[...trunkParts, ...crownParts].forEach(g => g.dispose());
export const jungleTrunkMaterial = new THREE.MeshStandardMaterial({ color: '#68583c', roughness: 0.95 });
export const jungleCrownMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 });
