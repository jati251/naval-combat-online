import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const stemPath = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0, 0, 0), new THREE.Vector3(-0.16, 2, 0.05),
  new THREE.Vector3(0.02, 4.3, 0.04), new THREE.Vector3(0.3, 5.8, 0),
]);
export const palmTrunkGeometry = new THREE.TubeGeometry(stemPath, 8, 0.13, 6, false);
const fronds: THREE.BufferGeometry[] = [];
for (let frond = 0; frond < 10; frond++) {
  const length = 2.5 + (frond % 3) * 0.3;
  const yaw = frond * Math.PI * 2 / 10;
  const bend = (t: number) => Math.sin(t * Math.PI) * 0.72 - t * t * (1.2 + frond % 3 * 0.2);
  const rib = new THREE.PlaneGeometry(0.035, length, 1, 12);
  const rp = rib.attributes.position;
  for (let i = 0; i < rp.count; i++) {
    const t = rp.getY(i) / length + 0.5;
    rp.setXYZ(i, rp.getX(i), bend(t), t * length);
  }
  rib.rotateY(yaw); rib.translate(0.3, 5.8, 0); rib.computeVertexNormals(); fronds.push(rib);
  for (let i = 1; i < 15; i++) for (const side of [-1, 1]) {
    const t = i / 16;
    const reach = Math.sin(Math.PI * t) * (0.65 + (i % 3) * 0.05);
    const positions = new Float32Array([
      0,bend(t),t*length,
      side*reach*0.55,bend(t)-0.10,t*length+0.14,
      side*reach,bend(t)-0.30,t*length+0.35,
      side*reach*0.55,bend(t)-0.10,t*length+0.23,
    ]);
    const leaf = new THREE.BufferGeometry();
    leaf.setAttribute('position', new THREE.BufferAttribute(positions,3));
    leaf.setIndex([0,1,3,1,2,3]);
    leaf.setAttribute('uv', new THREE.Float32BufferAttribute([0,0,0,0.5,1,1,1,0.5],2));
    leaf.rotateY(yaw); leaf.translate(0.3,5.8,0); leaf.computeVertexNormals(); fronds.push(leaf);
  }
}
export const palmCrownGeometry = mergeGeometries(fronds)!;
fronds.forEach((geometry) => geometry.dispose());
export const palmTrunkMaterial = new THREE.MeshStandardMaterial({ color: '#716047', roughness: 0.94 });
export const palmCrownMaterial = new THREE.MeshStandardMaterial({ color: '#667846', roughness: 0.87, side: THREE.DoubleSide });
