import * as THREE from 'three';

const SIZE = 256;
const wrap = (x: number, period: number) => ((x % period) + period) % period;
function hash(x: number, y: number, period: number): number {
  const value = Math.sin(wrap(x, period) * 127.1 + wrap(y, period) * 311.7) * 43758.5453;
  return value - Math.floor(value);
}
function noise(x: number, y: number, period: number): number {
  const ix = Math.floor(x), iy = Math.floor(y);
  let fx = x - ix, fy = y - iy;
  fx *= fx * (3 - 2 * fx); fy *= fy * (3 - 2 * fy);
  const a = hash(ix, iy, period), b = hash(ix + 1, iy, period);
  const c = hash(ix, iy + 1, period), d = hash(ix + 1, iy + 1, period);
  return (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy;
}
function texture(data: Uint8Array, size = SIZE) {
  const result = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  result.wrapS = result.wrapT = THREE.RepeatWrapping;
  result.minFilter = THREE.LinearMipmapLinearFilter;
  result.magFilter = THREE.LinearFilter;
  result.generateMipmaps = true;
  result.needsUpdate = true;
  return result;
}
let weatherNoise: THREE.DataTexture | undefined;
let oceanDetail: THREE.DataTexture | undefined;

/** Shared, tileable noise. Mipmaps filter detail instead of flickering shader hashes. */
export function getWeatherNoise(): THREE.DataTexture {
  if (weatherNoise) return weatherNoise;
  const data = new Uint8Array(SIZE * SIZE * 4);
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
    let value = 0, weight = 0.52;
    for (let octave = 0; octave < 5; octave++) {
      const frequency = 4 * 2 ** octave;
      value += noise(x / SIZE * frequency, y / SIZE * frequency, frequency) * weight;
      weight *= 0.5;
    }
    const i = (y * SIZE + x) * 4;
    data[i] = Math.round(value * 255);
    data[i + 1] = Math.round(noise(x / SIZE * 16, y / SIZE * 16, 16) * 255);
    data[i + 2] = hash(x, y, SIZE) > 0.998 ? 255 : 0; data[i + 3] = 255;
  }
  return weatherNoise = texture(data);
}

export function getOceanDetail(): THREE.DataTexture {
  if (oceanDetail) return oceanDetail;
  const size = 512;
  const data = new Uint8Array(size * size * 4);
  const heights = new Float32Array(size * size);
  // A broad directional spectrum avoids the visible crossing stripes of a few sine waves.
  const modes = Array.from({ length: 40 }, (_, i) => {
    const frequency = 5 * 2 ** (i / 10);
    const kx = Math.max(1, Math.round(frequency * (0.65 + hash(i, 31, 101) * 0.7)));
    const kz = Math.round(frequency * (hash(i, 73, 101) - 0.5) * 1.5);
    return { kx, kz, phase: hash(i, 17, 101) * Math.PI * 2,
      amplitude: 0.08 / Math.hypot(kx, kz) / Math.sqrt(40) };
  });
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size, v = y / size;
    const warpX = (noise(u * 4, v * 4, 4) - 0.5) * 0.035;
    const warpY = (noise(u * 4 + 1.7, v * 4 + 2.3, 4) - 0.5) * 0.035;
    let height = 0;
    for (const mode of modes) {
      height += Math.sin(2 * Math.PI * (mode.kx * (u + warpX) + mode.kz * (v + warpY)) + mode.phase) * mode.amplitude;
    }
    heights[y * size + x] = height;
  }
  const byte = (v: number) => Math.round(Math.max(0, Math.min(1, v)) * 255);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dx = (heights[y * size + wrap(x + 1, size)] - heights[y * size + wrap(x - 1, size)]) * size * 0.5;
    const dz = (heights[wrap(y + 1, size) * size + x] - heights[wrap(y - 1, size) * size + x]) * size * 0.5;
    const px = x / size * 24, py = y / size * 24;
    const ix = Math.floor(px), iy = Math.floor(py);
    let nearest = 2, second = 2;
    for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
      const cx = ix + ox, cy = iy + oy;
      const distance = Math.hypot(cx + hash(cx, cy, 24) - px, cy + hash(cx + 37, cy + 13, 24) - py);
      if (distance < nearest) { second = nearest; nearest = distance; }
      else second = Math.min(second, distance);
    }
    const patch = noise(x / size * 8, y / size * 8, 8);
    const web = Math.max(0, 1 - (second - nearest) / 0.16);
    const i = (y * size + x) * 4;
    data[i] = byte(0.5 + dx);
    data[i + 1] = byte(0.5 + dz);
    data[i + 2] = byte(web * (0.3 + patch * 0.7));
    data[i + 3] = byte(patch);
  }
  return oceanDetail = texture(data, size);
}
