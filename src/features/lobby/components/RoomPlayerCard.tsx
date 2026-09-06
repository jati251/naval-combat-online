import React from 'react';
import { Bot, CheckCircle, Hourglass, Shield, Trash2 } from 'lucide-react';
import { networkClient } from '@/services/networkClient';
import type { RoomPlayer } from '@/types';

interface RoomPlayerCardProps {
  player: RoomPlayer;
  selfId: string;
  isHost: boolean;
  isRedTeam?: boolean;
  isBlueTeam?: boolean;
}

export const RoomPlayerCard: React.FC<RoomPlayerCardProps> = ({
  player: p,
  selfId,
  isHost,
  isRedTeam,
  isBlueTeam,
}) => {
  const isMe = p.id === selfId;

  return (
    <div
      className={`flex items-center justify-between p-1.5 sm:p-2.5 rounded-lg border transition-all duration-150 ${
        isMe
          ? isRedTeam
            ? 'bg-rose-950/70 border-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.35)] ring-1 ring-rose-400/50'
            : isBlueTeam
            ? 'bg-cyan-950/70 border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.35)] ring-1 ring-cyan-400/50'
            : 'bg-amber-950/60 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.35)] ring-1 ring-amber-400/50'
          : isRedTeam
          ? 'bg-black/50 border-rose-800/40 hover:border-rose-600/50'
          : isBlueTeam
          ? 'bg-black/50 border-cyan-800/40 hover:border-cyan-600/50'
          : 'bg-black/50 border-amber-600/30 hover:border-amber-500/50'
      }`}
    >
      {/* Left: Avatar Crest & Captain Info */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
        <div
          className={`w-6 h-6 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center font-cinzel font-black text-[10px] sm:text-sm border shadow shrink-0 ${
            isRedTeam
              ? 'bg-rose-950 text-rose-300 border-rose-500/60 shadow-[0_0_8px_rgba(244,63,94,0.3)]'
              : isBlueTeam
              ? 'bg-cyan-950 text-cyan-300 border-cyan-500/60 shadow-[0_0_8px_rgba(6,182,212,0.3)]'
              : p.isHost
              ? 'bg-amber-950 text-amber-300 border-amber-500/60'
              : 'bg-[#18273d] text-amber-100 border-amber-500/40'
          }`}
        >
          {p.isBot ? (
            <Bot className="w-3.5 h-3.5 text-cyan-300" />
          ) : (
            p.name.charAt(0).toUpperCase()
          )}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
            <span className="font-cinzel font-bold text-[10px] sm:text-xs text-amber-100 tracking-wide truncate max-w-[80px] xs:max-w-[110px] sm:max-w-[130px]">
              {p.name}
            </span>
            {isMe && (
              <span className="text-[6.5px] sm:text-[7px] font-cinzel font-bold px-1 rounded bg-stone-800 text-amber-300 border border-amber-500/40">
                YOU
              </span>
            )}
            {p.isHost && (
              <span className="text-[6.5px] sm:text-[7px] font-cinzel font-bold px-1 rounded bg-amber-950 text-amber-300 border border-amber-600/60">
                HOST
              </span>
            )}
            {p.isBot && (
              <span className="text-[6.5px] sm:text-[7px] font-cinzel font-bold px-1 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/60">
                BOT
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-[7.5px] sm:text-[9px] font-mono text-amber-300/80 uppercase mt-0.5">
            <Shield className="w-2.5 h-2.5 text-amber-400" />
            <span>{p.shipClass}</span>
          </div>
        </div>
      </div>

      {/* Right: Ready Status Badge & Host Bot Dismiss */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        {p.isBot && isHost && (
          <button
            onClick={() => networkClient.removeBot(p.id)}
            className="p-1 rounded hover:bg-rose-950/80 border border-transparent hover:border-rose-700/60 text-stone-400 hover:text-rose-300 transition cursor-pointer"
            title="Dismiss Bot"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}

        {p.isReady ? (
          <div className="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 font-cinzel font-bold text-[7.5px] sm:text-[9px] shadow-[0_0_8px_rgba(16,185,129,0.3)]">
            <CheckCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-400" />
            <span>READY</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded bg-amber-950/50 border border-amber-600/40 text-amber-400/80 font-cinzel font-bold text-[7.5px] sm:text-[9px]">
            <Hourglass className="w-2.5 h-2.5 text-amber-400 animate-pulse" />
            <span>WAIT</span>
          </div>
        )}
      </div>
    </div>
  );
};
