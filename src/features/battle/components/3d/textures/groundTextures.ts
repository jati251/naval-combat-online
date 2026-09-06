import * as THREE from 'three';
import { hashNoise, fbmNoise, terrainTextureCache } from './noiseUtils';

// ────────────────────────────────────────────────────────────────────────
// 1. Rich Caribbean Beach Sand Texture & Bump Map
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
// 2. Lush Tropical Vegetation Texture
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
// 3. Rolling Hill Grass / Meadow Texture (for verdant hills & grassy ridges)
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
