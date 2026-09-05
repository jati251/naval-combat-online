import * as THREE from 'three';

const terrainTextureCache = new Map<string, THREE.CanvasTexture>();

// ────────────────────────────────────────────────────────────────────────
// Helper: simple 2D value noise for organic texture patterns
// ────────────────────────────────────────────────────────────────────────
function hashNoise(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return n - Math.floor(n);
}

function smoothNoise(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);

  const n00 = hashNoise(ix, iy);
  const n10 = hashNoise(ix + 1, iy);
  const n01 = hashNoise(ix, iy + 1);
  const n11 = hashNoise(ix + 1, iy + 1);

  const nx0 = n00 + (n10 - n00) * sx;
  const nx1 = n01 + (n11 - n01) * sx;
  return nx0 + (nx1 - nx0) * sy;
}

function fbmNoise(x: number, y: number, octaves: number): number {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1;
  for (let i = 0; i < octaves; i++) {
    value += amplitude * smoothNoise(x * frequency, y * frequency);
    amplitude *= 0.5;
    frequency *= 2.1;
  }
  return value;
}

/**
 * Rich tropical volcanic/limestone cliff rock texture (1024×1024).
 * Dark earthy basalt & sandstone with moss, lichen, exposed strata, and weathered cracks.
 */
export function createCliffRockTexture(): THREE.CanvasTexture {
  const cacheKey = 'cliff_rock_v2';
  const cached = terrainTextureCache.get(cacheKey);
  if (cached) return cached;

  const S = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // 1. Base: dark warm volcanic basalt/mudstone
  const baseR = 78, baseG = 62, baseB = 50;
  const imageData = ctx.createImageData(S, S);
  const data = imageData.data;

  for (let py = 0; py < S; py++) {
    for (let px = 0; px < S; px++) {
      const idx = (py * S + px) * 4;

      const n = fbmNoise(px * 0.012, py * 0.012, 5);
      const strata = Math.sin(py * 0.035 + n * 8) * 0.15 + Math.sin(py * 0.009 + n * 3) * 0.1;
      const streak = Math.sin(px * 0.04 + py * 0.01 + n * 6) * 0.06;

      const warmShift = fbmNoise(px * 0.008 + 50, py * 0.008 + 50, 3);
      const coolShift = fbmNoise(px * 0.006 + 100, py * 0.006, 3);

      let r = baseR + (n - 0.5) * 40 + strata * 45 + streak * 30 + warmShift * 25 - coolShift * 10;
      let g = baseG + (n - 0.5) * 35 + strata * 35 + streak * 25 + warmShift * 18 - coolShift * 8;
      let b = baseB + (n - 0.5) * 28 + strata * 25 + streak * 18 + warmShift * 8 + coolShift * 12;

      const grain = (hashNoise(px * 3.7, py * 3.7) - 0.5) * 18;
      r += grain;
      g += grain * 0.85;
      b += grain * 0.7;

      data[idx]     = Math.max(0, Math.min(255, r));
      data[idx + 1] = Math.max(0, Math.min(255, g));
      data[idx + 2] = Math.max(0, Math.min(255, b));
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imageData, 0, 0);

  // 2. Deep rock fissures and cracks
  for (let c = 0; c < 24; c++) {
    const cx = Math.random() * S;
    ctx.strokeStyle = `rgba(20, 15, 10, ${0.3 + Math.random() * 0.25})`;
    ctx.lineWidth = 1.5 + Math.random() * 2.5;
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    let curX = cx;
    for (let cy = 0; cy < S; cy += 16 + Math.random() * 16) {
      curX += (Math.random() - 0.5) * 20;
      ctx.lineTo(curX, cy);
    }
    ctx.stroke();

    // Lighter edge highlight
    ctx.strokeStyle = `rgba(130, 110, 90, ${0.12 + Math.random() * 0.08})`;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(cx + 2, 0);
    curX = cx + 2;
    for (let cy = 0; cy < S; cy += 16 + Math.random() * 16) {
      curX += (Math.random() - 0.5) * 20;
      ctx.lineTo(curX, cy);
    }
    ctx.stroke();
  }

  // 3. Horizontal cracks and ledges
  for (let h = 0; h < 12; h++) {
    const hy = Math.random() * S;
    ctx.strokeStyle = `rgba(25, 18, 12, ${0.2 + Math.random() * 0.15})`;
    ctx.lineWidth = 1 + Math.random() * 2;
    ctx.beginPath();
    ctx.moveTo(0, hy);
    let curY = hy;
    for (let hx = 0; hx < S; hx += 24 + Math.random() * 24) {
      curY += (Math.random() - 0.5) * 8;
      ctx.lineTo(hx, curY);
    }
    ctx.stroke();
  }

  // 4. Tropical moss & lichen patches
  for (let m = 0; m < 40; m++) {
    const mx = Math.random() * S;
    const my = Math.random() * S;
    const mr = 20 + Math.random() * 50;
    const mossType = Math.random();

    const mGrad = ctx.createRadialGradient(mx, my, mr * 0.05, mx, my, mr);
    if (mossType < 0.5) {
      mGrad.addColorStop(0, `rgba(34, 120, 50, ${0.35 + Math.random() * 0.2})`);
      mGrad.addColorStop(0.5, `rgba(28, 90, 38, ${0.2 + Math.random() * 0.1})`);
      mGrad.addColorStop(1, 'rgba(28, 90, 38, 0)');
    } else if (mossType < 0.8) {
      mGrad.addColorStop(0, `rgba(140, 150, 50, ${0.25 + Math.random() * 0.15})`);
      mGrad.addColorStop(0.5, `rgba(100, 120, 40, ${0.15 + Math.random() * 0.08})`);
      mGrad.addColorStop(1, 'rgba(100, 120, 40, 0)');
    } else {
      mGrad.addColorStop(0, `rgba(160, 100, 40, ${0.2 + Math.random() * 0.12})`);
      mGrad.addColorStop(0.5, `rgba(120, 80, 30, ${0.12 + Math.random() * 0.06})`);
      mGrad.addColorStop(1, 'rgba(120, 80, 30, 0)');
    }
    ctx.fillStyle = mGrad;
    ctx.beginPath();
    ctx.arc(mx, my, mr, 0, Math.PI * 2);
    ctx.fill();
  }

  // 5. Exposed mineral veins
  for (let v = 0; v < 8; v++) {
    const vx = Math.random() * S;
    ctx.strokeStyle = `rgba(180, 165, 140, ${0.15 + Math.random() * 0.12})`;
    ctx.lineWidth = 1 + Math.random() * 1.5;
    ctx.beginPath();
    let curX = vx;
    let curY = Math.random() * S;
    ctx.moveTo(curX, curY);
    for (let s = 0; s < 20; s++) {
      curX += (Math.random() - 0.5) * 40;
      curY += 12 + Math.random() * 16;
      ctx.lineTo(curX, curY);
    }
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  terrainTextureCache.set(cacheKey, texture);
  return texture;
}

/**
 * Rich Caribbean beach sand texture (1024×1024).
 */
export function createBeachSandTexture(): THREE.CanvasTexture {
  const cacheKey = 'beach_sand_v2';
  const cached = terrainTextureCache.get(cacheKey);
  if (cached) return cached;

  const S = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const baseR = 218, baseG = 185, baseB = 130;
  const imageData = ctx.createImageData(S, S);
  const data = imageData.data;

  for (let py = 0; py < S; py++) {
    for (let px = 0; px < S; px++) {
      const idx = (py * S + px) * 4;

      const n = fbmNoise(px * 0.015, py * 0.015, 4);
      const ripple = Math.sin(py * 0.08 + Math.sin(px * 0.02) * 3 + n * 4) * 0.08;
      const grain = (hashNoise(px * 5.3, py * 5.3) - 0.5) * 22;
      const damp = fbmNoise(px * 0.005 + 200, py * 0.005 + 200, 3);
      const dampFactor = damp > 0.55 ? (damp - 0.55) * 3 : 0;

      const r = baseR + (n - 0.5) * 30 + ripple * 25 + grain - dampFactor * 35;
      const g = baseG + (n - 0.5) * 25 + ripple * 20 + grain * 0.85 - dampFactor * 25;
      const b = baseB + (n - 0.5) * 18 + ripple * 12 + grain * 0.6 - dampFactor * 10;

      data[idx]     = Math.max(0, Math.min(255, r));
      data[idx + 1] = Math.max(0, Math.min(255, g));
      data[idx + 2] = Math.max(0, Math.min(255, b));
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imageData, 0, 0);

  // Shell fragments and pebbles
  for (let s = 0; s < 80; s++) {
    const sx = Math.random() * S;
    const sy = Math.random() * S;
    const sr = 2 + Math.random() * 4;
    const shellType = Math.random();

    if (shellType < 0.5) {
      ctx.fillStyle = `rgba(245, 240, 230, ${0.4 + Math.random() * 0.3})`;
    } else if (shellType < 0.8) {
      ctx.fillStyle = `rgba(80, 65, 50, ${0.3 + Math.random() * 0.2})`;
    } else {
      ctx.fillStyle = `rgba(220, 180, 160, ${0.3 + Math.random() * 0.25})`;
    }
    ctx.beginPath();
    ctx.ellipse(sx, sy, sr, sr * (0.5 + Math.random() * 0.5), Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  // Tide water ripple lines
  ctx.strokeStyle = 'rgba(180, 150, 100, 0.1)';
  ctx.lineWidth = 1.5;
  for (let r = 0; r < S; r += 28 + Math.random() * 16) {
    ctx.beginPath();
    for (let x = 0; x < S; x += 4) {
      const ry = r + Math.sin(x * 0.015 + r * 0.1) * 6;
      if (x === 0) ctx.moveTo(x, ry);
      else ctx.lineTo(x, ry);
    }
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  terrainTextureCache.set(cacheKey, texture);
  return texture;
}

/**
 * Lush tropical vegetation ground texture (1024×1024).
 */
export function createVegetationTexture(): THREE.CanvasTexture {
  const cacheKey = 'vegetation_v1';
  const cached = terrainTextureCache.get(cacheKey);
  if (cached) return cached;

  const S = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const baseR = 32, baseG = 90, baseB = 38;
  const imageData = ctx.createImageData(S, S);
  const data = imageData.data;

  for (let py = 0; py < S; py++) {
    for (let px = 0; px < S; px++) {
      const idx = (py * S + px) * 4;

      const n = fbmNoise(px * 0.02, py * 0.02, 5);
      const n2 = fbmNoise(px * 0.008 + 100, py * 0.008, 3);
      const dirt = n2 > 0.6 ? (n2 - 0.6) * 4 : 0;
      const grain = (hashNoise(px * 4.1, py * 4.1) - 0.5) * 20;

      const r = baseR + (n - 0.5) * 30 + dirt * 60 + grain * 0.6;
      const g = baseG + (n - 0.5) * 45 - dirt * 30 + grain * 0.8;
      const b = baseB + (n - 0.5) * 20 - dirt * 20 + grain * 0.4;

      data[idx]     = Math.max(0, Math.min(255, r));
      data[idx + 1] = Math.max(0, Math.min(255, g));
      data[idx + 2] = Math.max(0, Math.min(255, b));
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imageData, 0, 0);

  // Fallen leaf shapes
  for (let l = 0; l < 120; l++) {
    const lx = Math.random() * S;
    const ly = Math.random() * S;
    const ls = 4 + Math.random() * 8;
    const leafType = Math.random();

    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(Math.random() * Math.PI * 2);

    if (leafType < 0.4) {
      ctx.fillStyle = `rgba(45, 140, 50, ${0.25 + Math.random() * 0.2})`;
    } else if (leafType < 0.7) {
      ctx.fillStyle = `rgba(120, 100, 30, ${0.2 + Math.random() * 0.15})`;
    } else {
      ctx.fillStyle = `rgba(80, 55, 25, ${0.2 + Math.random() * 0.15})`;
    }
    ctx.beginPath();
    ctx.ellipse(0, 0, ls, ls * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Root/vine lines
  for (let r = 0; r < 10; r++) {
    ctx.strokeStyle = `rgba(60, 40, 20, ${0.15 + Math.random() * 0.1})`;
    ctx.lineWidth = 1 + Math.random() * 2;
    ctx.beginPath();
    let rx = Math.random() * S;
    let ry = Math.random() * S;
    ctx.moveTo(rx, ry);
    for (let s = 0; s < 12; s++) {
      rx += (Math.random() - 0.5) * 50;
      ry += 20 + Math.random() * 30;
      ctx.lineTo(rx, ry);
    }
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  terrainTextureCache.set(cacheKey, texture);
  return texture;
}

/**
 * Dark volcanic / igneous rock texture for secondary outcrops (512×512).
 */
export function createDarkRockTexture(): THREE.CanvasTexture {
  const cacheKey = 'dark_rock_v1';
  const cached = terrainTextureCache.get(cacheKey);
  if (cached) return cached;

  const S = 512;
  const canvas = document.createElement('canvas');
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const baseR = 52, baseG = 46, baseB = 40;
  const imageData = ctx.createImageData(S, S);
  const data = imageData.data;

  for (let py = 0; py < S; py++) {
    for (let px = 0; px < S; px++) {
      const idx = (py * S + px) * 4;

      const n = fbmNoise(px * 0.018, py * 0.018, 4);
      const grain = (hashNoise(px * 6.1, py * 6.1) - 0.5) * 15;
      const crystal = hashNoise(px * 12.3, py * 12.3) > 0.92 ? 40 : 0;

      const r = baseR + (n - 0.5) * 25 + grain + crystal;
      const g = baseG + (n - 0.5) * 22 + grain * 0.8 + crystal * 0.9;
      const b = baseB + (n - 0.5) * 18 + grain * 0.6 + crystal * 0.7;

      data[idx]     = Math.max(0, Math.min(255, r));
      data[idx + 1] = Math.max(0, Math.min(255, g));
      data[idx + 2] = Math.max(0, Math.min(255, b));
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imageData, 0, 0);

  // Cracks
  for (let c = 0; c < 16; c++) {
    const cx = Math.random() * S;
    ctx.strokeStyle = `rgba(10, 8, 5, ${0.3 + Math.random() * 0.2})`;
    ctx.lineWidth = 1 + Math.random() * 2;
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    let curX = cx;
    for (let cy = 0; cy < S; cy += 20 + Math.random() * 20) {
      curX += (Math.random() - 0.5) * 18;
      ctx.lineTo(curX, cy);
    }
    ctx.stroke();
  }

  // Subtle moss
  for (let m = 0; m < 15; m++) {
    const mx = Math.random() * S;
    const my = Math.random() * S;
    const mr = 10 + Math.random() * 25;
    const mGrad = ctx.createRadialGradient(mx, my, mr * 0.05, mx, my, mr);
    mGrad.addColorStop(0, `rgba(30, 80, 35, ${0.2 + Math.random() * 0.15})`);
    mGrad.addColorStop(0.6, `rgba(25, 60, 28, ${0.1 + Math.random() * 0.06})`);
    mGrad.addColorStop(1, 'rgba(25, 60, 28, 0)');
    ctx.fillStyle = mGrad;
    ctx.beginPath();
    ctx.arc(mx, my, mr, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  terrainTextureCache.set(cacheKey, texture);
  return texture;
}
