import React from 'react';
import { Anchor } from 'lucide-react';
import type { SailState } from '@/types';

interface SpeedRudderControlProps {
  localSail: SailState;
  speedKnots: string;
  localRudder: number;
  onChangeSail: (state: SailState) => void;
  onSetRudder: (value: number) => void;
}

const SAIL_STEPS: { state: SailState; label: string; desc: string }[] = [
  { state: 'FULL_SAIL', label: 'FULL', desc: 'Full Sail [W]' },
  { state: 'HALF_SAIL', label: 'HALF', desc: 'Half Sail' },
  { state: 'ANCHOR', label: 'ANCHOR', desc: 'Drop Anchor [S]' },
];

export const SpeedRudderControl: React.FC<SpeedRudderControlProps> = React.memo(({
  localSail,
  speedKnots,
  localRudder,
  onChangeSail,
}) => {
  // Wheel rotation in degrees based on rudder angle (-1 to 1 => -45deg to +45deg)
  const wheelRotation = localRudder * 45;

  return (
    <div className="pointer-events-auto flex items-center gap-3 naval-plaque px-3.5 py-2 select-none">
      {/* Ship's Helm Wheel */}
      <div className="flex flex-col items-center gap-0.5">
        <div className="relative w-10 h-10 flex items-center justify-center">
          <svg
            viewBox="0 0 100 100"
            className="w-10 h-10 transition-transform duration-75"
            style={{ transform: `rotate(${wheelRotation}deg)` }}
          >
            {/* Outer Wheel Ring */}
            <circle cx="50" cy="50" r="38" fill="none" stroke="#8a6d3b" strokeWidth="3" />
            <circle cx="50" cy="50" r="32" fill="none" stroke="#d4af37" strokeWidth="2" />
            <circle cx="50" cy="50" r="18" fill="#1e1814" stroke="#d4af37" strokeWidth="1.5" />
            {/* Center Hub */}
            <circle cx="50" cy="50" r="7" fill="#d4af37" stroke="#8a6d3b" strokeWidth="1" />
            {/* 8 Spokes */}
            {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
              <g key={deg} transform={`rotate(${deg} 50 50)`}>
                <line x1="50" y1="12" x2="50" y2="42" stroke="#4a3020" strokeWidth="3" strokeLinecap="round" />
                <line x1="50" y1="5" x2="50" y2="12" stroke="#d4af37" strokeWidth="2.5" strokeLinecap="round" />
              </g>
            ))}
          </svg>
        </div>
        <span className="text-[7.5px] font-mono tracking-wider text-stone-400 uppercase font-semibold">
          HELM [A/D]
        </span>
      </div>

      <div className="w-[1px] h-8 bg-amber-500/20" />

      {/* Speedometer Telegraph */}
      <div className="flex flex-col items-center min-w-[48px]">
        <span className="text-xl font-cinzel font-bold text-amber-100 tracking-wider leading-none">
          {speedKnots}
        </span>
        <span className="text-[8px] font-mono tracking-wider text-amber-400/80 uppercase mt-0.5">
          KNOTS
        </span>
      </div>

      <div className="w-[1px] h-8 bg-amber-500/20" />

      {/* Sail Telegraph Lever */}
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-1 bg-stone-950/70 p-0.5 rounded border border-stone-800">
          {SAIL_STEPS.map(({ state, label, desc }) => {
            const isActive = localSail === state;
            return (
              <button
                key={state}
                onClick={() => onChangeSail(state)}
                title={desc}
                className={`px-2 py-0.5 rounded text-[9px] font-cinzel font-bold tracking-wider transition-colors cursor-pointer flex items-center gap-1 ${
                  isActive
                    ? state === 'ANCHOR'
                      ? 'bg-rose-950 text-rose-200 border border-rose-700/60'
                      : state === 'HALF_SAIL'
                      ? 'bg-amber-950 text-amber-200 border border-amber-700/60'
                      : 'bg-emerald-950 text-emerald-200 border border-emerald-700/60'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
                }`}
              >
                {state === 'ANCHOR' && <Anchor className="w-2.5 h-2.5" />}
                <span>{label}</span>
              </button>
            );
          })}
        </div>
        <div className="flex justify-between text-[7.5px] font-mono text-stone-400 px-0.5 uppercase tracking-wider">
          <span>SAILS</span>
          <span>[W/S]</span>
        </div>
      </div>
    </div>
  );
});
