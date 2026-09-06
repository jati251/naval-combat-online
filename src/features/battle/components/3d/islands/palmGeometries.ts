import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const stemPath = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0, 0, 0), new THREE.Vector3(-0.16, 2, 0.05),
  new THREE.Vector3(0.02, 4.3, 0.04), new THREE.Vector3(0.3, 5.8, 0),
]);
export const palmTrunkGeometry = new THREE.TubeGeometry(stemPath, 8, 0.13, 6, false);
const fronds = Array.from({ length: 9 }, (_, frond) => {
  const geometry = new THREE.PlaneGeometry(1, 1, 1, 12);
  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const t = positions.getY(i) + 0.5;
    const width = Math.sin(t * Math.PI) * (0.68 + Math.sin(t * Math.PI * 12) * 0.22);
    positions.setXYZ(i, positions.getX(i) * width,
      Math.sin(t * Math.PI) * 0.8 - t * t * (1.1 + frond % 3 * 0.22),
      t * (2.3 + frond % 3 * 0.25));
  }
  geometry.rotateY(frond * Math.PI * 2 / 9);
  geometry.translate(0.3, 5.8, 0);
  geometry.computeVertexNormals();
  return geometry;
});
export const palmCrownGeometry = mergeGeometries(fronds)!;
fronds.forEach((geometry) => geometry.dispose());
export const palmTrunkMaterial = new THREE.MeshStandardMaterial({ color: '#716047', roughness: 0.94 });
export const palmCrownMaterial = new THREE.MeshStandardMaterial({ color: '#587732', roughness: 0.87, side: THREE.DoubleSide });
