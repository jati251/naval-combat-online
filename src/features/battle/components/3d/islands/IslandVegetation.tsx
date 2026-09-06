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

  // Warm tropical yellowish-green fronds (no mint/cyan)
  const frondConfigs = [
    { a: -2.35, l: 88, d: 0.9,  cS: '#384d16', cL: '#618822', cH: '#8eb830' },
    { a: -1.95, l: 98, d: 0.82, cS: '#4a671a', cL: '#729e26', cH: '#a6d23a' },
    { a: -1.45, l: 104, d: 0.72, cS: '#55761e', cL: '#84b22c', cH: '#bee846' },
    { a: -0.95, l: 100, d: 0.76, cS: '#4a671a', cL: '#7ea828', cH: '#b5de40' },
    { a: -0.45, l: 94, d: 0.85, cS: '#3f5716', cL: '#6e9824', cH: '#9fcb34' },
    { a: 0.05,  l: 84, d: 0.95, cS: '#384d16', cL: '#5c8020', cH: '#8ab42e' },
    { a: -2.75, l: 80, d: 1.05, cS: '#344714', cL: '#54761e', cH: '#7da62a' },
    { a: -1.2,  l: 95, d: 0.68, cS: '#52721d', cL: '#8ab62e', cH: '#c8ee4c' },
    { a: -0.7,  l: 90, d: 0.74, cS: '#476219', cL: '#76a028', cH: '#b0da3c' },
    { a: -1.65, l: 96, d: 0.78, cS: '#4c6b1b', cL: '#7da82a', cH: '#bae444' },
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
    { ox: 122, oy: 315, a: -1.1, l: 42, c: '#48631a' },
    { ox: 134, oy: 315, a: 1.05, l: 44, c: '#54741e' },
    { ox: 120, oy: 312, a: -0.7, l: 52, c: '#6d9426' },
    { ox: 136, oy: 312, a: 0.65, l: 54, c: '#7aa22a' },
    { ox: 126, oy: 308, a: -0.3, l: 58, c: '#8eb632' },
    { ox: 130, oy: 308, a: 0.25, l: 60, c: '#9fc836' },
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
 * Multi-tiered golden-green canopy extending from crown down to ground-level foliage skirt.
 */
export function createJungleTreeSpriteTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 320;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.clearRect(0, 0, 256, 320);

  // 1. Broad tropical hardwood trunk with lateral limbs & buttress roots
  ctx.fillStyle = '#3a2516';
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
  ctx.fillStyle = '#523722';
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

    // Secondary sunlit leaf dappling on top
    if (highlightCol) {
      ctx.fillStyle = highlightCol;
      ctx.beginPath();
      ctx.ellipse(-rx * 0.22, -ry * 0.26, rx * 0.45, ry * 0.35, -0.3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  };

  // ── RICH CARIBBEAN RAINFOREST COLOR PALETTE ──
  const cDark     = '#162e0c'; // Deep understory shadow
  const cDeepMid  = '#264714'; // Lower-mid rainforest canopy
  const cMid      = '#3a661c'; // Rich tropical foliage emerald
  const cLight    = '#548827'; // Sunlit leaf foliage
  const cSunlit   = '#72a832'; // Canopy dome highlight
  const cGoldTip  = '#94c840'; // Sunlit crest glint

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
  // Broadleaf tropical ferns, elephant ears, and shrubs covering the ground beneath the tree!
  drawCanopyCluster(84, 285, 46, 28, cDark, cDeepMid, cMid, cLight);
  drawCanopyCluster(172, 288, 48, 30, cDark, cDeepMid, cMid, cLight);
  drawCanopyCluster(128, 292, 54, 26, cDark, cDeepMid, cMid, cSunlit);
  drawCanopyCluster(54, 305, 36, 18, cDark, cDeepMid, cMid, cLight);
  drawCanopyCluster(202, 306, 38, 18, cDark, cDeepMid, cMid, cLight);
  drawCanopyCluster(128, 312, 60, 16, cDeepMid, cMid, cSunlit, cGoldTip);

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

  // Warm deep tropical foliage layers from background to foreground
  const bushFronds = [
    // Background layer (deeper forest shadow)
    { a: -1.35, l: 110, w: 26, s: '#1e2c0c', lC: '#2a3d12', h: '#3e581a' },
    { a: 1.30,  l: 112, w: 26, s: '#1e2c0c', lC: '#2a3d12', h: '#3e581a' },
    { a: -1.05, l: 128, w: 30, s: '#24340e', lC: '#344b16', h: '#4c6c20' },
    { a: 1.02,  l: 130, w: 30, s: '#24340e', lC: '#344b16', h: '#4c6c20' },
    // Mid layer (rich emerald foliage)
    { a: -0.72, l: 145, w: 34, s: '#2c3e10', lC: '#425f1a', h: '#5e8424' },
    { a: 0.68,  l: 148, w: 34, s: '#2c3e10', lC: '#425f1a', h: '#5e8424' },
    { a: -0.42, l: 156, w: 36, s: '#364c14', lC: '#527420', h: '#729e2c' },
    { a: 0.38,  l: 158, w: 36, s: '#364c14', lC: '#527420', h: '#729e2c' },
    { a: -0.15, l: 164, w: 38, s: '#3c5416', lC: '#5c8224', h: '#80ae32' },
    { a: 0.12,  l: 166, w: 38, s: '#3c5416', lC: '#5c8224', h: '#80ae32' },
    // Foreground spreading fan (sunlit foliage tips)
    { a: -0.88, l: 122, w: 32, s: '#405c18', lC: '#648e28', h: '#8ab836' },
    { a: 0.85,  l: 125, w: 32, s: '#405c18', lC: '#648e28', h: '#8ab836' },
    { a: -0.55, l: 136, w: 34, s: '#48661a', lC: '#709c2c', h: '#96c43c' },
    { a: 0.52,  l: 138, w: 34, s: '#48661a', lC: '#709c2c', h: '#96c43c' },
    { a: 0.0,   l: 146, w: 36, s: '#50701c', lC: '#7aa830', h: '#a2d242' },
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

let cachedPalmMat: THREE.MeshStandardMaterial | null = null;
let cachedJungleMat: THREE.MeshStandardMaterial | null = null;
let cachedBushMat: THREE.MeshStandardMaterial | null = null;

export function getVegMaterials(): {
  palmMat: THREE.MeshStandardMaterial;
  jungleMat: THREE.MeshStandardMaterial;
  bushMat: THREE.MeshStandardMaterial;
} {
  if (!cachedPalmMat) {
    cachedPalmMat = new THREE.MeshStandardMaterial({
      map: createPalmTreeSpriteTexture(),
      transparent: false,
      alphaTest: 0.28,
      depthWrite: true,
      roughness: 0.68,
      metalness: 0.02,
      side: THREE.DoubleSide,
    });
    cachedJungleMat = new THREE.MeshStandardMaterial({
      map: createJungleTreeSpriteTexture(),
      transparent: false,
      alphaTest: 0.32,
      depthWrite: true,
      roughness: 0.72,
      metalness: 0.02,
      side: THREE.DoubleSide,
    });
    cachedBushMat = new THREE.MeshStandardMaterial({
      map: createTropicalBushSpriteTexture(),
      transparent: false,
      alphaTest: 0.25,
      depthWrite: true,
      roughness: 0.74,
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
