import React from 'react';
import { Anchor, Compass } from 'lucide-react';

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
    <header className="w-full max-w-6xl flex items-center justify-between z-10">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
          <Anchor className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-cinzel font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500">
            NAVAL COMBAT ONLINE
          </h1>
          <p className="text-[10px] text-slate-400 tracking-wider uppercase font-semibold">
            Black Flag 3D Multiplayer Fleet Warfare
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Captain Name Input */}
        <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-1.5 focus-within:border-amber-500/60 transition shadow-inner">
          <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
            Captain:
          </span>
          <input
            type="text"
            value={playerName}
            onChange={(e) => onPlayerNameChange(e.target.value)}
            className="bg-transparent text-sm font-medium text-slate-100 focus:outline-none w-36"
            placeholder="Enter Captain Name"
            maxLength={18}
          />
        </div>

        {/* Server & Status Indicator */}
        <button
          onClick={onOpenServerModal}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300 hover:text-amber-400 hover:border-amber-500/40 transition cursor-pointer text-xs"
          title="Configure WebSocket Endpoint"
        >
          <Compass className="w-3.5 h-3.5 text-cyan-400" />
          <div className="flex items-center gap-1.5">
            <div
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
              }`}
            />
            <span className="text-[11px] font-mono">
              {isConnected ? 'ONLINE' : 'CONNECTING...'}
            </span>
          </div>
        </button>
      </div>
    </header>
  );
};
