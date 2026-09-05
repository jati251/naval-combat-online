import type { StateCreator } from 'zustand';
import type { SailState, AimDirection } from '@/types';
import { navalAudio } from '@/features/battle/services/navalAudio';

export interface ControlsSlice {
  localRudder: number;
  localSail: SailState;
  portReloadProgress: number; // 0 to 1
  starboardReloadProgress: number;
  aimDirection: AimDirection;
  isAiming: boolean;

  setLocalRudder: (rudder: number) => void;
  setLocalSail: (sail: SailState) => void;
  cycleSailState: (dir: 'up' | 'down') => void;
  setAimDirection: (aimDirection: AimDirection, isAiming: boolean) => void;
  triggerFireCooldown: (side: 'port' | 'starboard', durationSec: number) => void;
  resetControls: () => void;
}

let activePortTimer: ReturnType<typeof setInterval> | null = null;
let activeStarboardTimer: ReturnType<typeof setInterval> | null = null;

export const createControlsSlice: StateCreator<
  ControlsSlice,
  [],
  [],
  ControlsSlice
> = (set, get) => ({
  localRudder: 0,
  localSail: 'ANCHOR',
  portReloadProgress: 1,
  starboardReloadProgress: 1,
  aimDirection: 'none',
  isAiming: false,

  setLocalRudder: (localRudder) => set({ localRudder }),
  setLocalSail: (localSail) => set({ localSail }),

  cycleSailState: (dir) => {
    const current = get().localSail;
    let next: SailState = current;
    if (dir === 'up') {
      if (current === 'ANCHOR') next = 'HALF_SAIL';
      else if (current === 'HALF_SAIL') next = 'FULL_SAIL';
    } else {
      if (current === 'FULL_SAIL') next = 'HALF_SAIL';
      else if (current === 'HALF_SAIL') next = 'ANCHOR';
    }
    if (next !== current) {
      navalAudio.playSailShift();
      set({ localSail: next });
    }
  },

  setAimDirection: (aimDirection, isAiming) => set({ aimDirection, isAiming }),

  triggerFireCooldown: (side, durationSec) => {
    // Clear any existing running timer for this side
    if (side === 'port' && activePortTimer) {
      clearInterval(activePortTimer);
      activePortTimer = null;
    } else if (side === 'starboard' && activeStarboardTimer) {
      clearInterval(activeStarboardTimer);
      activeStarboardTimer = null;
    }

    const startTime = performance.now();
    const intervalMs = 50;

    // Immediately reset progress to 0
    if (side === 'port') {
      set({ portReloadProgress: 0 });
    } else {
      set({ starboardReloadProgress: 0 });
    }

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
        if (side === 'port') activePortTimer = null;
        else activeStarboardTimer = null;
      }
    }, intervalMs);

    if (side === 'port') activePortTimer = timer;
    else activeStarboardTimer = timer;
  },

  resetControls: () => {
    if (activePortTimer) {
      clearInterval(activePortTimer);
      activePortTimer = null;
    }
    if (activeStarboardTimer) {
      clearInterval(activeStarboardTimer);
      activeStarboardTimer = null;
    }

    set({
      localRudder: 0,
      localSail: 'ANCHOR',
      portReloadProgress: 1,
      starboardReloadProgress: 1,
      aimDirection: 'none',
      isAiming: false,
    });
  },
});
