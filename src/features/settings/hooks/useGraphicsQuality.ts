import { useMemo, useSyncExternalStore } from 'react';
import { useSettingsStore } from '../stores/useSettingsStore';
import { GRAPHIC_PROFILES } from '../config/graphicProfiles';
import { getClampedDpr } from '../utils/resolutionClamping';
import type { GraphicQuality, GraphicProfile, ResolutionLimit } from '../types';

const subscribeResize = (callback: () => void) => {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('resize', callback);
  return () => window.removeEventListener('resize', callback);
};

export function useGraphicsQuality(): {
  quality: GraphicQuality;
  profile: GraphicProfile;
  resolutionLimit: ResolutionLimit;
  setQuality: (quality: GraphicQuality) => void;
  setResolutionLimit: (limit: ResolutionLimit) => void;
} {
  const quality = useSettingsStore((s) => s.graphicQuality);
  const resolutionLimit = useSettingsStore((s) => s.resolutionLimit);
  const setQuality = useSettingsStore((s) => s.setGraphicQuality);
  const setResolutionLimit = useSettingsStore((s) => s.setResolutionLimit);

  const base = GRAPHIC_PROFILES[quality] || GRAPHIC_PROFILES.balanced;

  // Subscribe to window geometry changes reactively without useEffect.
  // Returns a primitive key of the clamped DPR so resize events that do not
  // alter the clamped DPR values never trigger re-renders or new profile objects.
  const dprKey = useSyncExternalStore(
    subscribeResize,
    () => {
      const [minDpr, maxDpr] = getClampedDpr(base.dpr, resolutionLimit);
      return `${minDpr}:${maxDpr}`;
    },
    () => `${base.dpr[0]}:${base.dpr[1]}`
  );

  const profile = useMemo<GraphicProfile>(() => {
    const [minStr, maxStr] = dprKey.split(':');
    const clampedDpr: [number, number] = [Number(minStr), Number(maxStr)];

    return {
      ...base,
      dpr: clampedDpr,
    };
  }, [base, dprKey]);

  return { quality, profile, resolutionLimit, setQuality, setResolutionLimit };
}
