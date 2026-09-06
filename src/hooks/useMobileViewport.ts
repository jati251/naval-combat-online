import { useSyncExternalStore } from 'react';

/**
 * Checks if the client is an actual mobile or tablet hardware device
 * (touch-first, coarse pointer, mobile user agent), rather than a desktop
 * Mac/PC browser window that has simply been resized narrow.
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;

  // 1. Explicit Mobile / Tablet User Agent check
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );

  // 2. Pure touch coarse pointer (touchscreen) and explicitly NOT a precision mouse pointer
  // Mac trackpads and mice report (pointer: fine)
  const hasFinePointer = window.matchMedia('(pointer: fine)').matches;
  const hasCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  // Desktop with mouse/trackpad is never mobile, even when window is narrow
  if (hasFinePointer && !isMobileUA) {
    return false;
  }

  // True mobile device: has mobile UA or coarse touch screen and width constraint
  return (isMobileUA || (hasCoarsePointer && hasTouch)) && window.innerWidth <= 1024;
}

const subscribe = (notify: () => void) => {
  window.addEventListener('resize', notify);
  window.addEventListener('orientationchange', notify);
  return () => {
    window.removeEventListener('resize', notify);
    window.removeEventListener('orientationchange', notify);
  };
};

const getSnapshot = () => isMobileDevice();

export function useMobileViewport(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

