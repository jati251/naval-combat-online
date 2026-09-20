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

  // 1. Broad outer explosive fireball glow
  const outerGrad = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  outerGrad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
  outerGrad.addColorStop(0.18, 'rgba(254, 240, 138, 0.98)');
  outerGrad.addColorStop(0.38, 'rgba(251, 146, 60, 0.9)');
  outerGrad.addColorStop(0.65, 'rgba(239, 68, 68, 0.55)');
  outerGrad.addColorStop(0.88, 'rgba(185, 28, 28, 0.2)');
  outerGrad.addColorStop(1, 'rgba(153, 27, 27, 0)');

  ctx.fillStyle = outerGrad;
  ctx.beginPath();
  ctx.arc(64, 64, 62, 0, Math.PI * 2);
  ctx.fill();

  // 2. High-energy jagged explosive flame tendrils
  ctx.strokeStyle = 'rgba(254, 215, 170, 0.95)';
  ctx.lineWidth = 3.5;
  const spikes = 12;
  for (let i = 0; i < spikes; i++) {
    const angle = (i / spikes) * Math.PI * 2 + (i % 2 ? 0.15 : -0.1);
    const len = 38 + ((i * 17) % 24);
    ctx.beginPath();
    ctx.moveTo(64, 64);
    ctx.lineTo(64 + Math.cos(angle) * len, 64 + Math.sin(angle) * len);
    ctx.stroke();
  }

  // 3. Ultra-bright white-hot core starburst
  const coreGrad = ctx.createRadialGradient(64, 64, 0, 64, 64, 18);
  coreGrad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
  coreGrad.addColorStop(0.5, 'rgba(254, 249, 195, 0.95)');
  coreGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.arc(64, 64, 18, 0, Math.PI * 2);
  ctx.fill();

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

  const drawLobe = (cx: number, cy: number, r: number, alpha: number, isDark = false) => {
    const grad = ctx.createRadialGradient(cx, cy, 1, cx, cy, r);
    if (isDark) {
      grad.addColorStop(0, `rgba(55, 65, 81, ${alpha * 0.9})`);
      grad.addColorStop(0.45, `rgba(75, 85, 99, ${alpha * 0.6})`);
      grad.addColorStop(0.8, `rgba(107, 114, 128, ${alpha * 0.2})`);
      grad.addColorStop(1, 'rgba(107, 114, 128, 0)');
    } else {
      grad.addColorStop(0, `rgba(243, 244, 246, ${alpha})`);
      grad.addColorStop(0.35, `rgba(209, 213, 219, ${alpha * 0.8})`);
      grad.addColorStop(0.75, `rgba(156, 163, 175, ${alpha * 0.3})`);
      grad.addColorStop(1, 'rgba(156, 163, 175, 0)');
    }
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  };

  // Volumetric multi-lobed gunpowder cloud with dark charcoal core and billowy edges
  drawLobe(64, 64, 46, 0.9, true);
  drawLobe(46, 48, 36, 0.85);
  drawLobe(82, 52, 38, 0.85);
  drawLobe(52, 80, 40, 0.8);
  drawLobe(78, 78, 38, 0.8);
  drawLobe(64, 60, 30, 0.95);

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

  // Intense burning ember with diamond flare
  const grad = ctx.createRadialGradient(32, 32, 1, 32, 32, 30);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
  grad.addColorStop(0.25, 'rgba(254, 240, 138, 0.95)');
  grad.addColorStop(0.55, 'rgba(249, 115, 22, 0.7)');
  grad.addColorStop(0.85, 'rgba(220, 38, 38, 0.25)');
  grad.addColorStop(1, 'rgba(220, 38, 38, 0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(32, 32, 30, 0, Math.PI * 2);
  ctx.fill();

  // Cross flare
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(32, 10);
  ctx.lineTo(32, 54);
  ctx.moveTo(10, 32);
  ctx.lineTo(54, 32);
  ctx.stroke();

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

  // Conical high-pressure water column
  const grad = ctx.createRadialGradient(32, 96, 4, 32, 64, 52);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
  grad.addColorStop(0.3, 'rgba(240, 249, 255, 0.95)');
  grad.addColorStop(0.55, 'rgba(186, 230, 253, 0.75)');
  grad.addColorStop(0.8, 'rgba(125, 211, 252, 0.35)');
  grad.addColorStop(1, 'rgba(125, 211, 252, 0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(32, 64, 28, 60, 0, 0, Math.PI * 2);
  ctx.fill();

  // Foamy top crown droplets
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  for (let i = 0; i < 6; i++) {
    const rx = 20 + Math.random() * 24;
    const ry = 14 + Math.random() * 26;
    ctx.beginPath();
    ctx.arc(rx, ry, 2.5 + Math.random() * 2, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Superheated Molten Cannonball Texture:
 * Incandescent white-hot kinetic core enveloped in blazing yellow/orange halo
 * with a realistic dark cast-iron silhouette.
 */
export function createMoltenCannonballTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Outer radiant heat corona
  const heatGrad = ctx.createRadialGradient(64, 64, 28, 64, 64, 62);
  heatGrad.addColorStop(0, 'rgba(249, 115, 22, 0.75)');
  heatGrad.addColorStop(0.45, 'rgba(239, 68, 68, 0.4)');
  heatGrad.addColorStop(0.8, 'rgba(185, 28, 28, 0.15)');
  heatGrad.addColorStop(1, 'rgba(185, 28, 28, 0)');
  ctx.fillStyle = heatGrad;
  ctx.beginPath();
  ctx.arc(64, 64, 62, 0, Math.PI * 2);
  ctx.fill();

  // Solid cast iron sphere body
  const ironGrad = ctx.createRadialGradient(50, 50, 4, 64, 64, 38);
  ironGrad.addColorStop(0, '#fef08a'); // Superheated molten specular reflection
  ironGrad.addColorStop(0.18, '#f97316');
  ironGrad.addColorStop(0.42, '#7c2d12');
  ironGrad.addColorStop(0.72, '#18181b');
  ironGrad.addColorStop(0.95, '#09090b');
  ironGrad.addColorStop(1, 'rgba(9, 9, 11, 0.9)');
  ctx.fillStyle = ironGrad;
  ctx.beginPath();
  ctx.arc(64, 64, 38, 0, Math.PI * 2);
  ctx.fill();

  // Molten white-hot kinetic core
  const coreGrad = ctx.createRadialGradient(50, 50, 0, 50, 50, 16);
  coreGrad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
  coreGrad.addColorStop(0.5, 'rgba(254, 240, 138, 0.8)');
  coreGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.arc(50, 50, 16, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Soft radiant bloom flare for flying cannonballs
 */
export function createCannonballFlareTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
  grad.addColorStop(0.2, 'rgba(254, 240, 138, 0.9)');
  grad.addColorStop(0.45, 'rgba(249, 115, 22, 0.6)');
  grad.addColorStop(0.75, 'rgba(239, 68, 68, 0.2)');
  grad.addColorStop(1, 'rgba(239, 68, 68, 0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(32, 32, 30, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

