import React from 'react';
import { Anchor, Volume2, VolumeX, LogOut } from 'lucide-react';
import type { ShipConfig } from '@/types';

interface ShipStatusBarProps {
  shipName: string;
  shipClass: string;
  config: ShipConfig;
  currentHp: number;
  hpPercent: number;
  aliveCount: number;
  sunkCount: number;
  ping: number;
  isMuted: boolean;
  onToggleMute: () => void;
  onLeave: () => void;
}

export const ShipStatusBar: React.FC<ShipStatusBarProps> = ({
  shipName,
  shipClass,
  config,
  currentHp,
  hpPercent,
  aliveCount,
  sunkCount,
  ping,
  isMuted,
  onToggleMute,
  onLeave,
}) => {
  return (
    <div className="flex items-center justify-between w-full pointer-events-auto">
      {/* Ship Hull Status */}
      <div className="flex items-center gap-4 backdrop-blur-md bg-slate-950/80 p-3.5 rounded-2xl border border-amber-500/30 shadow-2xl shadow-slate-950/80 max-w-md w-full">
        <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
          <Anchor className="w-6 h-6" />
        </div>

        <div className="flex flex-col flex-1 gap-1.5">
          <div className="flex items-center justify-between">
            <span className="font-cinzel font-bold text-amber-200 tracking-wider text-sm flex items-center gap-2">
              {shipName}
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-400 border border-amber-800/40 uppercase">
                {shipClass}
              </span>
            </span>
            <span className="text-xs font-mono font-bold text-slate-300">
              {Math.round(currentHp)} / {config.maxHealth} HP
            </span>
          </div>

          {/* Health Bar */}
          <div className="w-full h-2.5 bg-slate-900/90 rounded-full overflow-hidden border border-slate-700/60 p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                hpPercent > 50
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_10px_#10b981]'
                  : hpPercent > 25
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-400 shadow-[0_0_10px_#f59e0b]'
                  : 'bg-gradient-to-r from-rose-600 to-red-500 shadow-[0_0_10px_#f43f5e]'
              }`}
              style={{ width: `${hpPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Center Fleet Status */}
      <div className="backdrop-blur-md bg-slate-950/80 px-6 py-2 rounded-2xl border border-amber-500/20 shadow-xl flex items-center gap-6">
        <div className="flex flex-col items-center">
          <span className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Fleet Afloat</span>
          <span className="text-xl font-cinzel font-black text-emerald-400">{aliveCount}</span>
        </div>
        <div className="w-px h-6 bg-slate-800" />
        <div className="flex flex-col items-center">
          <span className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Sunk</span>
          <span className="text-xl font-cinzel font-black text-rose-400">{sunkCount}</span>
        </div>
      </div>

      {/* Top Right Utilities */}
      <div className="flex items-center gap-3">
        <div className="backdrop-blur-md bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800 text-[11px] font-mono font-bold text-emerald-400 flex items-center gap-1.5 shadow-lg">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>{ping}ms</span>
        </div>

        <button
          onClick={onToggleMute}
          className="p-2.5 rounded-xl backdrop-blur-md bg-slate-950/80 border border-slate-800 text-slate-300 hover:text-amber-400 hover:border-amber-500/50 transition shadow-lg cursor-pointer"
          title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
        </button>

        <button
          onClick={onLeave}
          className="p-2.5 rounded-xl backdrop-blur-md bg-slate-950/80 border border-rose-900/50 text-rose-400 hover:bg-rose-950/40 hover:border-rose-500/60 transition shadow-lg cursor-pointer flex items-center gap-1.5 text-xs font-bold"
          title="Return to Port"
        >
          <LogOut className="w-4 h-4" />
          <span>Abandon</span>
        </button>
      </div>
    </div>
  );
};
