import React from 'react';
import { AlertTriangle, Compass } from 'lucide-react';
import { useGameStore } from '@/stores/useGameStore';
import { ARENA_RADIUS } from '../3d/MapBoundary3D';

export const BoundaryWarningAlert: React.FC = React.memo(() => {
  // Extract primitive state rounded to 2m to prevent 30Hz React re-render thrashing
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
        className={`flex items-center gap-2.5 px-4 py-2 rounded-md border shadow-lg transition-colors duration-200 ${
          isCritical
            ? 'bg-rose-950/85 border-rose-500/80 text-rose-200'
            : 'bg-stone-950/85 border-amber-500/50 text-amber-200'
        }`}
      >
        <div className={`p-1.5 rounded ${isCritical ? 'bg-rose-900/60' : 'bg-amber-950/80'}`}>
          <AlertTriangle className={`w-4 h-4 ${isCritical ? 'text-rose-400' : 'text-amber-400'}`} />
        </div>

        <div className="flex flex-col">
          <div className="text-[11px] font-bold tracking-wider uppercase font-cinzel">
            {isCritical ? 'DESYNCHRONIZATION IMMINENT' : 'LEAVING COMBAT ZONE'}
          </div>
          <div className="text-[10px] font-mono opacity-85 flex items-center gap-1">
            <Compass className="w-3 h-3 text-stone-400" />
            <span>TURN BACK! {remaining}M TO BOUNDARY REPEL</span>
          </div>
        </div>
      </div>
    </div>
  );
});
