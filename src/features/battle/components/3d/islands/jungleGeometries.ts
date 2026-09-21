import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { constructionMaterial } from '../textures/constructionMaterials';

function leafClusterTexture() {
  const size = 128, data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = (x / size - 0.5) * 2, v = y / size;
    let coverage = Math.abs(u - Math.sin(v * 3) * 0.04) < 0.016 && v > 0.08 && v < 0.93 ? 0.8 : 0;
    let vein = 0;
    for (let row = 0; row < 6; row++) for (const side of [-1, 1]) {
      const cy = 0.16 + row * 0.125;
      const cx = side * (0.24 + Math.sin(row * 2.3) * 0.055);
      const dx = u - cx, dy = (v - cy) * 2;
      const a = dx * 0.82 + dy * side * 0.57;
      const b = -dx * side * 0.57 + dy * 0.82;
      const shape = a * a / 0.12 + b * b / 0.011;
      if (shape < 1) {
        coverage = Math.max(coverage, Math.min(1, (1 - shape) * 16));
        vein = Math.max(vein, Math.max(0, 1 - Math.abs(b) * 75) * 0.1 + (1 - shape) * 0.12);
      }
    }
    const i = (y * size + x) * 4;
    const tone = 0.75 + vein + Math.sin(x * 4.1 + y * 7.3) * 0.04;
    data[i] = tone * 235; data[i + 1] = tone * 255; data[i + 2] = tone * 190; data[i + 3] = coverage * 255;
  }
  const map = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  map.colorSpace = THREE.SRGBColorSpace;
  map.generateMipmaps = true; map.minFilter = THREE.LinearMipmapLinearFilter; map.magFilter = THREE.LinearFilter;
  map.needsUpdate = true;
  return map;
}

const trunkParts: THREE.BufferGeometry[] = [new THREE.CylinderGeometry(0.13, 0.34, 4.8, 9).translate(0, 2.4, 0)];
const crownParts: THREE.BufferGeometry[] = [];
const low = new THREE.Color('#314427'), high = new THREE.Color('#7b8951');
for (let branch = 0; branch < 7; branch++) {
  const angle = branch * 2.39996;
  const spread = branch === 0 ? 0 : 1.5 + (branch % 2) * 0.5;
  const tip = new THREE.Vector3(Math.cos(angle) * spread, 4.4 + (branch % 3) * 0.7, Math.sin(angle) * spread);
  trunkParts.push(new THREE.TubeGeometry(new THREE.LineCurve3(new THREE.Vector3(0, 2.4, 0), tip), 1, 0.095, 5, false));
  for (let i = 0; i < 36; i++) {
    const azimuth = i * 2.39996 + branch;
    const elevation = 1 - 2 * (i + 0.5) / 36;
    const radius = Math.sqrt(1 - elevation * elevation);
    const card = new THREE.PlaneGeometry(1.35 + (i % 3) * 0.16, 1.6, 1, 2);
    const p = card.attributes.position;
    for (let j = 0; j < p.count; j++) p.setZ(j, Math.abs(p.getX(j)) * 0.22);
    card.rotateX(elevation * 1.1); card.rotateY(azimuth);
    card.translate(tip.x + Math.cos(azimuth) * radius * 1.2, tip.y + elevation, tip.z + Math.sin(azimuth) * radius * 1.2);
    const tint = low.clone().lerp(high, (elevation + 1) * 0.35 + (i % 4) * 0.05);
    const colors = new Float32Array(p.count * 3);
    for (let j = 0; j < p.count; j++) tint.toArray(colors, j * 3);
    card.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    card.computeVertexNormals();
    crownParts.push(card);
  }
}
export const jungleTrunkGeometry = mergeGeometries(trunkParts)!;
export const jungleCrownGeometry = mergeGeometries(crownParts)!;
[...trunkParts, ...crownParts].forEach(g => g.dispose());
export const jungleTrunkMaterial = constructionMaterial('wood', '#75664d', 1.5);
export const jungleCrownMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, map: leafClusterTexture(),
  alphaTest: 0.28, side: THREE.DoubleSide, roughness: 0.88 });
