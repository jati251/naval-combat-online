import React from 'react';
import type { CombatLog } from '@/types';

interface CombatLogFeedProps {
  logs: CombatLog[];
}

export const CombatLogFeed: React.FC<CombatLogFeedProps> = React.memo(({ logs }) => {
  if (logs.length === 0) return null;

  return (
    <div className="flex flex-col gap-1 max-w-xs w-full pointer-events-none select-none">
      {logs.slice(0, 3).map((log) => {
        const isSink = log.type === 'sink';
        const isVictory = log.type === 'victory';
        const isDamage = log.type === 'damage';

        const colorClass = isSink
          ? 'border-l-rose-500 bg-stone-950/80 text-rose-200'
          : isDamage
          ? 'border-l-amber-500 bg-stone-950/80 text-amber-200'
          : isVictory
          ? 'border-l-emerald-400 bg-stone-950/80 text-emerald-200'
          : 'border-l-stone-600 bg-stone-950/70 text-stone-300';

        const icon = isSink ? '☠ ' : isVictory ? '★ ' : isDamage ? '⚔ ' : '⚓ ';

        return (
          <div
            key={log.id}
            className={`border-l-2 px-2.5 py-1 rounded-r text-[11px] font-mono tracking-normal shadow-sm ${colorClass}`}
          >
            <span className="font-bold mr-1 opacity-80">{icon}</span>
            <span>{log.text}</span>
          </div>
        );
      })}
    </div>
  );
});
