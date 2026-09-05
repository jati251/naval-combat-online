import type { StateCreator } from 'zustand';
import type { ShipSnapshot, CannonballSnapshot, CombatLog, GameStage } from '@/types';

export interface CameraShakeEvent {
  intensity: number;
  direction?: 'port' | 'starboard' | 'hit';
  timestamp: number;
}

export interface BattleSlice {
  serverTime: number;
  timeOfDay: 'DAY' | 'NIGHT';
  ships: ShipSnapshot[];
  cannonballs: CannonballSnapshot[];
  winnerName: string | null;
  windAngle: number;
  windSpeed: number;
  combatLogs: CombatLog[];
  fireEvents: Array<{ id: string; ownerId: string; side: 'port' | 'starboard'; timestamp: number }>;
  cameraShake: CameraShakeEvent | null;

  updateWorldSnapshot: (
    serverTime: number,
    ships: ShipSnapshot[],
    cannonballs: CannonballSnapshot[]
  ) => void;
  setTimeOfDay: (timeOfDay: 'DAY' | 'NIGHT') => void;
  setWind: (windAngle: number, windSpeed: number) => void;
  addCombatLog: (text: string, type?: CombatLog['type']) => void;
  setWinner: (name: string) => void;
  triggerFireEvent: (ownerId: string, side: 'port' | 'starboard') => void;
  triggerCameraShake: (intensity: number, direction?: 'port' | 'starboard' | 'hit') => void;
}

export const createBattleSlice: StateCreator<
  BattleSlice & { stage: GameStage },
  [],
  [],
  BattleSlice
> = (set) => ({
  serverTime: 0,
  timeOfDay: 'DAY',
  ships: [],
  cannonballs: [],
  winnerName: null,
  windAngle: 0.4,
  windSpeed: 12,
  combatLogs: [],
  fireEvents: [],
  cameraShake: null,

  updateWorldSnapshot: (serverTime, ships, cannonballs) =>
    set({
      serverTime,
      ships,
      cannonballs,
    }),

  setTimeOfDay: (timeOfDay) => set({ timeOfDay }),

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

  triggerFireEvent: (ownerId, side) =>
    set((state) => ({
      fireEvents: [
        ...state.fireEvents.slice(-15),
        {
          id: `${ownerId}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          ownerId,
          side,
          timestamp: Date.now(),
        },
      ],
    })),

  triggerCameraShake: (intensity, direction) =>
    set({
      cameraShake: {
        intensity,
        direction,
        timestamp: Date.now(),
      },
    }),
});
