import * as THREE from 'three';
import { hashNoise, fbmNoise, terrainTextureCache } from './noiseUtils';

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

  // Cross-cutting horizontal jointing steps
  for (let j = 0; j < 22; j++) {
    const jy = Math.random() * S;
    ctx.strokeStyle = `rgba(15, 12, 8, ${0.35 + Math.random() * 0.25})`;
    ctx.lineWidth = 1.4 + Math.random() * 1.6;
    ctx.beginPath();
    ctx.moveTo(0, jy);
    let curY = jy;
    for (let cx = 0; cx < S; cx += 22 + Math.random() * 22) {
      curY += (Math.random() - 0.5) * 12;
      ctx.lineTo(cx, curY);
    }
    ctx.stroke();
  }

  // Weathered iron/lichens & coastal mineral streaks
  for (let p = 0; p < 70; p++) {
    const px = Math.random() * S;
    const py = Math.random() * S;
    const pr = 12 + Math.random() * 45;
    const patchType = Math.random();

    let gradCol0: string, gradCol1: string;
    if (patchType < 0.35) {
      // Golden-olive tropical moss / crustose lichen (warm natural tone)
      gradCol0 = `rgba(74, 98, 38, ${0.22 + Math.random() * 0.22})`;
      gradCol1 = 'rgba(74, 98, 38, 0)';
    } else if (patchType < 0.7) {
      // Iron oxide rust seep (rich terracotta ochre)
      gradCol0 = `rgba(142, 68, 32, ${0.18 + Math.random() * 0.18})`;
      gradCol1 = 'rgba(142, 68, 32, 0)';
    } else {
      // Pale salt/calcite patina bloom
      gradCol0 = `rgba(165, 155, 140, ${0.15 + Math.random() * 0.15})`;
      gradCol1 = 'rgba(165, 155, 140, 0)';
    }

    const grad = ctx.createRadialGradient(px, py, 2, px, py, pr);
    grad.addColorStop(0, gradCol0);
    grad.addColorStop(1, gradCol1);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.fill();
  }

  // Coastal splash spray dark water stains at base (seamless vertical transition)
  const tideGrad = ctx.createLinearGradient(0, S * 0.82, 0, S);
  tideGrad.addColorStop(0, 'rgba(18, 14, 10, 0)');
  tideGrad.addColorStop(1, 'rgba(18, 14, 10, 0.42)');
  ctx.fillStyle = tideGrad;
  ctx.fillRect(0, S * 0.82, S, S * 0.18);

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
// 4. Dark Volcanic / Igneous Rock Texture for Secondary Outcrops
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
