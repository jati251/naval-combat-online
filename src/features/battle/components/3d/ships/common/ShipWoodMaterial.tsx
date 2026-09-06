import { DoubleSide, type CanvasTexture } from 'three';
import { getSurfaceBump } from '../../textures/surfaceTextures';

export function ShipWoodMaterial({ map, deck = false, color = '#ffffff' }: {
  map: CanvasTexture; deck?: boolean; color?: string;
}) {
  return <meshStandardMaterial map={map} color={color}
    bumpMap={getSurfaceBump('wood', deck ? 10 : 8)} bumpScale={deck ? 0.045 : 0.065}
    roughness={deck ? 0.87 : 0.76} side={DoubleSide} />;
}
