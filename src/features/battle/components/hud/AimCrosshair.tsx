import React from 'react';
import { Crosshair } from 'lucide-react';
import type { AimDirection } from '@/types';

interface AimCrosshairProps {
  isAiming: boolean;
  aimDirection: AimDirection;
}

export const AimCrosshair: React.FC<AimCrosshairProps> = React.memo(({ isAiming, aimDirection }) => {
  if (!isAiming || aimDirection === 'none') return null;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
      <div className="relative flex items-center justify-center w-24 h-24 text-amber-400">
        <Crosshair className="w-16 h-16 animate-pulse opacity-85" />
        <div className="absolute w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_10px_#f43f5e]" />
      </div>

      <div className="mt-2 text-xs font-mono font-black uppercase tracking-wider text-amber-300 bg-slate-950/80 px-3 py-1 rounded-full border border-amber-500/40 shadow-xl flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
        <span>{aimDirection.toUpperCase()} BATTERY LOCKED</span>
        <span className="text-[10px] text-slate-400">[SPACE / CLICK] FIRE</span>
      </div>
    </div>
  );
});
