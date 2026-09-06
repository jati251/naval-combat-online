import React, { useState } from 'react';
import { Swords } from 'lucide-react';
import { networkClient } from '@/services/networkClient';
import type { RoomInfo, RoomPlayer } from '@/types';
import { RoomPlayerCard } from './RoomPlayerCard';
import { RoomLobbyTopBar } from './RoomLobbyTopBar';
import { RoomLobbyBottomBar } from './RoomLobbyBottomBar';

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
  const isTeamMode = room.gameMode === 'TEAM';

  const [mobileTeamTab, setMobileTeamTab] = useState<'red' | 'blue'>(() => {
    return selfPlayer?.team === 'blue' ? 'blue' : 'red';
  });

  // Group players by team in Team Mode
  const redPlayers = room.players.filter((p) => p.team === 'red');
  const bluePlayers = room.players.filter((p) => p.team === 'blue');
  const maxPerTeam = Math.max(1, Math.floor(room.maxPlayers / 2));

  return (
    <div className="w-full h-full flex flex-col justify-between pointer-events-none p-1 sm:p-2.5 z-10 select-none relative">
      {/* 1. TOP STAGING COMMAND BAR */}
      <RoomLobbyTopBar
        room={room}
        isHost={isHost}
        canAddBot={canAddBot}
        onLeaveRoom={onLeaveRoom}
      />

      {/* 2. MIDDLE ARMADA ROSTER: TEAM FLANKS OR FFA GRID */}
      <div className="w-full flex-1 min-h-0 flex flex-col items-center justify-center pointer-events-none py-1 sm:py-2">
        {isTeamMode ? (
          /* Team Mode: Adaptive Mobile Tabs or Desktop Side Flanks */
          <div className="w-full h-full flex flex-col md:flex-row items-center justify-between gap-1.5 sm:gap-4 pointer-events-none">
            {/* Mobile Team Switcher Tabs (Only visible on screens < md) */}
            <div className="flex md:hidden items-center justify-center gap-1.5 w-full max-w-sm shrink-0 pointer-events-auto">
              <button
                onClick={() => setMobileTeamTab('red')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-2.5 rounded-lg border font-cinzel font-bold text-[10px] transition cursor-pointer ${
                  mobileTeamTab === 'red'
                    ? 'bg-rose-950/90 border-rose-400 text-rose-200 shadow-[0_0_10px_rgba(244,63,94,0.4)] ring-1 ring-rose-400/40'
                    : 'bg-black/50 border-stone-800 text-stone-400 hover:text-stone-200'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_4px_rgba(244,63,94,0.8)]" />
                <span>RED ARMADA ({redPlayers.length}/{maxPerTeam})</span>
              </button>
              <button
                onClick={() => setMobileTeamTab('blue')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-2.5 rounded-lg border font-cinzel font-bold text-[10px] transition cursor-pointer ${
                  mobileTeamTab === 'blue'
                    ? 'bg-cyan-950/90 border-cyan-400 text-cyan-200 shadow-[0_0_10px_rgba(6,182,212,0.4)] ring-1 ring-cyan-400/40'
                    : 'bg-black/50 border-stone-800 text-stone-400 hover:text-stone-200'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_4px_rgba(6,182,212,0.8)]" />
                <span>BLUE ARMADA ({bluePlayers.length}/{maxPerTeam})</span>
              </button>
            </div>

            {/* Red Fleet Column */}
            <div className={`pointer-events-auto ${mobileTeamTab === 'red' ? 'flex' : 'hidden md:flex'} w-full max-w-sm md:max-w-none md:w-[260px] lg:w-[310px] h-full max-h-[calc(100dvh-195px)] sm:max-h-[calc(100dvh-170px)] flex-col gap-1 sm:gap-1.5 game-dock rounded-xl p-1.5 sm:p-2 border border-rose-500/40 bg-[#16080e]/85 backdrop-blur-md shadow-2xl overflow-hidden`}>
              <div className="flex items-center justify-between border-b border-rose-500/30 pb-1 shrink-0">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.8)]" />
                  <span className="font-cinzel font-black text-[10px] sm:text-xs text-rose-200 tracking-wider">
                    RED ARMADA
                  </span>
                </div>
                <span className="text-[8.5px] sm:text-[9px] font-mono text-rose-300 font-bold">
                  {redPlayers.length}/{maxPerTeam}
                </span>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-1 sm:gap-1.5 scrollbar-thin pr-0.5">
                {redPlayers.map((p) => (
                  <RoomPlayerCard
                    key={p.id}
                    player={p}
                    selfId={selfId}
                    isHost={isHost}
                    isRedTeam={true}
                    isBlueTeam={false}
                  />
                ))}
                {/* Empty Slot / Switch Team Trigger */}
                {redPlayers.length < maxPerTeam && (
                  <button
                    onClick={() => {
                      if (selfPlayer?.team !== 'red') networkClient.switchTeam();
                    }}
                    className="p-1.5 sm:p-2 rounded-lg border border-dashed border-rose-700/40 text-center font-cinzel text-[8.5px] sm:text-[9px] text-rose-300/60 hover:text-rose-200 hover:border-rose-500/60 transition cursor-pointer"
                  >
                    {selfPlayer?.team !== 'red' ? '+ Join Red Armada' : '+ Open Berth'}
                  </button>
                )}
              </div>
            </div>

            {/* Center Stage Floating Emblem (Desktop only) */}
            <div className="pointer-events-none hidden md:flex flex-col items-center justify-center gap-1">
              <div className="px-3 py-1 rounded-full game-dock border border-amber-500/60 bg-black/60 shadow-[0_0_20px_rgba(245,158,11,0.3)] flex items-center gap-1.5">
                <Swords className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-cinzel font-black text-xs text-amber-100 tracking-[0.2em]">VERSUS</span>
                <Swords className="w-3.5 h-3.5 text-amber-400" />
              </div>
            </div>

            {/* Blue Fleet Column */}
            <div className={`pointer-events-auto ${mobileTeamTab === 'blue' ? 'flex' : 'hidden md:flex'} w-full max-w-sm md:max-w-none md:w-[260px] lg:w-[310px] h-full max-h-[calc(100dvh-195px)] sm:max-h-[calc(100dvh-170px)] flex-col gap-1 sm:gap-1.5 game-dock rounded-xl p-1.5 sm:p-2 border border-cyan-500/40 bg-[#061220]/85 backdrop-blur-md shadow-2xl overflow-hidden`}>
              <div className="flex items-center justify-between border-b border-cyan-500/30 pb-1 shrink-0">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.8)]" />
                  <span className="font-cinzel font-black text-[10px] sm:text-xs text-cyan-200 tracking-wider">
                    BLUE ARMADA
                  </span>
                </div>
                <span className="text-[8.5px] sm:text-[9px] font-mono text-cyan-300 font-bold">
                  {bluePlayers.length}/{maxPerTeam}
                </span>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-1 sm:gap-1.5 scrollbar-thin pr-0.5">
                {bluePlayers.map((p) => (
                  <RoomPlayerCard
                    key={p.id}
                    player={p}
                    selfId={selfId}
                    isHost={isHost}
                    isRedTeam={false}
                    isBlueTeam={true}
                  />
                ))}
                {/* Empty Slot / Switch Team Trigger */}
                {bluePlayers.length < maxPerTeam && (
                  <button
                    onClick={() => {
                      if (selfPlayer?.team !== 'blue') networkClient.switchTeam();
                    }}
                    className="p-1.5 sm:p-2 rounded-lg border border-dashed border-cyan-700/40 text-center font-cinzel text-[8.5px] sm:text-[9px] text-cyan-300/60 hover:text-cyan-200 hover:border-cyan-500/60 transition cursor-pointer"
                  >
                    {selfPlayer?.team !== 'blue' ? '+ Join Blue Armada' : '+ Open Berth'}
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* FFA Mode: Clean Adaptive Roster Framing Center 3D Stage */
          <div className="w-full h-full flex flex-col md:flex-row items-center justify-between gap-1.5 sm:gap-4 pointer-events-none">
            {/* Flank 1: Vanguard (Or single full list on mobile) */}
            <div className="pointer-events-auto w-full max-w-sm md:max-w-none md:w-[260px] lg:w-[300px] h-full max-h-[calc(100dvh-195px)] sm:max-h-[calc(100dvh-170px)] flex flex-col gap-1 sm:gap-1.5 game-dock rounded-xl p-1.5 sm:p-2 border border-amber-500/40 bg-[#081220]/85 backdrop-blur-md shadow-2xl overflow-hidden">
              <div className="border-b border-amber-500/30 pb-1 font-cinzel font-bold text-[9.5px] sm:text-[11px] text-amber-200 flex items-center justify-between shrink-0">
                <span>{window.innerWidth < 768 ? 'Fleet Captains' : 'Vanguard Captains'}</span>
                <span className="text-[8.5px] sm:text-[9px] font-mono text-amber-400 font-bold">
                  {room.players.length}/{room.maxPlayers}
                </span>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-1 sm:gap-1.5 scrollbar-thin pr-0.5">
                {/* On mobile show all players in this unified container; on desktop show first 4 */}
                {(window.innerWidth < 768 ? room.players : room.players.slice(0, 4)).map((p) => (
                  <RoomPlayerCard
                    key={p.id}
                    player={p}
                    selfId={selfId}
                    isHost={isHost}
                  />
                ))}
                {room.players.length < room.maxPlayers && (
                  <div className="p-1.5 sm:p-2 rounded-lg border border-dashed border-amber-700/30 text-center font-cinzel text-[8.5px] sm:text-[9px] text-amber-400/50">
                    + Open Berth
                  </div>
                )}
              </div>
            </div>

            {/* Flank 2: Rearguard (Desktop only, > md) */}
            <div className="pointer-events-auto hidden md:flex md:w-[260px] lg:w-[300px] h-full max-h-[calc(100dvh-170px)] flex-col gap-1.5 game-dock rounded-xl p-2 border border-amber-500/40 bg-[#081220]/85 backdrop-blur-md shadow-2xl overflow-hidden">
              <div className="border-b border-amber-500/30 pb-1 font-cinzel font-bold text-[10px] sm:text-[11px] text-amber-200 flex items-center justify-between shrink-0">
                <span>Rearguard Captains</span>
                <span className="text-[9px] font-mono text-amber-400 font-bold">{Math.max(0, room.players.length - 4)}/4</span>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-1.5 scrollbar-thin pr-0.5">
                {room.players.slice(4).map((p) => (
                  <RoomPlayerCard
                    key={p.id}
                    player={p}
                    selfId={selfId}
                    isHost={isHost}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. BOTTOM COCKPIT COMMAND DECK */}
      <RoomLobbyBottomBar
        isHost={isHost}
        isTeamMode={isTeamMode}
        isDeploying={isDeploying}
        selfPlayer={selfPlayer}
        allCaptainsReady={allCaptainsReady}
        readyCount={readyCount}
        totalCount={totalCount}
        onStartGame={onStartGame}
      />
    </div>
  );
};
