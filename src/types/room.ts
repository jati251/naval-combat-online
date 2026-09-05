import type { ShipClass } from './ship';

export type GameStage = 'LOBBY' | 'BATTLE' | 'DEBRIEF';
export type TimeOfDay = 'DAY' | 'NIGHT';

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
}

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
