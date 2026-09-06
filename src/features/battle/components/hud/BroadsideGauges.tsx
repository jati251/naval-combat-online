import React from 'react';
import { Crosshair, Flame } from 'lucide-react';
import type { AimDirection } from '@/types';

interface BroadsideGaugesProps {
  leftProgress: number;
  rightProgress: number;
  aimDirection: AimDirection;
  onFireBattery: () => void;
}

export const BroadsideGauges: React.FC<BroadsideGaugesProps> = React.memo(
  ({ leftProgress, rightProgress, aimDirection, onFireBattery }) => {
    const isLeftReady = leftProgress >= 1.0;
    const isRightReady = rightProgress >= 1.0;

    const isAimingLeft = aimDirection === 'left';
    const isAimingRight = aimDirection === 'right';
    const canFireActiveAim =
      (isAimingLeft && isLeftReady) || (isAimingRight && isRightReady);

    return (
      <div className="pointer-events-auto flex items-center gap-3 bg-gradient-to-t from-stone-950/95 via-stone-900/90 to-stone-950/70 backdrop-blur-md px-3.5 py-2 select-none rounded-t-2xl border-t-2 border-x border-amber-500/35 shadow-2xl relative">
        {/* Left Battery (LEFT [Q]) */}
        <div
          className={`flex flex-col gap-1 w-24 transition-opacity ${isAimingRight ? 'opacity-40' : 'opacity-100'}`}
        >
          <div className="flex items-center justify-between text-[10px] font-mono leading-none">
            <span
              className={`font-cinzel font-bold tracking-wider ${isAimingLeft ? 'text-amber-300 gold-emboss' : 'text-stone-400'}`}
            >
              PORT [Q]
            </span>
            <span
              className={`text-[8.5px] font-mono font-bold ${isLeftReady ? 'text-emerald-400' : 'text-amber-400/90'}`}
            >
              {isLeftReady ? 'PRIMED' : `${Math.round(leftProgress * 100)}%`}
            </span>
          </div>
          {/* Gunpowder charge bar */}
          <div className="w-full h-2 bg-black/80 rounded-sm overflow-hidden border border-amber-900/50 shadow-inner p-0.5">
            <div
              className={`h-full rounded-[1px] transition-all duration-75 ${
                isLeftReady
                  ? 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-400 shadow-[0_0_8px_rgba(16,185,129,0.7)]'
                  : 'bg-gradient-to-r from-amber-700 via-amber-600 to-amber-500'
              }`}
              style={{ width: `${Math.min(100, leftProgress * 100)}%` }}
            />
          </div>
        </div>

        {/* Broadside Salvo Hammer / Matchlock Action Button */}
        <button
          onClick={onFireBattery}
          className={`px-4 py-2 rounded-xl border transition-all duration-150 cursor-pointer flex flex-col items-center justify-center min-w-[108px] shadow-lg active:scale-95 ${
            canFireActiveAim
              ? 'bg-gradient-to-b from-rose-600 via-rose-700 to-stone-950 border-rose-400 text-rose-100 shadow-[0_0_16px_rgba(225,29,72,0.6)]'
              : aimDirection !== 'none'
              ? 'bg-gradient-to-b from-amber-800/90 to-stone-950 border-amber-500/60 text-amber-200 shadow-[0_0_10px_rgba(212,175,55,0.3)]'
              : 'bg-stone-900/80 border-stone-800 text-stone-500 hover:text-stone-300'
          }`}
          title="Discharge Broadside Cannons (Space / Left Click)"
        >
          <div className="flex items-center gap-1.5">
            {canFireActiveAim ? (
              <Flame className="w-4 h-4 text-amber-300 animate-bounce" />
            ) : (
              <Crosshair className="w-3.5 h-3.5 text-stone-400" />
            )}
            <span className="font-cinzel font-black text-xs tracking-wider gold-emboss">
              FIRE SALVO
            </span>
          </div>
          <span className="text-[7.5px] font-mono font-bold opacity-80 mt-0.5 tracking-tight text-amber-300/80">
            [SPACE / LMB]
          </span>
        </button>

        {/* Right Battery (RIGHT [E]) */}
        <div
          className={`flex flex-col gap-1 w-24 transition-opacity ${isAimingLeft ? 'opacity-40' : 'opacity-100'}`}
        >
          <div className="flex items-center justify-between text-[10px] font-mono leading-none">
            <span
              className={`font-cinzel font-bold tracking-wider ${isAimingRight ? 'text-amber-300 gold-emboss' : 'text-stone-400'}`}
            >
              STARB [E]
            </span>
            <span
              className={`text-[8.5px] font-mono font-bold ${isRightReady ? 'text-emerald-400' : 'text-amber-400/90'}`}
            >
              {isRightReady ? 'PRIMED' : `${Math.round(rightProgress * 100)}%`}
            </span>
          </div>
          {/* Gunpowder charge bar */}
          <div className="w-full h-2 bg-black/80 rounded-sm overflow-hidden border border-amber-900/50 shadow-inner p-0.5">
            <div
              className={`h-full rounded-[1px] transition-all duration-75 ${
                isRightReady
                  ? 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-400 shadow-[0_0_8px_rgba(16,185,129,0.7)]'
                  : 'bg-gradient-to-r from-amber-700 via-amber-600 to-amber-500'
              }`}
              style={{ width: `${Math.min(100, rightProgress * 100)}%` }}
            />
          </div>
        </div>
      </div>
    );
  }
);
