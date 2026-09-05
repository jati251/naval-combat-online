import React from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Skull, RotateCcw } from 'lucide-react';
import { useGameStore } from '@/stores/useGameStore';
import { networkClient } from '@/services/networkClient';

export const DebriefModal: React.FC = () => {
  const stage = useGameStore((s) => s.stage);
  const winnerName = useGameStore((s) => s.winnerName);
  const playerName = useGameStore((s) => s.playerName);
  const resetToLobby = useGameStore((s) => s.resetToLobby);

  const isWinner = Boolean(winnerName && winnerName === playerName);

  React.useEffect(() => {
    if (isWinner && stage === 'DEBRIEF') {
      // Golden doubloon & ruby confetti shower
      confetti({
        particleCount: 140,
        spread: 80,
        origin: { y: 0.55 },
        colors: ['#f59e0b', '#d97706', '#fbbf24', '#b91c1c', '#fef08a'],
      });
    }
  }, [isWinner, stage]);

  // Only show debrief modal when match has actually concluded with a winner
  if (stage !== 'DEBRIEF' || !winnerName) {
    return null;
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-2.5 sm:p-4 select-none pointer-events-auto">
      <div className="pirate-parchment max-w-md w-full max-h-[92dvh] overflow-y-auto rounded-xl p-4 sm:p-7 border-2 border-amber-600/60 shadow-2xl flex flex-col items-center text-center gap-3.5 sm:gap-6 relative">
        {/* Ornate Corner Brackets */}
        <div className="absolute top-1.5 left-1.5 w-3 h-3 sm:w-3.5 sm:h-3.5 border-t-2 border-l-2 border-amber-400/80 pointer-events-none" />
        <div className="absolute top-1.5 right-1.5 w-3 h-3 sm:w-3.5 sm:h-3.5 border-t-2 border-r-2 border-amber-400/80 pointer-events-none" />
        <div className="absolute bottom-1.5 left-1.5 w-3 h-3 sm:w-3.5 sm:h-3.5 border-b-2 border-l-2 border-amber-400/80 pointer-events-none" />
        <div className="absolute bottom-1.5 right-1.5 w-3 h-3 sm:w-3.5 sm:h-3.5 border-b-2 border-r-2 border-amber-400/80 pointer-events-none" />

        {/* Heraldic Medallion Seal */}
        <div
          className={`w-14 h-14 sm:w-20 sm:h-20 rounded-full flex items-center justify-center border-2 shadow-2xl shrink-0 ${
            isWinner
              ? 'wax-seal-gold text-stone-950'
              : 'wax-seal-red text-amber-200'
          }`}
        >
          {isWinner ? (
            <Trophy className="w-7 h-7 sm:w-10 sm:h-10 stroke-[2] drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]" />
          ) : (
            <Skull className="w-7 h-7 sm:w-10 sm:h-10 stroke-[2] drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]" />
          )}
        </div>

        <div className="flex flex-col gap-1 sm:gap-1.5">
          <span className="text-[9px] sm:text-[10px] font-cinzel font-bold uppercase tracking-[0.25em] text-amber-400">
            {isWinner ? 'PRIZE COURT OF THE ADMIRALTY' : 'ARTICLES OF CAPITULATION'}
          </span>
          <h2 className="font-cinzel text-xl sm:text-3xl font-black text-amber-100 tracking-wider gold-emboss">
            {isWinner ? 'VICTORY ON THE HIGH SEAS!' : 'SENT TO DAVY JONES'}
          </h2>
          <p className="text-xs sm:text-sm font-fell italic text-amber-200/80 mt-0.5 sm:mt-1 leading-relaxed">
            {isWinner ? (
              <>
                The enemy armada is scattered beneath the waves! All prize honors awarded to{' '}
                <strong className="text-amber-300 font-cinzel not-italic">{winnerName}</strong>.
              </>
            ) : (
              <>
                Your timbers broke and the deep took the hull. The waters belong to Captain{' '}
                <strong className="text-amber-300 font-cinzel not-italic">{winnerName}</strong>.
              </>
            )}
          </p>
        </div>

        <button
          onClick={() => {
            networkClient.leaveRoom();
            resetToLobby();
          }}
          className="w-full py-2.5 sm:py-3 px-4 sm:px-6 rounded-md bg-gradient-to-b from-amber-500 via-amber-600 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-stone-950 font-cinzel font-black text-[11px] sm:text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(212,175,55,0.4)] transition-all active:scale-95 cursor-pointer border border-amber-300/80"
        >
          <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-stone-950 stroke-[2.5]" />
          <span>RETURN TO SAFE HARBOR</span>
        </button>
      </div>
    </div>
  );
};
