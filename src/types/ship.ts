export type ShipClass = 'sloop' | 'brig' | 'frigate';

export interface ShipConfig {
  id: ShipClass;
  name: string;
  subtitle: string;
  description: string;
  maxHealth: number;
  topSpeed: number; // knots
  acceleration: number;
  turnSpeed: number; // rad/sec
  cannonsPerSide: number;
  reloadTime: number; // seconds
  cannonDamage: number;
  length: number;
  width: number;
  hullColor: string;
  trimColor: string;
  sailColor: string;
}

export const SHIP_PRESETS: Record<ShipClass, ShipConfig> = {
  sloop: {
    id: 'sloop',
    name: 'Swift Corsair',
    subtitle: 'Light Raider',
    description: 'Fast, agile, and maneuverable. Excels at outflanking larger ships with hit-and-run broadsides.',
    maxHealth: 100,
    topSpeed: 18,
    acceleration: 4.5,
    turnSpeed: 1.2,
    cannonsPerSide: 2,
    reloadTime: 3.5,
    cannonDamage: 18,
    length: 12,
    width: 4,
    hullColor: '#3d2516',
    trimColor: '#c29d59',
    sailColor: '#f1e7d0',
  },
  brig: {
    id: 'brig',
    name: 'Iron Marauder',
    subtitle: 'Medium Warship',
    description: 'Balanced speed and firepower. Dual masts with dependable double broadside volleys.',
    maxHealth: 180,
    topSpeed: 14,
    acceleration: 3.2,
    turnSpeed: 0.85,
    cannonsPerSide: 4,
    reloadTime: 4.5,
    cannonDamage: 22,
    length: 18,
    width: 5.5,
    hullColor: '#2b1b11',
    trimColor: '#e0a845',
    sailColor: '#e2d7c0',
  },
  frigate: {
    id: 'frigate',
    name: 'Leviathan Dreadnought',
    subtitle: 'Heavy Ship-of-the-Line',
    description: 'A fortress upon the sea. Devastating six-gun broadsides capable of pulverizing any challenger.',
    maxHealth: 260,
    topSpeed: 10.5,
    acceleration: 2.0,
    turnSpeed: 0.55,
    cannonsPerSide: 6,
    reloadTime: 5.5,
    cannonDamage: 26,
    length: 24,
    width: 7.2,
    hullColor: '#1c140d',
    trimColor: '#d4af37',
    sailColor: '#c9bda5',
  },
};

export type SailState = 'ANCHOR' | 'HALF_SAIL' | 'FULL_SAIL';

export interface ShipSnapshot {
  id: string;
  name: string;
  shipClass: ShipClass;
  x: number;
  y: number;
  z: number;
  rotationY: number; // yaw
  pitch: number;
  roll: number;
  speed: number;
  health: number;
  maxHealth: number;
  sail: SailState;
  rudder: number;
  isSunk: boolean;
  score: number;
}
