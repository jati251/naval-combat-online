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
    <div className="w-[420px] flex flex-col bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 backdrop-blur-md shadow-2xl">
      <div className="pb-2.5 border-b border-slate-800/80 flex items-center justify-between">
        <div>
          <h2 className="font-cinzel font-bold text-amber-200 tracking-wider text-base">
            VESSEL COMMISSION
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">Select warship class for the engagement</p>
        </div>
        <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-mono font-bold">
          <Anchor className="w-3 h-3 text-amber-400" />
          <span>8 CLASSES</span>
        </div>
      </div>

      {/* 3D Turntable Preview */}
      <div className="w-full h-44 rounded-xl overflow-hidden bg-gradient-to-b from-slate-900 to-slate-950 my-2.5 border border-slate-800/90 relative flex items-center justify-center">
        <ShipTurntable3D shipClass={selectedShip} />
        <div className="absolute top-2 right-3 text-[10px] font-mono font-bold text-cyan-300 bg-slate-950/85 px-2 py-0.5 rounded border border-cyan-500/30">
          {currentConfig.name}
        </div>
        <div className="absolute bottom-2 left-3 text-[10px] font-mono text-amber-400/90 bg-slate-950/85 px-2 py-0.5 rounded border border-amber-500/30">
          {currentConfig.subtitle}
        </div>
      </div>

      {/* Ship Selection Cards (4x2 Grid) */}
      <div className="grid grid-cols-4 gap-1.5">
        {(Object.keys(SHIP_PRESETS) as ShipClass[]).map((cls) => {
          const config = SHIP_PRESETS[cls];
          const isChosen = selectedShip === cls;
          const displayName = cls === 'man_o_war' ? "Man-o'-War" : config.id;

          return (
            <button
              key={cls}
              onClick={() => onSelectShip(cls)}
              className={`flex flex-col items-center py-2 px-1.5 rounded-lg border transition cursor-pointer text-center ${
                isChosen
                  ? 'bg-amber-500/25 border-amber-400 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.25)] ring-1 ring-amber-400/50'
                  : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700 hover:bg-slate-900'
              }`}
            >
              <span className="font-cinzel font-bold text-[11px] capitalize truncate w-full">
                {displayName}
              </span>
              <span className="text-[9px] text-slate-400 mt-0.5 font-mono">
                {config.cannonsPerSide * 2} Guns
              </span>
            </button>
          );
        })}
      </div>

      {/* Vessel Description */}
      <p className="text-[11px] text-slate-400 line-clamp-2 mt-2.5 px-1 italic">
        "{currentConfig.description}"
      </p>

      {/* Ship Stats Overview */}
      <div className="mt-2.5 pt-2.5 border-t border-slate-800/80 space-y-1.5">
        <div className="grid grid-cols-3 gap-2 text-[11px] font-mono">
          <div className="flex flex-col">
            <span className="text-slate-400 flex items-center gap-1">
              <Shield className="w-3 h-3 text-amber-400" /> Armor
            </span>
            <span className="font-bold text-slate-200 mt-0.5">{currentConfig.maxHealth} HP</span>
            <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden mt-1">
              <div
                className="h-full bg-amber-400 rounded-full"
                style={{ width: `${(currentConfig.maxHealth / 350) * 100}%` }}
              />
            </div>
          </div>

          <div className="flex flex-col">
            <span className="text-slate-400 flex items-center gap-1">
              <Zap className="w-3 h-3 text-cyan-400" /> Speed
            </span>
            <span className="font-bold text-slate-200 mt-0.5">{currentConfig.topSpeed} Kts</span>
            <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden mt-1">
              <div
                className="h-full bg-cyan-400 rounded-full"
                style={{ width: `${(currentConfig.topSpeed / 21) * 100}%` }}
              />
            </div>
          </div>

          <div className="flex flex-col">
            <span className="text-slate-400 flex items-center gap-1">
              <Crosshair className="w-3 h-3 text-rose-400" /> Broadside
            </span>
            <span className="font-bold text-slate-200 mt-0.5">{currentConfig.cannonsPerSide * 2} Cannons</span>
            <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden mt-1">
              <div
                className="h-full bg-rose-400 rounded-full"
                style={{ width: `${(currentConfig.cannonsPerSide / 8) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
