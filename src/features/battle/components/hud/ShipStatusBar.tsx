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
    <div className="pointer-events-auto flex items-center gap-2.5 naval-plaque px-3.5 py-2 select-none">
      {/* Anchor Medallion */}
      <div className="w-8 h-8 rounded-full bg-stone-900/80 border border-amber-500/40 flex items-center justify-center text-amber-300 shrink-0">
        <Anchor className="w-4 h-4" />
      </div>

      <div className="flex flex-col gap-0.5 min-w-[150px]">
        {/* Vessel Name & Class Banner */}
        <div className="flex items-baseline justify-between gap-2 border-b border-stone-800 pb-0.5">
          <span className="font-cinzel font-bold text-amber-100 tracking-wider text-xs truncate">
            {shipName}
          </span>
          <span className="text-[8px] font-mono font-bold uppercase tracking-widest px-1 py-0.2 rounded bg-stone-900 text-amber-300/90 border border-amber-700/40">
            {shipClass}
          </span>
        </div>

        {/* Nautical Hull Integrity Bar */}
        <div className="flex items-center gap-1.5 pt-0.5">
          <Shield className="w-2.5 h-2.5 text-stone-400 shrink-0" />
          <div className="flex-1 h-1.5 bg-stone-950 rounded-sm overflow-hidden border border-stone-800 relative">
            <div
              className={`h-full rounded-[1px] transition-all duration-300 ${
                hpPercent > 50
                  ? 'bg-emerald-500'
                  : hpPercent > 25
                  ? 'bg-amber-500'
                  : 'bg-rose-500'
              }`}
              style={{ width: `${hpPercent}%` }}
            />
          </div>
          <span className="text-[9px] font-mono font-bold text-stone-300 shrink-0">
            {Math.round(currentHp)}<span className="text-stone-600">/</span>{config.maxHealth}
          </span>
        </div>
      </div>
    </div>
  );
});
