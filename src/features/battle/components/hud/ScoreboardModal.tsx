import React, { useEffect } from 'react';
import { Trophy, Skull, Swords, Shield, X } from 'lucide-react';
import { useGameStore } from '@/stores/useGameStore';
import { SHIP_PRESETS } from '@/types';

interface ScoreboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ScoreboardModalContent: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const currentRoom = useGameStore((s) => s.currentRoom);
  const selfId = useGameStore((s) => s.selfId);
  const ships = useGameStore((s) => s.ships);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const targetKills = currentRoom?.targetKills || 5;
  const players = currentRoom?.players || [];

  // Sort players by kills (desc), then score (desc), then deaths (asc)
  const sortedPlayers = [...players].sort((a, b) => {
    const killsA = a.kills || 0;
    const killsB = b.kills || 0;
    if (killsB !== killsA) return killsB - killsA;
    const scoreA = a.score || 0;
    const scoreB = b.score || 0;
    if (scoreB !== scoreA) return scoreB - scoreA;
    return (a.deaths || 0) - (b.deaths || 0);
  });

  const leader = sortedPlayers[0];
  const leaderKills = leader?.kills || 0;
  const progressPercent = Math.min(100, Math.round((leaderKills / targetKills) * 100));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-black/75 backdrop-blur-sm pointer-events-auto">
      <div className="w-full max-w-2xl max-h-[94dvh] overflow-y-auto pirate-parchment rounded-xl border-2 border-amber-500/70 p-3 sm:p-5 shadow-[0_12px_40px_rgba(0,0,0,0.85),0_0_20px_rgba(245,158,11,0.2)] flex flex-col gap-2.5 sm:gap-4 relative animate-in fade-in zoom-in-95 duration-150">
        {/* Brass Corner Filigree Accents */}
        <div className="absolute top-1.5 left-1.5 w-3 h-3 border-t-2 border-l-2 border-amber-400 pointer-events-none" />
        <div className="absolute top-1.5 right-1.5 w-3 h-3 border-t-2 border-r-2 border-amber-400 pointer-events-none" />
        <div className="absolute bottom-1.5 left-1.5 w-3 h-3 border-b-2 border-l-2 border-amber-400 pointer-events-none" />
        <div className="absolute bottom-1.5 right-1.5 w-3 h-3 border-b-2 border-r-2 border-amber-400 pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-2 sm:pb-3 border-b border-amber-500/30">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 rounded-lg bg-amber-500/20 border border-amber-400/60 text-amber-300 shadow-md">
              <Trophy className="w-4 h-4 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h2 className="font-cinzel font-black text-amber-100 text-sm sm:text-lg tracking-wider gold-emboss">
                  FLEET DEATHMATCH OBJECTIVE
                </h2>
                <span className="text-[9px] sm:text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-500/40 text-amber-300">
                  GOAL: {targetKills} SINKS
                </span>
              </div>
              <p className="text-[10px] sm:text-xs font-fell italic text-amber-200/90 leading-tight hidden xs:block">
                First Captain to send {targetKills} enemy hulls to Davy Jones' locker claims the high seas!
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 sm:p-1.5 rounded-md pirate-panel border border-amber-600/40 text-amber-300 hover:text-white hover:border-amber-400 transition cursor-pointer"
            title="Close Scoreboard"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Objective Progress Bar */}
        <div className="bg-[#121f30]/90 p-2 sm:p-3 rounded-lg border border-amber-500/30 flex flex-col gap-1 sm:gap-1.5">
          <div className="flex items-center justify-between text-[11px] sm:text-xs font-cinzel">
            <span className="text-amber-200/90 font-bold flex items-center gap-1.5 truncate mr-2">
              <Swords className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400 shrink-0" />
              <span className="hidden sm:inline">Fleet Supremacy Standing:</span>
              <strong className="text-white font-mono truncate">
                {leader ? `${leader.name} (${leaderKills}/${targetKills})` : 'Awaiting Engagements'}
              </strong>
            </span>
            <span className="text-amber-300 font-mono font-bold shrink-0">{progressPercent}%</span>
          </div>
          <div className="w-full h-1.5 sm:h-2 bg-[#09111c] rounded-full overflow-hidden border border-amber-500/30">
            <div
              className="h-full bg-gradient-to-r from-amber-600 via-amber-400 to-yellow-300 rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(245,158,11,0.6)]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Tactical Captains Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px] sm:text-xs">
            <thead>
              <tr className="border-b border-amber-500/30 text-amber-300 font-cinzel font-bold text-[9px] sm:text-[11px] tracking-wider uppercase">
                <th className="pb-1.5 sm:pb-2 pl-2">Rank</th>
                <th className="pb-1.5 sm:pb-2">Captain</th>
                <th className="pb-1.5 sm:pb-2">Warship</th>
                <th className="pb-1.5 sm:pb-2 text-center">Sinks</th>
                <th className="pb-1.5 sm:pb-2 text-center">Losses</th>
                <th className="pb-1.5 sm:pb-2 text-right">Score</th>
                <th className="pb-1.5 sm:pb-2 pr-2 text-right">Hull Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-amber-600/20">
              {sortedPlayers.map((player, idx) => {
                const isSelf = player.id === selfId;
                const liveShip = ships.find((s) => s.id === player.id);
                const shipConfig = SHIP_PRESETS[player.shipClass] || SHIP_PRESETS.brig;
                const isSunk = liveShip?.isSunk ?? false;
                const hp = liveShip ? Math.max(0, liveShip.health) : shipConfig.maxHealth;
                const hpPercent = Math.round((hp / shipConfig.maxHealth) * 100);

                let rankBadge = `${idx + 1}`;
                if (idx === 0) rankBadge = '🥇 1st';
                else if (idx === 1) rankBadge = '🥈 2nd';
                else if (idx === 2) rankBadge = '🥉 3rd';

                return (
                  <tr
                    key={player.id}
                    className={`transition-colors ${
                      isSelf
                        ? 'bg-amber-500/15 font-semibold text-white'
                        : 'text-amber-100/90 hover:bg-amber-500/5'
                    }`}
                  >
                    {/* Rank */}
                    <td className="py-1.5 sm:py-2.5 pl-2 font-mono font-bold text-amber-300">{rankBadge}</td>

                    {/* Captain */}
                    <td className="py-1.5 sm:py-2.5 font-cinzel">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate max-w-[100px] sm:max-w-[140px] font-bold">{player.name}</span>
                        {isSelf && (
                          <span className="text-[8px] sm:text-[9px] px-1 sm:px-1.5 py-0.2 rounded bg-amber-400 text-stone-950 font-bold uppercase">
                            You
                          </span>
                        )}
                        {player.isHost && (
                          <span className="text-[8px] sm:text-[9px] px-1 py-0.2 rounded bg-stone-900 text-amber-300 border border-amber-500/40">
                            Host
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Warship */}
                    <td className="py-1.5 sm:py-2.5 capitalize font-fell text-amber-200/80">
                      {shipConfig.name}
                    </td>

                    {/* Sinks (Kills) */}
                    <td className="py-1.5 sm:py-2.5 text-center font-mono font-bold text-emerald-300 text-xs sm:text-sm">
                      {player.kills || 0}
                    </td>

                    {/* Deaths */}
                    <td className="py-1.5 sm:py-2.5 text-center font-mono text-rose-300 text-xs">
                      {player.deaths || 0}
                    </td>

                    {/* Score */}
                    <td className="py-1.5 sm:py-2.5 text-right font-mono font-bold text-amber-300 text-xs">
                      {player.score || 0}
                    </td>

                    {/* Hull Status */}
                    <td className="py-1.5 sm:py-2.5 pr-2 text-right">
                      {isSunk ? (
                        <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-cinzel font-bold bg-rose-950/80 text-rose-300 border border-rose-700/60 shadow-[0_0_8px_rgba(225,29,72,0.3)]">
                          <Skull className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-rose-400 animate-pulse" />
                          <span>Respawning</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-mono font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-700/60">
                          <Shield className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-400" />
                          <span>{hpPercent}% HP</span>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer Hint */}
        <div className="pt-1.5 sm:pt-2 border-t border-amber-500/30 flex items-center justify-between text-[10px] sm:text-[11px] font-fell italic text-amber-200/70">
          <span className="hidden xs:inline">Sunk warships refit at safe anchorage and respawn in 5 seconds.</span>
          <span className="font-mono text-amber-300 font-bold not-italic ml-auto">
            [TAB] / [ESC] to close
          </span>
        </div>
      </div>
    </div>
  );
};

export const ScoreboardModal: React.FC<ScoreboardModalProps> = React.memo(({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return <ScoreboardModalContent onClose={onClose} />;
});
