import React from 'react';
import type { CombatLog } from '@/types';

interface CombatLogFeedProps {
  logs: CombatLog[];
}

export const CombatLogFeed: React.FC<CombatLogFeedProps> = React.memo(({ logs }) => {
  if (logs.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5 max-w-sm w-full pointer-events-none">
      {logs.slice(0, 5).map((log) => (
        <div
          key={log.id}
          className={`backdrop-blur-md px-3 py-1.5 rounded-xl border text-xs font-mono tracking-wide transition-all shadow-lg animate-fadeIn ${
            log.type === 'sink'
              ? 'bg-rose-950/80 border-rose-500/60 text-rose-200'
              : log.type === 'damage'
              ? 'bg-amber-950/80 border-amber-500/60 text-amber-200'
              : log.type === 'victory'
              ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-200'
              : 'bg-slate-950/80 border-slate-800 text-slate-300'
          }`}
        >
          {log.text}
        </div>
      ))}
    </div>
  );
});
