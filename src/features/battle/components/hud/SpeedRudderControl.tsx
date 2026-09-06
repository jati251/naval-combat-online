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

const SailIconVisual: React.FC<{ state: SailState }> = ({ state }) => {
  if (state === 'ANCHOR') {
    return (
      <div className="w-9 h-9 rounded-xl bg-gradient-to-b from-rose-950 via-stone-950 to-black border-2 border-rose-500/70 shadow-[0_0_12px_rgba(225,29,72,0.4)] flex items-center justify-center text-rose-300 shrink-0">
        <Anchor className="w-5 h-5 stroke-[2.3] drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" />
      </div>
    );
  }

  const isFull = state === 'FULL_SAIL';
  return (
    <div
      className={`w-9 h-9 rounded-xl flex items-center justify-center p-1 border-2 shadow-[0_0_12px_rgba(0,0,0,0.8)] shrink-0 transition-all ${
        isFull
          ? 'bg-gradient-to-b from-emerald-950 via-stone-950 to-black border-emerald-400/80 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.5)]'
          : 'bg-gradient-to-b from-amber-950 via-stone-950 to-black border-amber-400/80 text-amber-300 shadow-[0_0_12px_rgba(212,175,55,0.4)]'
      }`}
    >
      <svg viewBox="0 0 32 32" className="w-6 h-6 fill-current drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
        {/* Central Mast */}
        <line x1="16" y1="2" x2="16" y2="30" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        
        {/* Top Yardarm & Sail */}
        <line x1="8" y1="6" x2="24" y2="6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.65" />
        <path d="M8 6 Q 16 10 24 6 Q 20 13 16 13 Q 12 13 8 6 Z" fill="currentColor" opacity="0.95" />
        
        {/* Mid Yardarm & Sail */}
        <line x1="6" y1="14" x2="26" y2="14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.65" />
        <path d="M6 14 Q 16 18 26 14 Q 21 21 16 21 Q 11 21 6 14 Z" fill="currentColor" opacity="0.95" />

        {/* Lower Yardarm & Sail (Full Rig only) */}
        {isFull && (
          <>
            <line x1="4" y1="22" x2="28" y2="22" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.65" />
            <path d="M4 22 Q 16 26 28 22 Q 22 29 16 29 Q 10 29 4 22 Z" fill="currentColor" opacity="0.95" />
          </>
        )}
      </svg>
    </div>
  );
};

export const SpeedRudderControl: React.FC<SpeedRudderControlProps> = React.memo(({
  localSail,
  speedKnots,
  localRudder,
  onChangeSail,
}) => {
  // Wheel rotation in degrees based on rudder angle (-1 to 1 => -45deg to +45deg)
  const wheelRotation = localRudder * 45;

  const handleCycleSail = () => {
    if (localSail === 'ANCHOR') {
      onChangeSail('HALF_SAIL');
    } else if (localSail === 'HALF_SAIL') {
      onChangeSail('FULL_SAIL');
    } else {
      onChangeSail('ANCHOR');
    }
  };

  const sailLabel =
    localSail === 'FULL_SAIL'
      ? 'FULL RIG'
      : localSail === 'HALF_SAIL'
      ? 'BATTLE RIG'
      : 'ANCHORED';

  const sailColor =
    localSail === 'FULL_SAIL'
      ? 'text-emerald-300'
      : localSail === 'HALF_SAIL'
      ? 'text-amber-300'
      : 'text-rose-300';

  return (
    <div className="pointer-events-auto flex items-center gap-3.5 bg-gradient-to-t from-stone-950/95 via-stone-900/90 to-stone-950/70 backdrop-blur-md px-3.5 py-2 select-none rounded-t-2xl border-t-2 border-x border-amber-500/35 shadow-2xl relative">
      {/* Ship's Mahogany & Brass Helm */}
      <div className="flex flex-col items-center gap-0.5">
        <div className="relative w-11 h-11 flex items-center justify-center">
          <svg
            viewBox="0 0 100 100"
            className="w-11 h-11 transition-transform duration-75 filter drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]"
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
        <span className="text-[7.5px] font-cinzel font-bold tracking-widest text-amber-400/80 uppercase">
          HELM [A/D]
        </span>
      </div>

      <div className="w-[1px] h-9 bg-amber-500/25" />

      {/* Brass Knotmeter Telegraph */}
      <div className="flex flex-col items-center min-w-[54px]">
        <span className="text-2xl font-cinzel font-black text-amber-100 tracking-wider leading-none gold-emboss">
          {speedKnots}
        </span>
        <span className="text-[7.5px] font-cinzel font-bold tracking-widest text-amber-400/90 uppercase mt-0.5">
          KNOTS
        </span>
      </div>

      <div className="w-[1px] h-9 bg-amber-500/25" />

      {/* Single Sail Status Icon Widget (Click to cycle or use W/S) */}
      <button
        onClick={handleCycleSail}
        className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-black/50 hover:bg-black/70 border border-amber-500/30 hover:border-amber-400/60 transition cursor-pointer active:scale-95 text-left group"
        title="Cycle Sail State (or use W / S keys)"
      >
        <SailIconVisual state={localSail} />

        <div className="flex flex-col leading-none">
          <span className={`text-[10px] font-cinzel font-black tracking-wider ${sailColor} gold-emboss uppercase`}>
            {sailLabel}
          </span>
          <span className="text-[8px] font-mono font-bold text-amber-300/70 mt-1">
            CANVASES [W/S]
          </span>
        </div>
      </button>
    </div>
  );
});
