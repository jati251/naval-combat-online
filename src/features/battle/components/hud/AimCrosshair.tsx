import React from 'react';
import type { AimDirection } from '@/types';

interface AimCrosshairProps {
  isAiming: boolean;
  aimDirection: AimDirection;
}

/**
 * Sleek, lightweight, hairline naval gunnery reticle.
 * Features an unobstructed open center for pinpoint waterline aiming
 * without distracting animations or screen-cluttering glows.
 */
export const AimCrosshair: React.FC<AimCrosshairProps> = React.memo(({ isAiming, aimDirection }) => {
  if (!isAiming || aimDirection === 'none') return null;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
      {/* Precision Naval Artillery Hairline Reticle */}
      <div className="relative w-16 h-16 flex items-center justify-center">
        {/* Outer Fine Aiming Ring */}
        <div className="w-14 h-14 rounded-full border border-amber-400/40" />

        {/* 4 Cardinal Hairlines with open 8px center clear-zone */}
        {/* Top */}
        <div className="absolute top-1 left-1/2 -translate-x-1/2 w-[1px] h-3.5 bg-amber-400/70" />
        {/* Bottom */}
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-[1px] h-3.5 bg-amber-400/70" />
        {/* Left */}
        <div className="absolute left-1 top-1/2 -translate-y-1/2 h-[1px] w-3.5 bg-amber-400/70" />
        {/* Right */}
        <div className="absolute right-1 top-1/2 -translate-y-1/2 h-[1px] w-3.5 bg-amber-400/70" />

        {/* Subtle range lead tick marks */}
        <div className="absolute left-3 top-1/2 -translate-y-1/2 h-1 w-[1px] bg-amber-400/50" />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 h-1 w-[1px] bg-amber-400/50" />

        {/* Unobstructed Center: Crisp sub-millimeter target dot */}
        <div className="w-1 h-1 rounded-full bg-amber-300 opacity-90" />
      </div>

      {/* Lightweight, compact battery status badge */}
      <div className="mt-1.5 flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-stone-950/75 border border-amber-500/25 text-[10px] font-mono tracking-widest text-amber-200">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        <span className="font-bold uppercase">{aimDirection} BATTERY</span>
        <span className="text-stone-400">·</span>
        <span className="text-[9px] text-stone-300">[SPACE/LMB]</span>
      </div>
    </div>
  );
});
