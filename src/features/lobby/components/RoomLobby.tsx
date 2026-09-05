import React from 'react';
import { CheckCircle, LogOut, Loader2, Hourglass, Anchor, Shield, Bot, Trash2, Users, Compass } from 'lucide-react';
import { networkClient } from '@/services/networkClient';
import type { RoomInfo, RoomPlayer } from '@/types';
import { getMapConfig, MAP_LIST } from '@/features/battle/maps';

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
    <div className="w-full max-w-4xl max-h-[92dvh] sm:max-h-[calc(100dvh-120px)] flex flex-col pirate-parchment rounded-xl p-3 sm:p-5 md:p-6 shadow-2xl relative border border-amber-600/40 z-10 overflow-y-auto">
      {/* Corner Filigree Brackets */}
      <div className="absolute top-1.5 left-1.5 w-3 h-3 border-t-2 border-l-2 border-amber-400/80 pointer-events-none" />
      <div className="absolute top-1.5 right-1.5 w-3 h-3 border-t-2 border-r-2 border-amber-400/80 pointer-events-none" />
      <div className="absolute bottom-1.5 left-1.5 w-3 h-3 border-b-2 border-l-2 border-amber-400/80 pointer-events-none" />
      <div className="absolute bottom-1.5 right-1.5 w-3 h-3 border-b-2 border-r-2 border-amber-400/80 pointer-events-none" />

      {/* Wardroom Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2.5 sm:pb-4 border-b border-amber-600/30 gap-2 shrink-0">
        <div>
          <div className="flex items-center gap-1.5 sm:gap-2.5 flex-wrap">
            <h2 className="text-base sm:text-2xl font-cinzel font-black text-amber-100 tracking-wider gold-emboss">
              {room.name}
            </h2>
            <span className="text-[8px] sm:text-[9px] font-cinzel font-bold px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-500/50 shadow-sm">
              COUNCIL OF WAR
            </span>
            <span
              className={`text-[8px] sm:text-[9px] font-cinzel font-bold px-2 py-0.5 rounded-full border shadow-sm ${
                room.gameMode === 'TEAM'
                  ? 'bg-cyan-950/80 text-cyan-300 border-cyan-500/60'
                  : 'bg-amber-950/80 text-amber-300 border-amber-500/50'
              }`}
            >
              {room.gameMode === 'TEAM' ? '🛡 ARMADA CLASH' : '⚔ FREE FOR ALL'}
            </span>
            <span className="text-[8px] sm:text-[9px] font-cinzel font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-200 border border-amber-400/50 shadow-sm">
              {room.gameMode === 'TEAM' ? `🚩 GOAL: ${room.targetKills || 5} SINKS` : `⚔ GOAL: ${room.targetKills || 5} SINKS`}
            </span>
          </div>
          <p className="text-[10px] sm:text-xs font-fell italic text-amber-200/80 mt-0.5">
            Captains Assembled in Wardroom:{' '}
            <strong className="text-amber-100 font-mono not-italic">{room.players.length}</strong> of{' '}
            <strong className="text-amber-100 font-mono not-italic">{room.maxPlayers}</strong> vessels
          </p>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 self-start sm:self-auto">
          {isHost && (
            <button
              onClick={() => networkClient.addBot()}
              disabled={!canAddBot}
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 py-1 sm:px-3.5 sm:py-2 rounded-md font-cinzel font-bold text-[11px] sm:text-xs tracking-wider transition-all border shadow-md ${
                canAddBot
                  ? 'bg-gradient-to-b from-cyan-700 via-cyan-800 to-blue-950 hover:from-cyan-600 hover:to-blue-900 text-cyan-100 border-cyan-400/60 shadow-[0_0_15px_rgba(6,182,212,0.3)] cursor-pointer active:scale-95'
                  : 'bg-stone-900/80 text-stone-600 border-stone-800 cursor-not-allowed'
              }`}
              title={canAddBot ? 'Commission Corsair Bot AI (Brig)' : 'All Armada Slots Filled'}
            >
              <Bot className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${canAddBot ? 'text-cyan-300' : 'text-stone-600'}`} />
              <span>+ Add Bot</span>
            </button>
          )}

          <button
            onClick={onLeaveRoom}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 py-1 sm:px-3.5 sm:py-2 rounded-md pirate-panel border border-rose-800/60 text-rose-300 hover:text-white hover:border-rose-500 transition-all cursor-pointer text-[11px] sm:text-xs font-cinzel font-bold tracking-wider shadow-sm"
          >
            <LogOut className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span>Abandon Fleet</span>
          </button>
        </div>
      </div>

      {/* Charted Waters & Naval Theater Selector */}
      {(() => {
        const activeMap = getMapConfig(room.mapId);
        return (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 sm:p-2.5 rounded-lg bg-[#0a1626]/80 border border-amber-600/30 my-2 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-md bg-amber-950/80 border border-amber-500/50 flex items-center justify-center text-amber-300 shrink-0">
                <Compass className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] sm:text-xs font-cinzel font-bold text-amber-100">
                    Theater: {activeMap.name}
                  </span>
                  <span
                    className={`text-[8px] font-cinzel font-bold px-1.5 py-0.2 rounded border ${
                      activeMap.id === 'kingston'
                        ? 'bg-sky-950/80 text-sky-300 border-sky-600/60'
                        : activeMap.id === 'mexico'
                        ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600/60'
                        : 'bg-amber-950/80 text-amber-300 border-amber-600/60'
                    }`}
                  >
                    {activeMap.tacticalTag}
                  </span>
                </div>
                <p className="text-[9px] sm:text-[10px] font-fell italic text-amber-200/70 truncate">
                  {activeMap.subtitle} • {activeMap.islands.length} Islands, {activeMap.shipwrecks.length} Shipwrecks
                </p>
              </div>
            </div>

            {/* Map Selection Controls for Host */}
            {isHost ? (
              <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 self-end sm:self-auto">
                <span className="text-[9px] font-cinzel font-bold text-amber-300/70 mr-1 hidden md:inline uppercase">
                  Change Map:
                </span>
                {MAP_LIST.map((m) => {
                  const isActive = (room.mapId || 'caribbean') === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => networkClient.setMap(m.id)}
                      disabled={isDeploying}
                      className={`px-2 py-1 rounded text-[9px] sm:text-[10px] font-cinzel font-bold transition-all cursor-pointer border ${
                        isActive
                          ? m.id === 'kingston'
                            ? 'bg-sky-900/90 border-sky-400 text-white shadow-[0_0_10px_rgba(56,189,248,0.4)] ring-1 ring-sky-300'
                            : m.id === 'mexico'
                            ? 'bg-emerald-900/90 border-emerald-400 text-white shadow-[0_0_10px_rgba(52,211,153,0.4)] ring-1 ring-emerald-300'
                            : 'bg-amber-900/90 border-amber-400 text-white shadow-[0_0_10px_rgba(245,158,11,0.4)] ring-1 ring-amber-300'
                          : 'bg-[#121f30] border-amber-500/30 text-amber-200/80 hover:text-white hover:border-amber-400/60'
                      }`}
                      title={`Switch theater to ${m.name}`}
                    >
                      {m.id === 'caribbean' && '⚓ Caribbean'}
                      {m.id === 'kingston' && '🛡 Kingston'}
                      {m.id === 'mexico' && '🏛 Mexico'}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-[9px] font-fell italic text-amber-300/60 self-end sm:self-auto">
                Commodore's Chart
              </div>
            )}
          </div>
        );
      })()}

      {/* Captains Roster Grid (Scrolls internally within wardroom parchment) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 my-2.5 sm:my-4 flex-1 min-h-0 overflow-y-auto pr-0.5 sm:pr-2">
        {room.players.map((p) => {
          const isMe = p.id === selfId;
          const isRed = room.gameMode === 'TEAM' && p.team === 'red';
          const isBlue = room.gameMode === 'TEAM' && p.team === 'blue';

          return (
            <div
              key={p.id}
              className={`flex items-center justify-between p-2.5 sm:p-3.5 rounded-lg border transition-all ${
                isMe
                  ? isRed
                    ? 'bg-[#220d14]/90 border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.35)] ring-1 ring-rose-400/50'
                    : isBlue
                    ? 'bg-[#0b1c2e]/90 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.35)] ring-1 ring-cyan-400/50'
                    : 'pirate-panel border-amber-400 shadow-[0_0_15px_rgba(212,175,55,0.3)] ring-1 ring-amber-400/40'
                  : isRed
                  ? 'bg-[#1a0f16]/90 border border-rose-700/50 shadow-sm'
                  : isBlue
                  ? 'bg-[#0a1827]/90 border border-cyan-700/50 shadow-sm'
                  : p.isBot
                  ? 'bg-[#0e2137]/90 border border-cyan-500/40 shadow-sm'
                  : 'bg-[#121e2f]/90 border border-amber-500/30 shadow-sm'
              }`}
            >
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                {/* Captain Monogram Crest */}
                <div
                  className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center font-cinzel font-bold text-xs sm:text-sm border shadow-md shrink-0 ${
                    isRed
                      ? 'bg-rose-950 text-rose-300 border-rose-500/60 shadow-[0_0_8px_rgba(244,63,94,0.3)]'
                      : isBlue
                      ? 'bg-cyan-950 text-cyan-300 border-cyan-500/60 shadow-[0_0_8px_rgba(6,182,212,0.3)]'
                      : p.isBot
                      ? 'bg-cyan-950/80 text-cyan-300 border-cyan-500/60 shadow-[0_0_8px_rgba(6,182,212,0.3)]'
                      : p.isHost
                      ? 'bg-amber-950/80 text-amber-300 border-amber-500/60'
                      : 'bg-[#18273d] text-amber-100 border-amber-500/40'
                  }`}
                >
                  {p.isBot ? (
                    <Bot className={`w-4 h-4 sm:w-5 sm:h-5 ${isRed ? 'text-rose-300' : isBlue ? 'text-cyan-300' : 'text-cyan-300'}`} />
                  ) : (
                    p.name.charAt(0).toUpperCase()
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
                    <span className="font-cinzel font-bold text-xs sm:text-sm text-amber-100 tracking-wide truncate max-w-[90px] sm:max-w-[130px]">
                      {p.name}
                    </span>
                    {room.gameMode === 'TEAM' && (
                      <span
                        className={`text-[7px] sm:text-[8px] font-cinzel font-bold px-1 py-0.2 rounded border ${
                          p.team === 'red'
                            ? 'bg-rose-950 text-rose-300 border-rose-600/60'
                            : 'bg-cyan-950 text-cyan-300 border-cyan-600/60'
                        }`}
                      >
                        {p.team === 'red' ? 'RED' : 'BLUE'}
                      </span>
                    )}
                    {p.isHost && (
                      <span className="text-[7px] sm:text-[8px] font-cinzel font-bold px-1 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-600/60">
                        COMMODORE
                      </span>
                    )}
                    {p.isBot && (
                      <span className="text-[7px] sm:text-[8px] font-cinzel font-bold px-1 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/60">
                        BOT AI
                      </span>
                    )}
                    {isMe && (
                      <span className="text-[7px] sm:text-[8px] font-cinzel font-bold px-1 py-0.2 rounded bg-stone-800 text-amber-200 border border-amber-600/40">
                        YOU
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-mono text-amber-400/80 uppercase flex items-center gap-1 mt-0.5">
                    <Shield className="w-2.5 h-2.5" />
                    Vessel: {p.shipClass}
                  </span>
                </div>
              </div>

              {/* Ready Status Stamp & Host Bot Dismissal */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {p.isBot && isHost && (
                  <button
                    onClick={() => networkClient.removeBot(p.id)}
                    className="p-1 sm:p-1.5 rounded hover:bg-rose-950/80 border border-transparent hover:border-rose-700/60 text-stone-400 hover:text-rose-300 transition-colors cursor-pointer"
                    title="Dismiss Corsair Bot from Fleet"
                    aria-label="Dismiss Bot"
                  >
                    <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </button>
                )}

                {p.isReady ? (
                  <div className="flex items-center gap-1 sm:gap-1.5 text-amber-200 text-[9px] sm:text-[10px] font-cinzel font-bold bg-amber-950/70 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded border border-amber-500/50 shadow-sm">
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full wax-seal-red" />
                    <span className="hidden xs:inline">{p.isBot ? 'CREW MUSTERED' : 'ARTICLES SIGNED'}</span>
                    <span className="xs:hidden">READY</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 sm:gap-1.5 text-stone-400 text-[9px] sm:text-[10px] font-cinzel font-bold bg-stone-900/80 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded border border-stone-800">
                    <Hourglass className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-stone-500 animate-pulse" />
                    <span>PREPARING</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Footer Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-4 pt-2.5 sm:pt-4 border-t border-amber-600/30 shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Captain Ready Toggle */}
          <button
            onClick={() => networkClient.setReady(!selfPlayer?.isReady)}
            disabled={isDeploying}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2 sm:py-2.5 rounded-md font-cinzel font-bold text-[11px] sm:text-xs uppercase tracking-wider transition-all cursor-pointer border shadow-md ${
              selfPlayer?.isReady
                ? 'bg-amber-950/80 border-amber-400 text-amber-200 shadow-[0_0_15px_rgba(212,175,55,0.3)]'
                : 'pirate-panel border-stone-700 text-stone-300 hover:border-amber-500/60 hover:text-amber-100'
            } ${isDeploying ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`}
          >
            <CheckCircle className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${selfPlayer?.isReady ? 'text-amber-400' : 'text-stone-500'}`} />
            <span>{selfPlayer?.isReady ? 'Aye, Ready' : 'Sign Articles (Ready)'}</span>
          </button>

          {/* Switch Fleet in Team Mode */}
          {room.gameMode === 'TEAM' && (
            <button
              onClick={() => networkClient.switchTeam()}
              disabled={isDeploying}
              className={`flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-md font-cinzel font-bold text-[11px] sm:text-xs uppercase tracking-wider transition-all cursor-pointer border shadow-md active:scale-95 ${
                selfPlayer?.team === 'red'
                  ? 'bg-rose-950/80 border-rose-500/60 text-rose-200 hover:bg-rose-900/80 hover:text-white'
                  : 'bg-cyan-950/80 border-cyan-500/60 text-cyan-200 hover:bg-cyan-900/80 hover:text-white'
              }`}
              title="Switch between Red Armada and Blue Armada"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Switch ({selfPlayer?.team === 'red' ? 'Blue' : 'Red'})</span>
            </button>
          )}
        </div>

        {/* Host Deploy Armada Action */}
        {isHost ? (
          <div className="flex flex-col sm:items-end gap-1">
            <button
              onClick={onStartGame}
              disabled={isDeploying}
              className={`w-full sm:w-auto flex items-center justify-center gap-2 px-5 sm:px-8 py-2.5 sm:py-3 rounded-md font-cinzel font-black text-[11px] sm:text-xs uppercase tracking-[0.12em] sm:tracking-[0.15em] transition-all shadow-xl cursor-pointer ${
                isDeploying
                  ? 'bg-amber-800 text-stone-950 cursor-wait opacity-90'
                  : allCaptainsReady
                  ? 'bg-gradient-to-b from-amber-400 via-amber-500 to-amber-700 hover:from-amber-300 hover:to-amber-600 text-stone-950 border border-amber-200 shadow-[0_0_25px_rgba(212,175,55,0.6)] active:scale-95'
                  : 'bg-stone-900 text-stone-400 border border-stone-800 hover:border-amber-600/40 hover:text-amber-200'
              }`}
            >
              {isDeploying ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin text-stone-950" />
                  <span>Unfurling Canvases...</span>
                </>
              ) : (
                <>
                  <Anchor className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-stone-950 stroke-[2.5]" />
                  <span>Weigh Anchor & Engage</span>
                </>
              )}
            </button>
            <span className="text-[9px] sm:text-[10px] font-fell italic text-amber-200/60 text-center sm:text-right">
              {readyCount} of {totalCount} Captains Prepared for Engagement
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 text-[11px] sm:text-xs font-fell italic text-amber-300/80 pirate-panel px-3 sm:px-4 py-1.5 sm:py-2 rounded-md border border-amber-600/40 text-center">
            <Loader2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-spin text-amber-400 shrink-0" />
            <span>Awaiting the Commodore's Signal Gun to Weigh Anchor...</span>
          </div>
        )}
      </div>
    </div>
  );
};
