import React from 'react';
import { CheckCircle, LogOut, Loader2, Hourglass, Anchor, Shield, Bot, Trash2 } from 'lucide-react';
import { networkClient } from '@/services/networkClient';
import type { RoomInfo, RoomPlayer } from '@/types';

interface RoomLobbyProps {
  room: RoomInfo;
  selfId: string;
  isHost: boolean;
  selfPlayer: RoomPlayer | undefined;
  allCaptainsReady: boolean | undefined;
  readyCount: number;
  totalCount: number;
  isDeploying: boolean;
  onStartGame: () => void;
  onLeaveRoom: () => void;
}

export const RoomLobby: React.FC<RoomLobbyProps> = ({
  room,
  selfId,
  isHost,
  selfPlayer,
  allCaptainsReady,
  readyCount,
  totalCount,
  isDeploying,
  onStartGame,
  onLeaveRoom,
}) => {
  const canAddBot = isHost && room.players.length < room.maxPlayers;

  return (
    <div className="w-full max-w-4xl flex flex-col pirate-parchment rounded-xl p-7 shadow-2xl relative border border-amber-600/40 z-10">
      {/* Corner Filigree Brackets */}
      <div className="absolute top-1.5 left-1.5 w-3 h-3 border-t-2 border-l-2 border-amber-400/80" />
      <div className="absolute top-1.5 right-1.5 w-3 h-3 border-t-2 border-r-2 border-amber-400/80" />
      <div className="absolute bottom-1.5 left-1.5 w-3 h-3 border-b-2 border-l-2 border-amber-400/80" />
      <div className="absolute bottom-1.5 right-1.5 w-3 h-3 border-b-2 border-r-2 border-amber-400/80" />

      {/* Wardroom Header */}
      <div className="flex items-center justify-between pb-5 border-b border-amber-600/30">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-cinzel font-black text-amber-100 tracking-wider gold-emboss">
              {room.name}
            </h2>
            <span className="text-[9px] font-cinzel font-bold px-2.5 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-500/50 shadow-sm">
              COUNCIL OF WAR
            </span>
            <span className="text-[9px] font-cinzel font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-200 border border-amber-400/50 shadow-sm">
              ⚔ FIRST TO {room.targetKills || 5} SINKS
            </span>
          </div>
          <p className="text-xs font-fell italic text-amber-200/80 mt-1">
            Captains Assembled in Wardroom:{' '}
            <strong className="text-amber-100 font-mono not-italic">{room.players.length}</strong> of{' '}
            <strong className="text-amber-100 font-mono not-italic">{room.maxPlayers}</strong> vessels
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isHost && (
            <button
              onClick={() => networkClient.addBot()}
              disabled={!canAddBot}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-md font-cinzel font-bold text-xs tracking-wider transition-all border shadow-md ${
                canAddBot
                  ? 'bg-gradient-to-b from-cyan-700 via-cyan-800 to-blue-950 hover:from-cyan-600 hover:to-blue-900 text-cyan-100 border-cyan-400/60 shadow-[0_0_15px_rgba(6,182,212,0.3)] cursor-pointer active:scale-95'
                  : 'bg-stone-900/80 text-stone-600 border-stone-800 cursor-not-allowed'
              }`}
              title={canAddBot ? 'Commission Corsair Bot AI (Brig)' : 'All Armada Slots Filled'}
            >
              <Bot className={`w-3.5 h-3.5 ${canAddBot ? 'text-cyan-300' : 'text-stone-600'}`} />
              <span>+ Add Bot (Brig)</span>
            </button>
          )}

          <button
            onClick={onLeaveRoom}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-md pirate-panel border border-rose-800/60 text-rose-300 hover:text-white hover:border-rose-500 transition-all cursor-pointer text-xs font-cinzel font-bold tracking-wider shadow-sm"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Abandon Fleet</span>
          </button>
        </div>
      </div>

      {/* Captains Roster Grid */}
      <div className="grid grid-cols-2 gap-3.5 my-6">
        {room.players.map((p) => {
          const isMe = p.id === selfId;
          return (
            <div
              key={p.id}
              className={`flex items-center justify-between p-3.5 rounded-lg border transition-all ${
                isMe
                  ? 'pirate-panel border-amber-400 shadow-[0_0_15px_rgba(212,175,55,0.3)] ring-1 ring-amber-400/40'
                  : p.isBot
                  ? 'bg-[#0e2137]/90 border border-cyan-500/40 shadow-sm'
                  : 'bg-[#121e2f]/90 border border-amber-500/30 shadow-sm'
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Captain Monogram Crest */}
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center font-cinzel font-bold text-sm border shadow-md ${
                    p.isBot
                      ? 'bg-cyan-950/80 text-cyan-300 border-cyan-500/60 shadow-[0_0_8px_rgba(6,182,212,0.3)]'
                      : p.isHost
                      ? 'bg-amber-950/80 text-amber-300 border-amber-500/60'
                      : 'bg-[#18273d] text-amber-100 border-amber-500/40'
                  }`}
                >
                  {p.isBot ? (
                    <Bot className="w-5 h-5 text-cyan-300" />
                  ) : (
                    p.name.charAt(0).toUpperCase()
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-cinzel font-bold text-sm text-amber-100 tracking-wide">
                      {p.name}
                    </span>
                    {p.isHost && (
                      <span className="text-[8px] font-cinzel font-bold px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-600/60">
                        COMMODORE
                      </span>
                    )}
                    {p.isBot && (
                      <span className="text-[8px] font-cinzel font-bold px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/60 flex items-center gap-0.5">
                        BOT AI
                      </span>
                    )}
                    {isMe && (
                      <span className="text-[8px] font-cinzel font-bold px-1.5 py-0.5 rounded bg-stone-800 text-amber-200 border border-amber-600/40">
                        YOU
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-amber-400/80 uppercase flex items-center gap-1 mt-0.5">
                    <Shield className="w-2.5 h-2.5" />
                    Vessel: {p.shipClass}
                  </span>
                </div>
              </div>

              {/* Ready Status Stamp & Host Bot Dismissal */}
              <div className="flex items-center gap-2">
                {p.isBot && isHost && (
                  <button
                    onClick={() => networkClient.removeBot(p.id)}
                    className="p-1.5 rounded hover:bg-rose-950/80 border border-transparent hover:border-rose-700/60 text-stone-400 hover:text-rose-300 transition-colors cursor-pointer"
                    title="Dismiss Corsair Bot from Fleet"
                    aria-label="Dismiss Bot"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}

                {p.isReady ? (
                  <div className="flex items-center gap-1.5 text-amber-200 text-[10px] font-cinzel font-bold bg-amber-950/70 px-2.5 py-1 rounded border border-amber-500/50 shadow-sm">
                    <div className="w-2 h-2 rounded-full wax-seal-red" />
                    <span>{p.isBot ? 'CREW MUSTERED' : 'ARTICLES SIGNED'}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-stone-400 text-[10px] font-cinzel font-bold bg-stone-900/80 px-2.5 py-1 rounded border border-stone-800">
                    <Hourglass className="w-3 h-3 text-stone-500 animate-pulse" />
                    <span>PREPARING</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Footer Bar */}
      <div className="flex items-center justify-between pt-5 border-t border-amber-600/30">
        <div className="flex items-center gap-2">
          {/* Captain Ready Toggle */}
          <button
            onClick={() => networkClient.setReady(!selfPlayer?.isReady)}
            disabled={isDeploying}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-md font-cinzel font-bold text-xs uppercase tracking-wider transition-all cursor-pointer border shadow-md ${
              selfPlayer?.isReady
                ? 'bg-amber-950/80 border-amber-400 text-amber-200 shadow-[0_0_15px_rgba(212,175,55,0.3)]'
                : 'pirate-panel border-stone-700 text-stone-300 hover:border-amber-500/60 hover:text-amber-100'
            } ${isDeploying ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`}
          >
            <CheckCircle className={`w-4 h-4 ${selfPlayer?.isReady ? 'text-amber-400' : 'text-stone-500'}`} />
            <span>{selfPlayer?.isReady ? 'Aye, Ready for Battle' : 'Sign Articles (Ready)'}</span>
          </button>
        </div>

        {/* Host Deploy Armada Action */}
        {isHost ? (
          <div className="flex flex-col items-end gap-1">
            <button
              onClick={onStartGame}
              disabled={isDeploying}
              className={`flex items-center gap-2 px-8 py-3 rounded-md font-cinzel font-black text-xs uppercase tracking-[0.15em] transition-all shadow-xl cursor-pointer ${
                isDeploying
                  ? 'bg-amber-800 text-stone-950 cursor-wait opacity-90'
                  : allCaptainsReady
                  ? 'bg-gradient-to-b from-amber-400 via-amber-500 to-amber-700 hover:from-amber-300 hover:to-amber-600 text-stone-950 border border-amber-200 shadow-[0_0_25px_rgba(212,175,55,0.6)] active:scale-95'
                  : 'bg-stone-900 text-stone-400 border border-stone-800 hover:border-amber-600/40 hover:text-amber-200'
              }`}
            >
              {isDeploying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-stone-950" />
                  <span>Unfurling Canvases...</span>
                </>
              ) : (
                <>
                  <Anchor className="w-4 h-4 text-stone-950 stroke-[2.5]" />
                  <span>Weigh Anchor & Engage</span>
                </>
              )}
            </button>
            <span className="text-[10px] font-fell italic text-amber-200/60">
              {readyCount} of {totalCount} Captains Prepared for Engagement
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs font-fell italic text-amber-300/80 pirate-panel px-4 py-2 rounded-md border border-amber-600/40">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
            <span>Awaiting the Commodore's Signal Gun to Weigh Anchor...</span>
          </div>
        )}
      </div>
    </div>
  );
};
