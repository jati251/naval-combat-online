import type { StateCreator } from 'zustand';
import type { ShipClass, GameStage } from '@/types';
import { navalAudio } from '@/features/battle/services/navalAudio';

export interface SessionSlice {
  selfId: string;
  playerName: string;
  selectedShip: ShipClass;
  stage: GameStage;
  isConnected: boolean;
  ping: number;
  isMuted: boolean;
  serverUrl: string;

  setServerUrl: (url: string) => void;
  setPlayerName: (name: string) => void;
  setSelectedShip: (ship: ShipClass) => void;
  setStage: (stage: GameStage) => void;
  setIsConnected: (connected: boolean) => void;
  setPing: (ping: number) => void;
  setMuted: (muted: boolean) => void;
}

const DEFAULT_NAMES = ['Drake', 'Blackbeard', 'Morgan', 'Kidd', 'Bonny', 'Teach', 'Rackham'];

export const createSessionSlice: StateCreator<SessionSlice, [], [], SessionSlice> = (set) => ({
  selfId: '',
  playerName: 'Captain ' + DEFAULT_NAMES[Math.floor(Math.random() * DEFAULT_NAMES.length)],
  selectedShip: 'brig',
  stage: 'LOBBY',
  isConnected: false,
  ping: 0,
  isMuted: false,
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
});
