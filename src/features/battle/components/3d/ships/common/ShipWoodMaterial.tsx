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
      bumpScale: deck ? 0.05 : 0.075,
      roughness: deck ? 0.78 : 0.64,
      metalness: 0.04,
      side: DoubleSide,
    });
    materialCache.set(key, mat);
  }
  return <primitive object={mat} attach="material" />;
}
