import * as THREE from 'three';

const textureCache = new Map<string, THREE.CanvasTexture>();

/**
 * Generates an in-memory high-res weathered naval oak plank texture.
 */
export function createWoodPlankTexture(
  baseColorHex = '#5c3a21',
  grooveColorHex = '#27160c',
  plankCount = 6
): THREE.CanvasTexture {
  const cacheKey = `wood_${baseColorHex}_${grooveColorHex}_${plankCount}`;
  const cached = textureCache.get(cacheKey);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Base wood tone
  ctx.fillStyle = baseColorHex;
  ctx.fillRect(0, 0, 512, 512);

  // Wood grain noise
  for (let y = 0; y < 512; y++) {
    const grainAlpha = (Math.sin(y * 0.4) * 0.5 + 0.5) * 0.12 + Math.random() * 0.08;
    ctx.fillStyle = Math.random() > 0.5 ? `rgba(255, 230, 200, ${grainAlpha})` : `rgba(0, 0, 0, ${grainAlpha})`;
    ctx.fillRect(0, y, 512, 1);
  }

  // Horizontal plank seams and iron bolts
  const plankHeight = 512 / plankCount;
  ctx.fillStyle = grooveColorHex;
  for (let i = 0; i <= plankCount; i++) {
    const y = i * plankHeight;
    // Dark groove
    ctx.fillRect(0, y - 2, 512, 4);

    // Weathered edge highlight
    ctx.fillStyle = 'rgba(255, 235, 200, 0.15)';
    ctx.fillRect(0, y + 2, 512, 1.5);
    ctx.fillStyle = grooveColorHex;

    // Iron rivets / bolts
    if (i < plankCount) {
      for (let bx = 32; bx < 512; bx += 64) {
        const by = y + plankHeight * 0.5 + (Math.sin(bx) * 4);
        ctx.fillStyle = '#18181b';
        ctx.beginPath();
        ctx.arc(bx, by, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#52525b';
        ctx.beginPath();
        ctx.arc(bx - 0.8, by - 0.8, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = grooveColorHex;
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  textureCache.set(cacheKey, texture);
  return texture;
}

/**
 * Generates an in-memory canvas sailcloth texture with vertical stitching and fabric weave.
 */
export function createSailClothTexture(baseColorHex = '#f8fafc'): THREE.CanvasTexture {
  const cacheKey = `sail_${baseColorHex}`;
  const cached = textureCache.get(cacheKey);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.fillStyle = baseColorHex;
  ctx.fillRect(0, 0, 256, 256);

  // Micro fabric cross-weave
  ctx.fillStyle = 'rgba(0, 0, 0, 0.04)';
  for (let x = 0; x < 256; x += 4) {
    ctx.fillRect(x, 0, 2, 256);
  }
  for (let y = 0; y < 256; y += 4) {
    ctx.fillRect(0, y, 2, 256);
  }

  // Vertical canvas seam panels
  const panelWidth = 256 / 4;
  for (let p = 1; p < 4; p++) {
    const sx = p * panelWidth;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
    ctx.fillRect(sx - 1, 0, 2, 256);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.fillRect(sx + 1, 0, 1.5, 256);

    // Stitched dashes
    ctx.fillStyle = 'rgba(120, 100, 80, 0.35)';
    for (let sy = 4; sy < 256; sy += 8) {
      ctx.fillRect(sx - 2, sy, 4, 3);
    }
  }

  // Soft atmospheric weather grime on lower edges
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
  grad.addColorStop(0.85, 'rgba(0, 0, 0, 0)');
  grad.addColorStop(1, 'rgba(80, 60, 40, 0.22)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Generates an in-memory limestone cliff rock texture with layered geological strata and moss.
 */
export function createCliffRockTexture(): THREE.CanvasTexture {
  const cacheKey = 'cliff_rock';
  const cached = textureCache.get(cacheKey);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Base limestone slate
  ctx.fillStyle = '#64748b';
  ctx.fillRect(0, 0, 512, 512);

  // Geological horizontal strata bands
  for (let y = 0; y < 512; y += 4) {
    const strata = Math.sin(y * 0.08) * 0.5 + Math.cos(y * 0.02) * 0.3;
    const alpha = (strata + 0.5) * 0.18;
    ctx.fillStyle = strata > 0 ? `rgba(226, 232, 240, ${alpha})` : `rgba(30, 41, 59, ${alpha * 1.5})`;
    ctx.fillRect(0, y, 512, 4);
  }

  // Vertical rock fissures and cracks
  for (let c = 0; c < 16; c++) {
    const cx = Math.random() * 512;
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.35)';
    ctx.lineWidth = 2 + Math.random() * 2;
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    let curX = cx;
    for (let cy = 0; cy < 512; cy += 32) {
      curX += (Math.random() - 0.5) * 24;
      ctx.lineTo(curX, cy);
    }
    ctx.stroke();
  }

  // Tropical moss / lichen patches on upper ledges
  for (let m = 0; m < 25; m++) {
    const mx = Math.random() * 512;
    const my = Math.random() * 256; // mostly upper section
    const mr = 15 + Math.random() * 30;
    const mGrad = ctx.createRadialGradient(mx, my, mr * 0.1, mx, my, mr);
    mGrad.addColorStop(0, 'rgba(34, 197, 94, 0.45)');
    mGrad.addColorStop(0.7, 'rgba(21, 128, 61, 0.25)');
    mGrad.addColorStop(1, 'rgba(21, 128, 61, 0)');
    ctx.fillStyle = mGrad;
    ctx.beginPath();
    ctx.arc(mx, my, mr, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  textureCache.set(cacheKey, texture);
  return texture;
}

/**
 * Generates an in-memory golden Caribbean beach sand texture with shoreline wave ripples.
 */
export function createBeachSandTexture(): THREE.CanvasTexture {
  const cacheKey = 'beach_sand';
  const cached = textureCache.get(cacheKey);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Warm golden sunlit sand
  ctx.fillStyle = '#fde047';
  ctx.fillRect(0, 0, 256, 256);

  // Sand granule specks
  for (let i = 0; i < 3000; i++) {
    const sx = Math.random() * 256;
    const sy = Math.random() * 256;
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(217, 119, 6, 0.18)' : 'rgba(254, 240, 138, 0.3)';
    ctx.fillRect(sx, sy, 1.5, 1.5);
  }

  // Subtle tide water ripple crests
  ctx.fillStyle = 'rgba(245, 158, 11, 0.12)';
  for (let r = 0; r < 256; r += 16) {
    ctx.beginPath();
    ctx.arc(128, r, 220, 0, Math.PI);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  textureCache.set(cacheKey, texture);
  return texture;
}
