import { create } from 'zustand';
import type { GraphicQuality, SettingsState } from '../types';
import { isMobileDevice } from '@/hooks/useMobileViewport';

const STORAGE_KEY = 'nco_graphics_quality';
const RES_STORAGE_KEY = 'nco_resolution_limit';

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

function getInitialResolution(): import('../types').ResolutionLimit {
  if (typeof window === 'undefined') return '1080p';

  try {
    const saved = localStorage.getItem(RES_STORAGE_KEY);
    if (saved === '720p' || saved === '1080p' || saved === 'native') {
      return saved;
    }
  } catch {
    // localStorage not accessible
  }

  return '1080p'; // Default to 1080p to prevent thermal throttling on laptops & Macs
}

export const useSettingsStore = create<SettingsState>((set) => ({
  graphicQuality: getInitialQuality(),
  resolutionLimit: getInitialResolution(),
  isSettingsOpen: false,

  setGraphicQuality: (quality: GraphicQuality) => {
    try {
      localStorage.setItem(STORAGE_KEY, quality);
    } catch {
      // ignore storage failure
    }
    set({ graphicQuality: quality });
  },

  setResolutionLimit: (limit) => {
    try {
      localStorage.setItem(RES_STORAGE_KEY, limit);
    } catch {
      // ignore storage failure
    }
    set({ resolutionLimit: limit });
  },

  openSettings: () => set({ isSettingsOpen: true }),
  closeSettings: () => set({ isSettingsOpen: false }),
  toggleSettings: () => set((s) => ({ isSettingsOpen: !s.isSettingsOpen })),
}));
