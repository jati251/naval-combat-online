import React from 'react';
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

  return (
    <div className="flex flex-col items-center gap-2 backdrop-blur-md bg-slate-950/85 px-6 py-3 rounded-2xl border border-amber-500/30 shadow-2xl pointer-events-auto">
      <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
        Broadside Cannons
      </div>

      <div className="flex items-center gap-6">
        {/* Port Battery */}
        <div className="flex flex-col items-center gap-1.5">
          <div className="flex items-center justify-between w-20 text-[10px] font-bold">
            <span className="text-slate-400">PORT (Q)</span>
            <span className={isPortReady ? 'text-emerald-400' : 'text-amber-400 font-mono'}>
              {isPortReady ? 'READY' : `${Math.round(portProgress * 100)}%`}
            </span>
          </div>
          <div className="w-20 h-2 bg-slate-900 rounded-full border border-slate-800 overflow-hidden">
            <div
              className={`h-full transition-all duration-75 ${
                isPortReady ? 'bg-emerald-400 shadow-[0_0_8px_#10b981]' : 'bg-amber-400'
              }`}
              style={{ width: `${portProgress * 100}%` }}
            />
          </div>
        </div>

        {/* Central Fire Button Badge */}
        <button
          onClick={onFireBattery}
          className={`px-4 py-2 rounded-xl border font-black text-xs uppercase tracking-wider transition shadow-lg cursor-pointer flex flex-col items-center ${
            aimDirection === 'none'
              ? 'bg-slate-900 border-slate-800 text-slate-500 opacity-60'
              : (aimDirection === 'port' && isPortReady) || (aimDirection === 'starboard' && isStbdReady)
              ? 'bg-rose-600 hover:bg-rose-500 border-rose-400 text-white shadow-[0_0_16px_rgba(244,63,94,0.6)] animate-pulse'
              : 'bg-amber-950/60 border-amber-700/50 text-amber-300 opacity-80'
          }`}
        >
          <span>FIRE SALVO</span>
          <span className="text-[8px] opacity-75 mt-0.5">SPACE / CLICK</span>
        </button>

        {/* Starboard Battery */}
        <div className="flex flex-col items-center gap-1.5">
          <div className="flex items-center justify-between w-20 text-[10px] font-bold">
            <span className="text-slate-400">STARBOARD (E)</span>
            <span className={isStbdReady ? 'text-emerald-400' : 'text-amber-400 font-mono'}>
              {isStbdReady ? 'READY' : `${Math.round(stbdProgress * 100)}%`}
            </span>
          </div>
          <div className="w-20 h-2 bg-slate-900 rounded-full border border-slate-800 overflow-hidden">
            <div
              className={`h-full transition-all duration-75 ${
                isStbdReady ? 'bg-emerald-400 shadow-[0_0_8px_#10b981]' : 'bg-amber-400'
              }`}
              style={{ width: `${stbdProgress * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="text-[9px] text-slate-500 font-mono">HOLD Q / E TO AIM BROADSIDE</div>
    </div>
  );
});
