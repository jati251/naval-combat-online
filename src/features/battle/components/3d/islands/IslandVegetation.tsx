import React, { useMemo } from 'react';
import * as THREE from 'three';

// ────────────────────────────────────────────────────────────────────────────
// Procedural 2D-into-3D Crossed Billboard Vegetation Textures
// Natural Tropical Warm Yellowish-Green Palette & Dense Ground Coverage
// ────────────────────────────────────────────────────────────────────────────

/**
 * Procedural Caribbean Coconut Palm Tree Sprite (Warm golden-green fronds & ground-rooted shoots)
 */
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

  // 1. Curved tropical coconut palm trunk
  ctx.beginPath();
  ctx.moveTo(trunkBaseX - 7.5, trunkBaseY);
  ctx.quadraticCurveTo(ctrlX - 4.5, ctrlY, crownX - 4.0, crownY);
  ctx.lineTo(crownX + 4.0, crownY);
  ctx.quadraticCurveTo(ctrlX + 4.5, ctrlY, trunkBaseX + 7.5, trunkBaseY);
  ctx.closePath();

  const trunkGrad = ctx.createLinearGradient(trunkBaseX - 8, 0, trunkBaseX + 8, 0);
  trunkGrad.addColorStop(0, '#3e2816');
  trunkGrad.addColorStop(0.35, '#6e4926');
  trunkGrad.addColorStop(0.7, '#885e36');
  trunkGrad.addColorStop(1, '#2c1a0c');
  ctx.fillStyle = trunkGrad;
  ctx.fill();

  // Bark horizontal ring ridges
  ctx.strokeStyle = 'rgba(32, 20, 10, 0.45)';
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 28; i++) {
    const t = i / 28;
    const px = Math.pow(1 - t, 2) * trunkBaseX + 2 * (1 - t) * t * ctrlX + t * t * crownX;
    const py = Math.pow(1 - t, 2) * trunkBaseY + 2 * (1 - t) * t * ctrlY + t * t * crownY;
    const wid = 7.5 * (1 - t * 0.48);
    ctx.beginPath();
    ctx.moveTo(px - wid, py);
    ctx.lineTo(px + wid, py - 1);
    ctx.stroke();
  }

  // 2. Heavy coconut cluster under crown
  const nuts = [
    { x: crownX - 4, y: crownY + 3, r: 4.5 },
    { x: crownX + 4, y: crownY + 4, r: 4.6 },
    { x: crownX - 1, y: crownY + 7, r: 4.0 },
    { x: crownX + 6, y: crownY + 7, r: 3.8 },
  ];
  for (const n of nuts) {
    const nutGrad = ctx.createRadialGradient(n.x - 1, n.y - 1, 1, n.x, n.y, n.r);
    nutGrad.addColorStop(0, '#a8680c');
    nutGrad.addColorStop(0.7, '#784314');
    nutGrad.addColorStop(1, '#42240a');
    ctx.fillStyle = nutGrad;
    ctx.beginPath();
    ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // 3. Spreading, feathery drooping palm fronds (WARM GOLDEN-GREEN PALETTE)
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

    const segments = 19;
    for (let s = 1; s < segments; s++) {
      const t = s / segments;
      const sx = Math.pow(1 - t, 2) * 0 + 2 * (1 - t) * t * midX + t * t * endX;
      const sy = Math.pow(1 - t, 2) * 0 + 2 * (1 - t) * t * midY + t * t * endY;
      const leafLen = Math.sin(t * Math.PI) * 20 + 4;
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

  // Warm tropical deep olive-green fronds (no bright pale lime)
  const frondConfigs = [
    { a: -2.35, l: 88, d: 0.9,  cS: '#18260a', cL: '#284012', cH: '#3c5e1a' },
    { a: -1.95, l: 98, d: 0.82, cS: '#1e2e0c', cL: '#304c16', cH: '#466c20' },
    { a: -1.45, l: 104, d: 0.72, cS: '#22340e', cL: '#365418', cH: '#4e7624' },
    { a: -0.95, l: 100, d: 0.76, cS: '#1e2e0c', cL: '#325016', cH: '#4a7222' },
    { a: -0.45, l: 94, d: 0.85, cS: '#1a280a', cL: '#2c4614', cH: '#42661e' },
    { a: 0.05,  l: 84, d: 0.95, cS: '#18260a', cL: '#284012', cH: '#3c5e1a' },
    { a: -2.75, l: 80, d: 1.05, cS: '#162208', cL: '#243a10', cH: '#365416' },
    { a: -1.2,  l: 95, d: 0.68, cS: '#20320e', cL: '#345218', cH: '#4c7422' },
    { a: -0.7,  l: 90, d: 0.74, cS: '#1c2c0c', cL: '#2e4a14', cH: '#446a1e' },
    { a: -1.65, l: 96, d: 0.78, cS: '#1e300c', cL: '#304e16', cH: '#487020' },
  ];

  for (const f of frondConfigs) {
    drawFrond(f.a, f.l, f.d, f.cS, f.cL, f.cH);
  }

  // 4. Ground-rooted young palm shoots and fern fronds around trunk base
  const drawBaseLeaf = (ox: number, oy: number, angle: number, len: number, col: string) => {
    ctx.save();
    ctx.translate(ox, oy);
    ctx.rotate(angle);
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(12, -len * 0.5, 0, -len);
    ctx.quadraticCurveTo(-12, -len * 0.5, 0, 0);
    ctx.fill();
    ctx.restore();
  };

  const baseLeaves = [
    { ox: 122, oy: 315, a: -1.1, l: 42, c: '#1e300c' },
    { ox: 134, oy: 315, a: 1.05, l: 44, c: '#24380e' },
    { ox: 120, oy: 312, a: -0.7, l: 52, c: '#2c4412' },
    { ox: 136, oy: 312, a: 0.65, l: 54, c: '#304c14' },
    { ox: 126, oy: 308, a: -0.3, l: 58, c: '#365416' },
    { ox: 130, oy: 308, a: 0.25, l: 60, c: '#3c5e18' },
  ];
  for (const bl of baseLeaves) {
    drawBaseLeaf(bl.ox, bl.oy, bl.a, bl.l, bl.c);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Procedural Lush Rainforest Canopy Tree with Dense Understory Skirt
 * Deep, dark tropical rainforest canopy (AC Black Flag aesthetic).
 */
export function createJungleTreeSpriteTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 320;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.clearRect(0, 0, 256, 320);

  // 1. Broad tropical hardwood trunk with lateral limbs & buttress roots
  ctx.fillStyle = '#22150a';
  ctx.beginPath();
  // Buttress root base spreading wide
  ctx.moveTo(105, 318);
  ctx.quadraticCurveTo(116, 260, 118, 180);
  ctx.lineTo(80, 120);
  ctx.lineTo(94, 114);
  ctx.lineTo(122, 160);
  ctx.lineTo(162, 122);
  ctx.lineTo(174, 130);
  ctx.lineTo(134, 180);
  ctx.quadraticCurveTo(138, 260, 151, 318);
  ctx.closePath();
  ctx.fill();

  // Bark highlight
  ctx.fillStyle = '#382414';
  ctx.beginPath();
  ctx.moveTo(122, 318);
  ctx.lineTo(125, 175);
  ctx.lineTo(131, 175);
  ctx.lineTo(135, 318);
  ctx.closePath();
  ctx.fill();

  // 2. Organic textured canopy cluster drawer (multi-lobed foliage puffs)
  const drawCanopyCluster = (
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    darkCol: string,
    midCol: string,
    lightCol: string,
    highlightCol?: string
  ) => {
    ctx.save();
    ctx.translate(cx, cy);

    // Draw main volume
    const grad = ctx.createRadialGradient(-rx * 0.18, -ry * 0.22, rx * 0.08, 0, 0, Math.max(rx, ry));
    grad.addColorStop(0, highlightCol || lightCol);
    grad.addColorStop(0.35, lightCol);
    grad.addColorStop(0.7, midCol);
    grad.addColorStop(1, darkCol);

    ctx.fillStyle = grad;
    ctx.beginPath();

    // Multi-lobed scalloped foliage perimeter
    const lobes = 10;
    for (let i = 0; i <= lobes; i++) {
      const angle = (i / lobes) * Math.PI * 2;
      const wobble = 1.0 + Math.sin(angle * 5 + cx * 0.1) * 0.09 + Math.cos(angle * 3) * 0.06;
      const x = Math.cos(angle) * rx * wobble;
      const y = Math.sin(angle) * ry * wobble;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();

    // Subtle sunlit leaf dappling on top
    if (highlightCol) {
      ctx.fillStyle = highlightCol;
      ctx.beginPath();
      ctx.ellipse(-rx * 0.22, -ry * 0.26, rx * 0.38, ry * 0.28, -0.3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  };

  // ── DEEP CARIBBEAN RAINFOREST COLOR PALETTE (AC BLACK FLAG LUSH JUNGLE) ──
  const cDark     = '#0a1606'; // Deep interior canopy & understory shadow
  const cDeepMid  = '#12240b'; // Lower canopy dense emerald
  const cMid      = '#1a3612'; // Rich tropical jungle green
  const cLight    = '#264c1a'; // Diffuse rainforest foliage
  const cSunlit   = '#346022'; // Sunlit canopy foliage (deep rich emerald)
  const cGoldTip  = '#44782a'; // Subtle canopy crest glint (restrained, no pale mint)

  // 3. TIER 1: Upper Canopy (Summit Crest)
  drawCanopyCluster(128, 48, 52, 38, cDark, cMid, cLight, cGoldTip);
  drawCanopyCluster(96, 68, 48, 36, cDeepMid, cMid, cLight, cSunlit);
  drawCanopyCluster(160, 70, 50, 38, cDeepMid, cMid, cLight, cSunlit);

  // 4. TIER 2: Main Middle Canopy (Expansive Wide Foliage Mass)
  drawCanopyCluster(128, 92, 68, 52, cDark, cMid, cLight, cSunlit);
  drawCanopyCluster(68, 108, 56, 44, cDark, cDeepMid, cMid, cLight);
  drawCanopyCluster(188, 110, 58, 45, cDark, cDeepMid, cMid, cLight);
  drawCanopyCluster(128, 132, 66, 48, cDark, cDeepMid, cMid, cLight);

  // 5. TIER 3: Lower Weeping Foliage & Dangling Rainforest Boughs
  drawCanopyCluster(58, 148, 44, 34, cDark, cDeepMid, cMid, cLight);
  drawCanopyCluster(198, 150, 46, 35, cDark, cDeepMid, cMid, cLight);
  drawCanopyCluster(92, 172, 46, 34, cDark, cDeepMid, cMid, cLight);
  drawCanopyCluster(164, 174, 48, 35, cDark, cDeepMid, cMid, cLight);
  drawCanopyCluster(128, 192, 52, 36, cDark, cDeepMid, cMid, cLight);

  // 6. Hanging lianas & weeping foliage droplets
  ctx.fillStyle = cLight;
  const hangingVines = [
    { x: 70, y: 175, r: 6 },
    { x: 88, y: 198, r: 8 },
    { x: 168, y: 202, r: 8 },
    { x: 186, y: 178, r: 6 },
    { x: 128, y: 220, r: 7 },
  ];
  for (const v of hangingVines) {
    ctx.beginPath();
    ctx.ellipse(v.x, v.y, v.r * 0.7, v.r * 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // 7. TIER 4: DENSE UNDERSTORY JUNGLE SKIRT AT BASE OF TRUNK
  drawCanopyCluster(84, 285, 46, 28, cDark, cDeepMid, cMid, cLight);
  drawCanopyCluster(172, 288, 48, 30, cDark, cDeepMid, cMid, cLight);
  drawCanopyCluster(128, 292, 54, 26, cDark, cDeepMid, cMid, cSunlit);
  drawCanopyCluster(54, 305, 36, 18, cDark, cDeepMid, cMid, cLight);
  drawCanopyCluster(202, 306, 38, 18, cDark, cDeepMid, cMid, cLight);
  drawCanopyCluster(128, 312, 60, 16, cDeepMid, cMid, cLight, cSunlit);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Procedural Dense Tropical Fern & Broadleaf Bush Cluster
 * Wide, voluminous leafy mound in rich warm tropical tones that blankets the terrain.
 */
export function createTropicalBushSpriteTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 200;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.clearRect(0, 0, 256, 200);

  const drawBroadLeaf = (angle: number, len: number, wid: number, colStem: string, colLeaf: string, colHi: string) => {
    ctx.save();
    ctx.translate(128, 188);
    ctx.rotate(angle);

    // Leaf blade body
    const grad = ctx.createLinearGradient(-wid, 0, wid, 0);
    grad.addColorStop(0, colLeaf);
    grad.addColorStop(0.5, colHi);
    grad.addColorStop(1, colLeaf);

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(wid * 1.2, -len * 0.45, wid * 0.3, -len);
    ctx.quadraticCurveTo(0, -len * 1.05, -wid * 0.3, -len);
    ctx.quadraticCurveTo(-wid * 1.2, -len * 0.45, 0, 0);
    ctx.fill();

    // Central leaf rib vein
    ctx.strokeStyle = colStem;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -len * 0.95);
    ctx.stroke();

    ctx.restore();
  };

  // Deep, dark tropical rainforest undergrowth palette (AC Black Flag aesthetic)
  const bushFronds = [
    // Background layer (deepest undergrowth shadow)
    { a: -1.35, l: 110, w: 26, s: '#101c06', lC: '#1a2c0a', h: '#2c4612' },
    { a: 1.30,  l: 112, w: 26, s: '#101c06', lC: '#1a2c0a', h: '#2c4612' },
    { a: -1.05, l: 128, w: 30, s: '#142208', lC: '#20340c', h: '#345216' },
    { a: 1.02,  l: 130, w: 30, s: '#142208', lC: '#20340c', h: '#345216' },
    // Mid layer (rich jungle foliage)
    { a: -0.72, l: 145, w: 34, s: '#18280a', lC: '#284010', h: '#3c5e1a' },
    { a: 0.68,  l: 148, w: 34, s: '#18280a', lC: '#284010', h: '#3c5e1a' },
    { a: -0.42, l: 156, w: 36, s: '#1e300c', lC: '#304c14', h: '#466c1e' },
    { a: 0.38,  l: 158, w: 36, s: '#1e300c', lC: '#304c14', h: '#466c1e' },
    { a: -0.15, l: 164, w: 38, s: '#22360e', lC: '#365416', h: '#4e7822' },
    { a: 0.12,  l: 166, w: 38, s: '#22360e', lC: '#365416', h: '#4e7822' },
    // Foreground spreading fan (sunlit foliage tips - deep olive emerald)
    { a: -0.88, l: 122, w: 32, s: '#243810', lC: '#3c5c18', h: '#548226' },
    { a: 0.85,  l: 125, w: 32, s: '#243810', lC: '#3c5c18', h: '#548226' },
    { a: -0.55, l: 136, w: 34, s: '#284012', lC: '#42661a', h: '#5c8e2a' },
    { a: 0.52,  l: 138, w: 34, s: '#284012', lC: '#42661a', h: '#5c8e2a' },
    { a: 0.0,   l: 146, w: 36, s: '#2c4614', lC: '#48701e', h: '#649a2e' },
  ];

  for (const f of bushFronds) {
    drawBroadLeaf(f.a, f.l, f.w, f.s, f.lC, f.h);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

// ─── CROSSED BILLBOARD GEOMETRIES & SHARED MATERIALS ───
// Compact, realistically-proportioned vegetation (dense without being oversized)
export const palmPlaneGeo = new THREE.PlaneGeometry(5.4, 7.4);
palmPlaneGeo.translate(0, 3.7, 0);

export const junglePlaneGeo = new THREE.PlaneGeometry(6.4, 7.2);
junglePlaneGeo.translate(0, 3.6, 0);

// Compact, ground-hugging tropical bush geometry (2.6m wide x 1.8m tall)
export const bushPlaneGeo = new THREE.PlaneGeometry(2.6, 1.8);
bushPlaneGeo.translate(0, 0.9, 0);

// Optimized small undergrowth bush sprite geometry (1.8m wide x 1.3m tall)
export const smallBushPlaneGeo = new THREE.PlaneGeometry(1.8, 1.3);
smallBushPlaneGeo.translate(0, 0.65, 0);

/**
 * Procedural Compact Tropical Small Bush / Shrub Sprite Texture (AC Black Flag Understory)
 * Deep, dark tropical palmetto & broadleaf shrub cluster.
 */
export function createSmallBushSpriteTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 192;
  canvas.height = 144;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.clearRect(0, 0, 192, 144);

  const cx = 96;
  const cy = 138;

  // Multi-lobed lush tropical shrub mound
  const drawLeafBlade = (angle: number, len: number, wid: number, colStem: string, colLeaf: string, colTip: string) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);

    const grad = ctx.createLinearGradient(0, 0, 0, -len);
    grad.addColorStop(0, '#0c1606');
    grad.addColorStop(0.3, colStem);
    grad.addColorStop(0.7, colLeaf);
    grad.addColorStop(1, colTip);

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(wid * 1.1, -len * 0.45, wid * 0.25, -len);
    ctx.quadraticCurveTo(0, -len * 1.06, -wid * 0.25, -len);
    ctx.quadraticCurveTo(-wid * 1.1, -len * 0.45, 0, 0);
    ctx.fill();

    // Central leaf spine
    ctx.strokeStyle = colStem;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -len * 0.92);
    ctx.stroke();

    ctx.restore();
  };

  // 3-Tier layered dense tropical leaves (Deep AC Black Flag Rainforest green)
  const smallFronds = [
    // Back tier (dark shadow leaves)
    { a: -1.38, l: 78, w: 18, s: '#0c1606', lC: '#16260a', t: '#243c10' },
    { a: 1.35,  l: 80, w: 18, s: '#0c1606', lC: '#16260a', t: '#243c10' },
    { a: -1.10, l: 94, w: 22, s: '#101c08', lC: '#1c300c', t: '#2c4814' },
    { a: 1.08,  l: 96, w: 22, s: '#101c08', lC: '#1c300c', t: '#2c4814' },
    // Mid tier (deep emerald jungle leaves)
    { a: -0.78, l: 108, w: 25, s: '#14240a', lC: '#243c10', t: '#385818' },
    { a: 0.74,  l: 110, w: 25, s: '#14240a', lC: '#243c10', t: '#385818' },
    { a: -0.45, l: 118, w: 26, s: '#182c0c', lC: '#2c4814', t: '#42681c' },
    { a: 0.42,  l: 120, w: 26, s: '#182c0c', lC: '#2c4814', t: '#42681c' },
    { a: -0.18, l: 124, w: 27, s: '#1c320e', lC: '#325216', t: '#4a7420' },
    { a: 0.16,  l: 126, w: 27, s: '#1c320e', lC: '#325216', t: '#4a7420' },
    // Front spreading fan (sunlit tips - deep foliage olive)
    { a: -0.92, l: 88, w: 22, s: '#203610', lC: '#3a5c18', t: '#528024' },
    { a: 0.88,  l: 90, w: 22, s: '#203610', lC: '#3a5c18', t: '#528024' },
    { a: -0.58, l: 102, w: 24, s: '#243c12', lC: '#40661c', t: '#5a8c28' },
    { a: 0.55,  l: 104, w: 24, s: '#243c12', lC: '#40661c', t: '#5a8c28' },
    { a: 0.0,   l: 112, w: 26, s: '#284414', lC: '#467020', t: '#649a2e' },
  ];

  for (const sf of smallFronds) {
    drawLeafBlade(sf.a, sf.l, sf.w, sf.s, sf.lC, sf.t);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

let cachedPalmMat: THREE.MeshStandardMaterial | null = null;
let cachedJungleMat: THREE.MeshStandardMaterial | null = null;
let cachedBushMat: THREE.MeshStandardMaterial | null = null;
let cachedSmallBushMat: THREE.MeshStandardMaterial | null = null;

export function getVegMaterials(): {
  palmMat: THREE.MeshStandardMaterial;
  jungleMat: THREE.MeshStandardMaterial;
  bushMat: THREE.MeshStandardMaterial;
  smallBushMat: THREE.MeshStandardMaterial;
} {
  if (!cachedPalmMat) {
    cachedPalmMat = new THREE.MeshStandardMaterial({
      map: createPalmTreeSpriteTexture(),
      transparent: false,
      alphaTest: 0.28,
      depthWrite: true,
      roughness: 0.82,
      metalness: 0.0,
      side: THREE.DoubleSide,
    });
    cachedJungleMat = new THREE.MeshStandardMaterial({
      map: createJungleTreeSpriteTexture(),
      transparent: false,
      alphaTest: 0.32,
      depthWrite: true,
      roughness: 0.88,
      metalness: 0.0,
      side: THREE.DoubleSide,
    });
    cachedBushMat = new THREE.MeshStandardMaterial({
      map: createTropicalBushSpriteTexture(),
      transparent: false,
      alphaTest: 0.25,
      depthWrite: true,
      roughness: 0.88,
      metalness: 0.0,
      side: THREE.DoubleSide,
    });
    cachedSmallBushMat = new THREE.MeshStandardMaterial({
      map: createSmallBushSpriteTexture(),
      transparent: false,
      alphaTest: 0.26,
      depthWrite: true,
      roughness: 0.88,
      metalness: 0.0,
      side: THREE.DoubleSide,
    });
  }
  return {
    palmMat: cachedPalmMat!,
    jungleMat: cachedJungleMat!,
    bushMat: cachedBushMat!,
    smallBushMat: cachedSmallBushMat!,
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
 * 2.5D Quad-Crossed Billboard Jungle Canopy Rainforest Tree (Full 3D Volume)
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
      <mesh geometry={junglePlaneGeo} material={jungleMat} rotation={[0, Math.PI * 0.25, 0]} castShadow receiveShadow />
      <mesh geometry={junglePlaneGeo} material={jungleMat} rotation={[0, Math.PI * 0.5, 0]} castShadow receiveShadow />
      <mesh geometry={junglePlaneGeo} material={jungleMat} rotation={[0, Math.PI * 0.75, 0]} castShadow receiveShadow />
    </group>
  );
});

/**
 * 2.5D Triple-Crossed Billboard Tropical Fern & Broadleaf Bush Cluster
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
      <mesh geometry={bushPlaneGeo} material={bushMat} rotation={[0, Math.PI / 3, 0]} castShadow receiveShadow />
      <mesh geometry={bushPlaneGeo} material={bushMat} rotation={[0, (Math.PI * 2) / 3, 0]} castShadow receiveShadow />
    </group>
  );
});
