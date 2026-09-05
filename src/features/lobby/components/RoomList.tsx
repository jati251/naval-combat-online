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
    <div className="flex-1 flex flex-col pirate-parchment rounded-xl p-3 sm:p-5 shadow-2xl relative border border-amber-600/40">
      {/* Brass Corner Filigree Accents */}
      <div className="absolute top-1 left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-amber-400/70 pointer-events-none" />
      <div className="absolute top-1 right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-amber-400/70 pointer-events-none" />
      <div className="absolute bottom-1 left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-amber-400/70 pointer-events-none" />
      <div className="absolute bottom-1 right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-amber-400/70 pointer-events-none" />

      {/* Header Bar */}
      <div className="flex items-center justify-between pb-2 sm:pb-3.5 border-b border-amber-600/30 gap-1.5 sm:gap-2">
        <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
          <div className="p-1 sm:p-1.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 shrink-0">
            <Anchor className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="font-cinzel font-bold text-amber-100 tracking-widest text-xs sm:text-base gold-emboss truncate">
              HARBOR ANCHORAGES
            </h2>
            <p className="text-[8.5px] sm:text-[10px] font-fell italic text-amber-200/60 leading-tight hidden xs:block truncate">
              Active expeditions charted across the high seas
            </p>
          </div>
          <span className="text-[10px] sm:text-xs font-mono font-bold text-amber-400/80 px-1.5 sm:px-2 py-0.5 rounded bg-stone-950/60 border border-amber-500/30 ml-0.5 sm:ml-1 shrink-0">
            {rooms.length} {rooms.length === 1 ? 'Fleet' : 'Fleets'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-1.5 sm:p-2 rounded-md pirate-panel border border-amber-600/40 text-amber-300 hover:text-amber-100 hover:border-amber-400 transition cursor-pointer shadow-sm group"
            title="Scan the Horizon for Fleets"
          >
            <RefreshCw className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${isRefreshing ? 'animate-spin text-amber-400' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
          </button>

          <button
            onClick={onOpenCreateModal}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-md bg-gradient-to-b from-amber-500 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-stone-950 font-cinzel font-bold text-[11px] sm:text-xs uppercase tracking-wider transition-all duration-200 shadow-[0_0_15px_rgba(212,175,55,0.3)] cursor-pointer border border-amber-300/80 active:scale-95"
          >
            <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[2.5]" />
            <span className="hidden xs:inline">Commission Fleet</span>
            <span className="xs:hidden">Commission</span>
          </button>
        </div>
      </div>

      {/* Rooms Scroll List */}
      <div className="flex-1 overflow-y-auto mt-2 sm:mt-3.5 space-y-2 sm:space-y-2.5 max-h-[50dvh] sm:max-h-[380px] pr-1 sm:pr-1.5 min-h-[140px]">
        {rooms.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center py-8 sm:py-14 gap-2.5 sm:gap-3.5">
            <div className="p-3 sm:p-4 rounded-full bg-amber-500/20 border-2 border-amber-400/60 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.25)]">
              <Compass className="w-7 h-7 sm:w-9 sm:h-9" />
            </div>
            <div className="text-center px-4">
              <p className="font-cinzel text-sm sm:text-base font-bold text-amber-100 tracking-wider gold-emboss">
                NO WARSHIPS ANCHORED
              </p>
              <p className="text-[11px] sm:text-xs font-fell italic text-amber-200/90 mt-1 max-w-sm leading-relaxed">
                The horizon lies calm. Hoist your colors, muster your crew, and commission a fleet of your own!
              </p>
            </div>
            <button
              onClick={onOpenCreateModal}
              className="mt-1 sm:mt-2 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-md bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/80 text-amber-100 font-cinzel font-bold text-[11px] sm:text-xs uppercase tracking-wider transition-all duration-150 shadow-[0_0_12px_rgba(245,158,11,0.2)] cursor-pointer active:scale-95 flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5 text-amber-300" />
              <span>Commission New Fleet</span>
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
