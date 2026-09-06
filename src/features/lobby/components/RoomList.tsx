import React from 'react';
import { Plus, RefreshCw, Anchor, Compass, X } from 'lucide-react';
import type { RoomInfo } from '@/types';
import { RoomCard } from './RoomCard';

interface RoomListProps {
  rooms: RoomInfo[];
  isRefreshing: boolean;
  onRefresh: () => void;
  onOpenCreateModal: () => void;
  onJoinRoom: (roomId: string) => void;
  onClose?: () => void;
}

export const RoomList: React.FC<RoomListProps> = ({
  rooms,
  isRefreshing,
  onRefresh,
  onOpenCreateModal,
  onJoinRoom,
  onClose,
}) => {
  return (
    <div className="w-full h-full flex flex-col game-dock rounded-xl p-2.5 sm:p-3.5 shadow-2xl relative border border-amber-500/50">
      {/* Corner Accents */}
      <div className="absolute top-1 left-1 w-2 h-2 border-t-2 border-l-2 border-amber-400/80 pointer-events-none" />
      <div className="absolute top-1 right-1 w-2 h-2 border-t-2 border-r-2 border-amber-400/80 pointer-events-none" />
      <div className="absolute bottom-1 left-1 w-2 h-2 border-b-2 border-l-2 border-amber-400/80 pointer-events-none" />
      <div className="absolute bottom-1 right-1 w-2 h-2 border-b-2 border-r-2 border-amber-400/80 pointer-events-none" />

      {/* Header Bar */}
      <div className="flex items-center justify-between pb-2 border-b border-amber-500/30 gap-1.5 shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="p-1 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 shrink-0">
            <Anchor className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <h2 className="font-cinzel font-bold text-amber-100 tracking-wider text-xs sm:text-sm gold-emboss truncate">
              FLEET ANCHORAGES
            </h2>
          </div>
          <span className="text-[9px] sm:text-[10px] font-mono font-bold text-amber-400/90 px-1.5 py-0.2 rounded bg-black/50 border border-amber-500/30 shrink-0">
            {rooms.length} {rooms.length === 1 ? 'Fleet' : 'Fleets'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-1.5 rounded bg-black/40 border border-amber-600/40 text-amber-300 hover:text-amber-100 hover:border-amber-400 transition cursor-pointer group"
            title="Scan Horizon for Fleets"
          >
            <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-amber-400' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
          </button>

          <button
            onClick={onOpenCreateModal}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-gradient-to-b from-amber-500 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-stone-950 font-cinzel font-bold text-[10px] sm:text-xs uppercase tracking-wider transition-all duration-150 shadow-[0_0_10px_rgba(212,175,55,0.3)] cursor-pointer border border-amber-300/80 active:scale-95"
          >
            <Plus className="w-3 h-3 stroke-[2.5]" />
            <span>Commission</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded hover:bg-black/60 border border-transparent hover:border-amber-500/40 text-stone-400 hover:text-amber-200 transition cursor-pointer"
              title="Close Panel"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Rooms Scroll List */}
      <div className="flex-1 overflow-y-auto mt-2 space-y-1.5 pr-1 min-h-0">
        {rooms.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center py-6 gap-2 text-center">
            <div className="p-2.5 rounded-full bg-amber-500/20 border border-amber-400/60 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <p className="font-cinzel text-xs sm:text-sm font-bold text-amber-100 tracking-wider gold-emboss">
                NO WARSHIPS ANCHORED
              </p>
              <p className="text-[10px] font-fell italic text-amber-200/80 mt-0.5 max-w-xs leading-relaxed">
                The horizon lies calm. Hoist your colors and commission your fleet!
              </p>
            </div>
            <button
              onClick={onOpenCreateModal}
              className="mt-1 px-3 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/80 text-amber-100 font-cinzel font-bold text-[10px] uppercase tracking-wider transition-all shadow-[0_0_10px_rgba(245,158,11,0.2)] cursor-pointer active:scale-95 flex items-center gap-1"
            >
              <Plus className="w-3 h-3 text-amber-300" />
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
