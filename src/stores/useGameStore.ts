import { create } from 'zustand';
import {
  type ShipClass,
  type SailState,
  type GameStage,
  type RoomInfo,
  type ShipSnapshot,
  type CannonballSnapshot,
} from '@/types/game';
import { navalAudio } from '@/features/battle/services/navalAudio';

export interface CombatLog {
  id: string;
  text: string;
  type: 'info' | 'damage' | 'sink' | 'victory';
  timestamp: number;
}

interface GameStoreState {
  // Session & Player
  selfId: string;
  playerName: string;
  selectedShip: ShipClass;
  stage: GameStage;
  isConnected: boolean;
  ping: number;

  // Audio
  isMuted: boolean;

  // Lobby
  availableRooms: RoomInfo[];
  currentRoom: RoomInfo | null;

  // In-Game Simulation Snapshots
  serverTime: number;
  ships: ShipSnapshot[];
  cannonballs: CannonballSnapshot[];
  winnerName: string | null;

  // Local Controls & State
  localRudder: number;
  localSail: SailState;
  portReloadProgress: number; // 0 to 1
  starboardReloadProgress: number;

  // Combat Log feed
  combatLogs: CombatLog[];

  // Server Endpoint
  serverUrl: string;

  // Actions
  setServerUrl: (url: string) => void;
  setPlayerName: (name: string) => void;
  setSelectedShip: (ship: ShipClass) => void;
  setStage: (stage: GameStage) => void;
  setIsConnected: (connected: boolean) => void;
  setPing: (ping: number) => void;
  setMuted: (muted: boolean) => void;
  setAvailableRooms: (rooms: RoomInfo[]) => void;
  setCurrentRoom: (room: RoomInfo | null, selfId?: string) => void;
  updateWorldSnapshot: (
    serverTime: number,
    ships: ShipSnapshot[],
    cannonballs: CannonballSnapshot[]
  ) => void;
  triggerFireCooldown: (side: 'port' | 'starboard', durationSec: number) => void;
  setLocalRudder: (rudder: number) => void;
  setLocalSail: (sail: SailState) => void;
  addCombatLog: (text: string, type?: CombatLog['type']) => void;
  setWinner: (name: string) => void;
  resetToLobby: () => void;
}

export const useGameStore = create<GameStoreState>((set) => ({
  selfId: '',
  playerName: 'Captain ' + ['Drake', 'Blackbeard', 'Morgan', 'Kidd', 'Bonny'][Math.floor(Math.random() * 5)],
  selectedShip: 'brig',
  stage: 'LOBBY',
  isConnected: false,
  ping: 0,
  isMuted: false,

  availableRooms: [],
  currentRoom: null,

  serverTime: 0,
  ships: [],
  cannonballs: [],
  winnerName: null,

  localRudder: 0,
  localSail: 'ANCHOR',
  portReloadProgress: 1,
  starboardReloadProgress: 1,

  combatLogs: [],
  serverUrl: localStorage.getItem('naval_combat_ws_url') || (import.meta.env.VITE_WS_URL ?? ''),

  setServerUrl: (serverUrl) => {
    if (serverUrl) {
      localStorage.setItem('naval_combat_ws_url', serverUrl);
    } else {
      localStorage.removeItem('naval_combat_ws_url');
    }
    set({ serverUrl });
  },
  setPlayerName: (playerName) => set({ playerName }),
  setSelectedShip: (selectedShip) => set({ selectedShip }),
  setStage: (stage) => set({ stage }),
  setIsConnected: (isConnected) => set({ isConnected }),
  setPing: (ping) => set({ ping }),
  setMuted: (isMuted) => {
    navalAudio.setMuted(isMuted);
    set({ isMuted });
  },
  setAvailableRooms: (availableRooms) => set({ availableRooms }),
  setCurrentRoom: (currentRoom, selfId) =>
    set((state) => ({
      currentRoom,
      selfId: selfId || state.selfId,
    })),

  updateWorldSnapshot: (serverTime, ships, cannonballs) =>
    set({
      serverTime,
      ships,
      cannonballs,
    }),

  triggerFireCooldown: (side, durationSec) => {
    const startTime = performance.now();
    const interval = 50; // ms update

    const timer = setInterval(() => {
      const elapsed = (performance.now() - startTime) / 1000;
      const progress = Math.min(1.0, elapsed / durationSec);

      if (side === 'port') {
        set({ portReloadProgress: progress });
      } else {
        set({ starboardReloadProgress: progress });
      }

      if (progress >= 1.0) {
        clearInterval(timer);
      }
    }, interval);
  },

  setLocalRudder: (localRudder) => set({ localRudder }),
  setLocalSail: (localSail) => set({ localSail }),

  addCombatLog: (text, type = 'info') =>
    set((state) => ({
      combatLogs: [
        {
          id: Math.random().toString(36).substring(2, 9),
          text,
          type,
          timestamp: Date.now(),
        },
        ...state.combatLogs.slice(0, 19), // keep last 20
      ],
    })),

  setWinner: (winnerName) => set({ winnerName, stage: 'DEBRIEF' }),

  resetToLobby: () =>
    set({
      stage: 'LOBBY',
      currentRoom: null,
      ships: [],
      cannonballs: [],
      winnerName: null,
      localRudder: 0,
      localSail: 'ANCHOR',
      portReloadProgress: 1,
      starboardReloadProgress: 1,
    }),
}));
