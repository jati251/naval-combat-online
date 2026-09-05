import React, { useMemo } from 'react';
import * as THREE from 'three';

// ────────────────────────────────────────────────────────────────────────────
// Procedural 2D-into-3D Crossed Billboard Vegetation Textures
// ────────────────────────────────────────────────────────────────────────────

export function createPalmTreeSpriteTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 320;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.clearRect(0, 0, 256, 320);

  const trunkBaseX = 128;
  const trunkBaseY = 315;
  const crownX = 136;
  const crownY = 105;
  const ctrlX = 112;
  const ctrlY = 215;

  // 1. Curved wooden trunk
  ctx.beginPath();
  ctx.moveTo(trunkBaseX - 6.5, trunkBaseY);
  ctx.quadraticCurveTo(ctrlX - 4, ctrlY, crownX - 3.5, crownY);
  ctx.lineTo(crownX + 3.5, crownY);
  ctx.quadraticCurveTo(ctrlX + 4, ctrlY, trunkBaseX + 6.5, trunkBaseY);
  ctx.closePath();

  const trunkGrad = ctx.createLinearGradient(trunkBaseX - 8, 0, trunkBaseX + 8, 0);
  trunkGrad.addColorStop(0, '#382314');
  trunkGrad.addColorStop(0.35, '#6b4423');
  trunkGrad.addColorStop(0.7, '#855932');
  trunkGrad.addColorStop(1, '#2c1a0c');
  ctx.fillStyle = trunkGrad;
  ctx.fill();

  // Bark horizontal ridges
  ctx.strokeStyle = 'rgba(30, 18, 10, 0.45)';
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 26; i++) {
    const t = i / 26;
    const px = Math.pow(1 - t, 2) * trunkBaseX + 2 * (1 - t) * t * ctrlX + t * t * crownX;
    const py = Math.pow(1 - t, 2) * trunkBaseY + 2 * (1 - t) * t * ctrlY + t * t * crownY;
    const wid = 6.5 * (1 - t * 0.52);
    ctx.beginPath();
    ctx.moveTo(px - wid, py);
    ctx.lineTo(px + wid, py - 1);
    ctx.stroke();
  }

  // 2. Coconuts cluster under crown
  const nuts = [
    { x: crownX - 4, y: crownY + 3, r: 4.2 },
    { x: crownX + 4, y: crownY + 4, r: 4.4 },
    { x: crownX - 1, y: crownY + 7, r: 3.8 },
    { x: crownX + 6, y: crownY + 7, r: 3.6 },
  ];
  for (const n of nuts) {
    const nutGrad = ctx.createRadialGradient(n.x - 1, n.y - 1, 1, n.x, n.y, n.r);
    nutGrad.addColorStop(0, '#a16207');
    nutGrad.addColorStop(0.7, '#713f12');
    nutGrad.addColorStop(1, '#3f2208');
    ctx.fillStyle = nutGrad;
    ctx.beginPath();
    ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // 3. Spreading, feathery drooping palm fronds
  const drawFrond = (
    angle: number,
    length: number,
    droop: number,
    colorStem: string,
    colorLeaf: string,
    colorHighlight: string
  ) => {
    ctx.save();
    ctx.translate(crownX, crownY);
    ctx.rotate(angle);

    const endX = length;
    const endY = droop * length * 0.45;
    const midX = length * 0.55;
    const midY = -length * 0.16;

    const segments = 18;
    for (let s = 1; s < segments; s++) {
      const t = s / segments;
      const sx = Math.pow(1 - t, 2) * 0 + 2 * (1 - t) * t * midX + t * t * endX;
      const sy = Math.pow(1 - t, 2) * 0 + 2 * (1 - t) * t * midY + t * t * endY;
      const leafLen = Math.sin(t * Math.PI) * 19 + 4;
      const leafAngle = Math.PI * 0.44 + t * 0.22;

      ctx.fillStyle = (s % 2 === 0) ? colorLeaf : colorHighlight;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx - Math.cos(leafAngle) * leafLen, sy + Math.sin(leafAngle) * leafLen);
      ctx.lineTo(sx + 1, sy + 1);
      ctx.fill();

      ctx.fillStyle = colorLeaf;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + Math.cos(leafAngle) * leafLen, sy + Math.sin(leafAngle) * leafLen);
      ctx.lineTo(sx + 1, sy + 1);
      ctx.fill();
    }

    ctx.strokeStyle = colorStem;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(midX, midY, endX, endY);
    ctx.stroke();

    ctx.restore();
  };

  const frondConfigs = [
    { a: -2.35, l: 86, d: 0.9,  cS: '#14532d', cL: '#15803d', cH: '#16a34a' },
    { a: -1.95, l: 96, d: 0.82, cS: '#15803d', cL: '#16a34a', cH: '#22c55e' },
    { a: -1.45, l: 100, d: 0.72, cS: '#166534', cL: '#15803d', cH: '#4ade80' },
    { a: -0.95, l: 98, d: 0.76, cS: '#15803d', cL: '#22c55e', cH: '#86efac' },
    { a: -0.45, l: 92, d: 0.85, cS: '#166534', cL: '#16a34a', cH: '#22c55e' },
    { a: 0.05,  l: 82, d: 0.95, cS: '#14532d', cL: '#15803d', cH: '#16a34a' },
    { a: -2.75, l: 78, d: 1.05, cS: '#14532d', cL: '#166534', cH: '#15803d' },
    { a: -1.2,  l: 92, d: 0.68, cS: '#15803d', cL: '#22c55e', cH: '#bbf7d0' },
    { a: -0.7,  l: 88, d: 0.74, cS: '#166534', cL: '#16a34a', cH: '#4ade80' },
  ];

  for (const f of frondConfigs) {
    drawFrond(f.a, f.l, f.d, f.cS, f.cL, f.cH);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export function createJungleTreeSpriteTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 320;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.clearRect(0, 0, 256, 320);

  // Hardwood trunk and branching limbs
  ctx.fillStyle = '#382212';
  ctx.beginPath();
  ctx.moveTo(118, 318);
  ctx.quadraticCurveTo(124, 230, 122, 170);
  ctx.lineTo(95, 115);
  ctx.lineTo(105, 110);
  ctx.lineTo(126, 155);
  ctx.lineTo(152, 118);
  ctx.lineTo(162, 124);
  ctx.lineTo(132, 170);
  ctx.quadraticCurveTo(134, 230, 138, 318);
  ctx.closePath();
  ctx.fill();

  const drawCanopyCluster = (cx: number, cy: number, rx: number, ry: number, darkCol: string, midCol: string, lightCol: string) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(rx, ry);

    const grad = ctx.createRadialGradient(-0.15, -0.2, 0.05, 0, 0, 1.0);
    grad.addColorStop(0, lightCol);
    grad.addColorStop(0.35, midCol);
    grad.addColorStop(0.8, darkCol);
    grad.addColorStop(1, 'rgba(15, 60, 25, 0.95)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  drawCanopyCluster(128, 90, 58, 46, '#14532d', '#15803d', '#22c55e');
  drawCanopyCluster(84, 110, 48, 38, '#14532d', '#166534', '#16a34a');
  drawCanopyCluster(172, 112, 50, 40, '#14532d', '#15803d', '#22c55e');
  drawCanopyCluster(128, 55, 46, 36, '#15803d', '#16a34a', '#4ade80');
  drawCanopyCluster(105, 78, 38, 32, '#166534', '#22c55e', '#86efac');
  drawCanopyCluster(152, 80, 40, 32, '#166534', '#22c55e', '#86efac');

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export function createTropicalBushSpriteTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 160;
  canvas.height = 140;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.clearRect(0, 0, 160, 140);

  const drawLeaf = (angle: number, len: number, wid: number, col: string) => {
    ctx.save();
    ctx.translate(80, 130);
    ctx.rotate(angle);
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(wid, -len * 0.5, 0, -len);
    ctx.quadraticCurveTo(-wid, -len * 0.5, 0, 0);
    ctx.fill();
    ctx.restore();
  };

  const leaves = [
    { a: -1.2, l: 65, w: 16, c: '#14532d' },
    { a: 1.15, l: 68, w: 16, c: '#14532d' },
    { a: -0.85, l: 82, w: 18, c: '#166534' },
    { a: 0.8, l: 84, w: 18, c: '#166534' },
    { a: -0.45, l: 96, w: 20, c: '#15803d' },
    { a: 0.4, l: 98, w: 20, c: '#15803d' },
    { a: -0.15, l: 104, w: 22, c: '#16a34a' },
    { a: 0.12, l: 106, w: 22, c: '#22c55e' },
    { a: -0.6, l: 88, w: 19, c: '#4ade80' },
  ];

  for (const l of leaves) {
    drawLeaf(l.a, l.l, l.w, l.c);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

// ─── CROSSED BILLBOARD GEOMETRIES & SHARED MATERIALS ───
const palmPlaneGeo = new THREE.PlaneGeometry(8.5, 11.5);
palmPlaneGeo.translate(0, 5.75, 0);

const junglePlaneGeo = new THREE.PlaneGeometry(9.8, 10.5);
junglePlaneGeo.translate(0, 5.25, 0);

const bushPlaneGeo = new THREE.PlaneGeometry(3.6, 2.8);
bushPlaneGeo.translate(0, 1.4, 0);

let cachedPalmMat: THREE.MeshStandardMaterial | null = null;
let cachedJungleMat: THREE.MeshStandardMaterial | null = null;
let cachedBushMat: THREE.MeshStandardMaterial | null = null;

function getVegMaterials(): {
  palmMat: THREE.MeshStandardMaterial;
  jungleMat: THREE.MeshStandardMaterial;
  bushMat: THREE.MeshStandardMaterial;
} {
  if (!cachedPalmMat) {
    cachedPalmMat = new THREE.MeshStandardMaterial({
      map: createPalmTreeSpriteTexture(),
      transparent: true,
      alphaTest: 0.28,
      depthWrite: true,
      roughness: 0.65,
      metalness: 0.02,
      side: THREE.DoubleSide,
    });
    cachedJungleMat = new THREE.MeshStandardMaterial({
      map: createJungleTreeSpriteTexture(),
      transparent: true,
      alphaTest: 0.32,
      depthWrite: true,
      roughness: 0.7,
      metalness: 0.02,
      side: THREE.DoubleSide,
    });
    cachedBushMat = new THREE.MeshStandardMaterial({
      map: createTropicalBushSpriteTexture(),
      transparent: true,
      alphaTest: 0.25,
      depthWrite: true,
      roughness: 0.72,
      metalness: 0.01,
      side: THREE.DoubleSide,
    });
  }
  return {
    palmMat: cachedPalmMat!,
    jungleMat: cachedJungleMat!,
    bushMat: cachedBushMat!,
  };
}

/**
 * 2.5D Triple-Crossed Billboard Caribbean Palm Tree
 */
export const PalmTree: React.FC<{
  position: [number, number, number];
  scale?: number;
  seed?: number;
}> = React.memo(({ position, scale = 1, seed = 0 }) => {
  const { palmMat } = useMemo(() => getVegMaterials(), []);
  const baseRot = (seed * 1.618) % (Math.PI * 2);

  return (
    <group position={position} scale={[scale, scale, scale]} rotation={[0, baseRot, 0]}>
      <mesh geometry={palmPlaneGeo} material={palmMat} castShadow receiveShadow />
      <mesh geometry={palmPlaneGeo} material={palmMat} rotation={[0, Math.PI / 3, 0]} castShadow receiveShadow />
      <mesh geometry={palmPlaneGeo} material={palmMat} rotation={[0, (Math.PI * 2) / 3, 0]} castShadow receiveShadow />
    </group>
  );
});

/**
 * 2.5D Triple-Crossed Billboard Jungle Canopy Rainforest Tree
 */
export const JungleTree: React.FC<{
  position: [number, number, number];
  scale?: number;
  seed?: number;
}> = React.memo(({ position, scale = 1, seed = 0 }) => {
  const { jungleMat } = useMemo(() => getVegMaterials(), []);
  const baseRot = (seed * 1.345) % (Math.PI * 2);

  return (
    <group position={position} scale={[scale, scale, scale]} rotation={[0, baseRot, 0]}>
      <mesh geometry={junglePlaneGeo} material={jungleMat} castShadow receiveShadow />
      <mesh geometry={junglePlaneGeo} material={jungleMat} rotation={[0, Math.PI / 3, 0]} castShadow receiveShadow />
      <mesh geometry={junglePlaneGeo} material={jungleMat} rotation={[0, (Math.PI * 2) / 3, 0]} castShadow receiveShadow />
    </group>
  );
});

/**
 * 2.5D Crossed Billboard Tropical Fern Bush Cluster
 */
export const TropicalBush: React.FC<{
  position: [number, number, number];
  scale?: number;
  seed?: number;
}> = React.memo(({ position, scale = 1, seed = 0 }) => {
  const { bushMat } = useMemo(() => getVegMaterials(), []);
  const baseRot = (seed * 2.11) % (Math.PI * 2);

  return (
    <group position={position} scale={[scale, scale, scale]} rotation={[0, baseRot, 0]}>
      <mesh geometry={bushPlaneGeo} material={bushMat} castShadow receiveShadow />
      <mesh geometry={bushPlaneGeo} material={bushMat} rotation={[0, Math.PI * 0.5, 0]} castShadow receiveShadow />
    </group>
  );
});
