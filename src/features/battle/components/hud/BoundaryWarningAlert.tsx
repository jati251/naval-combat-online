import React from 'react';
import { AlertTriangle, Compass } from 'lucide-react';
import { useGameStore } from '@/stores/useGameStore';
import { ARENA_RADIUS } from '../3d/MapBoundary3D';

export const BoundaryWarningAlert: React.FC = React.memo(() => {
  const selfId = useGameStore((s) => s.selfId);
  const selfShip = useGameStore((s) => s.ships.find((ship) => ship.id === selfId));

  if (!selfShip || selfShip.isSunk) return null;

  const dist = Math.hypot(selfShip.x, selfShip.z);
  if (dist < 420) return null;

  const remaining = Math.max(0, Math.round(ARENA_RADIUS - dist));
  const isCritical = remaining < 30;

  return (
    <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 pointer-events-none select-none">
      <div
        className={`flex items-center gap-3 px-5 py-2.5 rounded-md border shadow-2xl transition-colors duration-200 ${
          isCritical
            ? 'bg-gradient-to-r from-rose-950 via-red-950 to-stone-950 border-rose-500 text-rose-100 shadow-[0_0_20px_rgba(225,29,72,0.4)]'
            : 'pirate-parchment border-amber-500/70 text-amber-100'
        }`}
      >
        <div className={`p-1.5 rounded ${isCritical ? 'bg-rose-900/80' : 'bg-amber-950/80 border border-amber-600/50'}`}>
          <AlertTriangle className={`w-4 h-4 ${isCritical ? 'text-rose-300 animate-bounce' : 'text-amber-300'}`} />
        </div>

        <div className="flex flex-col">
          <div className="text-xs font-cinzel font-black tracking-widest uppercase gold-emboss">
            {isCritical ? 'TREACHEROUS REEFS AHEAD!' : 'APPROACHING UNCHARTED SHOALS'}
          </div>
          <div className="text-[10px] font-fell italic opacity-90 flex items-center gap-1.5 mt-0.5">
            <Compass className="w-3 h-3 text-amber-400" />
            <span>Heed the helm! Turn about before grounding — {remaining}m to squall boundary.</span>
          </div>
        </div>
      </div>
    </div>
  );
});
