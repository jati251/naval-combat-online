import * as THREE from 'three';

/**
 * Procedural 2D Particle Sprite Textures (Generated on Canvas)
 */

export function createMuzzleFlashTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Explosive fiery orange/yellow starburst
  const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 60);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
  grad.addColorStop(0.2, 'rgba(254, 240, 138, 0.95)');
  grad.addColorStop(0.45, 'rgba(249, 115, 22, 0.8)');
  grad.addColorStop(0.8, 'rgba(239, 68, 68, 0.3)');
  grad.addColorStop(1, 'rgba(239, 68, 68, 0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(64, 64, 60, 0, Math.PI * 2);
  ctx.fill();

  // Fiery spikes
  ctx.strokeStyle = 'rgba(254, 215, 170, 0.8)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(64, 64);
    ctx.lineTo(64 + Math.cos(a) * 58, 64 + Math.sin(a) * 58);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export function createGunpowderSmokeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const drawLobe = (cx: number, cy: number, r: number, alpha: number) => {
    const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, r);
    grad.addColorStop(0, `rgba(225, 231, 239, ${alpha})`);
    grad.addColorStop(0.4, `rgba(180, 190, 205, ${alpha * 0.7})`);
    grad.addColorStop(0.8, `rgba(140, 150, 165, ${alpha * 0.25})`);
    grad.addColorStop(1, 'rgba(140, 150, 165, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  };

  drawLobe(64, 64, 45, 0.85);
  drawLobe(48, 52, 34, 0.7);
  drawLobe(78, 56, 36, 0.7);
  drawLobe(55, 78, 38, 0.65);
  drawLobe(74, 76, 35, 0.65);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export function createSparkTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 28);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
  grad.addColorStop(0.3, 'rgba(254, 215, 170, 0.9)');
  grad.addColorStop(0.6, 'rgba(249, 115, 22, 0.5)');
  grad.addColorStop(1, 'rgba(234, 88, 12, 0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(32, 32, 28, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export function createWaterPlumeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const grad = ctx.createRadialGradient(32, 90, 4, 32, 64, 50);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
  grad.addColorStop(0.4, 'rgba(224, 242, 254, 0.8)');
  grad.addColorStop(0.7, 'rgba(186, 230, 253, 0.35)');
  grad.addColorStop(1, 'rgba(186, 230, 253, 0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(32, 64, 26, 58, 0, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}
