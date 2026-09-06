import * as THREE from 'three';

const terrainTextureCache = new Map<string, THREE.CanvasTexture>();

// ────────────────────────────────────────────────────────────────────────
// Fast procedural noise helpers for organic geological textures
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
    frequency *= 2.05;
  }
  return value;
}

// ────────────────────────────────────────────────────────────────────────
// 1. Rich Tropical Volcanic / Limestone Cliff Rock Diffuse Texture
// ────────────────────────────────────────────────────────────────────────
export function createCliffRockTexture(): THREE.CanvasTexture {
  const cacheKey = 'cliff_rock_v3_hq';
  const cached = terrainTextureCache.get(cacheKey);
  if (cached) return cached;

  const S = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Base warm basalt/limestone palette
  const baseR = 76, baseG = 64, baseB = 52;
  const imageData = ctx.createImageData(S, S);
  const data = imageData.data;

  for (let py = 0; py < S; py++) {
    for (let px = 0; px < S; px++) {
      const idx = (py * S + px) * 4;

      // Multi-scale geological noise & natural angled bedding planes (20° tilt)
      const n = fbmNoise(px * 0.012, py * 0.012, 5);
      const angleStrata = px * 0.35 + py * 0.94;
      const strataPrimary = Math.sin(angleStrata * 0.018 + n * 5.2) * 0.16;
      const strataSecondary = Math.sin(angleStrata * 0.007 + n * 2.8) * 0.11;
      const verticalChutes = Math.sin(px * 0.024 + n * 4.2) * (0.07 + n * 0.06);

      const warmTone = fbmNoise(px * 0.007 + 30, py * 0.007 + 30, 3);
      const ironOchre = fbmNoise(px * 0.01 + 80, py * 0.01 + 80, 4) > 0.62 ? 35 : 0;
      const slateShift = fbmNoise(px * 0.005 + 150, py * 0.005 + 150, 3) * 20;

      let r = baseR + (n - 0.5) * 42 + (strataPrimary + strataSecondary) * 50 + verticalChutes * 25 + warmTone * 22 + ironOchre - slateShift * 0.4;
      let g = baseG + (n - 0.5) * 36 + (strataPrimary + strataSecondary) * 38 + verticalChutes * 20 + warmTone * 15 + ironOchre * 0.6 - slateShift * 0.2;
      let b = baseB + (n - 0.5) * 30 + (strataPrimary + strataSecondary) * 28 + verticalChutes * 15 + warmTone * 6 + slateShift * 0.6;

      // Fine mineral grain
      const grain = (hashNoise(px * 3.7, py * 3.7) - 0.5) * 20;
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

  // Deep vertical fissures and joint cracks
  for (let c = 0; c < 26; c++) {
    const cx = Math.random() * S;
    ctx.strokeStyle = `rgba(18, 14, 10, ${0.45 + Math.random() * 0.35})`;
    ctx.lineWidth = 1.8 + Math.random() * 2.8;
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    let curX = cx;
    for (let cy = 0; cy < S; cy += 14 + Math.random() * 14) {
      curX += (Math.random() - 0.5) * 22;
      ctx.lineTo(curX, cy);
    }
    ctx.stroke();

    // Sharp sunlit fracture edge
    ctx.strokeStyle = `rgba(175, 155, 128, ${0.28 + Math.random() * 0.15})`;
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(cx + 1.8, 0);
    curX = cx + 1.8;
    for (let cy = 0; cy < S; cy += 14 + Math.random() * 14) {
      curX += (Math.random() - 0.5) * 22;
      ctx.lineTo(curX, cy);
    }
    ctx.stroke();
  }

  // Segmented rock shelf ledges with authentic under-shelf cast shadows & top sunlit rims
  for (let h = 0; h < 32; h++) {
    const startX = Math.random() * S;
    const shelfWidth = 140 + Math.random() * 260;
    const startY = Math.random() * S;
    const tilt = (Math.random() - 0.5) * 0.4;

    // 1. Deep cast shadow underneath overhanging rock shelf
    ctx.strokeStyle = `rgba(10, 8, 6, ${0.45 + Math.random() * 0.35})`;
    ctx.lineWidth = 3.2 + Math.random() * 2.8;
    ctx.beginPath();
    ctx.moveTo(startX, startY + 2.4);
    for (let seg = 0; seg < shelfWidth; seg += 18) {
      const sx = (startX + seg) % S;
      const sy = startY + 2.4 + seg * tilt + (Math.sin(seg * 0.08) * 4);
      ctx.lineTo(sx, sy);
    }
    ctx.stroke();

    // 2. Structural joint crevice
    ctx.strokeStyle = `rgba(22, 16, 12, ${0.42 + Math.random() * 0.25})`;
    ctx.lineWidth = 1.4 + Math.random() * 1.8;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    for (let seg = 0; seg < shelfWidth; seg += 18) {
      const sx = (startX + seg) % S;
      const sy = startY + seg * tilt + (Math.sin(seg * 0.08) * 4);
      ctx.lineTo(sx, sy);
    }
    ctx.stroke();

    // 3. Top sunlit highlight rim on shelf upper crest
    ctx.strokeStyle = `rgba(220, 202, 172, ${0.32 + Math.random() * 0.22})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(startX, startY - 1.8);
    for (let seg = 0; seg < shelfWidth; seg += 18) {
      const sx = (startX + seg) % S;
      const sy = startY - 1.8 + seg * tilt + (Math.sin(seg * 0.08) * 4);
      ctx.lineTo(sx, sy);
    }
    ctx.stroke();
  }

  // Tropical cliff moss & lichen growth patches
  for (let m = 0; m < 55; m++) {
    const mx = Math.random() * S;
    const my = Math.random() * S;
    const mr = 18 + Math.random() * 60;
    const mossType = Math.random();

    const mGrad = ctx.createRadialGradient(mx, my, mr * 0.08, mx, my, mr);
    if (mossType < 0.45) {
      // Warm tropical golden-olive moss
      mGrad.addColorStop(0, `rgba(85, 122, 28, ${0.45 + Math.random() * 0.25})`);
      mGrad.addColorStop(0.55, `rgba(68, 96, 22, ${0.28 + Math.random() * 0.15})`);
      mGrad.addColorStop(1, 'rgba(68, 96, 22, 0)');
    } else if (mossType < 0.8) {
      // Sunlit golden-lime lichen
      mGrad.addColorStop(0, `rgba(165, 162, 46, ${0.35 + Math.random() * 0.2})`);
      mGrad.addColorStop(0.55, `rgba(125, 130, 34, ${0.2 + Math.random() * 0.1})`);
      mGrad.addColorStop(1, 'rgba(125, 130, 34, 0)');
    } else {
      // Dark warm cliff dampness
      mGrad.addColorStop(0, `rgba(38, 44, 22, ${0.4 + Math.random() * 0.2})`);
      mGrad.addColorStop(0.6, `rgba(45, 48, 26, ${0.2 + Math.random() * 0.1})`);
      mGrad.addColorStop(1, 'rgba(45, 48, 26, 0)');
    }
    ctx.fillStyle = mGrad;
    ctx.beginPath();
    ctx.arc(mx, my, mr, 0, Math.PI * 2);
    ctx.fill();
  }

  // Quartz & calcite mineral veins
  for (let v = 0; v < 12; v++) {
    const vx = Math.random() * S;
    ctx.strokeStyle = `rgba(215, 205, 185, ${0.22 + Math.random() * 0.18})`;
    ctx.lineWidth = 1.2 + Math.random() * 1.8;
    ctx.beginPath();
    let curX = vx;
    let curY = Math.random() * S;
    ctx.moveTo(curX, curY);
    for (let s = 0; s < 24; s++) {
      curX += (Math.random() - 0.5) * 45;
      curY += 10 + Math.random() * 18;
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

// ────────────────────────────────────────────────────────────────────────
// 2. High-Frequency Cliff Rock Bump / Height Map (for realistic 3D relief)
// ────────────────────────────────────────────────────────────────────────
export function createCliffRockBumpTexture(): THREE.CanvasTexture {
  const cacheKey = 'cliff_rock_bump_v1';
  const cached = terrainTextureCache.get(cacheKey);
  if (cached) return cached;

  const S = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const imageData = ctx.createImageData(S, S);
  const data = imageData.data;

  // Mid-gray baseline
  for (let py = 0; py < S; py++) {
    for (let px = 0; px < S; px++) {
      const idx = (py * S + px) * 4;

      const n1 = fbmNoise(px * 0.015, py * 0.015, 5);
      const n2 = fbmNoise(px * 0.04, py * 0.04, 3);
      // Natural angled strata matching rock diffuse texture
      const angleStrata = px * 0.35 + py * 0.94;
      const strata = Math.sin(angleStrata * 0.018 + n1 * 5.2) * 0.24 + Math.sin(angleStrata * 0.007 + n1 * 2.8) * 0.12;
      const grain = (hashNoise(px * 4.2, py * 4.2) - 0.5) * 32;

      let val = 128 + (n1 - 0.5) * 70 + (n2 - 0.5) * 35 + strata * 65 + grain;
      val = Math.max(0, Math.min(255, val));

      data[idx]     = val;
      data[idx + 1] = val;
      data[idx + 2] = val;
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imageData, 0, 0);

  // Deep recessed cracks (dark in height map)
  for (let c = 0; c < 26; c++) {
    const cx = Math.random() * S;
    ctx.strokeStyle = 'rgba(10, 10, 10, 0.75)';
    ctx.lineWidth = 2.0 + Math.random() * 2.5;
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    let curX = cx;
    for (let cy = 0; cy < S; cy += 14 + Math.random() * 14) {
      curX += (Math.random() - 0.5) * 22;
      ctx.lineTo(curX, cy);
    }
    ctx.stroke();

    // Raised lip on crack edge (bright height in bump map)
    ctx.strokeStyle = 'rgba(235, 235, 235, 0.45)';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(cx + 2, 0);
    curX = cx + 2;
    for (let cy = 0; cy < S; cy += 14 + Math.random() * 14) {
      curX += (Math.random() - 0.5) * 22;
      ctx.lineTo(curX, cy);
    }
    ctx.stroke();
  }

  // Segmented shelf ledges (raised top lip + recessed bottom joint)
  for (let h = 0; h < 26; h++) {
    const startX = Math.random() * S;
    const shelfWidth = 140 + Math.random() * 260;
    const startY = Math.random() * S;
    const tilt = (Math.random() - 0.5) * 0.4;

    // Recessed joint underneath
    ctx.strokeStyle = 'rgba(20, 20, 20, 0.65)';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(startX, startY + 2);
    for (let seg = 0; seg < shelfWidth; seg += 18) {
      const sx = (startX + seg) % S;
      const sy = startY + 2 + seg * tilt + (Math.sin(seg * 0.08) * 4);
      ctx.lineTo(sx, sy);
    }
    ctx.stroke();

    // Raised top lip
    ctx.strokeStyle = 'rgba(240, 240, 240, 0.55)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(startX, startY - 1.5);
    for (let seg = 0; seg < shelfWidth; seg += 18) {
      const sx = (startX + seg) % S;
      const sy = startY - 1.5 + seg * tilt + (Math.sin(seg * 0.08) * 4);
      ctx.lineTo(sx, sy);
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

// ────────────────────────────────────────────────────────────────────────
// 3. Cliff Rock Roughness Map (differentiating matte stone, velvet moss, & minerals)
// ────────────────────────────────────────────────────────────────────────
export function createCliffRockRoughnessTexture(): THREE.CanvasTexture {
  const cacheKey = 'cliff_rock_roughness_v1';
  const cached = terrainTextureCache.get(cacheKey);
  if (cached) return cached;

  const S = 512;
  const canvas = document.createElement('canvas');
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const imageData = ctx.createImageData(S, S);
  const data = imageData.data;

  // Base stone roughness ~0.82 (210/255)
  for (let py = 0; py < S; py++) {
    for (let px = 0; px < S; px++) {
      const idx = (py * S + px) * 4;

      const n = fbmNoise(px * 0.02, py * 0.02, 4);
      const grain = (hashNoise(px * 5.1, py * 5.1) - 0.5) * 25;
      let r = 210 + (n - 0.5) * 40 + grain;

      // Quartz veins / polished rock patches are smoother (~0.4 roughness)
      const smoothStreak = hashNoise(px * 0.04 + py * 0.01, 12.3);
      if (smoothStreak > 0.94) {
        r = 110;
      }

      r = Math.max(70, Math.min(255, r));

      data[idx]     = r;
      data[idx + 1] = r;
      data[idx + 2] = r;
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imageData, 0, 0);

  // Moss patches are velvety matte (high roughness 0.96 -> ~245)
  for (let m = 0; m < 30; m++) {
    const mx = Math.random() * S;
    const my = Math.random() * S;
    const mr = 15 + Math.random() * 35;
    const grad = ctx.createRadialGradient(mx, my, 0, mx, my, mr);
    grad.addColorStop(0, 'rgba(250, 250, 250, 0.7)');
    grad.addColorStop(1, 'rgba(210, 210, 210, 0)');
    ctx.fillStyle = grad;
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

// ────────────────────────────────────────────────────────────────────────
// 4. Rich Caribbean Beach Sand Texture & Bump Map
// ────────────────────────────────────────────────────────────────────────
export function createBeachSandTexture(): THREE.CanvasTexture {
  const cacheKey = 'beach_sand_v3';
  const cached = terrainTextureCache.get(cacheKey);
  if (cached) return cached;

  const S = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const baseR = 222, baseG = 192, baseB = 138;
  const imageData = ctx.createImageData(S, S);
  const data = imageData.data;

  for (let py = 0; py < S; py++) {
    for (let px = 0; px < S; px++) {
      const idx = (py * S + px) * 4;

      const n = fbmNoise(px * 0.015, py * 0.015, 4);
      // Gentle wind/water ripple bands
      const ripple = Math.sin(py * 0.09 + Math.sin(px * 0.02) * 3.5 + n * 4) * 0.09;
      const grain = (hashNoise(px * 5.7, py * 5.7) - 0.5) * 24;
      const damp = fbmNoise(px * 0.006 + 200, py * 0.006 + 200, 3);
      const dampFactor = damp > 0.54 ? (damp - 0.54) * 3.2 : 0;

      const r = baseR + (n - 0.5) * 28 + ripple * 28 + grain - dampFactor * 36;
      const g = baseG + (n - 0.5) * 24 + ripple * 22 + grain * 0.85 - dampFactor * 28;
      const b = baseB + (n - 0.5) * 16 + ripple * 14 + grain * 0.6 - dampFactor * 14;

      data[idx]     = Math.max(0, Math.min(255, r));
      data[idx + 1] = Math.max(0, Math.min(255, g));
      data[idx + 2] = Math.max(0, Math.min(255, b));
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imageData, 0, 0);

  // Shell fragments and tiny coastal pebbles
  for (let s = 0; s < 100; s++) {
    const sx = Math.random() * S;
    const sy = Math.random() * S;
    const sr = 2 + Math.random() * 4.5;
    const shellType = Math.random();

    if (shellType < 0.45) {
      ctx.fillStyle = `rgba(248, 244, 235, ${0.5 + Math.random() * 0.3})`;
    } else if (shellType < 0.75) {
      ctx.fillStyle = `rgba(75, 60, 48, ${0.35 + Math.random() * 0.25})`;
    } else {
      ctx.fillStyle = `rgba(225, 175, 155, ${0.4 + Math.random() * 0.25})`;
    }
    ctx.beginPath();
    ctx.ellipse(sx, sy, sr, sr * (0.45 + Math.random() * 0.45), Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  // Soft tidal ripple lines with micro cast-shadows and sunlit crests
  for (let r = 0; r < S; r += 28 + Math.random() * 20) {
    // 1. Trough shadow
    ctx.strokeStyle = 'rgba(120, 95, 65, 0.20)';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    for (let x = 0; x < S; x += 4) {
      const ry = r + Math.sin(x * 0.018 + r * 0.1) * 7;
      if (x === 0) ctx.moveTo(x, ry + 1.2);
      else ctx.lineTo(x, ry + 1.2);
    }
    ctx.stroke();

    // 2. Crest sunlit highlight
    ctx.strokeStyle = 'rgba(255, 245, 220, 0.22)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let x = 0; x < S; x += 4) {
      const ry = r + Math.sin(x * 0.018 + r * 0.1) * 7;
      if (x === 0) ctx.moveTo(x, ry - 0.8);
      else ctx.lineTo(x, ry - 0.8);
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

export function createBeachSandBumpTexture(): THREE.CanvasTexture {
  const cacheKey = 'beach_sand_bump_v1';
  const cached = terrainTextureCache.get(cacheKey);
  if (cached) return cached;

  const S = 512;
  const canvas = document.createElement('canvas');
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const imageData = ctx.createImageData(S, S);
  const data = imageData.data;

  for (let py = 0; py < S; py++) {
    for (let px = 0; px < S; px++) {
      const idx = (py * S + px) * 4;

      const ripple = Math.sin(py * 0.1 + Math.sin(px * 0.03) * 3) * 22;
      const grain = (hashNoise(px * 7.1, py * 7.1) - 0.5) * 16;
      let val = 128 + ripple + grain;
      val = Math.max(0, Math.min(255, val));

      data[idx]     = val;
      data[idx + 1] = val;
      data[idx + 2] = val;
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imageData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  terrainTextureCache.set(cacheKey, texture);
  return texture;
}

// ────────────────────────────────────────────────────────────────────────
// 5. Lush Tropical Vegetation & Hill Grass Texture
// ────────────────────────────────────────────────────────────────────────
export function createVegetationTexture(): THREE.CanvasTexture {
  const cacheKey = 'vegetation_v2_lush';
  const cached = terrainTextureCache.get(cacheKey);
  if (cached) return cached;

  const S = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const baseR = 76, baseG = 114, baseB = 28;
  const imageData = ctx.createImageData(S, S);
  const data = imageData.data;

  for (let py = 0; py < S; py++) {
    for (let px = 0; px < S; px++) {
      const idx = (py * S + px) * 4;

      const n = fbmNoise(px * 0.02, py * 0.02, 5);
      const n2 = fbmNoise(px * 0.008 + 100, py * 0.008 + 100, 3);
      const soilExposure = n2 > 0.62 ? (n2 - 0.62) * 3.8 : 0;
      const grain = (hashNoise(px * 4.3, py * 4.3) - 0.5) * 22;

      const r = baseR + (n - 0.5) * 32 + soilExposure * 60 + grain * 0.6;
      const g = baseG + (n - 0.5) * 44 - soilExposure * 30 + grain * 0.8;
      const b = baseB + (n - 0.5) * 18 - soilExposure * 18 + grain * 0.4;

      data[idx]     = Math.max(0, Math.min(255, r));
      data[idx + 1] = Math.max(0, Math.min(255, g));
      data[idx + 2] = Math.max(0, Math.min(255, b));
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imageData, 0, 0);

  // Tropical broadleaf and clover scatter
  for (let l = 0; l < 140; l++) {
    const lx = Math.random() * S;
    const ly = Math.random() * S;
    const ls = 4 + Math.random() * 9;
    const leafType = Math.random();

    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(Math.random() * Math.PI * 2);

    if (leafType < 0.45) {
      ctx.fillStyle = `rgba(125, 172, 38, ${0.32 + Math.random() * 0.25})`;
    } else if (leafType < 0.75) {
      ctx.fillStyle = `rgba(162, 172, 44, ${0.24 + Math.random() * 0.16})`;
    } else {
      ctx.fillStyle = `rgba(98, 72, 28, ${0.22 + Math.random() * 0.16})`;
    }
    ctx.beginPath();
    ctx.ellipse(0, 0, ls, ls * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  terrainTextureCache.set(cacheKey, texture);
  return texture;
}

// ────────────────────────────────────────────────────────────────────────
// 6. Rolling Hill Grass / Meadow Texture (for verdant hills & grassy ridges)
// ────────────────────────────────────────────────────────────────────────
export function createHillGrassTexture(): THREE.CanvasTexture {
  const cacheKey = 'hill_grass_v2_warm';
  const cached = terrainTextureCache.get(cacheKey);
  if (cached) return cached;

  const S = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const baseR = 92, baseG = 128, baseB = 34;
  const imageData = ctx.createImageData(S, S);
  const data = imageData.data;

  for (let py = 0; py < S; py++) {
    for (let px = 0; px < S; px++) {
      const idx = (py * S + px) * 4;

      const n1 = fbmNoise(px * 0.018, py * 0.018, 5);
      const n2 = fbmNoise(px * 0.05, py * 0.05, 3);
      const dryPatch = fbmNoise(px * 0.007 + 77, py * 0.007 + 77, 3);
      const isDry = dryPatch > 0.65 ? (dryPatch - 0.65) * 3 : 0;
      const grain = (hashNoise(px * 5.2, py * 5.2) - 0.5) * 20;

      const r = baseR + (n1 - 0.5) * 28 + (n2 - 0.5) * 18 + isDry * 55 + grain;
      const g = baseG + (n1 - 0.5) * 45 + (n2 - 0.5) * 25 - isDry * 15 + grain * 0.9;
      const b = baseB + (n1 - 0.5) * 20 + (n2 - 0.5) * 12 - isDry * 25 + grain * 0.5;

      data[idx]     = Math.max(0, Math.min(255, r));
      data[idx + 1] = Math.max(0, Math.min(255, g));
      data[idx + 2] = Math.max(0, Math.min(255, b));
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imageData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  terrainTextureCache.set(cacheKey, texture);
  return texture;
}

// ────────────────────────────────────────────────────────────────────────
// 7. Dark Volcanic / Igneous Rock Texture for Secondary Outcrops
// ────────────────────────────────────────────────────────────────────────
export function createDarkRockTexture(): THREE.CanvasTexture {
  const cacheKey = 'dark_rock_v2';
  const cached = terrainTextureCache.get(cacheKey);
  if (cached) return cached;

  const S = 512;
  const canvas = document.createElement('canvas');
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const baseR = 48, baseG = 42, baseB = 38;
  const imageData = ctx.createImageData(S, S);
  const data = imageData.data;

  for (let py = 0; py < S; py++) {
    for (let px = 0; px < S; px++) {
      const idx = (py * S + px) * 4;

      const n = fbmNoise(px * 0.02, py * 0.02, 4);
      const grain = (hashNoise(px * 6.5, py * 6.5) - 0.5) * 18;
      const crystal = hashNoise(px * 13.1, py * 13.1) > 0.9 ? 45 : 0;

      const r = baseR + (n - 0.5) * 28 + grain + crystal;
      const g = baseG + (n - 0.5) * 24 + grain * 0.8 + crystal * 0.9;
      const b = baseB + (n - 0.5) * 20 + grain * 0.6 + crystal * 0.7;

      data[idx]     = Math.max(0, Math.min(255, r));
      data[idx + 1] = Math.max(0, Math.min(255, g));
      data[idx + 2] = Math.max(0, Math.min(255, b));
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imageData, 0, 0);

  // Basalt cracks
  for (let c = 0; c < 18; c++) {
    const cx = Math.random() * S;
    ctx.strokeStyle = `rgba(10, 8, 5, ${0.4 + Math.random() * 0.25})`;
    ctx.lineWidth = 1.2 + Math.random() * 2.2;
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    let curX = cx;
    for (let cy = 0; cy < S; cy += 18 + Math.random() * 18) {
      curX += (Math.random() - 0.5) * 20;
      ctx.lineTo(curX, cy);
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
