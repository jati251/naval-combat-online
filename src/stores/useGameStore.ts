import { create } from 'zustand';
import { createSessionSlice, type SessionSlice } from './slices/createSessionSlice';
import { createLobbySlice, type LobbySlice } from './slices/createLobbySlice';
import { createBattleSlice, type BattleSlice } from './slices/createBattleSlice';
import { createControlsSlice, type ControlsSlice } from './slices/createControlsSlice';

export type GameStoreState = SessionSlice &
  LobbySlice &
  BattleSlice &
  ControlsSlice & {
    resetToLobby: () => void;
  };

export const useGameStore = create<GameStoreState>((set, get, api) => ({
  ...createSessionSlice(set, get, api),
  ...createLobbySlice(set, get, api),
  ...createBattleSlice(set, get, api),
  ...createControlsSlice(set, get, api),

  resetToLobby: () =>
    set({
      stage: 'LOBBY',
      currentRoom: null,
      ships: [],
      cannonballs: [],
      winnerName: null,
      localRudder: 0,
      localSail: 'ANCHOR',
      leftReloadProgress: 1,
      rightReloadProgress: 1,
      aimDirection: 'none',
      isAiming: false,
    }),
}));

export type { SessionSlice, LobbySlice, BattleSlice, ControlsSlice };
