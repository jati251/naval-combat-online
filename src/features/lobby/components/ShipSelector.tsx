import React from 'react';
import { Shield, Zap } from 'lucide-react';
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
  const currentConfig = SHIP_PRESETS[selectedShip];

  return (
    <div className="w-96 flex flex-col bg-slate-950/70 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-md shadow-2xl">
      <div className="pb-3 border-b border-slate-800">
        <h2 className="font-cinzel font-bold text-amber-200 tracking-wider text-base">
          VESSEL COMMISSION
        </h2>
        <p className="text-[11px] text-slate-400 mt-0.5">Select your warship for the engagement</p>
      </div>

      {/* 3D Turntable Preview */}
      <div className="w-full h-44 rounded-xl overflow-hidden bg-gradient-to-b from-slate-900 to-slate-950 my-3 border border-slate-800 relative flex items-center justify-center">
        <ShipTurntable3D shipClass={selectedShip} />
        <div className="absolute bottom-2 left-3 text-[10px] font-mono text-amber-400/80 bg-slate-950/80 px-2 py-0.5 rounded border border-amber-500/20">
          {currentConfig.subtitle}
        </div>
      </div>

      {/* Ship Selection Cards */}
      <div className="grid grid-cols-3 gap-2">
        {(Object.keys(SHIP_PRESETS) as ShipClass[]).map((cls) => {
          const config = SHIP_PRESETS[cls];
          const isChosen = selectedShip === cls;
          return (
            <button
              key={cls}
              onClick={() => onSelectShip(cls)}
              className={`flex flex-col items-center p-2.5 rounded-xl border transition cursor-pointer text-center ${
                isChosen
                  ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <span className="font-cinzel font-bold text-xs capitalize">{config.id}</span>
              <span className="text-[9px] text-slate-400 mt-0.5">{config.cannonsPerSide * 2} Guns</span>
            </button>
          );
        })}
      </div>

      {/* Ship Stats Overview */}
      <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-amber-400" /> Hull Armor
          </span>
          <span className="font-mono font-bold text-slate-200">{currentConfig.maxHealth} HP</span>
        </div>
        <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-400 rounded-full"
            style={{ width: `${(currentConfig.maxHealth / 260) * 100}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-xs pt-1">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-cyan-400" /> Max Speed
          </span>
          <span className="font-mono font-bold text-slate-200">{currentConfig.topSpeed} Knots</span>
        </div>
        <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
          <div
            className="h-full bg-cyan-400 rounded-full"
            style={{ width: `${(currentConfig.topSpeed / 18) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};
