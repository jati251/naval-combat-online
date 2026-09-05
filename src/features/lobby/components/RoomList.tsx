import React from 'react';
import { Plus, RefreshCw, Anchor, Compass } from 'lucide-react';
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
    <div className="flex-1 flex flex-col pirate-parchment rounded-xl p-5 shadow-2xl relative border border-amber-600/40">
      {/* Brass Corner Filigree Accents */}
      <div className="absolute top-1 left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-amber-400/70" />
      <div className="absolute top-1 right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-amber-400/70" />
      <div className="absolute bottom-1 left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-amber-400/70" />
      <div className="absolute bottom-1 right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-amber-400/70" />

      {/* Header Bar */}
      <div className="flex items-center justify-between pb-3.5 border-b border-amber-600/30">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300">
            <Anchor className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-cinzel font-bold text-amber-100 tracking-widest text-base gold-emboss">
              HARBOR ANCHORAGES
            </h2>
            <p className="text-[10px] font-fell italic text-amber-200/60 leading-tight">
              Active expeditions charted across the high seas
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-amber-400/80 px-2 py-0.5 rounded bg-stone-950/60 border border-amber-500/30 ml-1">
            {rooms.length} {rooms.length === 1 ? 'Fleet' : 'Fleets'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-md pirate-panel border border-amber-600/40 text-amber-300 hover:text-amber-100 hover:border-amber-400 transition cursor-pointer shadow-sm group"
            title="Scan the Horizon for Fleets"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-amber-400' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
          </button>

          <button
            onClick={onOpenCreateModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-gradient-to-b from-amber-500 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-stone-950 font-cinzel font-bold text-xs uppercase tracking-wider transition-all duration-200 shadow-[0_0_15px_rgba(212,175,55,0.3)] cursor-pointer border border-amber-300/80 active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Commission Fleet</span>
          </button>
        </div>
      </div>

      {/* Rooms Scroll List */}
      <div className="flex-1 overflow-y-auto mt-3.5 space-y-2.5 max-h-[380px] pr-1.5">
        {rooms.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center py-16 text-amber-200/50 gap-3">
            <div className="p-4 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400/60">
              <Compass className="w-8 h-8" />
            </div>
            <div className="text-center">
              <p className="font-cinzel text-sm font-bold text-amber-200/80 tracking-wider">
                NO WARSHIPS ANCHORED
              </p>
              <p className="text-xs font-fell italic text-amber-300/50 mt-1 max-w-xs">
                The horizon lies calm. Hoist your colors and commission an armada of your own!
              </p>
            </div>
            <button
              onClick={onOpenCreateModal}
              className="mt-1 text-xs font-cinzel font-bold text-amber-400 hover:text-amber-300 underline underline-offset-4 cursor-pointer"
            >
              Found a New Fleet Anchorage
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
