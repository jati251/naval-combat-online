import type { StateCreator } from 'zustand';
import type { SailState, AimDirection } from '@/types';
import { navalAudio } from '@/features/battle/services/navalAudio';

export interface ControlsSlice {
  localRudder: number;
  localSail: SailState;
  leftReloadProgress: number; // 0 to 1
  rightReloadProgress: number;
  aimDirection: AimDirection;
  isAiming: boolean;

  setLocalRudder: (rudder: number) => void;
  setLocalSail: (sail: SailState) => void;
  cycleSailState: (dir: 'up' | 'down') => void;
  setAimDirection: (aimDirection: AimDirection, isAiming: boolean) => void;
  triggerFireCooldown: (side: 'left' | 'right', durationSec: number) => void;
  resetControls: () => void;
}

let activeLeftTimer: ReturnType<typeof setInterval> | null = null;
let activeRightTimer: ReturnType<typeof setInterval> | null = null;

export const createControlsSlice: StateCreator<
  ControlsSlice,
  [],
  [],
  ControlsSlice
> = (set, get) => ({
  localRudder: 0,
  localSail: 'ANCHOR',
  leftReloadProgress: 1,
  rightReloadProgress: 1,
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
    if (side === 'left' && activeLeftTimer) {
      clearInterval(activeLeftTimer);
      activeLeftTimer = null;
    } else if (side === 'right' && activeRightTimer) {
      clearInterval(activeRightTimer);
      activeRightTimer = null;
    }

    const startTime = performance.now();
    const intervalMs = 100;

    // Immediately reset progress to 0
    if (side === 'left') {
      set({ leftReloadProgress: 0 });
    } else {
      set({ rightReloadProgress: 0 });
    }

    const timer = setInterval(() => {
      const elapsed = (performance.now() - startTime) / 1000;
      const progress = Math.min(1.0, elapsed / durationSec);

      if (side === 'left') {
        set({ leftReloadProgress: progress });
      } else {
        set({ rightReloadProgress: progress });
      }

      if (progress >= 1.0) {
        clearInterval(timer);
        if (side === 'left') activeLeftTimer = null;
        else activeRightTimer = null;
      }
    }, intervalMs);

    if (side === 'left') activeLeftTimer = timer;
    else activeRightTimer = timer;
  },

  resetControls: () => {
    if (activeLeftTimer) {
      clearInterval(activeLeftTimer);
      activeLeftTimer = null;
    }
    if (activeRightTimer) {
      clearInterval(activeRightTimer);
      activeRightTimer = null;
    }

    set({
      localRudder: 0,
      localSail: 'ANCHOR',
      leftReloadProgress: 1,
      rightReloadProgress: 1,
      aimDirection: 'none',
      isAiming: false,
    });
  },
});
