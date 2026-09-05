import React from 'react';
import { Shield, Zap, Crosshair, Anchor } from 'lucide-react';
import { SHIP_PRESETS, type ShipClass } from '@/types';
import { ShipTurntable3D } from './ShipTurntable3D';

interface ShipSelectorProps {
  selectedShip: ShipClass;
  onSelectShip: (shipClass: ShipClass) => void;
}

export const ShipSelector: React.FC<ShipSelectorProps> = ({
  selectedShip,
  onSelectShip,
}) => {
  const currentConfig = SHIP_PRESETS[selectedShip] || SHIP_PRESETS.brig;

  return (
    <div className="w-full max-w-[430px] flex flex-col pirate-parchment rounded-xl p-2.5 sm:p-4 shadow-2xl relative border border-amber-600/40">
      {/* Corner Ornaments */}
      <div className="absolute top-1 left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-amber-400/70 pointer-events-none" />
      <div className="absolute top-1 right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-amber-400/70 pointer-events-none" />
      <div className="absolute bottom-1 left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-amber-400/70 pointer-events-none" />
      <div className="absolute bottom-1 right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-amber-400/70 pointer-events-none" />

      {/* Shipwright Header */}
      <div className="pb-1.5 sm:pb-2.5 border-b border-amber-600/30 flex items-center justify-between">
        <div>
          <h2 className="font-cinzel font-bold text-amber-100 tracking-widest text-xs sm:text-base gold-emboss">
            MASTER SHIPWRIGHT
          </h2>
          <p className="text-[8.5px] sm:text-[10px] font-fell italic text-amber-200/60 leading-tight">
            Commission your warship for the line of battle
          </p>
        </div>
        <div className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2.5 py-0.5 rounded bg-stone-950/80 border border-amber-500/40 text-amber-300 text-[8.5px] sm:text-[10px] font-cinzel font-bold">
          <Anchor className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-400" />
          <span>8 RATINGS</span>
        </div>
      </div>

      {/* 3D Turntable Preview encased in a Brass Porthole Frame */}
      <div className="w-full h-28 sm:h-36 lg:h-44 rounded-lg overflow-hidden bg-gradient-to-b from-[#0e1622] to-[#060b12] my-1.5 sm:my-2.5 border-2 border-amber-600/50 relative flex items-center justify-center shadow-[inset_0_0_20px_rgba(0,0,0,0.8)]">
        <ShipTurntable3D shipClass={selectedShip} />
        
        {/* Vessel Class Name Badge */}
        <div className="absolute top-1.5 right-1.5 text-[9px] sm:text-[10px] font-cinzel font-bold text-amber-100 bg-stone-950/90 px-2 py-0.5 rounded border border-amber-500/40 shadow-sm">
          {currentConfig.name}
        </div>
        {/* Vessel Subtitle Rating */}
        <div className="absolute bottom-1.5 left-1.5 text-[8.5px] sm:text-[10px] font-fell italic text-amber-300/90 bg-stone-950/90 px-2 py-0.5 rounded border border-amber-500/30 shadow-sm truncate max-w-[70%]">
          {currentConfig.subtitle}
        </div>
      </div>

      {/* Ship Class Selection Tokens (4x2 Grid) */}
      <div className="grid grid-cols-4 gap-1 sm:gap-1.5">
        {(Object.keys(SHIP_PRESETS) as ShipClass[]).map((cls) => {
          const config = SHIP_PRESETS[cls];
          const isChosen = selectedShip === cls;
          const displayName = cls === 'man_o_war' ? "Man-o'-War" : config.id;

          return (
            <button
              key={cls}
              onClick={() => onSelectShip(cls)}
              className={`flex flex-col items-center py-1.5 sm:py-2 px-0.5 sm:px-1 rounded border transition-all duration-150 cursor-pointer text-center relative ${
                isChosen
                  ? 'bg-gradient-to-b from-amber-600/35 to-amber-950/80 border-2 border-amber-400 text-white shadow-[0_0_15px_rgba(245,158,11,0.45)] ring-1 ring-amber-300'
                  : 'bg-[#142338]/85 border border-amber-500/30 text-amber-100/90 hover:text-white hover:border-amber-400/70 hover:bg-[#1c304d] shadow-sm'
              }`}
            >
              {isChosen && (
                <div className="absolute -top-1 -right-1 w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full wax-seal-red" />
              )}
              <span className="font-cinzel font-bold text-[10px] sm:text-[11px] capitalize truncate w-full">
                {displayName}
              </span>
              <span className="text-[8px] sm:text-[9px] text-amber-300 font-mono font-bold mt-0.5">
                {config.cannonsPerSide * 2} Guns
              </span>
            </button>
          );
        })}
      </div>

      {/* Ship Description */}
      <p className="text-[10px] sm:text-[11px] font-fell italic text-amber-100/90 line-clamp-2 mt-1 sm:mt-2 px-1 leading-relaxed">
        "{currentConfig.description}"
      </p>

      {/* Naval Architecture Specifications */}
      <div className="mt-1.5 sm:mt-2.5 pt-1.5 sm:pt-2.5 border-t border-amber-500/30 space-y-1 sm:space-y-1.5">
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2 text-[10px] sm:text-[11px] font-mono">
          {/* Hull Timber */}
          <div className="flex flex-col">
            <span className="text-amber-200/90 flex items-center gap-1 font-cinzel text-[9px] sm:text-[10px] font-bold">
              <Shield className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-400" /> Hull Oak
            </span>
            <span className="font-black text-white text-[11px] sm:text-xs mt-0.5">{currentConfig.maxHealth} HP</span>
            <div className="w-full h-1 sm:h-1.5 bg-[#0e1929] rounded-sm overflow-hidden mt-0.5 sm:mt-1 border border-amber-500/30">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-300 rounded-sm shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                style={{ width: `${(currentConfig.maxHealth / 350) * 100}%` }}
              />
            </div>
          </div>

          {/* Knot Speed */}
          <div className="flex flex-col">
            <span className="text-amber-200/90 flex items-center gap-1 font-cinzel text-[9px] sm:text-[10px] font-bold">
              <Zap className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-cyan-400" /> Max Knots
            </span>
            <span className="font-black text-white text-[11px] sm:text-xs mt-0.5">{currentConfig.topSpeed} Kts</span>
            <div className="w-full h-1 sm:h-1.5 bg-[#0e1929] rounded-sm overflow-hidden mt-0.5 sm:mt-1 border border-amber-500/30">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-amber-300 rounded-sm shadow-[0_0_8px_rgba(6,182,212,0.5)]"
                style={{ width: `${(currentConfig.topSpeed / 21) * 100}%` }}
              />
            </div>
          </div>

          {/* Broadside Battery */}
          <div className="flex flex-col">
            <span className="text-amber-200/90 flex items-center gap-1 font-cinzel text-[9px] sm:text-[10px] font-bold">
              <Crosshair className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-400" /> Broadside
            </span>
            <span className="font-black text-white text-[11px] sm:text-xs mt-0.5">{currentConfig.cannonsPerSide * 2} Cannons</span>
            <div className="w-full h-1 sm:h-1.5 bg-[#0e1929] rounded-sm overflow-hidden mt-0.5 sm:mt-1 border border-amber-500/30">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-orange-400 rounded-sm shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                style={{ width: `${(currentConfig.cannonsPerSide / 8) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
