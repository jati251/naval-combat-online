import React from 'react';
import { Anchor, Shield } from 'lucide-react';
import type { ShipConfig } from '@/types';

interface ShipStatusBarProps {
  shipName: string;
  shipClass: string;
  config: ShipConfig;
  currentHp: number;
  hpPercent: number;
  hasMinimap?: boolean;
}

export const ShipStatusBar: React.FC<ShipStatusBarProps> = React.memo(({
  shipName,
  shipClass,
  config,
  currentHp,
  hpPercent,
  hasMinimap = false,
}) => {
  const isCritical = hpPercent <= 25;
  const isDamaged = hpPercent <= 50;

  return (
    <div className="pointer-events-auto flex items-center select-none shrink min-w-0">
      {/* Captain's Crest Medallion (Desktop only when minimap is at bottom) */}
      {!hasMinimap && (
        <div className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-b from-stone-800 via-stone-950 to-black border-2 border-amber-500/80 shadow-[0_0_10px_rgba(212,175,55,0.4)] flex items-center justify-center shrink-0 z-10">
          <Anchor className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300 stroke-[2.2] drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" />
          <div className="absolute inset-0.5 rounded-full border border-amber-400/30 pointer-events-none" />
        </div>
      )}

      {/* Naval Hull Integrity Command Plate */}
      <div className={`flex flex-col justify-center bg-gradient-to-r from-stone-950/95 via-stone-900/90 to-stone-950/80 backdrop-blur-md px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-r-xl ${hasMinimap ? '-ml-2 pl-3.5 border-y border-r border-amber-500/40 rounded-l-none' : 'border-l-2 border-amber-400/90 border-y border-r border-amber-500/30'} shadow-2xl min-w-[120px] sm:min-w-[190px]`}>
        {/* Vessel Name & Class Banner */}
        <div className="flex items-center justify-between gap-1.5 leading-none pb-0.5">
          <span className="font-cinzel font-bold text-amber-100 text-[9.5px] sm:text-xs truncate max-w-[70px] sm:max-w-[140px] gold-emboss">
            {shipName}
          </span>
          <span className="text-[7px] sm:text-[8.5px] font-cinzel font-bold uppercase tracking-wider px-1 sm:px-1.5 py-0.5 rounded bg-black/60 text-amber-300 border border-amber-500/40 shrink-0">
            {shipClass}
          </span>
        </div>

        {/* Vitality Gauge */}
        <div className="flex items-center gap-1 sm:gap-1.5 pt-0.5">
          <Shield className={`w-2 h-2 sm:w-3 sm:h-3 shrink-0 ${isCritical ? 'text-rose-400 animate-pulse' : 'text-amber-400/80'}`} />
          
          <div className="flex-1 h-1.5 sm:h-2.5 bg-black/80 rounded-sm overflow-hidden border border-amber-600/30 p-0.5 relative shadow-inner">
            <div
              className={`h-full rounded-[1px] transition-all duration-300 ${
                isCritical
                  ? 'bg-gradient-to-r from-rose-700 via-rose-500 to-red-400 shadow-[0_0_10px_rgba(225,29,72,0.8)] animate-pulse'
                  : isDamaged
                  ? 'bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-400 shadow-[0_0_8px_rgba(245,158,11,0.6)]'
                  : 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-400 shadow-[0_0_8px_rgba(16,185,129,0.6)]'
              }`}
              style={{ width: `${hpPercent}%` }}
            />
          </div>

          <span className="text-[7.5px] sm:text-[9.5px] font-mono font-bold text-amber-100 shrink-0 tabular-nums">
            {Math.round(currentHp)}<span className="text-amber-500/50">/</span>{config.maxHealth}
          </span>
        </div>
      </div>
    </div>
  );
});
