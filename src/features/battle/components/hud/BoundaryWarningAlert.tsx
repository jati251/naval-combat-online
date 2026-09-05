import React from 'react';
import { AlertTriangle, Compass } from 'lucide-react';
import { useGameStore } from '@/stores/useGameStore';
import { ARENA_RADIUS } from '../3d/MapBoundary3D';

export const BoundaryWarningAlert: React.FC = () => {
  const ships = useGameStore((s) => s.ships);
  const selfId = useGameStore((s) => s.selfId);
  const selfShip = ships.find((s) => s.id === selfId);

  if (!selfShip || selfShip.isSunk) return null;

  const dist = Math.hypot(selfShip.x, selfShip.z);
  const WARNING_THRESHOLD = 420;

  if (dist < WARNING_THRESHOLD) return null;

  const remaining = Math.max(0, Math.round(ARENA_RADIUS - dist));
  const isCritical = remaining < 30;

  return (
    <div className="absolute top-28 left-1/2 -translate-x-1/2 z-40 pointer-events-none animate-bounce">
      <div
        className={`flex items-center gap-3 px-5 py-2.5 rounded-2xl backdrop-blur-md border shadow-2xl transition-all duration-200 ${
          isCritical
            ? 'bg-rose-950/90 border-rose-500 text-rose-200 shadow-[0_0_30px_rgba(244,63,94,0.6)] animate-pulse'
            : 'bg-amber-950/90 border-amber-500 text-amber-200 shadow-[0_0_24px_rgba(245,158,11,0.5)]'
        }`}
      >
        <div className={`p-2 rounded-xl ${isCritical ? 'bg-rose-900/60' : 'bg-amber-900/60'}`}>
          <AlertTriangle className={`w-5 h-5 ${isCritical ? 'text-rose-400 animate-spin' : 'text-amber-400'}`} />
        </div>

        <div className="flex flex-col">
          <div className="text-xs font-black tracking-widest uppercase font-cinzel">
            {isCritical ? 'DESYNCHRONIZATION IMMINENT' : 'LEAVING COMBAT ZONE'}
          </div>
          <div className="text-[11px] font-mono font-bold opacity-90 flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5" />
            <span>TURN BACK! {remaining}M TO BOUNDARY REPEL</span>
          </div>
        </div>
      </div>
    </div>
  );
};
