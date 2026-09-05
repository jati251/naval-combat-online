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
    <div className="flex items-center justify-between p-3.5 rounded-lg pirate-panel border border-amber-600/30 hover:border-amber-400/60 transition-all duration-200 group shadow-md">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2.5">
          <span className="font-cinzel font-bold text-amber-100 text-sm tracking-wider group-hover:text-amber-300 transition-colors">
            {room.name}
          </span>

          {/* Engagement Status Badge */}
          <span
            className={`text-[9px] font-cinzel font-bold px-2 py-0.5 rounded border flex items-center gap-1 ${
              isPlaying
                ? 'bg-rose-950/80 text-rose-300 border-rose-700/60 shadow-[0_0_8px_rgba(225,29,72,0.2)]'
                : 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60 shadow-[0_0_8px_rgba(16,185,129,0.2)]'
            }`}
          >
            {isPlaying ? <Swords className="w-2.5 h-2.5 text-rose-400" /> : <Anchor className="w-2.5 h-2.5 text-emerald-400" />}
            <span>{isPlaying ? 'CANVASES ENGAGED' : 'HARBOR ANCHORAGE'}</span>
          </span>

          {/* Naval Theater Map */}
          <span
            className={`text-[9px] font-cinzel font-bold px-2 py-0.5 rounded border flex items-center gap-1 ${
              room.mapId === 'kingston'
                ? 'bg-sky-950/80 text-sky-300 border-sky-600/60'
                : room.mapId === 'mexico'
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600/60'
                : 'bg-amber-950/80 text-amber-300 border-amber-600/60'
            }`}
          >
            <span>
              {room.mapId === 'kingston'
                ? '🛡 KINGSTON STRAITS'
                : room.mapId === 'mexico'
                ? '🏛 GULF OF MEXICO'
                : '⚓ CARIBBEAN'}
            </span>
          </span>

          {/* Maritime Atmosphere */}
          <span
            className={`text-[9px] font-cinzel font-bold px-2 py-0.5 rounded border flex items-center gap-1 ${
              room.timeOfDay === 'NIGHT'
                ? 'bg-indigo-950/80 text-indigo-200 border-indigo-700/60'
                : 'bg-amber-950/80 text-amber-200 border-amber-700/60'
            }`}
          >
            {room.timeOfDay === 'NIGHT' ? (
              <>
                <Moon className="w-2.5 h-2.5 text-indigo-300" />
                <span>MOONLIT SEA</span>
              </>
            ) : (
              <>
                <Sun className="w-2.5 h-2.5 text-amber-300" />
                <span>DAYLIGHT SQUALL</span>
              </>
            )}
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs font-fell text-amber-200/70">
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-amber-500/80" />
            <span>
              Captains Commissioned:{' '}
              <strong className="text-amber-100 font-mono text-[11px]">{room.players.length}</strong>
              <span className="text-stone-500"> / </span>
              <strong className="text-amber-100 font-mono text-[11px]">{room.maxPlayers}</strong>
            </span>
          </div>
        </div>
      </div>

      <button
        onClick={() => onJoin(room.id)}
        disabled={isFull}
        className={`px-4 py-2 rounded-md font-cinzel text-xs font-bold uppercase tracking-wider transition-all duration-200 shadow-md cursor-pointer ${
          isFull
            ? 'bg-stone-900/80 text-stone-600 border border-stone-800 cursor-not-allowed'
            : isPlaying
            ? 'bg-gradient-to-b from-rose-600 via-rose-700 to-amber-800 hover:from-rose-500 hover:to-amber-700 text-amber-100 font-black border border-amber-400 shadow-[0_0_15px_rgba(225,29,72,0.4)] active:scale-95 animate-pulse'
            : 'bg-gradient-to-b from-amber-500 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-stone-950 font-black border border-amber-300/80 shadow-[0_0_12px_rgba(212,175,55,0.3)] active:scale-95'
        }`}
      >
        {isFull ? 'FLEET FULL' : isPlaying ? 'REINFORCE BATTLE' : 'SIGN ARTICLES'}
      </button>
    </div>
  );
};
