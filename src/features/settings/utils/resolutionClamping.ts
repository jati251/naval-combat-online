import type { ResolutionLimit } from '../types';

export const RESOLUTION_LIMIT_CONFIGS: Record<
  ResolutionLimit,
  { label: string; maxResolution?: { width: number; height: number }; description: string }
> = {
  '720p': {
    label: '720p HD',
    maxResolution: { width: 1280, height: 720 },
    description: 'Ultra-cool & battery saving',
  },
  '1080p': {
    label: '1080p FHD',
    maxResolution: { width: 1920, height: 1080 },
    description: 'Crisp & balanced (recommended)',
  },
  native: {
    label: 'Native Retina/4K',
    maxResolution: undefined,
    description: 'Uncapped panel resolution',
  },
};

/**
 * Dynamically computes DPR range clamped to a maximum resolution (e.g. 720p, 1080p, or native).
 * Ensures Retina and high-DPI screens do not over-rasterize and overheat fanless laptops.
 */
export function getClampedDpr(
  dprRange: [number, number],
  limit: ResolutionLimit = '1080p'
): [number, number] {
  if (typeof window === 'undefined') return dprRange;

  const nativeDpr = window.devicePixelRatio || 1;
  const config = RESOLUTION_LIMIT_CONFIGS[limit];
  let maxDpr = dprRange[1];

  if (config?.maxResolution) {
    const w = window.innerWidth || 1920;
    const h = window.innerHeight || 1080;

    // Scale factor needed so neither width nor height exceeds maxResolution
    const dprCapW = config.maxResolution.width / Math.max(1, w);
    const dprCapH = config.maxResolution.height / Math.max(1, h);
    const maxAllowedDpr = Math.min(dprCapW, dprCapH);

    maxDpr = Math.min(maxDpr, maxAllowedDpr);
  }

  // Never exceed hardware display capabilities
  maxDpr = Math.min(nativeDpr, maxDpr);

  // Keep minimum bounded by maxDpr, with a floor of 0.70
  const minDpr = Math.min(dprRange[0], maxDpr);

  return [
    Math.max(0.70, Math.round(minDpr * 100) / 100),
    Math.max(0.70, Math.round(maxDpr * 100) / 100),
  ];
}
