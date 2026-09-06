import React from 'react';
import { Anchor, Compass, Feather } from 'lucide-react';

interface LobbyHeaderProps {
  playerName: string;
  isConnected: boolean;
  onPlayerNameChange: (name: string) => void;
  onOpenGateway?: () => void;
  onOpenServerModal?: () => void;
}

export const LobbyHeader: React.FC<LobbyHeaderProps> = ({
  playerName,
  isConnected,
  onPlayerNameChange,
  onOpenGateway,
  onOpenServerModal,
}) => {
  const handleGatewayClick = onOpenGateway || onOpenServerModal;
  return (
    <header className="w-full flex items-center justify-between z-20 py-1 sm:py-1.5 px-2 sm:px-4 game-dock rounded-lg border border-amber-500/40 shadow-lg">
      {/* Left: Captain Profile Badge & Inscription */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-md pirate-panel flex items-center justify-center text-amber-300 border border-amber-400/60 shadow relative shrink-0">
          <Anchor className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2]" />
          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full wax-seal-red flex items-center justify-center text-[5px] font-bold text-amber-100">
            ★
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5 bg-black/40 px-2 py-1 rounded border border-amber-600/30">
          <Feather className="w-3 h-3 text-amber-400/80 shrink-0" />
          <input
            type="text"
            value={playerName}
            onChange={(e) => onPlayerNameChange(e.target.value)}
            className="bg-transparent text-[11px] sm:text-xs font-fell text-amber-100 focus:outline-none w-20 sm:w-28 md:w-36 placeholder:text-stone-500 font-semibold"
            placeholder="Captain"
            maxLength={18}
            title="Edit Captain Name"
          />
        </div>
      </div>

      {/* Center: Sleek Naval Crest */}
      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 px-2">
        <span className="text-amber-400/50 text-xs hidden sm:inline">❖</span>
        <h1 className="text-xs sm:text-sm md:text-base font-cinzel font-black tracking-[0.12em] sm:tracking-[0.2em] text-amber-100 gold-emboss truncate">
          NAVAL COMBAT ONLINE
        </h1>
        <span className="text-amber-400/50 text-xs hidden sm:inline">❖</span>
      </div>

      {/* Right: Signal Jewel & Gateway Trigger */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <button
          onClick={handleGatewayClick}
          className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded bg-black/40 hover:bg-black/60 border border-amber-600/40 text-amber-200/90 hover:text-amber-100 hover:border-amber-400 transition cursor-pointer text-xs group"
          title="Admiralty Signal Gateway"
        >
          <Compass className="w-3.5 h-3.5 text-amber-400 group-hover:rotate-45 transition-transform duration-300 shrink-0" />
          <div className="flex items-center gap-1">
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                isConnected
                  ? 'bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.9)]'
                  : 'bg-rose-500 animate-pulse shadow-[0_0_6px_rgba(225,29,72,0.9)]'
              }`}
            />
            <span className="text-[9px] font-mono tracking-wider text-amber-200/80 font-bold uppercase hidden md:inline">
              {isConnected ? 'ONLINE' : 'CONNECTING'}
            </span>
          </div>
        </button>
      </div>
    </header>
  );
};
