import { CanvasTexture, RepeatWrapping } from 'three';

const cache = new Map<string, CanvasTexture>();

/** Height data stays linear; independent of paint color so every class shares it. */
export function getSurfaceBump(kind: 'wood' | 'cloth', planks = 8) {
  const key = `${kind}:${planks}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const context = canvas.getContext('2d')!;
  context.fillStyle = '#aaa';
  context.fillRect(0, 0, 256, 256);
  if (kind === 'wood') {
    for (let y = 0; y < 256; y++) {
      const tone = Math.round(155 + Math.sin(y * 1.7) * 15 + Math.sin(y * 0.37) * 8);
      context.strokeStyle = `rgb(${tone},${tone},${tone})`;
      context.beginPath();
      context.moveTo(0, y);
      context.bezierCurveTo(80, y + Math.sin(y) * 2, 160, y - Math.sin(y) * 2, 256, y);
      context.stroke();
    }
    context.fillStyle = '#444';
    for (let plank = 0; plank < planks; plank++) {
      context.fillRect(0, plank * 256 / planks, 256, 1);
      context.fillRect((plank % 3) * 80 + 12, plank * 256 / planks, 1, 256 / planks);
    }
  } else {
    context.fillStyle = '#888';
    for (let i = 0; i < 256; i += 4) {
      context.fillRect(i, 0, 1, 256);
      context.fillRect(0, i, 256, 1);
    }
    context.fillStyle = '#ddd';
    for (let i = 1; i < 6; i++) context.fillRect(i * 256 / 6, 0, 2, 256);
  }
  const texture = new CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.anisotropy = 4;
  cache.set(key, texture);
  return texture;
}
