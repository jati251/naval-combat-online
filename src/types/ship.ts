export type ShipClass =
  | 'gunboat'
  | 'sloop'
  | 'corvette'
  | 'brig'
  | 'carrack'
  | 'galleon'
  | 'frigate'
  | 'man_o_war';

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
  gunboat: {
    id: 'gunboat',
    name: 'Viper Skiff',
    subtitle: 'Ultra-Light Skiff',
    description: 'Blisteringly fast and razor-nimble skiff. Triple rapid-fire guns and shallow draft for lightning ambush strikes.',
    maxHealth: 70,
    topSpeed: 21,
    acceleration: 5.5,
    turnSpeed: 1.45,
    cannonsPerSide: 3,
    reloadTime: 2.2,
    cannonDamage: 8,
    length: 9,
    width: 3.2,
    hullColor: '#2b1b10',
    trimColor: '#0ea5e9',
    sailColor: '#0f172a',
  },
  sloop: {
    id: 'sloop',
    name: 'Swift Corsair',
    subtitle: 'Light Raider',
    description: 'Fast, agile, and maneuverable. Quintuple-gun batteries unleash snappy hit-and-run broadsides.',
    maxHealth: 100,
    topSpeed: 18,
    acceleration: 4.5,
    turnSpeed: 1.2,
    cannonsPerSide: 5,
    reloadTime: 3.0,
    cannonDamage: 10,
    length: 12,
    width: 4,
    hullColor: '#5c3317',
    trimColor: '#eab308',
    sailColor: '#fffbeb',
  },
  corvette: {
    id: 'corvette',
    name: 'Royal Vanguard',
    subtitle: 'Escort Cruiser',
    description: 'A flush-deck naval speedster. Seven-gun batteries deliver swift rolling broadsides with sharp turn response.',
    maxHealth: 140,
    topSpeed: 16,
    acceleration: 3.8,
    turnSpeed: 1.0,
    cannonsPerSide: 7,
    reloadTime: 3.5,
    cannonDamage: 11,
    length: 15,
    width: 4.8,
    hullColor: '#3e2723',
    trimColor: '#0284c7',
    sailColor: '#f1f5f9',
  },
  brig: {
    id: 'brig',
    name: 'Iron Marauder',
    subtitle: 'Medium Warship',
    description: 'Balanced speed and firepower. Dual masts with heavy nine-gun rolling broadside volleys.',
    maxHealth: 180,
    topSpeed: 14,
    acceleration: 3.2,
    turnSpeed: 0.85,
    cannonsPerSide: 9,
    reloadTime: 4.0,
    cannonDamage: 12,
    length: 18,
    width: 5.5,
    hullColor: '#4a2511',
    trimColor: '#f59e0b',
    sailColor: '#f8fafc',
  },
  carrack: {
    id: 'carrack',
    name: 'Ghost Carrack',
    subtitle: 'Cursed Privateer',
    description: 'A haunted scourge of the seas. Ten heavy guns discharge cursed roundshot shrouded in spectral emerald smoke.',
    maxHealth: 200,
    topSpeed: 15,
    acceleration: 3.5,
    turnSpeed: 0.95,
    cannonsPerSide: 10,
    reloadTime: 4.2,
    cannonDamage: 14,
    length: 19,
    width: 6.0,
    hullColor: '#0f172a',
    trimColor: '#10b981',
    sailColor: '#334155',
  },
  galleon: {
    id: 'galleon',
    name: 'Imperial Galleon',
    subtitle: 'Spanish Treasure Castle',
    description: 'A towering sea castle with soaring poop deck. Thirteen-gun rolling cascade delivers crushing siege broadsides.',
    maxHealth: 230,
    topSpeed: 12,
    acceleration: 2.6,
    turnSpeed: 0.7,
    cannonsPerSide: 13,
    reloadTime: 4.8,
    cannonDamage: 14,
    length: 21,
    width: 6.5,
    hullColor: '#4c1d18',
    trimColor: '#f59e0b',
    sailColor: '#fffbeb',
  },
  frigate: {
    id: 'frigate',
    name: 'Leviathan Dreadnought',
    subtitle: 'Heavy Ship-of-the-Line',
    description: 'A fortress upon the sea. Devastating sixteen-gun continuous rolling broadsides capable of pulverizing any challenger.',
    maxHealth: 270,
    topSpeed: 10.5,
    acceleration: 2.0,
    turnSpeed: 0.55,
    cannonsPerSide: 16,
    reloadTime: 5.2,
    cannonDamage: 15,
    length: 24,
    width: 7.2,
    hullColor: '#382013',
    trimColor: '#fbbf24',
    sailColor: '#f1f5f9',
  },
  man_o_war: {
    id: 'man_o_war',
    name: 'Behemoth Man-of-War',
    subtitle: 'First-Rate Sovereign',
    description: 'The supreme first-rate titan. Quadruple masts and twenty-two heavy cannons unleash an apocalyptic rolling wall of iron.',
    maxHealth: 360,
    topSpeed: 9.0,
    acceleration: 1.6,
    turnSpeed: 0.42,
    cannonsPerSide: 22,
    reloadTime: 5.8,
    cannonDamage: 15,
    length: 28,
    width: 8.5,
    hullColor: '#18181b',
    trimColor: '#eab308',
    sailColor: '#e2e8f0',
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
