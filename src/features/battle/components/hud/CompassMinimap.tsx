import React from 'react';
import { Compass, Wind } from 'lucide-react';
import type { ShipSnapshot } from '@/types';
import { ARENA_ISLANDS } from '../3d/Islands3D';
import { ARENA_SHIPWRECKS } from '../3d/Shipwrecks3D';
import { CONTROL_CONFIG } from '../../utils/controls';

interface CompassMinimapProps {
  selfShip: ShipSnapshot | undefined;
  ships: ShipSnapshot[];
  selfId: string;
  windAngle: number;
  windSpeed: number;
}

/**
 * AAA Naval Tactical Compass & Minimap (Heading-Up Binnacle Projection)
 * - Forward ship heading is locked to UP (12 o'clock lubber line)
 * - Compass rose ring dynamically rotates with true cardinal bearings (N, E, S, W)
 * - Accurate island contours including elongated barrier spits
 * - Directional chevrons for self ship and enemy armada vessels
 * - Tactical range rings (120m, 240m) for cannon gunnery planning
 */
export const CompassMinimap: React.FC<CompassMinimapProps> = React.memo(({
  selfShip,
  ships,
  selfId,
  windAngle,
  windSpeed,
}) => {
  const scale = CONTROL_CONFIG.RADAR_SCALE;
  const shipHeading = selfShip?.rotationY || 0;
  const cosH = Math.cos(shipHeading);
  const sinH = Math.sin(shipHeading);

  // Helper: Project world coordinates into ship-relative radar screen space
  // Correctly aligned with 3D camera: Forward is UP (-Y), Starboard is RIGHT (+X)
  const projectToRadar = (worldX: number, worldZ: number) => {
    if (!selfShip) return { x: 0, y: 0 };
    const dx = worldX - selfShip.x;
    const dz = worldZ - selfShip.z;

    // Forward along ship bow
    const fwd = dx * sinH + dz * cosH;
    // Starboard (right) lateral perpendicular to bow
    const stbd = dx * cosH - dz * sinH;

    return {
      x: stbd * scale,
      y: -fwd * scale,
    };
  };

  // Bezel rotation: when heading North (rotationY = PI), N is at top (0 rad)
  // When ship turns right, North moves counter-clockwise
  const bezelRotation = Math.PI - shipHeading;

  return (
    <div className="relative flex items-center justify-center w-36 h-36 rounded-full backdrop-blur-md bg-slate-950/90 border-2 border-amber-500/60 shadow-2xl shadow-amber-950/80 p-2 pointer-events-auto select-none">
      {/* 1. Rotating Compass Rose Bezel (Cardinals rotate with world heading) */}
      <div
        className="absolute inset-1 rounded-full border border-amber-500/25 flex items-center justify-center transition-transform duration-75 pointer-events-none"
        style={{
          transform: `rotate(${bezelRotation}rad)`,
        }}
      >
        <span className="absolute top-1 text-[9px] font-black text-amber-400">N</span>
        <span className="absolute bottom-1 text-[9px] font-black text-slate-500">S</span>
        <span className="absolute right-1 text-[9px] font-black text-slate-500">E</span>
        <span className="absolute left-1 text-[9px] font-black text-slate-500">W</span>
      </div>

      {/* 2. Relative Wind Bearing Indicator */}
      <div
        className="absolute flex flex-col items-center pointer-events-none transition-transform duration-300 z-10"
        style={{
          transform: `rotate(${windAngle - shipHeading}rad)`,
        }}
      >
        <div className="w-0.5 h-14 bg-sky-400/50 rounded-full" />
        <Wind className="w-3.5 h-3.5 text-sky-300 -mt-1 drop-shadow-[0_0_4px_#38bdf8]" />
      </div>

      {/* 3. Clipped Radar Tactical Scope */}
      <div className="absolute inset-2 rounded-full overflow-hidden pointer-events-none">
        {/* Subtle Range Distance Rings */}
        <div className="absolute inset-0 flex items-center justify-center">
          {/* 200m range ring (28px radius) */}
          <div className="w-[56px] h-[56px] rounded-full border border-sky-500/20" />
          {/* 400m range ring (56px radius) */}
          <div className="w-[112px] h-[112px] rounded-full border border-sky-500/15" />
          {/* Crosshair guidelines */}
          <div className="absolute w-full h-[1px] bg-amber-500/10" />
          <div className="absolute h-full w-[1px] bg-amber-500/10" />
        </div>

        {/* Tactical Islands Terrain Silhouettes */}
        {ARENA_ISLANDS.map((isl) => {
          if (!selfShip) return null;
          const { x, y } = projectToRadar(isl.x, isl.z);

          // Support elongated barrier islands and circular atolls
          const isElongated = !!isl.elongation;
          const relAngle = isElongated ? ((isl.elongation?.angle ?? 0) - shipHeading) : 0;
          const baseW = Math.max(10, isl.sandRadius * 2 * (isl.elongation?.scaleX ?? 1) * scale);
          const baseH = Math.max(10, isl.sandRadius * 2 * (isl.elongation?.scaleZ ?? 1) * scale);

          return (
            <div
              key={isl.id}
              className="absolute bg-emerald-700/70 border border-emerald-400/50 shadow-inner flex items-center justify-center pointer-events-none"
              style={{
                width: `${baseW}px`,
                height: `${baseH}px`,
                borderRadius: isElongated ? `${baseW * 0.5}px` : '9999px',
                left: '50%',
                top: '50%',
                transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) rotate(${relAngle}rad)`,
              }}
              title={isl.name}
            >
              <span
                className="text-[6.5px] font-bold text-amber-200/90 select-none tracking-tighter"
                style={{
                  transform: `rotate(${-relAngle}rad)`,
                }}
              >
                {isl.name.slice(0, 3).toUpperCase()}
              </span>
            </div>
          );
        })}

        {/* Floating Shipwreck Flotsam Obstacles */}
        {ARENA_SHIPWRECKS.map((wreck) => {
          if (!selfShip) return null;
          const { x, y } = projectToRadar(wreck.x, wreck.z);
          return (
            <div
              key={wreck.id}
              className="absolute w-3 h-3 bg-amber-950/90 border border-amber-400/80 rotate-45 flex items-center justify-center pointer-events-none shadow"
              style={{
                left: '50%',
                top: '50%',
                transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) rotate(45deg)`,
              }}
              title={wreck.name}
            >
              <span className="text-[6px] text-amber-300 font-black -rotate-45">✕</span>
            </div>
          );
        })}

        {/* Enemy Warships with Directional Chevrons */}
        {ships
          .filter((s) => s.id !== selfId && !s.isSunk)
          .map((s) => {
            if (!selfShip) return null;
            const { x, y } = projectToRadar(s.x, s.z);
            const relHeading = s.rotationY - shipHeading;
            return (
              <div
                key={s.id}
                className="absolute w-3 h-4 flex items-center justify-center pointer-events-none"
                style={{
                  left: '50%',
                  top: '50%',
                  transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) rotate(${relHeading}rad)`,
                }}
                title={s.name}
              >
                <svg viewBox="0 0 20 28" className="w-3 h-4 drop-shadow-[0_0_6px_#f43f5e]">
                  <polygon points="10,2 18,24 10,18 2,24" fill="#f43f5e" stroke="#ffffff" strokeWidth="1.5" />
                </svg>
              </div>
            );
          })}
      </div>

      {/* 4. Center Player Ship (Forward locked at 12 o'clock lubber line) */}
      <div className="relative z-20 w-4 h-5 flex items-center justify-center pointer-events-none">
        <svg viewBox="0 0 20 28" className="w-4 h-5 drop-shadow-[0_0_8px_#f59e0b]">
          <polygon points="10,2 18,24 10,18 2,24" fill="#f59e0b" stroke="#0f172a" strokeWidth="1.8" />
        </svg>
      </div>

      {/* 5. Wind Speed & Heading Status Badge */}
      <div className="absolute -bottom-6 text-[10px] font-mono font-bold text-sky-300 bg-slate-950/90 px-2.5 py-0.5 rounded-lg border border-slate-800 flex items-center gap-1 shadow-lg">
        <Compass className="w-3 h-3 text-cyan-400" />
        <span>{typeof windSpeed === 'number' ? windSpeed.toFixed(1) : windSpeed} KTS</span>
      </div>
    </div>
  );
});
