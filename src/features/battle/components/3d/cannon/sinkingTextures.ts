import * as THREE from 'three';

let cachedRagingFlameTex: THREE.CanvasTexture | null = null;
let cachedDenseBlackSmokeTex: THREE.CanvasTexture | null = null;
let cachedDetonationBlastTex: THREE.CanvasTexture | null = null;
let cachedSteamVaporTex: THREE.CanvasTexture | null = null;

/**
 * Procedural Raging Fire Flame Sprite Texture
 * Multi-layer fiery tongue with incandescent white-hot core, intense golden-yellow body,
 * and fiery crimson lick edges.
 */
export function createRagingFlameTexture(): THREE.CanvasTexture {
  if (cachedRagingFlameTex) return cachedRagingFlameTex;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Outer red-orange radiant heat glow
  const outerGrad = ctx.createRadialGradient(64, 76, 4, 64, 64, 60);
  outerGrad.addColorStop(0, 'rgba(255, 140, 20, 0.95)');
  outerGrad.addColorStop(0.3, 'rgba(249, 115, 22, 0.85)');
  outerGrad.addColorStop(0.65, 'rgba(220, 38, 38, 0.5)');
  outerGrad.addColorStop(0.9, 'rgba(153, 27, 27, 0.15)');
  outerGrad.addColorStop(1, 'rgba(153, 27, 27, 0)');

  ctx.fillStyle = outerGrad;
  ctx.beginPath();
  ctx.arc(64, 64, 60, 0, Math.PI * 2);
  ctx.fill();

  // Multi-tongue flame tendrils rising upward
  ctx.fillStyle = 'rgba(254, 215, 170, 0.95)';
  const tongues = [
    { cx: 64, cy: 50, rx: 18, ry: 34 },
    { cx: 48, cy: 62, rx: 14, ry: 26 },
    { cx: 80, cy: 60, rx: 14, ry: 28 },
    { cx: 58, cy: 40, rx: 10, ry: 22 },
    { cx: 70, cy: 38, rx: 11, ry: 24 },
  ];
  for (const t of tongues) {
    ctx.beginPath();
    ctx.ellipse(t.cx, t.cy, t.rx, t.ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Intense incandescent white-hot inner core
  const coreGrad = ctx.createRadialGradient(64, 68, 0, 64, 68, 22);
  coreGrad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
  coreGrad.addColorStop(0.4, 'rgba(254, 240, 138, 0.95)');
  coreGrad.addColorStop(0.8, 'rgba(251, 146, 60, 0.6)');
  coreGrad.addColorStop(1, 'rgba(251, 146, 60, 0)');

  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.arc(64, 68, 22, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  cachedRagingFlameTex = texture;
  return texture;
}

/**
 * Procedural Dense Charcoal & Black Soot Smoke Texture
 * Volumetric multi-lobed puff with dark charcoal/slate core and soft fractal edges,
 * matching thick oily smoke from burning tarred ship oak.
 */
export function createDenseBlackSmokeTexture(): THREE.CanvasTexture {
  if (cachedDenseBlackSmokeTex) return cachedDenseBlackSmokeTex;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const drawLobe = (cx: number, cy: number, r: number, alpha: number, darkTone: string) => {
    const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, r);
    grad.addColorStop(0, `${darkTone}, ${alpha * 0.95})`);
    grad.addColorStop(0.45, `${darkTone}, ${alpha * 0.7})`);
    grad.addColorStop(0.78, `${darkTone}, ${alpha * 0.25})`);
    grad.addColorStop(1, `${darkTone}, 0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  };

  // Billowing irregular charcoal puff
  drawLobe(64, 64, 48, 0.95, 'rgba(20, 24, 33');
  drawLobe(46, 52, 38, 0.88, 'rgba(30, 36, 48');
  drawLobe(82, 50, 40, 0.9, 'rgba(24, 28, 40');
  drawLobe(50, 78, 42, 0.85, 'rgba(18, 22, 30');
  drawLobe(78, 76, 38, 0.88, 'rgba(28, 34, 46');
  drawLobe(64, 42, 32, 0.92, 'rgba(36, 44, 58');

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  cachedDenseBlackSmokeTex = texture;
  return texture;
}

/**
 * Procedural Catastrophic Magazine Explosion Fireball Texture
 * Dramatic jagged detonation burst with high-energy radial star spikes and glowing shock sphere.
 */
export function createExplosionDetonationTexture(): THREE.CanvasTexture {
  if (cachedDetonationBlastTex) return cachedDetonationBlastTex;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Outer expanding fiery shockwave
  const outerGrad = ctx.createRadialGradient(64, 64, 6, 64, 64, 62);
  outerGrad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
  outerGrad.addColorStop(0.18, 'rgba(254, 240, 138, 0.98)');
  outerGrad.addColorStop(0.42, 'rgba(249, 115, 22, 0.92)');
  outerGrad.addColorStop(0.7, 'rgba(220, 38, 38, 0.6)');
  outerGrad.addColorStop(0.9, 'rgba(127, 29, 29, 0.2)');
  outerGrad.addColorStop(1, 'rgba(127, 29, 29, 0)');

  ctx.fillStyle = outerGrad;
  ctx.beginPath();
  ctx.arc(64, 64, 62, 0, Math.PI * 2);
  ctx.fill();

  // Jagged explosive tendrils
  ctx.strokeStyle = 'rgba(254, 240, 138, 0.92)';
  ctx.lineWidth = 4;
  const spikes = 16;
  for (let i = 0; i < spikes; i++) {
    const angle = (i / spikes) * Math.PI * 2 + (i % 2 === 0 ? 0.1 : -0.12);
    const len = 42 + ((i * 23) % 20);
    ctx.beginPath();
    ctx.moveTo(64, 64);
    ctx.lineTo(64 + Math.cos(angle) * len, 64 + Math.sin(angle) * len);
    ctx.stroke();
  }

  // Brilliant nuclear center
  const centerGrad = ctx.createRadialGradient(64, 64, 0, 64, 64, 20);
  centerGrad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
  centerGrad.addColorStop(0.6, 'rgba(254, 249, 195, 0.98)');
  centerGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');

  ctx.fillStyle = centerGrad;
  ctx.beginPath();
  ctx.arc(64, 64, 20, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  cachedDetonationBlastTex = texture;
  return texture;
}

/**
 * Procedural Sizzling Water Steam Plume Texture
 * Soft billowy white-grey vapor puff created as hot timbers plunge into sea water.
 */
export function createSteamVaporTexture(): THREE.CanvasTexture {
  if (cachedSteamVaporTex) return cachedSteamVaporTex;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const drawSteamLobe = (cx: number, cy: number, r: number, alpha: number) => {
    const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, r);
    grad.addColorStop(0, `rgba(248, 250, 252, ${alpha})`);
    grad.addColorStop(0.4, `rgba(226, 232, 240, ${alpha * 0.75})`);
    grad.addColorStop(0.8, `rgba(203, 213, 225, ${alpha * 0.25})`);
    grad.addColorStop(1, 'rgba(203, 213, 225, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  };

  drawSteamLobe(64, 64, 46, 0.85);
  drawSteamLobe(48, 54, 36, 0.75);
  drawSteamLobe(80, 52, 38, 0.78);
  drawSteamLobe(54, 76, 38, 0.72);
  drawSteamLobe(76, 74, 36, 0.74);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  cachedSteamVaporTex = texture;
  return texture;
}
