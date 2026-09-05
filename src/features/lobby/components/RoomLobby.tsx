import React from 'react';
import { Play, CheckCircle, LogOut, Loader2, Clock } from 'lucide-react';
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
  return (
    <div className="w-full max-w-4xl flex flex-col bg-slate-950/80 border border-amber-500/30 rounded-3xl p-8 backdrop-blur-xl shadow-2xl z-10">
      <div className="flex items-center justify-between pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-cinzel font-black text-amber-200 tracking-wider">
              {room.name}
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
              FLEET ANCHORAGE
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Captains in Anchorage: {room.players.length} / {room.maxPlayers}
          </p>
        </div>

        <button
          onClick={onLeaveRoom}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 border border-rose-900/60 text-rose-400 hover:bg-rose-950/40 hover:border-rose-500 transition cursor-pointer text-xs font-bold"
        >
          <LogOut className="w-4 h-4" />
          <span>Leave Fleet</span>
        </button>
      </div>

      {/* Players Roster Grid */}
      <div className="grid grid-cols-2 gap-4 my-8">
        {room.players.map((p) => {
          const isMe = p.id === selfId;
          return (
            <div
              key={p.id}
              className={`flex items-center justify-between p-4 rounded-2xl border transition ${
                isMe
                  ? 'bg-amber-500/10 border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
                  : 'bg-slate-900/60 border-slate-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center font-cinzel font-bold text-sm ${
                    p.isHost
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {p.name.charAt(0).toUpperCase()}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-100">{p.name}</span>
                    {p.isHost && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800/60">
                        HOST
                      </span>
                    )}
                    {isMe && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/60">
                        YOU
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 uppercase">
                    Vessel: {p.shipClass}
                  </span>
                </div>
              </div>

              <div>
                {p.isReady ? (
                  <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold bg-emerald-950/40 px-3 py-1 rounded-lg border border-emerald-800/40">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>READY</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-slate-500 text-xs font-bold bg-slate-900 px-3 py-1 rounded-lg border border-slate-800">
                    <Clock className="w-3.5 h-3.5" />
                    <span>PREPARING</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-6 border-t border-slate-800">
        <div className="flex items-center gap-2">
          {/* Captain Ready Toggle */}
          <button
            onClick={() => networkClient.setReady(!selfPlayer?.isReady)}
            disabled={isDeploying}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition cursor-pointer border ${
              selfPlayer?.isReady
                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 hover:bg-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
            } ${isDeploying ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <CheckCircle className="w-4 h-4" />
            <span>{selfPlayer?.isReady ? 'Ready for Battle' : 'Mark as Ready'}</span>
          </button>
        </div>

        {/* Host Start Game Button */}
        {isHost ? (
          <div className="flex flex-col items-end gap-1.5">
            <button
              onClick={onStartGame}
              disabled={isDeploying}
              className={`flex items-center gap-2 px-8 py-3.5 rounded-xl font-black text-sm uppercase tracking-wider transition shadow-2xl ${
                isDeploying
                  ? 'bg-amber-600 text-slate-950 cursor-wait opacity-90'
                  : allCaptainsReady
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 shadow-[0_0_25px_rgba(245,158,11,0.5)] cursor-pointer'
                  : 'bg-slate-800 text-slate-500 border border-slate-700 hover:bg-slate-700/80 hover:text-slate-300 cursor-pointer'
              }`}
            >
              {isDeploying ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Deploying Armada...</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-current" />
                  <span>Deploy Game</span>
                </>
              )}
            </button>
            <span className="text-[10px] font-mono text-slate-400">
              {readyCount} of {totalCount} Captains Ready
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs font-mono text-amber-400/80 bg-amber-950/30 px-4 py-2 rounded-xl border border-amber-500/20">
            <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
            <span>Awaiting Host Admiral to Deploy Armada...</span>
          </div>
        )}
      </div>
    </div>
  );
};
