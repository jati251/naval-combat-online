import { create } from 'zustand';
import type { GraphicQuality, SettingsState } from '../types';
import { isMobileDevice } from '@/hooks/useMobileViewport';

const STORAGE_KEY = 'nco_graphics_quality';

function getInitialQuality(): GraphicQuality {
  if (typeof window === 'undefined') return 'balanced';

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'fast' || saved === 'balanced' || saved === 'performance') {
      return saved;
    }
  } catch {
    // localStorage not accessible (incognito/security sandbox)
  }

  return isMobileDevice() ? 'fast' : 'balanced';
}

export const useSettingsStore = create<SettingsState>((set) => ({
  graphicQuality: getInitialQuality(),
  isSettingsOpen: false,

  setGraphicQuality: (quality: GraphicQuality) => {
    try {
      localStorage.setItem(STORAGE_KEY, quality);
    } catch {
      // ignore storage failure
    }
    set({ graphicQuality: quality });
  },

  openSettings: () => set({ isSettingsOpen: true }),
  closeSettings: () => set({ isSettingsOpen: false }),
  toggleSettings: () => set((s) => ({ isSettingsOpen: !s.isSettingsOpen })),
}));
