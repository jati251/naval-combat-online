import React, { useState, useEffect } from 'react';
import type { CombatLog } from '@/types';

interface CombatLogFeedProps {
  logs: CombatLog[];
  maxItems?: number;
}

const LOG_LIFETIME_MS = 4500;

export const CombatLogFeed: React.FC<CombatLogFeedProps> = React.memo(({ logs, maxItems = 2 }) => {
  const [, setTick] = useState(0);

  // Gentle heartbeat every 700ms to clean up expired combat logs
  useEffect(() => {
    if (logs.length === 0) return;
    const interval = setInterval(() => {
      setTick((t) => (t + 1) % 1000);
    }, 700);
    return () => clearInterval(interval);
  }, [logs.length]);

  const now = Date.now();
  const activeLogs = logs
    .filter((l) => now - l.timestamp < LOG_LIFETIME_MS)
    .slice(0, maxItems);

  if (activeLogs.length === 0) return null;

  return (
    <div className="flex flex-col items-center gap-1.5 w-full pointer-events-none select-none">
      {activeLogs.map((log) => {
        const isSink = log.type === 'sink';
        const isVictory = log.type === 'victory';
        const isDamage = log.type === 'damage';

        const borderClass = isSink
          ? 'border-rose-500/70 shadow-[0_0_12px_rgba(244,63,94,0.4)]'
          : isDamage
          ? 'border-amber-500/70 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
          : isVictory
          ? 'border-emerald-400/70 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
          : 'border-amber-600/60';

        const bgClass = isSink
          ? 'from-rose-950/90 via-stone-950/90 to-rose-950/90'
          : isVictory
          ? 'from-emerald-950/90 via-stone-950/90 to-emerald-950/90'
          : 'from-stone-950/90 via-stone-900/90 to-stone-950/90';

        const textClass = isSink
          ? 'text-rose-200'
          : isDamage
          ? 'text-amber-200'
          : isVictory
          ? 'text-emerald-200'
          : 'text-amber-100';

        const icon = isSink ? '☠' : isVictory ? '★' : isDamage ? '⚔' : '⚓';

        return (
          <div
            key={log.id}
            className={`border bg-gradient-to-r ${bgClass} backdrop-blur-md px-3.5 py-1 rounded-full text-[9.5px] sm:text-xs font-fell italic tracking-wide shadow-xl flex items-center gap-1.5 animate-combat-log pointer-events-none ${borderClass} ${textClass}`}
          >
            <span className="font-cinzel not-italic font-black text-amber-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
              {icon}
            </span>
            <span className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] truncate max-w-[260px] sm:max-w-md">{log.text}</span>
          </div>
        );
      })}
    </div>
  );
});
