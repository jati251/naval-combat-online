import React from 'react';
import { Users, Swords, Anchor, Moon, Sun } from 'lucide-react';
import type { RoomInfo } from '@/types';

interface RoomCardProps {
  room: RoomInfo;
  onJoin: (roomId: string) => void;
}

export const RoomCard: React.FC<RoomCardProps> = ({ room, onJoin }) => {
  const isFull = room.players.length >= room.maxPlayers;
  const isPlaying = room.status === 'IN_GAME';

  return (
    <div className="flex items-center justify-between p-2 sm:p-2.5 rounded-lg game-hud-glass hover:border-amber-400/80 transition-all duration-150 group gap-2">
      <div className="flex flex-col gap-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-cinzel font-bold text-amber-100 text-xs sm:text-sm tracking-wide group-hover:text-amber-300 transition-colors truncate max-w-[140px] sm:max-w-[200px]">
            {room.name}
          </span>

          {/* Status Badge */}
          <span
            className={`text-[8px] sm:text-[9px] font-cinzel font-bold px-1.5 py-0.2 rounded border flex items-center gap-1 shrink-0 ${
              isPlaying
                ? 'bg-rose-950/80 text-rose-300 border-rose-600/60'
                : 'bg-emerald-950/80 text-emerald-300 border-emerald-600/60'
            }`}
          >
            {isPlaying ? <Swords className="w-2 h-2 text-rose-400" /> : <Anchor className="w-2 h-2 text-emerald-400" />}
            <span>{isPlaying ? 'ENGAGED' : 'OPEN'}</span>
          </span>

          {/* Map Badge */}
          <span className="text-[8px] font-cinzel font-bold px-1.5 py-0.2 rounded bg-black/40 text-amber-200/80 border border-amber-600/30 hidden xs:inline">
            {room.mapId === 'kingston' ? 'Kingston' : room.mapId === 'mexico' ? 'Mexico' : 'Caribbean'}
          </span>

          {/* Time Badge */}
          <span className="text-[8px] font-cinzel text-amber-300/70 hidden sm:flex items-center gap-0.5">
            {room.timeOfDay === 'NIGHT' ? <Moon className="w-2 h-2 text-indigo-300" /> : <Sun className="w-2 h-2 text-amber-300" />}
          </span>
        </div>

        {/* Captain Count */}
        <div className="flex items-center gap-1.5 text-[10px] font-fell text-amber-200/70">
          <Users className="w-3 h-3 text-amber-400/80 shrink-0" />
          <span>
            Captains:{' '}
            <strong className="text-amber-100 font-mono">{room.players.length}</strong>
            <span className="text-stone-500">/</span>
            <strong className="text-amber-100 font-mono">{room.maxPlayers}</strong>
          </span>
          <span className="text-amber-500/40">•</span>
          <span className="text-amber-300/80 font-cinzel font-bold text-[9px] uppercase">
            {room.gameMode === 'TEAM' ? 'Armada Clash' : 'Free for All'}
          </span>
        </div>
      </div>

      <button
        onClick={() => onJoin(room.id)}
        disabled={isFull}
        className={`px-2.5 sm:px-3.5 py-1.5 rounded font-cinzel text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all duration-150 shrink-0 cursor-pointer active:scale-95 ${
          isFull
            ? 'bg-stone-900/80 text-stone-600 border border-stone-800 cursor-not-allowed'
            : isPlaying
            ? 'bg-gradient-to-b from-rose-600 to-amber-800 hover:from-rose-500 hover:to-amber-700 text-amber-100 border border-amber-400 shadow-[0_0_10px_rgba(225,29,72,0.4)]'
            : 'bg-gradient-to-b from-amber-500 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-stone-950 border border-amber-300/80 shadow-[0_0_10px_rgba(212,175,55,0.3)]'
        }`}
      >
        {isFull ? 'FULL' : isPlaying ? 'REINFORCE' : 'JOIN'}
      </button>
    </div>
  );
};
