export type ShipClass =
  | 'gunboat'
  | 'sloop'
  | 'corvette'
  | 'brig'
  | 'carrack'
  | 'galleon'
  | 'frigate'
  | 'man_o_war';
export type SailState = 'ANCHOR' | 'HALF_SAIL' | 'FULL_SAIL';

export interface BroadsideFireCommand {
  playerId: string;
  side: 'port' | 'starboard';
  angle: number;
}

export interface ShipConfig {
  id: ShipClass;
  name: string;
  maxHealth: number;
  topSpeed: number; // knots
  acceleration: number;
  turnSpeed: number;
  cannonsPerSide: number;
  reloadTime: number;
  cannonDamage: number;
  length: number;
  width: number;
}

export const SERVER_SHIP_CONFIGS: Record<ShipClass, ShipConfig> = {
  gunboat: {
    id: 'gunboat',
    name: 'Viper Skiff',
    maxHealth: 70,
    topSpeed: 21,
    acceleration: 5.5,
    turnSpeed: 1.45,
    cannonsPerSide: 3,
    reloadTime: 2.2,
    cannonDamage: 8,
    length: 9,
    width: 3.2,
  },
  sloop: {
    id: 'sloop',
    name: 'Swift Corsair',
    maxHealth: 100,
    topSpeed: 18,
    acceleration: 4.5,
    turnSpeed: 1.2,
    cannonsPerSide: 5,
    reloadTime: 3.0,
    cannonDamage: 10,
    length: 12,
    width: 4,
  },
  corvette: {
    id: 'corvette',
    name: 'Royal Vanguard',
    maxHealth: 140,
    topSpeed: 16,
    acceleration: 3.8,
    turnSpeed: 1.0,
    cannonsPerSide: 7,
    reloadTime: 3.5,
    cannonDamage: 11,
    length: 15,
    width: 4.8,
  },
  brig: {
    id: 'brig',
    name: 'Iron Marauder',
    maxHealth: 180,
    topSpeed: 14,
    acceleration: 3.2,
    turnSpeed: 0.85,
    cannonsPerSide: 9,
    reloadTime: 4.0,
    cannonDamage: 12,
    length: 18,
    width: 5.5,
  },
  carrack: {
    id: 'carrack',
    name: 'Ghost Carrack',
    maxHealth: 200,
    topSpeed: 15,
    acceleration: 3.5,
    turnSpeed: 0.95,
    cannonsPerSide: 10,
    reloadTime: 4.2,
    cannonDamage: 14,
    length: 19,
    width: 6.0,
  },
  galleon: {
    id: 'galleon',
    name: 'Imperial Galleon',
    maxHealth: 230,
    topSpeed: 12,
    acceleration: 2.6,
    turnSpeed: 0.7,
    cannonsPerSide: 13,
    reloadTime: 4.8,
    cannonDamage: 14,
    length: 21,
    width: 6.5,
  },
  frigate: {
    id: 'frigate',
    name: 'Leviathan Dreadnought',
    maxHealth: 270,
    topSpeed: 10.5,
    acceleration: 2.0,
    turnSpeed: 0.55,
    cannonsPerSide: 16,
    reloadTime: 5.2,
    cannonDamage: 15,
    length: 24,
    width: 7.2,
  },
  man_o_war: {
    id: 'man_o_war',
    name: 'Behemoth Man-of-War',
    maxHealth: 360,
    topSpeed: 9.0,
    acceleration: 1.6,
    turnSpeed: 0.42,
    cannonsPerSide: 22,
    reloadTime: 5.8,
    cannonDamage: 15,
    length: 28,
    width: 8.5,
  },
};

export interface PlayerInput {
  seq: number;
  rudder: number; // -1 to 1
  sail: SailState;
}

export interface ShipSimulationState {
  id: string;
  name: string;
  shipClass: ShipClass;
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  speed: number;
  rotationY: number; // yaw
  pitch: number;
  roll: number;
  rudder: number;
  sail: SailState;
  health: number;
  maxHealth: number;
  isSunk: boolean;
  score: number;
  reloadTimerPort: number;
  reloadTimerStarboard: number;
}

export interface CannonballSimulationState {
  id: string;
  ownerId: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  damage: number;
  createdAt: number;
  maxLife: number;
}

export interface RoomPlayer {
  id: string;
  name: string;
  shipClass: ShipClass;
  isReady: boolean;
  isHost: boolean;
  score: number;
  kills: number;
  deaths: number;
  respawnCountdown?: number;
  sessionToken?: string;
  isDisconnected?: boolean;
  isBot?: boolean;
}

export type TimeOfDay = 'DAY' | 'NIGHT';

export interface RoomInfo {
  id: string;
  name: string;
  status: 'LOBBY' | 'IN_GAME' | 'FINISHED';
  players: RoomPlayer[];
  maxPlayers: number;
  targetKills: number;
  windAngle: number;
  windSpeed: number;
  timeOfDay: TimeOfDay;
}

// Client to Server Message
export type ClientMessage =
  | { type: 'CREATE_ROOM'; roomName: string; playerName: string; shipClass: ShipClass; maxPlayers?: number; targetKills?: number; timeOfDay?: TimeOfDay | 'RANDOM'; sessionToken?: string }
  | { type: 'JOIN_ROOM'; roomId: string; playerName: string; shipClass: ShipClass; sessionToken?: string }
  | { type: 'RECONNECT'; roomId: string; sessionToken: string }
  | { type: 'LEAVE_ROOM' }
  | { type: 'SELECT_SHIP'; shipClass: ShipClass }
  | { type: 'SET_READY'; ready: boolean }
  | { type: 'START_GAME' }
  | { type: 'ADD_BOT' }
  | { type: 'REMOVE_BOT'; botId?: string }
  | { type: 'GET_ROOMS' }
  | { type: 'INPUT'; seq: number; rudder: number; sail: SailState }
  | { type: 'FIRE_BROADSIDE'; side: 'port' | 'starboard'; angle: number }
  | { type: 'PING'; clientTime: number };

// Server to Client Message
export type ServerMessage =
  | { type: 'ROOM_LIST'; rooms: RoomInfo[] }
  | { type: 'ROOM_STATE'; room: RoomInfo; selfId: string }
  | { type: 'ERROR'; message: string }
  | { type: 'GAME_STARTED'; startTime: number; windAngle: number; windSpeed: number; timeOfDay: TimeOfDay }
  | {
      type: 'WORLD_SNAPSHOT';
      tick: number;
      serverTime: number;
      ships: Array<Omit<ShipSimulationState, 'reloadTimerPort' | 'reloadTimerStarboard'>>;
      cannonballs: Array<{ id: string; ownerId: string; x: number; y: number; z: number; vx: number; vy: number; vz: number }>;
    }
  | {
      type: 'CANNON_FIRED';
      ownerId: string;
      side: 'port' | 'starboard';
      origin: [number, number, number];
      count: number;
    }
  | {
      type: 'HIT_EVENT';
      targetId: string;
      attackerId: string;
      damage: number;
      hitPos: [number, number, number];
      remainingHp: number;
    }
  | {
      type: 'SHIP_SUNK';
      shipId: string;
      killerId?: string;
    }
  | {
      type: 'SHIP_RESPAWNED';
      shipId: string;
      x: number;
      z: number;
      rotationY: number;
      health: number;
    }
  | {
      type: 'GAME_OVER';
      winnerId: string;
      winnerName: string;
    }
  | { type: 'PONG'; clientTime: number; serverTime: number };
