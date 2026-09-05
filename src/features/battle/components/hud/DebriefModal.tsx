import React from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Skull, RotateCcw } from 'lucide-react';
import { useGameStore } from '@/stores/useGameStore';
import { networkClient } from '@/services/networkClient';

export const DebriefModal: React.FC = () => {
  const winnerName = useGameStore((s) => s.winnerName);
  const playerName = useGameStore((s) => s.playerName);
  const resetToLobby = useGameStore((s) => s.resetToLobby);

  const isWinner = winnerName === playerName;

  React.useEffect(() => {
    if (isWinner) {
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#f59e0b', '#06b6d4', '#10b981', '#fbbf24'],
      });
    }
  }, [isWinner]);

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4">
      <div className="glass-panel max-w-md w-full rounded-3xl p-8 border border-slate-700 shadow-2xl flex flex-col items-center text-center gap-6 animate-in fade-in zoom-in duration-300">
        <div
          className={`w-20 h-20 rounded-full flex items-center justify-center border-2 shadow-xl ${
            isWinner
              ? 'bg-amber-500/20 border-amber-400 text-amber-400 shadow-amber-500/30'
              : 'bg-rose-500/20 border-rose-400 text-rose-400 shadow-rose-500/30'
          }`}
        >
          {isWinner ? <Trophy className="w-10 h-10 animate-bounce" /> : <Skull className="w-10 h-10" />}
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-widest text-slate-400 font-bold">
            BATTLE REPORT
          </span>
          <h2 className="font-cinzel text-3xl font-black text-slate-100 tracking-wider">
            {isWinner ? 'GLORIOUS VICTORY!' : 'FLEET OVERTHROWN'}
          </h2>
          <p className="text-sm text-slate-300 mt-2">
            Victor of the high seas:{' '}
            <span className="font-bold text-amber-400">{winnerName || 'Unknown Captain'}</span>
          </p>
        </div>

        <button
          onClick={() => {
            networkClient.leaveRoom();
            resetToLobby();
          }}
          className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold tracking-wide flex items-center justify-center gap-2 shadow-lg transition active:scale-95 cursor-pointer"
        >
          <RotateCcw className="w-5 h-5" />
          <span>RETURN TO HARBOR</span>
        </button>
      </div>
    </div>
  );
};
