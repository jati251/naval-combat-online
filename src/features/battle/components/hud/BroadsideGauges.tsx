import React from 'react';
import { Crosshair, Flame } from 'lucide-react';
import type { AimDirection } from '@/types';

interface BroadsideGaugesProps {
  portProgress: number;
  stbdProgress: number;
  aimDirection: AimDirection;
  onFireBattery: () => void;
}

export const BroadsideGauges: React.FC<BroadsideGaugesProps> = React.memo(({
  portProgress,
  stbdProgress,
  aimDirection,
  onFireBattery,
}) => {
  const isPortReady = portProgress >= 1.0;
  const isStbdReady = stbdProgress >= 1.0;

  const isAimingPort = aimDirection === 'port';
  const isAimingStbd = aimDirection === 'starboard';
  const canFireActiveAim = (isAimingPort && isPortReady) || (isAimingStbd && isStbdReady);

  return (
    <div className="pointer-events-auto flex items-center gap-3 naval-plaque px-3.5 py-2 select-none">
      {/* Port Battery (Larboard Cannons) */}
      <div className={`flex flex-col gap-1 w-20 transition-opacity ${isAimingStbd ? 'opacity-35' : 'opacity-100'}`}>
        <div className="flex items-center justify-between text-[10px] font-mono">
          <span className={`font-bold tracking-wider ${isAimingPort ? 'text-amber-300 font-cinzel' : 'text-stone-300'}`}>
            PORT [Q]
          </span>
          <span className={`text-[9px] font-bold ${isPortReady ? 'text-emerald-400' : 'text-amber-400/80'}`}>
            {isPortReady ? 'READY' : `${Math.round(portProgress * 100)}%`}
          </span>
        </div>
        <div className="w-full h-1.5 bg-stone-950 rounded-sm overflow-hidden border border-stone-800">
          <div
            className={`h-full rounded-[1px] transition-all duration-75 ${
              isPortReady ? 'bg-emerald-400' : 'bg-amber-500'
            }`}
            style={{ width: `${Math.min(100, portProgress * 100)}%` }}
          />
        </div>
      </div>

      {/* Salvo Firing Action Button */}
      <button
        onClick={onFireBattery}
        className={`px-3 py-1.5 rounded border transition-colors cursor-pointer flex flex-col items-center justify-center min-w-[96px] ${
          canFireActiveAim
            ? 'bg-rose-900/90 hover:bg-rose-800 border-rose-500 text-rose-100 shadow-md'
            : aimDirection !== 'none'
            ? 'bg-amber-950/80 hover:bg-amber-900/80 border-amber-500/50 text-amber-200'
            : 'bg-stone-900/70 border-stone-800 text-stone-500 hover:text-stone-300'
        }`}
        title="Fire Cannon Salvo (Space / Click)"
      >
        <div className="flex items-center gap-1">
          {canFireActiveAim ? (
            <Flame className="w-3.5 h-3.5 text-amber-300" />
          ) : (
            <Crosshair className="w-3.5 h-3.5 text-stone-400" />
          )}
          <span className="font-cinzel font-bold text-xs tracking-wider">
            SALVO
          </span>
        </div>
        <span className="text-[8px] font-mono opacity-80 mt-0.5 tracking-tight">
          [SPACE / LMB]
        </span>
      </button>

      {/* Starboard Battery Cannons */}
      <div className={`flex flex-col gap-1 w-20 transition-opacity ${isAimingPort ? 'opacity-35' : 'opacity-100'}`}>
        <div className="flex items-center justify-between text-[10px] font-mono">
          <span className={`font-bold tracking-wider ${isAimingStbd ? 'text-amber-300 font-cinzel' : 'text-stone-300'}`}>
            STBD [E]
          </span>
          <span className={`text-[9px] font-bold ${isStbdReady ? 'text-emerald-400' : 'text-amber-400/80'}`}>
            {isStbdReady ? 'READY' : `${Math.round(stbdProgress * 100)}%`}
          </span>
        </div>
        <div className="w-full h-1.5 bg-stone-950 rounded-sm overflow-hidden border border-stone-800">
          <div
            className={`h-full rounded-[1px] transition-all duration-75 ${
              isStbdReady ? 'bg-emerald-400' : 'bg-amber-500'
            }`}
            style={{ width: `${Math.min(100, stbdProgress * 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
});
