import React, { useState } from 'react';
import {
  CheckCircle,
  LogOut,
  Loader2,
  Hourglass,
  Anchor,
  Shield,
  Bot,
  Trash2,
  Users,
  Compass,
  Swords,
  ChevronDown,
} from 'lucide-react';
import { networkClient } from '@/services/networkClient';
import type { RoomInfo, RoomPlayer, ShipClass } from '@/types';
import { SHIP_PRESETS } from '@/types';
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
  const [showShipPicker, setShowShipPicker] = useState(false);
  const canAddBot = isHost && room.players.length < room.maxPlayers;
  const isTeamMode = room.gameMode === 'TEAM';
  const activeMap = getMapConfig(room.mapId);

  const [mobileTeamTab, setMobileTeamTab] = useState<'red' | 'blue'>(() => {
    return selfPlayer?.team === 'blue' ? 'blue' : 'red';
  });

  const currentShipClass = selfPlayer?.shipClass || 'brig';
  const currentShipConfig = SHIP_PRESETS[currentShipClass] || SHIP_PRESETS.brig;

  const handleSelectShip = (cls: ShipClass) => {
    networkClient.selectShip(cls);
    setShowShipPicker(false);
  };

  // Group players by team in Team Mode
  const redPlayers = room.players.filter((p) => p.team === 'red');
  const bluePlayers = room.players.filter((p) => p.team === 'blue');
  const maxPerTeam = Math.max(1, Math.floor(room.maxPlayers / 2));

  const renderPlayerCard = (p: RoomPlayer, isRedTeam?: boolean, isBlueTeam?: boolean) => {
    const isMe = p.id === selfId;

    return (
      <div
        key={p.id}
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

  return (
    <div className="w-full h-full flex flex-col justify-between pointer-events-none p-1 sm:p-2.5 z-10 select-none relative">
      {/* 1. TOP STAGING COMMAND BAR */}
      <div className="pointer-events-auto w-full flex items-center justify-between gap-1.5 sm:gap-2 p-1.5 sm:p-2.5 rounded-xl game-dock border border-amber-500/40 bg-[#07101c]/90 backdrop-blur-md shadow-xl shrink-0">
        {/* Left: Anchorage Identity & Mode */}
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <div className="p-1 sm:p-1.5 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-300 shrink-0">
            <Anchor className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
              <h2 className="font-cinzel font-black text-[11px] sm:text-base md:text-lg text-amber-100 gold-emboss truncate max-w-[120px] xs:max-w-[160px] sm:max-w-none">
                {room.name}
              </h2>
              <span
                className={`text-[7px] sm:text-[9px] font-cinzel font-bold px-1.5 py-0.2 rounded border shadow-sm ${
                  isTeamMode
                    ? 'bg-cyan-950/80 text-cyan-300 border-cyan-500/60'
                    : 'bg-amber-950/80 text-amber-300 border-amber-500/50'
                }`}
              >
                {isTeamMode ? 'TEAM' : 'FFA'} • {room.targetKills || 5} SINKS
              </span>
            </div>
            <p className="hidden xs:block text-[8px] sm:text-[10px] font-fell italic text-amber-200/70 truncate mt-0.5">
              Commodore's Staging Wardroom • {room.players.length}/{room.maxPlayers} Captains
            </p>
          </div>
        </div>

        {/* Center: Theater & Map Controls */}
        <div className="hidden lg:flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/40 border border-amber-500/30 text-amber-200 text-xs font-cinzel font-bold">
            <Compass className="w-3.5 h-3.5 text-amber-400" />
            <span>{activeMap.name}</span>
          </div>

          {isHost && (
            <div className="flex items-center gap-1">
              {MAP_LIST.map((m) => (
                <button
                  key={m.id}
                  onClick={() => networkClient.setMap(m.id)}
                  className={`px-2 py-1 rounded text-[9px] font-cinzel font-bold border transition cursor-pointer ${
                    (room.mapId || 'caribbean') === m.id
                      ? 'bg-amber-500/30 border-amber-400 text-amber-100 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
                      : 'bg-black/30 border-amber-600/30 text-stone-400 hover:text-amber-200'
                  }`}
                >
                  {m.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Host Bot Add & Retreat Actions */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {isHost && (
            <button
              onClick={() => networkClient.addBot()}
              disabled={!canAddBot}
              className={`flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg font-cinzel font-bold text-[9px] sm:text-xs tracking-wider transition border shadow ${
                canAddBot
                  ? 'bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-200 border-cyan-400/60 shadow-[0_0_10px_rgba(6,182,212,0.3)] cursor-pointer active:scale-95'
                  : 'bg-stone-900/60 text-stone-600 border-stone-800 cursor-not-allowed'
              }`}
              title="Add Corsair AI Bot"
            >
              <Bot className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-cyan-300" />
              <span>+ Bot</span>
            </button>
          )}

          <button
            onClick={onLeaveRoom}
            className="flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-950/80 border border-rose-600/50 text-rose-300 hover:text-white transition cursor-pointer text-[9px] sm:text-xs font-cinzel font-bold tracking-wider shadow active:scale-95"
          >
            <LogOut className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span className="hidden xs:inline">Abandon</span>
          </button>
        </div>
      </div>

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
                {redPlayers.map((p) => renderPlayerCard(p, true, false))}
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
                {bluePlayers.map((p) => renderPlayerCard(p, false, true))}
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
                {(window.innerWidth < 768 ? room.players : room.players.slice(0, 4)).map((p) =>
                  renderPlayerCard(p)
                )}
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
                {room.players.slice(4).map((p) => renderPlayerCard(p))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. BOTTOM COCKPIT COMMAND DECK */}
      <div className="pointer-events-auto w-full flex flex-col sm:flex-row items-center justify-between gap-1.5 sm:gap-2 p-1.5 sm:p-2.5 rounded-xl game-dock border border-amber-500/50 bg-[#060e18]/95 backdrop-blur-md shadow-2xl shrink-0">
        {/* Left / Top Mobile: Warship Picker & Ready Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto justify-between sm:justify-start">
          {/* Warship Picker Dropdown */}
          <div className="relative shrink min-w-0">
            <button
              onClick={() => setShowShipPicker((prev) => !prev)}
              disabled={selfPlayer?.isReady}
              className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-2 rounded-lg border transition-all cursor-pointer ${
                selfPlayer?.isReady
                  ? 'bg-black/40 border-stone-800 text-stone-500 cursor-not-allowed'
                  : 'bg-black/50 border-amber-500/40 hover:border-amber-400 text-amber-100 hover:bg-[#122238] shadow active:scale-95'
              }`}
              title="Change your chosen warship before readying up"
            >
              <Shield className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400 shrink-0" />
              <div className="text-left min-w-0">
                <div className="text-[7px] sm:text-[8px] font-cinzel font-bold text-amber-400/80 uppercase">Active Vessel</div>
                <div className="font-cinzel font-black text-[11px] sm:text-xs text-white capitalize truncate max-w-[80px] sm:max-w-none">
                  {currentShipConfig.name}
                </div>
              </div>
              <ChevronDown className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400 shrink-0 ml-0.5" />
            </button>

            {/* Quick Ship Selection Popover */}
            {showShipPicker && (
              <div className="absolute bottom-full left-0 mb-2 w-56 sm:w-64 p-1.5 sm:p-2 rounded-xl game-dock border border-amber-500/60 bg-[#071322]/98 shadow-2xl z-50 flex flex-col gap-1 max-h-48 sm:max-h-56 overflow-y-auto scrollbar-thin">
                <div className="text-[8.5px] sm:text-[9px] font-cinzel font-bold text-amber-300 uppercase pb-1 border-b border-amber-500/30">
                  Select Fleet Vessel
                </div>
                {(Object.keys(SHIP_PRESETS) as ShipClass[]).map((cls) => {
                  const cfg = SHIP_PRESETS[cls];
                  const isSelected = cls === currentShipClass;
                  return (
                    <button
                      key={cls}
                      onClick={() => handleSelectShip(cls)}
                      className={`flex items-center justify-between p-1.5 rounded-lg border text-left transition cursor-pointer ${
                        isSelected
                          ? 'bg-amber-600/40 border-amber-400 text-white shadow'
                          : 'bg-black/30 border-amber-600/20 hover:border-amber-400 text-amber-100 hover:bg-white/5'
                      }`}
                    >
                      <span className="font-cinzel font-bold text-[11px] sm:text-xs capitalize">{cfg.name}</span>
                      <span className="text-[8px] sm:text-[9px] font-mono text-amber-300 font-bold">{cfg.cannonsPerSide * 2} Guns</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Team Switch & Ready Action */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {isTeamMode && (
              <button
                onClick={() => networkClient.switchTeam()}
                disabled={isDeploying}
                className={`flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-2 rounded-lg font-cinzel font-bold text-[10px] sm:text-xs uppercase tracking-wider transition border shadow active:scale-95 cursor-pointer ${
                  selfPlayer?.team === 'red'
                    ? 'bg-rose-950/80 border-rose-500/60 text-rose-200 hover:bg-rose-900/80'
                    : 'bg-cyan-950/80 border-cyan-500/60 text-cyan-200 hover:bg-cyan-900/80'
                }`}
                title="Switch fleet color"
              >
                <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span>{selfPlayer?.team === 'red' ? 'Blue' : 'Red'}</span>
              </button>
            )}

            <button
              onClick={() => networkClient.setReady(!selfPlayer?.isReady)}
              disabled={isDeploying}
              className={`flex items-center justify-center gap-1 sm:gap-1.5 px-3 sm:px-6 py-1 sm:py-2 rounded-lg font-cinzel font-black text-[10.5px] sm:text-xs uppercase tracking-wider transition-all border shadow-lg cursor-pointer active:scale-95 ${
                selfPlayer?.isReady
                  ? 'bg-emerald-600/40 hover:bg-emerald-600/60 border-emerald-400 text-emerald-100 shadow-[0_0_15px_rgba(16,185,129,0.4)] ring-1 ring-emerald-300'
                  : 'bg-gradient-to-b from-amber-600/40 to-amber-950/90 hover:from-amber-500/50 hover:to-amber-900 border-amber-400/80 text-amber-100 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
              }`}
            >
              <CheckCircle className={`w-3.5 h-3.5 ${selfPlayer?.isReady ? 'text-emerald-300' : 'text-amber-400'}`} />
              <span>{selfPlayer?.isReady ? 'Ready!' : 'Sign Ready'}</span>
            </button>
          </div>
        </div>

        {/* Right / Bottom Mobile: Host Launch Battle CTA */}
        {isHost ? (
          <div className="flex flex-col sm:items-end gap-0.5 w-full sm:w-auto">
            <button
              onClick={onStartGame}
              disabled={isDeploying}
              className={`w-full sm:w-auto flex items-center justify-center gap-1.5 sm:gap-2 px-4 sm:px-8 py-1.5 sm:py-2.5 rounded-lg font-cinzel font-black text-[11px] sm:text-xs uppercase tracking-[0.12em] sm:tracking-[0.15em] transition-all shadow-xl cursor-pointer border active:scale-95 ${
                isDeploying
                  ? 'bg-amber-900 text-stone-950 cursor-wait opacity-90 border-amber-700'
                  : allCaptainsReady
                  ? 'bg-gradient-to-b from-amber-300 via-amber-500 to-amber-700 hover:from-amber-200 hover:to-amber-600 text-stone-950 border-amber-200/90 shadow-[0_0_25px_rgba(245,158,11,0.6)] animate-pulse'
                  : 'bg-stone-900/90 text-stone-400 border-stone-800 hover:border-amber-600/40 hover:text-amber-200'
              }`}
            >
              {isDeploying ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-stone-950" />
                  <span>Deploying…</span>
                </>
              ) : (
                <>
                  <Swords className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>WEIGH ANCHOR & ENGAGE</span>
                </>
              )}
            </button>
            <span className="text-[7.5px] sm:text-[8.5px] font-fell italic text-amber-200/60 text-center sm:text-right">
              {readyCount} of {totalCount} Captains Prepared
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-1.5 text-[10px] sm:text-xs font-fell italic text-amber-300/80 px-2.5 py-1 rounded-lg border border-amber-600/30 bg-black/40 w-full sm:w-auto">
            <Loader2 className="w-3 h-3 animate-spin text-amber-400 shrink-0" />
            <span>Awaiting Commodore's signal gun…</span>
          </div>
        )}
      </div>
    </div>
  );
};
