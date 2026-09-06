import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';

/** Adjust only after sustained pressure; ignore tab resumes and loading stalls. */
export function AdaptiveResolution({ isMobile }: { isMobile: boolean }) {
  const setDpr = useThree((state) => state.setDpr);
  const sample = useRef({ seconds: 0, frames: 0, warmup: 3 });
  useFrame(({ viewport }, delta) => {
    const current = sample.current;
    if (document.hidden || delta > 0.25) {
      current.seconds = 0;
      current.frames = 0;
      current.warmup = 3;
      return;
    }
    if (current.warmup > 0) {
      current.warmup -= delta;
      return;
    }
    current.seconds += delta;
    current.frames++;
    if (current.seconds < 3) return;
    const fps = current.frames / current.seconds;
    const maximum = Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2);
    const minimum = Math.min(maximum, isMobile ? 0.85 : 1);
    const next = Math.max(minimum, Math.min(maximum,
      viewport.dpr + (fps < 42 ? -0.15 : fps > 57 ? 0.1 : 0)));
    if (Math.abs(next - viewport.dpr) > 0.01) setDpr(next);
    current.seconds = 0;
    current.frames = 0;
  });
  return null;
}
