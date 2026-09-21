import * as THREE from 'three';

type Surface = 'stone' | 'brick' | 'plaster' | 'tile' | 'wood' | 'rock';
const cache = new Map<Surface, { map: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture }>();

function noise(x: number, y: number, period: number): number {
  const hash = (a: number, b: number) => {
    const value = Math.sin(((a % period + period) % period) * 127.1 + ((b % period + period) % period) * 311.7) * 43758.5453;
    return value - Math.floor(value);
  };
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  return THREE.MathUtils.lerp(THREE.MathUtils.lerp(hash(ix, iy), hash(ix + 1, iy), u), THREE.MathUtils.lerp(hash(ix, iy + 1), hash(ix + 1, iy + 1), u), v);
}

function textures(kind: Surface) {
  const cached = cache.get(kind);
  if (cached) return cached;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  const height = document.createElement('canvas');
  height.width = height.height = 512;
  const bump = height.getContext('2d')!;
  const data = ctx.createImageData(512, 512);
  for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
    const macro = noise(x / 128, y / 128, 4);
    const medium = noise(x / 32, y / 32, 16);
    const fine = noise(x / 4, y / 4, 128);
    const grain = Math.sin(x * 127.1 + y * 311.7) * 3;
    const grainFlow = Math.sin(y * 0.035) * 3 + (macro - 0.5) * 6;
    const woodGrain = Math.sin(x * 0.7 + grainFlow) * 7 + Math.sin(x * 2.3 + grainFlow) * 3;
    const plasterWear = Math.max(0, 0.44 - medium) * 90 + Math.max(0, 0.35 - macro) * 60;
    const tileCurve = Math.sin((x % 64) / 64 * Math.PI) * 18;
    const blockTone = Math.sin(Math.floor(y / 85.333) * 17 + Math.floor(x / 128) * 7) * 9;
    const baseTone = 216 + (kind === 'wood' ? woodGrain : kind === 'plaster' ? -plasterWear : kind === 'tile' ? tileCurve : blockTone);
    const tone = Math.max(40, Math.min(250, Math.round(baseTone + (macro - 0.5) * 24 + (medium - 0.5) * 18 + (fine - 0.5) * 10 + grain)));
    const i = (y * 512 + x) * 4;
    data.data[i] = tone; data.data[i + 1] = tone; data.data[i + 2] = tone; data.data[i + 3] = 255;
  }
  ctx.putImageData(data, 0, 0);
  bump.drawImage(canvas, 0, 0);
  if (kind !== 'plaster' && kind !== 'rock') {
    const rows = kind === 'wood' ? 8 : kind === 'tile' ? 8 : 6;
    const rowHeight = 512 / rows;
    const blockWidth = kind === 'wood' ? 256 : kind === 'brick' ? 128 : 170.6667;
    for (let row = 0; row < rows; row++) {
      const y = row * rowHeight;
      for (const [context, shade] of [[ctx, '#aaa79e'], [bump, '#555555']] as const) {
        context.fillStyle = shade;
        context.fillRect(0, y, 512, kind === 'tile' ? 4 : 2);
        for (let x = -(row % 2) * blockWidth / 2; x < 512; x += blockWidth) {
          context.fillRect(x, y, 2, rowHeight);
        }
      }
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.fillRect(0, y + 3, 512, 2);
    }
  }
  const map = new THREE.CanvasTexture(canvas), bumpMap = new THREE.CanvasTexture(height);
  map.colorSpace = THREE.SRGBColorSpace;
  for (const texture of [map, bumpMap]) {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = 8;
  }
  const result = { map, bumpMap };
  cache.set(kind, result);
  return result;
}

/** Object-space projection keeps masonry courses in meters on differently sized meshes. */
export function constructionMaterial(kind: Surface, color: string, tileSize = 4) {
  const { map, bumpMap } = textures(kind);
  const material = new THREE.MeshStandardMaterial({ color, map, bumpMap,
    bumpScale: kind === 'plaster' ? 0.025 : 0.07, roughness: kind === 'tile' ? 0.78 : 0.91 });
  applyTriplanar(material, tileSize);
  return material;
}

export function applyTriplanar(material: THREE.MeshStandardMaterial, tileSize = 8) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.surfaceTileSize = { value: tileSize };
    shader.vertexShader = 'varying vec3 surfacePosition;\nvarying vec3 surfaceNormal;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      vec3 metricScale = vec3(length(modelMatrix[0].xyz), length(modelMatrix[1].xyz), length(modelMatrix[2].xyz));
      #ifdef USE_INSTANCING
        metricScale *= vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
      #endif
      surfacePosition = position * metricScale;
      surfaceNormal = normal;`);
    shader.fragmentShader = `varying vec3 surfacePosition;
      varying vec3 surfaceNormal;
      uniform float surfaceTileSize;
      vec4 surfaceSample(sampler2D tex) {
        vec3 w = pow(abs(normalize(surfaceNormal)), vec3(6.0));
        w /= max(w.x + w.y + w.z, 0.0001);
        vec3 p = surfacePosition / surfaceTileSize;
        return texture2D(tex, p.zy) * w.x + texture2D(tex, p.xz) * w.y + texture2D(tex, p.xy) * w.z;
      }\n` + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', '#ifdef USE_MAP\n diffuseColor *= surfaceSample(map);\n#endif');
    shader.fragmentShader = shader.fragmentShader.replace('#include <bumpmap_pars_fragment>', THREE.ShaderChunk.bumpmap_pars_fragment
      .replace('texture2D( bumpMap, vBumpMapUv ).x', 'surfaceSample( bumpMap ).x')
      .replace('texture2D( bumpMap, vBumpMapUv + dSTdx ).x', 'surfaceSampleOffset( bumpMap, dFdx(surfacePosition) ).x')
      .replace('texture2D( bumpMap, vBumpMapUv + dSTdy ).x', 'surfaceSampleOffset( bumpMap, dFdy(surfacePosition) ).x'));
    const offsetSampler = `vec4 surfaceSampleOffset(sampler2D tex, vec3 offset) {
      vec3 w = pow(abs(normalize(surfaceNormal)), vec3(6.0));
      w /= max(w.x + w.y + w.z, 0.0001);
      vec3 p = (surfacePosition + offset) / surfaceTileSize;
      return texture2D(tex, p.zy) * w.x + texture2D(tex, p.xz) * w.y + texture2D(tex, p.xy) * w.z;
    }\n`;
    shader.fragmentShader = shader.fragmentShader.replace('vec4 surfaceSample(sampler2D tex)', offsetSampler + 'vec4 surfaceSample(sampler2D tex)');
  };
  material.customProgramCacheKey = () => 'construction-triplanar-v2';
  return material;
}
