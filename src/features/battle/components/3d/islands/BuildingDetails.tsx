import { memo } from 'react';
import * as THREE from 'three';
import { constructionMaterial } from '../textures/constructionMaterials';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export function createGableRoof(width: number, depth: number, rise: number) {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, 0); shape.lineTo(width / 2, 0); shape.lineTo(0, rise); shape.closePath();
  const roof = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSize: 0.045, bevelThickness: 0.045, bevelSegments: 1, steps: 1 }).translate(0, 0, -depth / 2);
  const pieces: THREE.BufferGeometry[] = [roof];
  for (let z = -depth / 2; z < depth / 2; z += 0.42) {
    const cap = new THREE.CylinderGeometry(0.14, 0.16, 0.46, 6, 1, true, -Math.PI / 2, Math.PI);
    cap.rotateX(-Math.PI / 2); cap.translate(0, rise + 0.02, z + 0.21);
    pieces.push(cap.toNonIndexed()); cap.dispose();
  }
  const result = mergeGeometries(pieces)!;
  pieces.forEach(piece => piece.dispose());
  return result;
}

const trimParts = [-0.5, 0.5].map(x => new THREE.BoxGeometry(0.1, 1.5, 0.13).translate(x, 0, 0));
trimParts.push(...[-0.72, 0, 0.72].map(y => new THREE.BoxGeometry(1.1, 0.09, 0.13).translate(0, y, 0)));
trimParts.push(new THREE.BoxGeometry(0.055, 1.4, 0.13));
const frame = mergeGeometries(trimParts)!;
trimParts.forEach(g => g.dispose());
const shutterParts = [-0.83, 0.83].map(x => new THREE.BoxGeometry(0.44, 1.45, 0.12).translate(x, 0, 0));
for (const x of [-0.83, 0.83]) for (let i = 0; i < 7; i++) shutterParts.push(new THREE.BoxGeometry(0.46, 0.035, 0.06).translate(x, -0.6 + i * 0.2, 0.08));
for (const part of shutterParts) {
  const p = part.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    p.setZ(i, p.getZ(i) + Math.max(0, Math.abs(x) - 0.61) * 0.32);
  }
  part.computeVertexNormals();
}
const shutters = mergeGeometries(shutterParts)!;
shutterParts.forEach(g => g.dispose());

let windowMaterials: { trim: THREE.Material; shutter: THREE.Material } | undefined;
function getWindowMaterials() {
  return windowMaterials ??= { trim: constructionMaterial('wood', '#b6a281', 1.2), shutter: constructionMaterial('wood', '#53604b', 1.0) };
}
export const ShutterWindow = memo(function ShutterWindow({ position }: { position: [number, number, number] }) {
  const materials = getWindowMaterials();
  return <group position={position}>
    <mesh><boxGeometry args={[0.95, 1.4, 0.055]} /><meshStandardMaterial color="#182321" roughness={0.65} metalness={0} /></mesh>
    <mesh geometry={frame} material={materials.trim} dispose={null} />
    <mesh geometry={shutters} material={materials.shutter} castShadow dispose={null} />
    <mesh position={[0, -0.8, 0.08]} castShadow><boxGeometry args={[1.3, 0.13, 0.32]} /><meshStandardMaterial color="#c8b691" /></mesh>
  </group>;
});
