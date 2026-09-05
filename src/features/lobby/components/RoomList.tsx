import React from 'react';
import { Plus, RefreshCw, Swords } from 'lucide-react';
import type { RoomInfo } from '@/types';
import { RoomCard } from './RoomCard';

interface RoomListProps {
  rooms: RoomInfo[];
  isRefreshing: boolean;
  onRefresh: () => void;
  onOpenCreateModal: () => void;
  onJoinRoom: (roomId: string) => void;
}

export const RoomList: React.FC<RoomListProps> = ({
  rooms,
  isRefreshing,
  onRefresh,
  onOpenCreateModal,
  onJoinRoom,
}) => {
  return (
    <div className="flex-1 flex flex-col bg-slate-950/70 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-md shadow-2xl relative">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Swords className="w-4 h-4 text-amber-400" />
          <h2 className="font-cinzel font-bold text-amber-200 tracking-wider text-base">
            ACTIVE FLEET ROOMS
          </h2>
          <span className="text-xs font-mono text-slate-500">({rooms.length})</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-amber-400 hover:border-amber-500/40 transition cursor-pointer"
            title="Refresh Fleet Rooms"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
          </button>

          <button
            onClick={onOpenCreateModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider transition shadow-[0_0_15px_rgba(245,158,11,0.3)] cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Fleet</span>
          </button>
        </div>
      </div>

      {/* Rooms Scroll List */}
      <div className="flex-1 overflow-y-auto mt-4 space-y-2.5 max-h-[380px] pr-1 scrollbar-thin scrollbar-thumb-slate-800">
        {rooms.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center py-16 text-slate-500 gap-3">
            <Swords className="w-10 h-10 stroke-[1.2] opacity-40" />
            <p className="text-xs">No active armada rooms found on this ocean.</p>
            <button
              onClick={onOpenCreateModal}
              className="text-xs font-bold text-amber-400 hover:text-amber-300 underline cursor-pointer"
            >
              Found a New Fleet Room
            </button>
          </div>
        ) : (
          rooms.map((room) => (
            <RoomCard key={room.id} room={room} onJoin={onJoinRoom} />
          ))
        )}
      </div>
    </div>
  );
};
