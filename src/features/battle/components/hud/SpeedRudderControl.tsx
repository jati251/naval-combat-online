import React from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import type { SailState } from '@/types';

interface SpeedRudderControlProps {
  localSail: SailState;
  speedKnots: string;
  localRudder: number;
  onChangeSail: (state: SailState) => void;
  onSetRudder: (value: number) => void;
}

export const SpeedRudderControl: React.FC<SpeedRudderControlProps> = React.memo(({
  localSail,
  speedKnots,
  localRudder,
  onChangeSail,
  onSetRudder,
}) => {
  return (
    <div className="flex flex-col items-center gap-2 backdrop-blur-md bg-slate-950/80 px-6 py-3 rounded-2xl border border-amber-500/30 shadow-2xl pointer-events-auto">
      <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
        Sail Speed Control (W / S)
      </div>

      <div className="flex items-center gap-2">
        {(['ANCHOR', 'HALF_SAIL', 'FULL_SAIL'] as SailState[]).map((state) => {
          const isActive = localSail === state;
          const colorClass =
            state === 'ANCHOR'
              ? isActive
                ? 'bg-rose-500/25 text-rose-300 border-rose-500/60 shadow-[0_0_12px_rgba(244,63,94,0.4)]'
                : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
              : state === 'HALF_SAIL'
              ? isActive
                ? 'bg-amber-500/25 text-amber-300 border-amber-500/60 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
              : isActive
              ? 'bg-emerald-500/25 text-emerald-300 border-emerald-500/60 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
              : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300';

          return (
            <button
              key={state}
              onClick={() => onChangeSail(state)}
              className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider border transition cursor-pointer ${colorClass}`}
            >
              {state === 'ANCHOR' ? 'Anchor' : state === 'HALF_SAIL' ? 'Half Sail' : 'Full Sail'}
            </button>
          );
        })}
      </div>

      {/* Speedometer */}
      <div className="flex items-baseline gap-1 mt-0.5">
        <span className="text-2xl font-cinzel font-black text-amber-300 tracking-wider">
          {speedKnots}
        </span>
        <span className="text-[10px] uppercase font-bold text-slate-400">Knots</span>
      </div>

      {/* Rudder Angle Visualizer */}
      <div className="flex items-center gap-3 mt-1">
        <button
          onMouseDown={() => onSetRudder(-1)}
          onMouseUp={() => onSetRudder(0)}
          className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-amber-400 transition"
          title="Turn Port (A)"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
        </button>

        <div className="w-24 h-2 bg-slate-900 rounded-full border border-slate-800 overflow-hidden relative">
          <div
            className="h-full bg-amber-400 transition-all duration-75 rounded-full"
            style={{
              width: `${Math.abs(localRudder) * 50}%`,
              marginLeft: localRudder < 0 ? `${50 - Math.abs(localRudder) * 50}%` : '50%',
            }}
          />
        </div>

        <button
          onMouseDown={() => onSetRudder(1)}
          onMouseUp={() => onSetRudder(0)}
          className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-amber-400 transition"
          title="Turn Starboard (D)"
        >
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="text-[9px] text-slate-500 font-mono">STEER: A / D KEY</div>
    </div>
  );
});
