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
    description: 'Blisteringly fast and razor-nimble skiff. Shallow draft and rapid-firing guns for lightning ambush strikes.',
    maxHealth: 70,
    topSpeed: 21,
    acceleration: 5.5,
    turnSpeed: 1.45,
    cannonsPerSide: 1,
    reloadTime: 2.5,
    cannonDamage: 15,
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
  corvette: {
    id: 'corvette',
    name: 'Royal Vanguard',
    subtitle: 'Escort Cruiser',
    description: 'A flush-deck naval speedster. Excellent blend of sustained speed, sharp turn response, and three-gun batteries.',
    maxHealth: 140,
    topSpeed: 16,
    acceleration: 3.8,
    turnSpeed: 1.0,
    cannonsPerSide: 3,
    reloadTime: 3.8,
    cannonDamage: 20,
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
  carrack: {
    id: 'carrack',
    name: 'Ghost Carrack',
    subtitle: 'Cursed Privateer',
    description: 'A haunted scourge of the seas. Built of blackened charred timber with spectral jade lanterns and heavy broadsides.',
    maxHealth: 200,
    topSpeed: 15,
    acceleration: 3.5,
    turnSpeed: 0.95,
    cannonsPerSide: 4,
    reloadTime: 4.0,
    cannonDamage: 25,
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
    description: 'A towering sea castle with soaring poop deck and golden filigree. Heavy broadside punch and robust hull plating.',
    maxHealth: 220,
    topSpeed: 12,
    acceleration: 2.6,
    turnSpeed: 0.7,
    cannonsPerSide: 5,
    reloadTime: 5.0,
    cannonDamage: 24,
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
  man_o_war: {
    id: 'man_o_war',
    name: 'Behemoth Man-of-War',
    subtitle: 'First-Rate Sovereign',
    description: 'The supreme titan of naval warfare. Quadruple masts, 16 total cannons, and immense armor capable of commanding entire fleets.',
    maxHealth: 350,
    topSpeed: 9.0,
    acceleration: 1.6,
    turnSpeed: 0.42,
    cannonsPerSide: 8,
    reloadTime: 6.2,
    cannonDamage: 30,
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
