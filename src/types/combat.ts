import type { SailState } from './ship';

export interface PlayerInput {
  seq: number;
  rudder: number; // -1 (left) to 1 (right)
  sail: SailState;
}

export interface CannonballSnapshot {
  id: string;
  ownerId: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
}

export type AimDirection = 'none' | 'left' | 'right';

export interface CombatLog {
  id: string;
  text: string;
  type: 'info' | 'damage' | 'sink' | 'victory';
  timestamp: number;
}
