import type { ShipClass } from './ship';

export type GameStage = 'LOBBY' | 'BATTLE' | 'DEBRIEF';
export type TimeOfDay = 'DAY' | 'NIGHT';
export type MapId = 'caribbean' | 'kingston' | 'mexico' | 'english-channel' | 'greece' | 'nusantara';
export type GameMode = 'FFA' | 'TEAM';
export type Team = 'red' | 'blue';

export interface RoomPlayer {
  id: string;
  name: string;
  shipClass: ShipClass;
  isReady: boolean;
  isHost: boolean;
  score: number;
  kills: number;
  deaths: number;
  team?: Team;
  respawnCountdown?: number;
  sessionToken?: string;
  isDisconnected?: boolean;
  isBot?: boolean;
}

export interface RoomInfo {
  id: string;
  name: string;
  status: 'LOBBY' | 'IN_GAME' | 'FINISHED';
  players: RoomPlayer[];
  maxPlayers: number;
  targetKills: number;
  gameMode: GameMode;
  windAngle: number;
  windSpeed: number;
  timeOfDay: TimeOfDay;
  mapId: MapId;
}
