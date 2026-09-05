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
  { state: 'FULL_SAIL', label: 'FULL RIG', desc: 'Unfurl All Canvases [W]' },
  { state: 'HALF_SAIL', label: 'BATTLE', desc: 'Battle Canvases' },
  { state: 'ANCHOR', label: 'ANCHOR', desc: 'Cast Anchor [S]' },
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
    <div className="pointer-events-auto flex items-center gap-3.5 naval-plaque px-4 py-2 select-none rounded-md border border-amber-600/40 shadow-xl relative">
      {/* Corner Filigree Screws */}
      <div className="absolute top-1 left-1 w-1 h-1 rounded-full bg-amber-400/80 shadow-[0_0_2px_rgba(0,0,0,0.8)]" />
      <div className="absolute top-1 right-1 w-1 h-1 rounded-full bg-amber-400/80 shadow-[0_0_2px_rgba(0,0,0,0.8)]" />
      <div className="absolute bottom-1 left-1 w-1 h-1 rounded-full bg-amber-400/80 shadow-[0_0_2px_rgba(0,0,0,0.8)]" />
      <div className="absolute bottom-1 right-1 w-1 h-1 rounded-full bg-amber-400/80 shadow-[0_0_2px_rgba(0,0,0,0.8)]" />

      {/* Ship's Mahogany & Brass Helm */}
      <div className="flex flex-col items-center gap-0.5">
        <div className="relative w-11 h-11 flex items-center justify-center">
          <svg
            viewBox="0 0 100 100"
            className="w-11 h-11 transition-transform duration-75 filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
            style={{ transform: `rotate(${wheelRotation}deg)` }}
          >
            {/* Outer Wood Rim */}
            <circle cx="50" cy="50" r="38" fill="none" stroke="#3e2723" strokeWidth="4" />
            <circle cx="50" cy="50" r="35" fill="none" stroke="#d4af37" strokeWidth="1.8" />
            <circle cx="50" cy="50" r="19" fill="#1c140e" stroke="#d4af37" strokeWidth="2" />
            {/* Center Brass Hub */}
            <circle cx="50" cy="50" r="8" fill="#d4af37" stroke="#8a6d3b" strokeWidth="1.5" />
            {/* 8 Turned Mahogany & Brass Spoked Handles */}
            {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
              <g key={deg} transform={`rotate(${deg} 50 50)`}>
                <line x1="50" y1="10" x2="50" y2="42" stroke="#4e342e" strokeWidth="3.5" strokeLinecap="round" />
                <line x1="50" y1="4" x2="50" y2="11" stroke="#d4af37" strokeWidth="3" strokeLinecap="round" />
              </g>
            ))}
          </svg>
        </div>
        <span className="text-[8px] font-cinzel font-bold tracking-widest text-amber-400/80 uppercase">
          HELM [A/D]
        </span>
      </div>

      <div className="w-[1px] h-9 bg-amber-600/30" />

      {/* Brass Knotmeter Telegraph */}
      <div className="flex flex-col items-center min-w-[52px]">
        <span className="text-2xl font-cinzel font-black text-amber-100 tracking-wider leading-none gold-emboss">
          {speedKnots}
        </span>
        <span className="text-[8px] font-cinzel font-bold tracking-widest text-amber-400/90 uppercase mt-0.5">
          KNOTS
        </span>
      </div>

      <div className="w-[1px] h-9 bg-amber-600/30" />

      {/* Sail Telegraph Lever */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1 bg-stone-950/80 p-0.5 rounded border border-amber-900/50 shadow-inner">
          {SAIL_STEPS.map(({ state, label, desc }) => {
            const isActive = localSail === state;
            return (
              <button
                key={state}
                onClick={() => onChangeSail(state)}
                title={desc}
                className={`px-2.5 py-1 rounded text-[9px] font-cinzel font-bold tracking-wider transition-all cursor-pointer flex items-center gap-1 shadow-sm ${
                  isActive
                    ? state === 'ANCHOR'
                      ? 'bg-gradient-to-b from-rose-900 to-rose-950 text-rose-200 border border-rose-600/80 shadow-[0_0_8px_rgba(225,29,72,0.3)]'
                      : state === 'HALF_SAIL'
                      ? 'bg-gradient-to-b from-amber-900 to-amber-950 text-amber-200 border border-amber-600/80 shadow-[0_0_8px_rgba(212,175,55,0.3)]'
                      : 'bg-gradient-to-b from-emerald-900 to-emerald-950 text-emerald-200 border border-emerald-600/80 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                    : 'text-stone-400 hover:text-amber-200 hover:bg-stone-900/60'
                }`}
              >
                {state === 'ANCHOR' && <Anchor className="w-2.5 h-2.5" />}
                <span>{label}</span>
              </button>
            );
          })}
        </div>
        <div className="flex justify-between text-[8px] font-fell italic text-amber-200/60 px-1">
          <span>Canvases</span>
          <span className="not-italic font-cinzel text-amber-400/80 font-bold">[W/S]</span>
        </div>
      </div>
    </div>
  );
});
