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
    hullColor: '#5c3317',
    trimColor: '#eab308',
    sailColor: '#fffbeb',
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
    hullColor: '#4a2511',
    trimColor: '#f59e0b',
    sailColor: '#f8fafc',
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
    hullColor: '#382013',
    trimColor: '#fbbf24',
    sailColor: '#f1f5f9',
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
  vx?: number;
  vz?: number;
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
