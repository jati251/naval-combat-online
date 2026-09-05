export type ShipClass = 'sloop' | 'brig' | 'frigate';
export type SailState = 'ANCHOR' | 'HALF_SAIL' | 'FULL_SAIL';

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
  sloop: {
    id: 'sloop',
    name: 'Swift Corsair',
    maxHealth: 100,
    topSpeed: 18,
    acceleration: 4.5,
    turnSpeed: 1.2,
    cannonsPerSide: 2,
    reloadTime: 3.5,
    cannonDamage: 18,
    length: 12,
    width: 4,
  },
  brig: {
    id: 'brig',
    name: 'Iron Marauder',
    maxHealth: 180,
    topSpeed: 14,
    acceleration: 3.2,
    turnSpeed: 0.85,
    cannonsPerSide: 4,
    reloadTime: 4.5,
    cannonDamage: 22,
    length: 18,
    width: 5.5,
  },
  frigate: {
    id: 'frigate',
    name: 'Leviathan Dreadnought',
    maxHealth: 260,
    topSpeed: 10.5,
    acceleration: 2.0,
    turnSpeed: 0.55,
    cannonsPerSide: 6,
    reloadTime: 5.5,
    cannonDamage: 26,
    length: 24,
    width: 7.2,
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
}

export interface RoomInfo {
  id: string;
  name: string;
  status: 'LOBBY' | 'IN_GAME' | 'FINISHED';
  players: RoomPlayer[];
  maxPlayers: number;
  windAngle: number;
  windSpeed: number;
}

// Client to Server Message
export type ClientMessage =
  | { type: 'CREATE_ROOM'; roomName: string; playerName: string; shipClass: ShipClass; maxPlayers?: number }
  | { type: 'JOIN_ROOM'; roomId: string; playerName: string; shipClass: ShipClass }
  | { type: 'LEAVE_ROOM' }
  | { type: 'SELECT_SHIP'; shipClass: ShipClass }
  | { type: 'SET_READY'; ready: boolean }
  | { type: 'START_GAME' }
  | { type: 'INPUT'; seq: number; rudder: number; sail: SailState }
  | { type: 'FIRE_BROADSIDE'; side: 'port' | 'starboard'; angle: number }
  | { type: 'PING'; clientTime: number };

// Server to Client Message
export type ServerMessage =
  | { type: 'ROOM_LIST'; rooms: RoomInfo[] }
  | { type: 'ROOM_STATE'; room: RoomInfo; selfId: string }
  | { type: 'ERROR'; message: string }
  | { type: 'GAME_STARTED'; startTime: number; windAngle: number; windSpeed: number }
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
      type: 'GAME_OVER';
      winnerId: string;
      winnerName: string;
    }
  | { type: 'PONG'; clientTime: number; serverTime: number };
