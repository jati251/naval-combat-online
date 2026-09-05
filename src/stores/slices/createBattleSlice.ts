import type { StateCreator } from 'zustand';
import type { ShipSnapshot, CannonballSnapshot, CombatLog, GameStage } from '@/types';

export interface BattleSlice {
  serverTime: number;
  ships: ShipSnapshot[];
  cannonballs: CannonballSnapshot[];
  winnerName: string | null;
  windAngle: number;
  windSpeed: number;
  combatLogs: CombatLog[];

  updateWorldSnapshot: (
    serverTime: number,
    ships: ShipSnapshot[],
    cannonballs: CannonballSnapshot[]
  ) => void;
  setWind: (windAngle: number, windSpeed: number) => void;
  addCombatLog: (text: string, type?: CombatLog['type']) => void;
  setWinner: (name: string) => void;
}

export const createBattleSlice: StateCreator<
  BattleSlice & { stage: GameStage },
  [],
  [],
  BattleSlice
> = (set) => ({
  serverTime: 0,
  ships: [],
  cannonballs: [],
  winnerName: null,
  windAngle: 0.4,
  windSpeed: 12,
  combatLogs: [],

  updateWorldSnapshot: (serverTime, ships, cannonballs) =>
    set({
      serverTime,
      ships,
      cannonballs,
    }),

  setWind: (windAngle, windSpeed) => set({ windAngle, windSpeed }),

  addCombatLog: (text, type = 'info') =>
    set((state) => ({
      combatLogs: [
        {
          id: Math.random().toString(36).substring(2, 9),
          text,
          type,
          timestamp: Date.now(),
        },
        ...state.combatLogs.slice(0, 19),
      ],
    })),

  setWinner: (winnerName) => set({ winnerName, stage: 'DEBRIEF' }),
});
