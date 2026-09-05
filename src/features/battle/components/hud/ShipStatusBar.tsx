import React from 'react';
import { Anchor, Shield } from 'lucide-react';
import type { ShipConfig } from '@/types';

interface ShipStatusBarProps {
  shipName: string;
  shipClass: string;
  config: ShipConfig;
  currentHp: number;
  hpPercent: number;
}

export const ShipStatusBar: React.FC<ShipStatusBarProps> = React.memo(({
  shipName,
  shipClass,
  config,
  currentHp,
  hpPercent,
}) => {
  return (
    <div className="pointer-events-auto flex items-center gap-2 sm:gap-3 naval-plaque px-2.5 sm:px-4 py-1 sm:py-2 select-none rounded-md border border-amber-600/40 shadow-xl relative">
      {/* Corner Filigree Screws */}
      <div className="absolute top-1 left-1 w-1 h-1 rounded-full bg-amber-400/80 shadow-[0_0_2px_rgba(0,0,0,0.8)]" />
      <div className="absolute top-1 right-1 w-1 h-1 rounded-full bg-amber-400/80 shadow-[0_0_2px_rgba(0,0,0,0.8)]" />
      <div className="absolute bottom-1 left-1 w-1 h-1 rounded-full bg-amber-400/80 shadow-[0_0_2px_rgba(0,0,0,0.8)]" />
      <div className="absolute bottom-1 right-1 w-1 h-1 rounded-full bg-amber-400/80 shadow-[0_0_2px_rgba(0,0,0,0.8)]" />

      {/* Admiralty Anchor Medallion */}
      <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-full pirate-panel border border-amber-500/60 flex items-center justify-center text-amber-300 shrink-0 shadow-inner">
        <Anchor className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2]" />
      </div>

      <div className="flex flex-col gap-0.5 sm:gap-1 min-w-[105px] sm:min-w-[165px]">
        {/* Vessel Name & Class Banner */}
        <div className="flex items-baseline justify-between gap-1.5 sm:gap-3 border-b border-amber-600/30 pb-0.5">
          <span className="font-cinzel font-bold text-amber-100 tracking-wider text-[10px] sm:text-xs truncate max-w-[80px] sm:max-w-none gold-emboss">
            {shipName}
          </span>
          <span className="text-[7px] sm:text-[8px] font-cinzel font-bold uppercase tracking-widest px-1 py-0.2 rounded bg-stone-950/80 text-amber-300 border border-amber-600/50">
            {shipClass}
          </span>
        </div>

        {/* Nautical Hull Timber Integrity */}
        <div className="flex items-center gap-1.5 sm:gap-2 pt-0.5">
          <Shield className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-400/80 shrink-0" />
          <div className="flex-1 h-1.5 sm:h-2 bg-stone-950 rounded-sm overflow-hidden border border-amber-900/60 relative shadow-inner">
            {/* Segmented health gauge */}
            <div
              className={`h-full rounded-sm transition-all duration-300 ${
                hpPercent > 50
                  ? 'bg-gradient-to-r from-emerald-600 to-emerald-400'
                  : hpPercent > 25
                  ? 'bg-gradient-to-r from-amber-600 to-amber-400'
                  : 'bg-gradient-to-r from-rose-700 to-rose-500 animate-pulse'
              }`}
              style={{ width: `${hpPercent}%` }}
            />
          </div>
          <span className="text-[8px] sm:text-[9px] font-mono font-bold text-amber-100 shrink-0">
            {Math.round(currentHp)}<span className="text-amber-500/60">/</span>{config.maxHealth}
          </span>
        </div>
      </div>
    </div>
  );
});
