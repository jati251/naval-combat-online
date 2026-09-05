import React from 'react';
import { Anchor, Compass, Feather } from 'lucide-react';

interface LobbyHeaderProps {
  playerName: string;
  isConnected: boolean;
  onPlayerNameChange: (name: string) => void;
  onOpenServerModal: () => void;
}

export const LobbyHeader: React.FC<LobbyHeaderProps> = ({
  playerName,
  isConnected,
  onPlayerNameChange,
  onOpenServerModal,
}) => {
  return (
    <header className="w-full max-w-6xl flex items-center justify-between z-10 py-1 gap-2">
      {/* Admiralty Emblem & Royal Title */}
      <div className="flex items-center gap-2 sm:gap-3.5 min-w-0">
        <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-lg pirate-panel flex items-center justify-center text-amber-400 border border-amber-500/40 shadow-lg relative group shrink-0">
          <Anchor className="w-4 h-4 sm:w-6 sm:h-6 stroke-[1.75] text-amber-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" />
          <div className="absolute -bottom-1 -right-1 w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full wax-seal-red flex items-center justify-center text-[6px] sm:text-[7px] font-bold text-amber-100 font-cinzel">
            ★
          </div>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-sm sm:text-xl lg:text-2xl font-cinzel font-black tracking-[0.1em] sm:tracking-[0.2em] text-amber-100 gold-emboss truncate">
              NAVAL COMBAT ONLINE
            </h1>
          </div>
          <p className="text-[10px] sm:text-[11px] font-fell italic text-amber-200/70 tracking-wider hidden sm:block truncate">
            Articles of War & High Seas Fleet Engagements • Anno 1720
          </p>
        </div>
      </div>

      {/* Captain's Registry & Admiralty Telegraph */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        {/* Captain Logbook Inscription */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 pirate-parchment px-2 sm:px-3.5 py-1 sm:py-1.5 rounded-md border border-amber-600/40 shadow-md">
          <Feather className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400/90 shrink-0" />
          <div className="flex flex-col">
            <span className="text-[8px] sm:text-[9px] font-cinzel font-bold text-amber-400/80 uppercase tracking-widest leading-none hidden xs:inline">
              Commanding Captain
            </span>
            <input
              type="text"
              value={playerName}
              onChange={(e) => onPlayerNameChange(e.target.value)}
              className="bg-transparent text-xs sm:text-sm font-fell text-amber-100 focus:outline-none w-24 sm:w-36 lg:w-40 placeholder:text-stone-600 font-semibold"
              placeholder="Captain"
              maxLength={18}
            />
          </div>
        </div>

        {/* Admiralty Signal Lantern */}
        <button
          onClick={onOpenServerModal}
          className="flex items-center gap-1.5 sm:gap-2.5 px-2 sm:px-3.5 py-1.5 sm:py-2 rounded-md pirate-panel border border-amber-600/40 text-amber-200/90 hover:text-amber-100 hover:border-amber-400 transition-all cursor-pointer shadow-md text-xs group shrink-0"
          title="Admiralty Signal Gateway Configuration"
        >
          <Compass className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 group-hover:rotate-45 transition-transform duration-300 shrink-0" />
          <div className="flex flex-col items-start leading-tight">
            <span className="text-[7.5px] sm:text-[8px] font-cinzel font-bold tracking-widest text-amber-400/80 uppercase hidden sm:inline">
              Admiralty Gateway
            </span>
            <div className="flex items-center gap-1 sm:gap-1.5">
              <span
                className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full shrink-0 ${
                  isConnected
                    ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]'
                    : 'bg-rose-600 animate-pulse shadow-[0_0_6px_rgba(225,29,72,0.8)]'
                }`}
              />
              <span className="text-[9px] sm:text-[10px] font-mono tracking-wider text-stone-300 font-bold uppercase hidden xs:inline">
                {isConnected ? 'SIGNAL SOUND' : 'SEEKING'}
              </span>
            </div>
          </div>
        </button>
      </div>
    </header>
  );
};
