import type * as THREE from 'three';
import type { ShipConfig, SailState, ShipClass } from '@/types/game';

export interface ShipModelProps {
  config?: ShipConfig;
  shipClass?: ShipClass;
  sailState?: SailState;
  rudderAngle?: number;
  isEnemy?: boolean;
  shipId?: string;
  isSelf?: boolean;
}

export interface SubModelProps {
  config: ShipConfig;
  sailState: SailState;
  rudderAngle: number;
  isEnemy: boolean;
  hullTexture: THREE.CanvasTexture;
  deckTexture: THREE.CanvasTexture;
  sailTexture: THREE.CanvasTexture;
  shipId?: string;
  isSelf?: boolean;
}
