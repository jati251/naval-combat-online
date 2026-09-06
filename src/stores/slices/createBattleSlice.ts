import type { StateCreator } from 'zustand';
import type { ShipSnapshot, CannonballSnapshot, CombatLog, GameStage, MapId } from '@/types';
import { fireEventQueue } from '@/features/battle/services/fireEventQueue';

export interface CameraShakeEvent {
  intensity: number;
  direction?: 'left' | 'right' | 'hit';
  timestamp: number;
}

export interface BattleSlice {
  serverTime: number;
  timeOfDay: 'DAY' | 'NIGHT';
  currentMapId: MapId;
  ships: ShipSnapshot[];
  cannonballs: CannonballSnapshot[];
  winnerName: string | null;
  windAngle: number;
  windSpeed: number;
  combatLogs: CombatLog[];
  fireEvents: Array<{ id: string; ownerId: string; side: 'left' | 'right'; timestamp: number }>;
  cameraShake: CameraShakeEvent | null;

  updateWorldSnapshot: (
    serverTime: number,
    ships: ShipSnapshot[],
    cannonballs: CannonballSnapshot[]
  ) => void;
  setTimeOfDay: (timeOfDay: 'DAY' | 'NIGHT') => void;
  setMapId: (mapId: MapId) => void;
  setWind: (windAngle: number, windSpeed: number) => void;
  addCombatLog: (text: string, type?: CombatLog['type']) => void;
  setWinner: (name: string) => void;
  triggerFireEvent: (ownerId: string, side: 'left' | 'right') => void;
  triggerCameraShake: (intensity: number, direction?: 'left' | 'right' | 'hit') => void;
}

export const createBattleSlice: StateCreator<
  BattleSlice & { stage: GameStage },
  [],
  [],
  BattleSlice
> = (set) => ({
  serverTime: 0,
  timeOfDay: 'DAY',
  currentMapId: 'caribbean',
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
  setMapId: (currentMapId) => set({ currentMapId }),

  setWind: (windAngle, windSpeed) => set({ windAngle, windSpeed }),

  addCombatLog: (text, type = 'info') =>
    set((state) => {
      const now = Date.now();
      // Deduplicate identical messages in quick succession (e.g. repeated kill/sink or respawn events)
      const isDuplicate = state.combatLogs.some(
        (log) => log.text === text && now - log.timestamp < 2500
      );
      if (isDuplicate) return state;

      return {
        combatLogs: [
          {
            id: Math.random().toString(36).substring(2, 9),
            text,
            type,
            timestamp: now,
          },
          ...state.combatLogs.slice(0, 19),
        ],
      };
    }),

  setWinner: (winnerName) => set({ winnerName, stage: 'DEBRIEF' }),

  triggerFireEvent: (ownerId, side) => {
    fireEventQueue.push({
      id: `${ownerId}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      ownerId,
      side,
      timestamp: Date.now(),
    });
  },

  triggerCameraShake: (intensity, direction) =>
    set({
      cameraShake: {
        intensity,
        direction,
        timestamp: Date.now(),
      },
    }),
});
