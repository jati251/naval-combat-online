import React from 'react';
import { Shield, Zap, Crosshair, Anchor } from 'lucide-react';
import { SHIP_PRESETS, type ShipClass } from '@/types';

interface ShipSelectorProps {
  selectedShip: ShipClass;
  onSelectShip: (shipClass: ShipClass) => void;
  className?: string;
}

export const ShipSelector: React.FC<ShipSelectorProps> = ({
  selectedShip,
  onSelectShip,
  className = '',
}) => {
  const currentConfig = SHIP_PRESETS[selectedShip] || SHIP_PRESETS.brig;

  return (
    <div className={`w-full flex flex-col gap-2 select-none ${className}`}>
      {/* Top Floating Card: Vessel Tactical Specs & Description */}
      <div className="game-dock rounded-xl p-2.5 sm:p-3.5 border border-amber-500/40 shadow-xl flex flex-col gap-1.5 sm:gap-2">
        {/* Vessel Header */}
        <div className="flex items-center justify-between border-b border-amber-500/30 pb-1.5">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="font-cinzel font-black text-amber-100 text-xs sm:text-sm md:text-base gold-emboss truncate">
                {currentConfig.name}
              </h2>
              <span className="text-[8px] sm:text-[9px] font-cinzel font-bold px-1.5 py-0.2 rounded bg-amber-950/80 text-amber-300 border border-amber-500/50 uppercase shrink-0">
                {currentConfig.id}
              </span>
            </div>
            <p className="text-[9px] sm:text-[10px] font-fell italic text-amber-200/80 truncate mt-0.5">
              {currentConfig.subtitle}
            </p>
          </div>

          <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-black/40 border border-amber-500/30 text-amber-300 text-[9px] font-cinzel font-bold shrink-0">
            <Anchor className="w-3 h-3 text-amber-400" />
            <span>{currentConfig.cannonsPerSide * 2} GUNS</span>
          </div>
        </div>

        {/* Tactical Stat Gauges */}
        <div className="grid grid-cols-3 gap-2 text-[9px] sm:text-[10px] font-mono pt-0.5">
          {/* Hull HP */}
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center justify-between text-amber-200/90 font-cinzel text-[8.5px] sm:text-[9px] font-bold">
              <span className="flex items-center gap-1">
                <Shield className="w-2.5 h-2.5 text-emerald-400" /> HULL
              </span>
              <span className="font-mono text-white font-bold">{currentConfig.maxHealth}</span>
            </div>
            <div className="w-full h-1 sm:h-1.5 bg-black/60 rounded-full overflow-hidden border border-amber-500/30">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-300 rounded-full shadow-[0_0_6px_rgba(16,185,129,0.6)]"
                style={{ width: `${(currentConfig.maxHealth / 350) * 100}%` }}
              />
            </div>
          </div>

          {/* Knot Speed */}
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center justify-between text-amber-200/90 font-cinzel text-[8.5px] sm:text-[9px] font-bold">
              <span className="flex items-center gap-1">
                <Zap className="w-2.5 h-2.5 text-cyan-400" /> SPEED
              </span>
              <span className="font-mono text-white font-bold">{currentConfig.topSpeed} Kts</span>
            </div>
            <div className="w-full h-1 sm:h-1.5 bg-black/60 rounded-full overflow-hidden border border-amber-500/30">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-amber-300 rounded-full shadow-[0_0_6px_rgba(6,182,212,0.6)]"
                style={{ width: `${(currentConfig.topSpeed / 21) * 100}%` }}
              />
            </div>
          </div>

          {/* Broadside Battery */}
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center justify-between text-amber-200/90 font-cinzel text-[8.5px] sm:text-[9px] font-bold">
              <span className="flex items-center gap-1">
                <Crosshair className="w-2.5 h-2.5 text-amber-400" /> BATTERY
              </span>
              <span className="font-mono text-white font-bold">{currentConfig.cannonsPerSide * 2}</span>
            </div>
            <div className="w-full h-1 sm:h-1.5 bg-black/60 rounded-full overflow-hidden border border-amber-500/30">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-orange-400 rounded-full shadow-[0_0_6px_rgba(245,158,11,0.6)]"
                style={{ width: `${(currentConfig.cannonsPerSide / 8) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Horizontal Fleet Carousel (Scrollable dock row) */}
      <div className="w-full flex items-center gap-1.5 overflow-x-auto py-1 px-0.5 scrollbar-thin">
        {(Object.keys(SHIP_PRESETS) as ShipClass[]).map((cls) => {
          const config = SHIP_PRESETS[cls];
          const isChosen = selectedShip === cls;
          const displayName = cls === 'man_o_war' ? "Man-o'-War" : config.id;

          return (
            <button
              key={cls}
              onClick={() => onSelectShip(cls)}
              className={`flex-1 min-w-[76px] sm:min-w-[88px] flex flex-col items-center py-1.5 px-1 rounded-lg border transition-all duration-150 cursor-pointer text-center relative shrink-0 active:scale-95 ${
                isChosen
                  ? 'bg-gradient-to-b from-amber-600/40 to-amber-950/90 border-amber-400 text-white shadow-[0_0_12px_rgba(245,158,11,0.4)] ring-1 ring-amber-300'
                  : 'game-hud-glass border-amber-600/30 text-amber-100/80 hover:text-white hover:border-amber-400/60 hover:bg-[#142338]'
              }`}
            >
              {isChosen && (
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full wax-seal-red shadow-sm" />
              )}
              <span className="font-cinzel font-bold text-[10px] sm:text-[11px] capitalize truncate w-full">
                {displayName}
              </span>
              <span className="text-[8px] sm:text-[9px] text-amber-300/90 font-mono font-bold mt-0.5">
                {config.cannonsPerSide * 2} Guns
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
