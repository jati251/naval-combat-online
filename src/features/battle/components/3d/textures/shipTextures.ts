import * as THREE from 'three';

const shipTextureCache = new Map<string, THREE.CanvasTexture>();

/**
 * Generates an in-memory high-res weathered naval oak plank texture.
 */
export function createWoodPlankTexture(
  baseColorHex = '#5c3a21',
  grooveColorHex = '#27160c',
  plankCount = 6
): THREE.CanvasTexture {
  const cacheKey = `wood_${baseColorHex}_${grooveColorHex}_${plankCount}`;
  const cached = shipTextureCache.get(cacheKey);
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
  shipTextureCache.set(cacheKey, texture);
  return texture;
}

/**
 * Generates high-detail authentic 18th-century canvas sailcloth texture.
 * Features woven flax/linen cross threads, vertical cloth panels with double seams,
 * horizontal reef bands with rope reef points, corner cringle patches, and bolt ropes.
 */
export function createSailClothTexture(baseColorHex = '#f8fafc'): THREE.CanvasTexture {
  const cacheKey = `sail_${baseColorHex}_v2`;
  const cached = shipTextureCache.get(cacheKey);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // 1. Natural warm linen canvas base
  ctx.fillStyle = baseColorHex;
  ctx.fillRect(0, 0, 512, 512);

  // 2. Heavy woven cloth cross-weave texture
  ctx.fillStyle = 'rgba(0, 0, 0, 0.035)';
  for (let x = 0; x < 512; x += 4) {
    ctx.fillRect(x, 0, 2, 512);
  }
  for (let y = 0; y < 512; y += 4) {
    ctx.fillRect(0, y, 2, 512);
  }

  // 3. Vertical canvas panels with twin seam stitching
  const panelCount = 6;
  const panelWidth = 512 / panelCount;
  for (let p = 1; p < panelCount; p++) {
    const sx = p * panelWidth;

    // Seam fold shadow & highlight
    ctx.fillStyle = 'rgba(40, 30, 20, 0.22)';
    ctx.fillRect(sx - 2, 0, 3, 512);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.fillRect(sx + 2, 0, 2, 512);

    // Twin rows of waxed thread stitching dashes
    ctx.fillStyle = 'rgba(100, 75, 50, 0.45)';
    for (let sy = 3; sy < 512; sy += 10) {
      ctx.fillRect(sx - 3, sy, 2, 5);
      ctx.fillRect(sx + 2, sy, 2, 5);
    }
  }

  // 4. Horizontal Reef Bands (Naval Reefing Points for battle sails)
  const reefYLevels = [180, 310];
  for (const ry of reefYLevels) {
    // Heavy canvas reinforcement band
    ctx.fillStyle = 'rgba(50, 35, 20, 0.15)';
    ctx.fillRect(0, ry - 7, 512, 14);

    // Top and bottom stitch borders
    ctx.fillStyle = 'rgba(100, 75, 50, 0.35)';
    for (let rx = 8; rx < 512; rx += 12) {
      ctx.fillRect(rx, ry - 8, 6, 2);
      ctx.fillRect(rx, ry + 7, 6, 2);
    }

    // Hemp rope reef points (dangling tie cords with brass grommets)
    for (let rx = 32; rx < 512; rx += 48) {
      // Brass eyelet grommet
      ctx.fillStyle = '#854d0e';
      ctx.beginPath();
      ctx.arc(rx, ry, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(rx, ry, 1.8, 0, Math.PI * 2);
      ctx.fill();

      // Dangling reef point rope tail
      ctx.strokeStyle = 'rgba(75, 50, 25, 0.65)';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.quadraticCurveTo(rx + (Math.sin(rx) * 6), ry + 12, rx + (Math.cos(rx) * 8), ry + 22);
      ctx.stroke();
    }
  }

  // 5. Corner Reinforcement Cringles (Clews & Head Corners)
  const drawCornerCringle = (cx: number, cy: number, flipX: number, flipY: number) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(flipX, flipY);
    ctx.fillStyle = 'rgba(70, 50, 30, 0.28)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(45, 0);
    ctx.lineTo(0, 45);
    ctx.closePath();
    ctx.fill();

    // Heavy stitched arc border
    ctx.strokeStyle = 'rgba(90, 60, 30, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 36, 0, Math.PI * 0.5);
    ctx.stroke();

    // Corner brass grommet
    ctx.fillStyle = '#a16207';
    ctx.beginPath();
    ctx.arc(14, 14, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(14, 14, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  drawCornerCringle(0, 0, 1, 1);
  drawCornerCringle(512, 0, -1, 1);
  drawCornerCringle(0, 512, 1, -1);
  drawCornerCringle(512, 512, -1, -1);

  // 6. Perimeter Bolt Rope Border
  ctx.strokeStyle = 'rgba(70, 45, 20, 0.45)';
  ctx.lineWidth = 4.5;
  ctx.strokeRect(2, 2, 508, 508);

  // 7. Weathering & sun-illumination gradient (natural outdoor canvas lighting)
  const weatherGrad = ctx.createLinearGradient(0, 0, 0, 512);
  weatherGrad.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
  weatherGrad.addColorStop(0.3, 'rgba(255, 255, 255, 0.03)');
  weatherGrad.addColorStop(0.7, 'rgba(0, 0, 0, 0)');
  weatherGrad.addColorStop(1, 'rgba(80, 55, 30, 0.24)');
  ctx.fillStyle = weatherGrad;
  ctx.fillRect(0, 0, 512, 512);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  shipTextureCache.set(cacheKey, texture);
  return texture;
}
