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
    <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2.5 game-hud-glass px-2 sm:px-3 py-1 select-none rounded-lg border border-amber-500/40 shadow-lg">
      {/* Mini Anchor Medallion */}
      <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-black/40 border border-amber-500/50 flex items-center justify-center text-amber-300 shrink-0">
        <Anchor className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[2]" />
      </div>

      <div className="flex flex-col gap-0.5 min-w-[100px] sm:min-w-[150px]">
        {/* Vessel Name & Class */}
        <div className="flex items-center justify-between gap-1.5 leading-none">
          <span className="font-cinzel font-bold text-amber-100 text-[10px] sm:text-xs truncate max-w-[90px] sm:max-w-[140px] gold-emboss">
            {shipName}
          </span>
          <span className="text-[7.5px] sm:text-[8px] font-cinzel font-bold uppercase tracking-widest px-1 py-0.2 rounded bg-black/50 text-amber-300 border border-amber-600/40 shrink-0">
            {shipClass}
          </span>
        </div>

        {/* Health Gauge Bar */}
        <div className="flex items-center gap-1.5 pt-0.5">
          <Shield className="w-2.5 h-2.5 text-amber-400/80 shrink-0" />
          <div className="flex-1 h-1.5 bg-black/60 rounded-full overflow-hidden border border-amber-500/30 relative">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                hpPercent > 50
                  ? 'bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.7)]'
                  : hpPercent > 25
                  ? 'bg-gradient-to-r from-amber-600 to-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.7)]'
                  : 'bg-gradient-to-r from-rose-700 to-rose-500 shadow-[0_0_6px_rgba(225,29,72,0.8)] animate-pulse'
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
