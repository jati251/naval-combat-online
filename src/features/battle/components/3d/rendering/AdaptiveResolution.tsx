import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";

/** Lower resolution on sustained frame pressure; recover slowly to avoid resize oscillation. */
export function AdaptiveResolution({ isMobile, dprRange }: { isMobile?: boolean; dprRange?: [number, number] }) {
  const setDpr = useThree((state) => state.setDpr);

  const stateRef = useRef({
    seconds: 0,
    frames: 0,
    warmup: 6.0,
    cooldown: 0, // Cooldown timer between canvas resizes
    lowFpsStreak: 0,
    highFpsStreak: 0,
  });
  const lowerDpr = dprRange?.[0];
  const upperDpr = dprRange?.[1];
  useEffect(() => {
    Object.assign(stateRef.current, { seconds: 0, frames: 0, warmup: 6,
      cooldown: 0, lowFpsStreak: 0, highFpsStreak: 0 });
  }, [lowerDpr, upperDpr, isMobile]);

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
    // A resolution cap can collapse the profile range. Reserve actual room to adapt.
    const minimum = Math.min(maximum, Math.max(0.7, Math.min(dprRange?.[0] ?? 1, maximum * 0.75)));

    const currentDpr = viewport.dpr;

    if (fps < 52) {
      s.lowFpsStreak++;
      s.highFpsStreak = 0;
    } else if (fps >= 59) {
      s.highFpsStreak++;
      s.lowFpsStreak = 0;
    } else {
      s.lowFpsStreak = 0;
      s.highFpsStreak = 0;
    }

    // Two windows ignore isolated compilation stalls while responding to sustained GPU load.
    if (s.lowFpsStreak >= 2 && currentDpr > minimum) {
      const nextDpr = Math.max(minimum, Math.round((currentDpr - 0.125) * 100) / 100);
      if (Math.abs(nextDpr - currentDpr) > 0.05) {
        setDpr(nextDpr);
        s.cooldown = 12.0; // Wait 12s before allowing another resize
        s.lowFpsStreak = 0;
      }
    }
    else if (s.highFpsStreak >= 6 && currentDpr < maximum) {
      const nextDpr = Math.min(maximum, Math.round((currentDpr + 0.125) * 100) / 100);
      if (Math.abs(nextDpr - currentDpr) > 0.05) {
        setDpr(nextDpr);
        s.cooldown = 20.0;
        s.highFpsStreak = 0;
      }
    }
  });

  return null;
}
