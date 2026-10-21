import { DoubleSide, MeshStandardMaterial, type CanvasTexture } from 'three';
import { getSurfaceBump } from '../../textures/surfaceTextures';

const materialCache = new Map<string, MeshStandardMaterial>();

export function ShipWoodMaterial({ map, deck = false, color = '#ffffff' }: {
  map: CanvasTexture; deck?: boolean; color?: string;
}) {
  const key = `${map.uuid}_${deck ? '1' : '0'}_${color}`;
  let mat = materialCache.get(key);
  if (!mat) {
    mat = new MeshStandardMaterial({
      map,
      color,
      bumpMap: getSurfaceBump('wood', deck ? 10 : 8),
      bumpScale: deck ? 0.045 : 0.065,
      roughness: deck ? 0.87 : 0.76,
      side: DoubleSide,
    });
    materialCache.set(key, mat);
  }
  return <primitive object={mat} attach="material" />;
}
