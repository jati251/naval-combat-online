import { memo } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export function createGableRoof(width: number, depth: number, rise: number) {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, 0); shape.lineTo(width / 2, 0); shape.lineTo(0, rise); shape.closePath();
  return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSize: 0.045, bevelThickness: 0.045, bevelSegments: 1, steps: 1 }).translate(0, 0, -depth / 2);
}

const trimParts = [-0.5, 0.5].map(x => new THREE.BoxGeometry(0.1, 1.5, 0.13).translate(x, 0, 0));
trimParts.push(...[-0.72, 0, 0.72].map(y => new THREE.BoxGeometry(1.1, 0.09, 0.13).translate(0, y, 0)));
trimParts.push(new THREE.BoxGeometry(0.055, 1.4, 0.13));
const frame = mergeGeometries(trimParts)!;
trimParts.forEach(g => g.dispose());
const shutterParts = [-0.83, 0.83].map(x => new THREE.BoxGeometry(0.44, 1.45, 0.12).translate(x, 0, 0));
for (const x of [-0.83, 0.83]) for (let i = 0; i < 7; i++) shutterParts.push(new THREE.BoxGeometry(0.46, 0.035, 0.06).translate(x, -0.6 + i * 0.2, 0.08));
const shutters = mergeGeometries(shutterParts)!;
shutterParts.forEach(g => g.dispose());

export const ShutterWindow = memo(function ShutterWindow({ position }: { position: [number, number, number] }) {
  return <group position={position}>
    <mesh><boxGeometry args={[0.95, 1.4, 0.055]} /><meshStandardMaterial color="#233b3b" roughness={0.3} metalness={0.15} /></mesh>
    <mesh geometry={frame}><meshStandardMaterial color="#d0b78a" roughness={0.85} /></mesh>
    <mesh geometry={shutters} castShadow><meshStandardMaterial color="#536557" roughness={0.9} /></mesh>
    <mesh position={[0, -0.8, 0.08]} castShadow><boxGeometry args={[1.3, 0.13, 0.32]} /><meshStandardMaterial color="#c8b691" /></mesh>
  </group>;
});
