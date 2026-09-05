import React from 'react';
import type { CombatLog } from '@/types';

interface CombatLogFeedProps {
  logs: CombatLog[];
}

export const CombatLogFeed: React.FC<CombatLogFeedProps> = React.memo(({ logs }) => {
  if (logs.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5 max-w-xs w-full pointer-events-none select-none">
      {logs.slice(0, 3).map((log) => {
        const isSink = log.type === 'sink';
        const isVictory = log.type === 'victory';
        const isDamage = log.type === 'damage';

        const colorClass = isSink
          ? 'border-l-rose-600 bg-[#1c0f0d]/90 text-rose-200 border-r border-t border-b border-rose-900/40'
          : isDamage
          ? 'border-l-amber-500 bg-[#1c150c]/90 text-amber-200 border-r border-t border-b border-amber-900/40'
          : isVictory
          ? 'border-l-emerald-400 bg-[#0c1a14]/90 text-emerald-200 border-r border-t border-b border-emerald-900/40'
          : 'border-l-amber-700/60 bg-[#16120e]/90 text-amber-100/80 border-r border-t border-b border-stone-800';

        const icon = isSink ? '☠ ' : isVictory ? '★ ' : isDamage ? '⚔ ' : '⚓ ';

        return (
          <div
            key={log.id}
            className={`border-l-[3px] px-3 py-1 rounded-r-md text-[11px] font-fell italic tracking-wide shadow-md backdrop-blur-sm ${colorClass}`}
          >
            <span className="font-cinzel not-italic font-bold mr-1.5 opacity-90">{icon}</span>
            <span>{log.text}</span>
          </div>
        );
      })}
    </div>
  );
});
