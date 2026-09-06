import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";

/**
 * Intelligent Adaptive Resolution Controller
 * - Protects high-DPI desktop displays (Retina Macs) from unwarranted blur/downscaling.
 * - Enforces warm-up period (6s) so shader compilation and asset streaming don't trigger downscaling.
 * - Requires sustained low performance (3 consecutive windows of FPS < 42) before stepping down.
 * - Rate-limits canvas backbuffer resizes to once every 12 seconds to prevent GPU buffer reallocation stalls.
 * - Smoothly recovers toward native DPR when FPS is healthy (>= 56 FPS).
 */
export function AdaptiveResolution({ isMobile, dprRange }: { isMobile?: boolean; dprRange?: [number, number] }) {
  const setDpr = useThree((state) => state.setDpr);

  const stateRef = useRef({
    seconds: 0,
    frames: 0,
    warmup: 10.0, // 6s initial warm-up
    cooldown: 0, // Cooldown timer between canvas resizes
    lowFpsStreak: 0,
    highFpsStreak: 0,
  });

  useFrame(({ viewport }, delta) => {
    const s = stateRef.current;

    // Ignore background tab stalls or window freeze pauses
    if (document.hidden || delta > 0.25) {
      s.seconds = 0;
      s.frames = 0;
      s.warmup = Math.max(s.warmup, 4.0);
      return;
    }

    // Warm-up countdown
    if (s.warmup > 0) {
      s.warmup -= delta;
      return;
    }

    // Cooldown countdown
    if (s.cooldown > 0) {
      s.cooldown -= delta;
      return;
    }

    s.seconds += delta;
    s.frames++;

    // Sample every 2 seconds
    if (s.seconds < 2.0) return;

    const fps = s.frames / s.seconds;
    s.seconds = 0;
    s.frames = 0;

    const nativePixelRatio = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    const maximum = dprRange ? Math.min(nativePixelRatio, dprRange[1]) : Math.min(nativePixelRatio, isMobile ? 1.5 : 2.0);
    const minimum = dprRange ? Math.max(1.0, Math.min(dprRange[0], maximum)) : (isMobile ? 1.0 : 1.25);

    const currentDpr = viewport.dpr;

    if (fps < 32) {
      s.lowFpsStreak++;
      s.highFpsStreak = 0;
    } else if (fps >= 56) {
      s.highFpsStreak++;
      s.lowFpsStreak = 0;
    } else {
      s.lowFpsStreak = 0;
      s.highFpsStreak = 0;
    }

    // Downscale only after 3 consecutive low-FPS windows (6s of sustained < 42 FPS)
    // Prevents transient frame dips from thrashing the canvas backbuffer and postprocessing render targets
    if (s.lowFpsStreak >= 3 && currentDpr > minimum) {
      const nextDpr = Math.max(minimum, Math.round((currentDpr - 0.25) * 100) / 100);
      if (Math.abs(nextDpr - currentDpr) > 0.05) {
        setDpr(nextDpr);
        s.cooldown = 12.0; // Wait 12s before allowing another resize
        s.lowFpsStreak = 0;
      }
    }
    // Recover towards target DPR if running smoothly (4 consecutive windows >= 56 FPS)
    else if (s.highFpsStreak >= 4 && currentDpr < maximum) {
      const nextDpr = Math.min(maximum, Math.round((currentDpr + 0.25) * 100) / 100);
      if (Math.abs(nextDpr - currentDpr) > 0.05) {
        setDpr(nextDpr);
        s.cooldown = 12.0;
        s.highFpsStreak = 0;
      }
    }
  });

  return null;
}
