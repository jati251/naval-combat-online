import React from 'react';
import { Users } from 'lucide-react';
import type { RoomInfo } from '@/types';

interface RoomCardProps {
  room: RoomInfo;
  onJoin: (roomId: string) => void;
}

export const RoomCard: React.FC<RoomCardProps> = ({ room, onJoin }) => {
  const isFull = room.players.length >= room.maxPlayers;
  const isPlaying = room.status === 'IN_GAME';

  return (
    <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-amber-500/40 hover:bg-slate-900 transition duration-150">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="font-cinzel font-bold text-slate-200 text-sm tracking-wide">
            {room.name}
          </span>
          <span
            className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
              isPlaying
                ? 'bg-rose-950/60 text-rose-400 border-rose-800/40'
                : 'bg-emerald-950/60 text-emerald-400 border-emerald-800/40'
            }`}
          >
            {isPlaying ? 'IN BATTLE' : 'WAITING'}
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Users className="w-3.5 h-3.5 text-slate-500" />
          <span>
            Captains: {room.players.length} / {room.maxPlayers}
          </span>
        </div>
      </div>

      <button
        onClick={() => onJoin(room.id)}
        disabled={isFull || isPlaying}
        className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
          isFull || isPlaying
            ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
            : 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-[0_0_12px_rgba(245,158,11,0.3)]'
        }`}
      >
        {isPlaying ? 'Engaged' : isFull ? 'Full' : 'Join'}
      </button>
    </div>
  );
};
