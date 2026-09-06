import React from 'react';
import { Anchor, Bot, Compass, LogOut } from 'lucide-react';
import { networkClient } from '@/services/networkClient';
import type { RoomInfo } from '@/types';
import { getMapConfig, MAP_LIST } from '@/features/battle/maps';

interface RoomLobbyTopBarProps {
  room: RoomInfo;
  isHost: boolean;
  canAddBot: boolean;
  onLeaveRoom: () => void;
}

export const RoomLobbyTopBar: React.FC<RoomLobbyTopBarProps> = ({
  room,
  isHost,
  canAddBot,
  onLeaveRoom,
}) => {
  const isTeamMode = room.gameMode === 'TEAM';
  const activeMap = getMapConfig(room.mapId);

  return (
    <div className="pointer-events-auto w-full flex items-center justify-between gap-1.5 sm:gap-2 p-1.5 sm:p-2.5 rounded-xl game-dock border border-amber-500/40 bg-[#07101c]/90 backdrop-blur-md shadow-xl shrink-0">
      {/* Left: Anchorage Identity & Mode */}
      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
        <div className="p-1 sm:p-1.5 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-300 shrink-0">
          <Anchor className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
            <h2 className="font-cinzel font-black text-[11px] sm:text-base md:text-lg text-amber-100 gold-emboss truncate max-w-[120px] xs:max-w-[160px] sm:max-w-none">
              {room.name}
            </h2>
            <span
              className={`text-[7px] sm:text-[9px] font-cinzel font-bold px-1.5 py-0.2 rounded border shadow-sm ${
                isTeamMode
                  ? 'bg-cyan-950/80 text-cyan-300 border-cyan-500/60'
                  : 'bg-amber-950/80 text-amber-300 border-amber-500/50'
              }`}
            >
              {isTeamMode ? 'TEAM' : 'FFA'} • {room.targetKills || 5} SINKS
            </span>
          </div>
          <p className="hidden xs:block text-[8px] sm:text-[10px] font-fell italic text-amber-200/70 truncate mt-0.5">
            Commodore's Staging Wardroom • {room.players.length}/{room.maxPlayers} Captains
          </p>
        </div>
      </div>

      {/* Center: Theater & Map Controls */}
      <div className="hidden lg:flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/40 border border-amber-500/30 text-amber-200 text-xs font-cinzel font-bold">
          <Compass className="w-3.5 h-3.5 text-amber-400" />
          <span>{activeMap.name}</span>
        </div>

        {isHost && (
          <div className="flex items-center gap-1">
            {MAP_LIST.map((m) => (
              <button
                key={m.id}
                onClick={() => networkClient.setMap(m.id)}
                className={`px-2 py-1 rounded text-[9px] font-cinzel font-bold border transition cursor-pointer ${
                  (room.mapId || 'caribbean') === m.id
                    ? 'bg-amber-500/30 border-amber-400 text-amber-100 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
                    : 'bg-black/30 border-amber-600/30 text-stone-400 hover:text-amber-200'
                }`}
              >
                {m.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right: Host Bot Add & Retreat Actions */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {isHost && (
          <button
            onClick={() => networkClient.addBot()}
            disabled={!canAddBot}
            className={`flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg font-cinzel font-bold text-[9px] sm:text-xs tracking-wider transition border shadow ${
              canAddBot
                ? 'bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-200 border-cyan-400/60 shadow-[0_0_10px_rgba(6,182,212,0.3)] cursor-pointer active:scale-95'
                : 'bg-stone-900/60 text-stone-600 border-stone-800 cursor-not-allowed'
            }`}
            title="Add Corsair AI Bot"
          >
            <Bot className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-cyan-300" />
            <span>+ Bot</span>
          </button>
        )}

        <button
          onClick={onLeaveRoom}
          className="flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-950/80 border border-rose-600/50 text-rose-300 hover:text-white transition cursor-pointer text-[9px] sm:text-xs font-cinzel font-bold tracking-wider shadow active:scale-95"
        >
          <LogOut className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          <span className="hidden xs:inline">Abandon</span>
        </button>
      </div>
    </div>
  );
};
