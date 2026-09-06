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

const getWindowDimensionsSnapshot = () =>
  typeof window !== 'undefined'
    ? `${window.innerWidth}x${window.innerHeight}x${window.devicePixelRatio}`
    : '1920x1080x1';

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

  // Subscribe to window geometry changes reactively without useEffect
  const windowGeometry = useSyncExternalStore(
    subscribeResize,
    getWindowDimensionsSnapshot,
    () => '1920x1080x1'
  );

  const profile = useMemo(() => {
    const base = GRAPHIC_PROFILES[quality] || GRAPHIC_PROFILES.balanced;
    const clampedDpr = getClampedDpr(base.dpr, resolutionLimit);

    return {
      ...base,
      dpr: clampedDpr,
    };
  }, [quality, resolutionLimit, windowGeometry]);

  return { quality, profile, resolutionLimit, setQuality, setResolutionLimit };
}
