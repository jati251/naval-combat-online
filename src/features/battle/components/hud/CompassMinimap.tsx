import React from 'react';
import { Compass, Wind } from 'lucide-react';
import type { ShipSnapshot } from '@/types';
import { ARENA_ISLANDS } from '../3d/Islands3D';
import { CONTROL_CONFIG } from '../../utils/controls';

interface CompassMinimapProps {
  selfShip: ShipSnapshot | undefined;
  ships: ShipSnapshot[];
  selfId: string;
  windAngle: number;
  windSpeed: number;
}

export const CompassMinimap: React.FC<CompassMinimapProps> = ({
  selfShip,
  ships,
  selfId,
  windAngle,
  windSpeed,
}) => {
  const scale = CONTROL_CONFIG.RADAR_SCALE;

  return (
    <div className="relative flex items-center justify-center w-36 h-36 rounded-full backdrop-blur-md bg-slate-950/85 border-2 border-amber-500/50 shadow-2xl shadow-amber-950/80 p-2 pointer-events-auto">
      {/* Compass Rose Ring */}
      <div className="absolute inset-1 rounded-full border border-amber-500/20 flex items-center justify-center">
        <span className="absolute top-1 text-[9px] font-black text-amber-400">N</span>
        <span className="absolute bottom-1 text-[9px] font-black text-slate-500">S</span>
        <span className="absolute right-1 text-[9px] font-black text-slate-500">E</span>
        <span className="absolute left-1 text-[9px] font-black text-slate-500">W</span>
      </div>

      {/* Wind Arrow */}
      <div
        className="absolute flex flex-col items-center pointer-events-none transition-transform duration-500"
        style={{
          transform: `rotate(${windAngle}rad)`,
        }}
      >
        <div className="w-0.5 h-12 bg-sky-400/60 rounded-full" />
        <Wind className="w-3.5 h-3.5 text-sky-300 -mt-1" />
      </div>

      {/* Clipped Radar Surface for Islands & Ships */}
      <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
        {/* Islands Terrain Indicators */}
        {ARENA_ISLANDS.map((isl) => {
          if (!selfShip) return null;
          const rx = (isl.x - selfShip.x) * scale;
          const rz = (isl.z - selfShip.z) * scale;
          const size = Math.max(12, isl.radius * 2 * scale);
          return (
            <div
              key={isl.id}
              className="absolute rounded-full bg-emerald-700/60 border border-amber-500/40 shadow-inner flex items-center justify-center pointer-events-none"
              style={{
                width: `${size}px`,
                height: `${size}px`,
                left: '50%',
                top: '50%',
                transform: `translate(calc(-50% + ${rx}px), calc(-50% + ${-rz}px))`,
              }}
              title={isl.name}
            >
              <span className="text-[7px] font-bold text-amber-200/80 select-none">
                {isl.name.slice(0, 3).toUpperCase()}
              </span>
            </div>
          );
        })}

        {/* Enemy Ship Blips on Compass */}
        {ships
          .filter((s) => s.id !== selfId && !s.isSunk)
          .map((s) => {
            if (!selfShip) return null;
            const rx = (s.x - selfShip.x) * scale;
            const rz = (s.z - selfShip.z) * scale;
            return (
              <div
                key={s.id}
                className="absolute w-2.5 h-2.5 rounded-full bg-rose-500 border border-white shadow-[0_0_8px_#f43f5e]"
                style={{
                  left: '50%',
                  top: '50%',
                  transform: `translate(calc(-50% + ${rx}px), calc(-50% + ${-rz}px))`,
                }}
                title={s.name}
              />
            );
          })}
      </div>

      {/* Center Player Ship Indicator with Rotation */}
      <div
        className="w-4 h-4 rounded-full bg-amber-400 border border-slate-950 flex items-center justify-center shadow-[0_0_8px_#f59e0b] z-10 transition-transform duration-100"
        style={{
          transform: `rotate(${-(selfShip?.rotationY || 0)}rad)`,
        }}
      >
        <div className="w-1.5 h-1.5 bg-slate-950 rounded-full" />
      </div>

      {/* Wind Speed Badge */}
      <div className="absolute -bottom-6 text-[10px] font-mono font-bold text-sky-300 bg-slate-950/85 px-2.5 py-0.5 rounded-lg border border-slate-800 flex items-center gap-1 shadow-lg">
        <Compass className="w-3 h-3 text-cyan-400" />
        <span>{typeof windSpeed === 'number' ? windSpeed.toFixed(1) : windSpeed} KTS WIND</span>
      </div>
    </div>
  );
};
