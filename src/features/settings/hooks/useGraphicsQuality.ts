import { useMemo } from 'react';
import { useSettingsStore } from '../stores/useSettingsStore';
import { GRAPHIC_PROFILES } from '../config/graphicProfiles';
import type { GraphicQuality, GraphicProfile } from '../types';

export function useGraphicsQuality(): {
  quality: GraphicQuality;
  profile: GraphicProfile;
  setQuality: (quality: GraphicQuality) => void;
} {
  const quality = useSettingsStore((s) => s.graphicQuality);
  const setQuality = useSettingsStore((s) => s.setGraphicQuality);

  const profile = useMemo(() => {
    return GRAPHIC_PROFILES[quality] || GRAPHIC_PROFILES.balanced;
  }, [quality]);

  return { quality, profile, setQuality };
}
