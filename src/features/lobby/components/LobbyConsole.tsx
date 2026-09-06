import React, { useState } from 'react';
import {
  Anchor,
  Swords,
  Compass,
  RefreshCw,
  Plus,
  Zap,
  Dices,
  Sun,
  Moon,
  Shield,
} from 'lucide-react';
import type { RoomInfo, MapId } from '@/types';
import { MAP_LIST } from '@/features/battle/maps';
import { RoomCard } from './RoomCard';
import { useGameStore } from '@/stores/useGameStore';
import { networkClient } from '@/services/networkClient';

export type LobbyConsoleTab = 'anchorages' | 'commission' | 'gateway';

interface LobbyConsoleProps {
  rooms: RoomInfo[];
  isRefreshing: boolean;
  activeTab: LobbyConsoleTab;
  onTabChange: (tab: LobbyConsoleTab) => void;
  onRefresh: () => void;
  onJoinRoom: (roomId: string) => void;
  onCreateRoom: (
    roomName: string,
    maxPlayers: number,
    timeOfDay: 'DAY' | 'NIGHT' | 'RANDOM',
    targetKills: number,
    gameMode: 'FFA' | 'TEAM',
    mapId: MapId
  ) => boolean;
  className?: string;
}

const PIRATE_NAMES = [
  'Tortuga Buccaneers',
  'Blackbeard Revenge',
  'Port Royal Armada',
  'Nassau Privateers',
  'Dead Man Reef',
  'Bermuda Tempest',
  'Kraken Bay Raiders',
  'Calypso Squadron',
];

export const LobbyConsole: React.FC<LobbyConsoleProps> = ({
  rooms,
  isRefreshing,
  activeTab,
  onTabChange,
  onRefresh,
  onJoinRoom,
  onCreateRoom,
  className = '',
}) => {
  // Commission Form State
  const [roomName, setRoomName] = useState(() => PIRATE_NAMES[Math.floor(Math.random() * PIRATE_NAMES.length)]);
  const maxPlayers = 16;
  const [targetKills, setTargetKills] = useState(20);
  const [timeOfDay, setTimeOfDay] = useState<'DAY' | 'NIGHT' | 'RANDOM'>('DAY');
  const [gameMode, setGameMode] = useState<'FFA' | 'TEAM'>('FFA');
  const [selectedMapId, setSelectedMapId] = useState<MapId>('caribbean');

  // Gateway Settings State
  const serverUrl = useGameStore((s) => s.serverUrl);
  const isConnected = useGameStore((s) => s.isConnected);
  const [gatewayUrl, setGatewayUrl] = useState(serverUrl);

  const handleRollDiceName = () => {
    const next = PIRATE_NAMES[Math.floor(Math.random() * PIRATE_NAMES.length)];
    setRoomName(next);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = roomName.trim() || 'Pirate Skirmish';
    onCreateRoom(name, maxPlayers, timeOfDay, targetKills, gameMode, selectedMapId);
  };

  const handleGatewaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    networkClient.reconnectWithUrl(gatewayUrl.trim());
  };

  // Quick Play: Join first open room or create one immediately
  const handleQuickPlay = () => {
    const openRoom = rooms.find((r) => r.status === 'LOBBY' && r.players.length < r.maxPlayers);
    if (openRoom) {
      onJoinRoom(openRoom.id);
    } else {
      onTabChange('commission');
    }
  };

  return (
    <div className={`w-full max-w-[340px] sm:max-w-[380px] flex flex-col game-dock rounded-xl border border-amber-500/50 shadow-2xl overflow-hidden relative ${className}`}>
      {/* Corner Accents */}
      <div className="absolute top-1 left-1 w-2 h-2 border-t-2 border-l-2 border-amber-400/80 pointer-events-none" />
      <div className="absolute top-1 right-1 w-2 h-2 border-t-2 border-r-2 border-amber-400/80 pointer-events-none" />
      <div className="absolute bottom-1 left-1 w-2 h-2 border-b-2 border-l-2 border-amber-400/80 pointer-events-none" />
      <div className="absolute bottom-1 right-1 w-2 h-2 border-b-2 border-r-2 border-amber-400/80 pointer-events-none" />

      {/* Naval Navigation Tabs */}
      <div className="flex items-center border-b border-amber-500/30 bg-black/40 p-1 gap-1 shrink-0">
        <button
          onClick={() => onTabChange('anchorages')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg font-cinzel font-bold text-[10px] sm:text-[11px] transition-all duration-150 cursor-pointer ${
            activeTab === 'anchorages'
              ? 'bg-gradient-to-b from-amber-600/40 to-amber-950/80 border border-amber-400 text-amber-100 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
              : 'text-stone-400 hover:text-amber-200 hover:bg-white/5 border border-transparent'
          }`}
        >
          <Anchor className="w-3 h-3 text-amber-400" />
          <span>Anchorages</span>
          <span className="text-[8px] font-mono px-1 rounded bg-black/60 text-amber-300 border border-amber-500/30">
            {rooms.length}
          </span>
        </button>

        <button
          onClick={() => onTabChange('commission')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg font-cinzel font-bold text-[10px] sm:text-[11px] transition-all duration-150 cursor-pointer ${
            activeTab === 'commission'
              ? 'bg-gradient-to-b from-amber-600/40 to-amber-950/80 border border-amber-400 text-amber-100 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
              : 'text-stone-400 hover:text-amber-200 hover:bg-white/5 border border-transparent'
          }`}
        >
          <Plus className="w-3 h-3 text-amber-400" />
          <span>Commission</span>
        </button>

        <button
          onClick={() => onTabChange('gateway')}
          className={`px-2.5 py-1.5 rounded-lg font-cinzel font-bold text-[10px] sm:text-[11px] transition-all duration-150 cursor-pointer flex items-center gap-1 ${
            activeTab === 'gateway'
              ? 'bg-gradient-to-b from-amber-600/40 to-amber-950/80 border border-amber-400 text-amber-100 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
              : 'text-stone-400 hover:text-amber-200 hover:bg-white/5 border border-transparent'
          }`}
          title="Server Gateway"
        >
          <Compass className="w-3 h-3 text-amber-400" />
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isConnected ? 'bg-emerald-400 shadow-[0_0_4px_rgba(16,185,129,0.8)]' : 'bg-rose-500 animate-pulse'
            }`}
          />
        </button>
      </div>

      {/* Tab Panels Body */}
      <div className="p-2 sm:p-3 overflow-y-auto max-h-[calc(100dvh-170px)] sm:max-h-[calc(100dvh-180px)] scrollbar-thin">
        {/* 1. ANCHORAGES TAB */}
        {activeTab === 'anchorages' && (
          <div className="flex flex-col gap-2">
            {/* Quick Action Ribbon */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleQuickPlay}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-gradient-to-b from-amber-400 via-amber-500 to-amber-700 hover:from-amber-300 hover:to-amber-600 text-stone-950 font-cinzel font-black text-xs uppercase tracking-wider transition-all duration-150 shadow-[0_0_12px_rgba(245,158,11,0.4)] cursor-pointer border border-amber-200/90 active:scale-95"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>Quick Battle</span>
              </button>

              <button
                onClick={onRefresh}
                disabled={isRefreshing}
                className="p-2 rounded-lg bg-black/40 border border-amber-600/40 text-amber-300 hover:text-amber-100 hover:border-amber-400 transition cursor-pointer shrink-0 group active:scale-95"
                title="Refresh Anchorage Registry"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-amber-400' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
              </button>
            </div>

            {/* Room List or Empty State */}
            {rooms.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-4 text-center rounded-lg bg-[#0a1422]/60 border border-dashed border-amber-500/30 gap-2 mt-1">
                <Anchor className="w-7 h-7 text-amber-400/40 stroke-[1.5]" />
                <div>
                  <h3 className="font-cinzel font-bold text-amber-200 text-xs uppercase tracking-wider">
                    No Fleets at Anchor
                  </h3>
                  <p className="text-[9px] font-fell italic text-stone-400 mt-0.5">
                    The horizon is calm. Commission a new armada to lead the charge.
                  </p>
                </div>
                <button
                  onClick={() => onTabChange('commission')}
                  className="mt-1 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-cinzel font-bold text-[10px] uppercase tracking-wider border border-amber-500/40 transition cursor-pointer"
                >
                  <Plus className="w-3 h-3 stroke-[2.5]" />
                  <span>Commission Fleet</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {rooms.map((room) => (
                  <RoomCard
                    key={room.id}
                    room={room}
                    onJoin={onJoinRoom}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* 2. COMMISSION TAB (Inline Create Room) */}
        {activeTab === 'commission' && (
          <form onSubmit={handleCreateSubmit} className="flex flex-col gap-2 sm:gap-2.5 text-amber-100">
            {/* Room Name */}
            <div>
              <div className="flex items-center justify-between mb-0.5">
                <label className="text-[9px] font-cinzel font-bold text-amber-300 uppercase tracking-wider">
                  Anchorage Name
                </label>
                <button
                  type="button"
                  onClick={handleRollDiceName}
                  className="flex items-center gap-1 text-[8.5px] font-cinzel text-amber-400/90 hover:text-amber-200 transition cursor-pointer"
                >
                  <Dices className="w-2.5 h-2.5" />
                  <span>Random</span>
                </button>
              </div>
              <input
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="Tortuga Buccaneers"
                className="w-full bg-[#0a1524] border border-amber-500/40 rounded-lg px-2.5 py-1.5 font-fell text-xs text-amber-100 placeholder:text-stone-500 focus:outline-none focus:border-amber-400 transition"
                maxLength={24}
                required
              />
            </div>

            {/* Game Mode Selector */}
            <div>
              <label className="block text-[9px] font-cinzel font-bold text-amber-300 uppercase tracking-wider mb-0.5">
                Battle Engagement Mode
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setGameMode('FFA')}
                  className={`py-1.5 px-2 rounded-lg border text-center font-cinzel font-bold text-[10px] transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    gameMode === 'FFA'
                      ? 'bg-amber-500/25 border-amber-400 text-amber-100 ring-1 ring-amber-400/50'
                      : 'bg-black/30 border-amber-600/30 text-stone-400 hover:text-amber-200'
                  }`}
                >
                  <Swords className="w-3 h-3 text-amber-400" />
                  <span>Free-for-All</span>
                </button>

                <button
                  type="button"
                  onClick={() => setGameMode('TEAM')}
                  className={`py-1.5 px-2 rounded-lg border text-center font-cinzel font-bold text-[10px] transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    gameMode === 'TEAM'
                      ? 'bg-sky-500/25 border-sky-400 text-sky-100 ring-1 ring-sky-400/50'
                      : 'bg-black/30 border-amber-600/30 text-stone-400 hover:text-sky-200'
                  }`}
                >
                  <Shield className="w-3 h-3 text-sky-400" />
                  <span>Team Deathmatch</span>
                </button>
              </div>
            </div>

            {/* Map Theater Selector */}
            <div>
              <label className="block text-[9px] font-cinzel font-bold text-amber-300 uppercase tracking-wider mb-0.5">
                Naval Theater
              </label>
              <div className="grid grid-cols-3 gap-1">
                {MAP_LIST.map((m) => {
                  const isSelected = selectedMapId === m.id;
                  return (
                    <button
                      type="button"
                      key={m.id}
                      onClick={() => setSelectedMapId(m.id)}
                      className={`py-1 px-1.5 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center ${
                        isSelected
                          ? 'bg-amber-600/30 border-amber-400 text-amber-100 shadow-[0_0_8px_rgba(245,158,11,0.3)] ring-1 ring-amber-300'
                          : 'bg-black/30 border-amber-600/30 text-stone-400 hover:text-amber-200'
                      }`}
                    >
                      <span className="font-cinzel font-bold text-[9px] truncate w-full">{m.name}</span>
                      <span className="text-[7.5px] font-mono text-amber-400/70">{m.tacticalTag}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Kill Target */}
            <div>
              <label className="block text-[8.5px] font-cinzel font-bold text-amber-300 uppercase tracking-wider mb-0.5">
                Target Sinks
              </label>
              <div className="grid grid-cols-3 gap-1">
                {[20, 50, 100].map((num) => (
                  <button
                    type="button"
                    key={num}
                    onClick={() => setTargetKills(num)}
                    className={`py-1 rounded font-mono font-bold text-[9px] border transition-all cursor-pointer ${
                      targetKills === num
                        ? 'bg-amber-500/30 border-amber-400 text-white'
                        : 'bg-black/30 border-amber-600/30 text-stone-400 hover:text-white'
                    }`}
                  >
                    {num} Sinks
                  </button>
                ))}
              </div>
            </div>

            {/* Time of Day */}
            <div>
              <label className="block text-[8.5px] font-cinzel font-bold text-amber-300 uppercase tracking-wider mb-0.5">
                Engagement Hour
              </label>
              <div className="grid grid-cols-3 gap-1">
                {(['DAY', 'NIGHT', 'RANDOM'] as const).map((tod) => (
                  <button
                    type="button"
                    key={tod}
                    onClick={() => setTimeOfDay(tod)}
                    className={`py-1 px-1 rounded-lg border text-center font-cinzel font-bold text-[8.5px] uppercase transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      timeOfDay === tod
                        ? 'bg-amber-500/30 border-amber-400 text-amber-100'
                        : 'bg-black/30 border-amber-600/30 text-stone-400 hover:text-white'
                    }`}
                  >
                    {tod === 'DAY' && <Sun className="w-2.5 h-2.5 text-amber-400" />}
                    {tod === 'NIGHT' && <Moon className="w-2.5 h-2.5 text-indigo-400" />}
                    {tod === 'RANDOM' && <Dices className="w-2.5 h-2.5 text-emerald-400" />}
                    <span>{tod}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="mt-1 w-full py-2.5 rounded-lg bg-gradient-to-b from-amber-400 via-amber-500 to-amber-700 hover:from-amber-300 hover:to-amber-600 text-stone-950 font-cinzel font-black text-xs uppercase tracking-wider transition-all duration-150 shadow-[0_0_14px_rgba(245,158,11,0.45)] cursor-pointer border border-amber-200/90 flex items-center justify-center gap-1.5 active:scale-95"
            >
              <Swords className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>SET SAIL & COMMISSION</span>
            </button>
          </form>
        )}

        {/* 3. GATEWAY TAB */}
        {activeTab === 'gateway' && (
          <form onSubmit={handleGatewaySubmit} className="flex flex-col gap-2.5 text-amber-100">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[9px] font-cinzel font-bold text-amber-300 uppercase tracking-wider">
                  WebSocket Beacon URI
                </label>
                <div className="flex items-center gap-1">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isConnected ? 'bg-emerald-400' : 'bg-rose-500 animate-pulse'
                    }`}
                  />
                  <span className="text-[8.5px] font-mono text-amber-300/80 font-bold">
                    {isConnected ? 'CONNECTED' : 'OFFLINE'}
                  </span>
                </div>
              </div>
              <input
                type="text"
                value={gatewayUrl}
                onChange={(e) => setGatewayUrl(e.target.value)}
                placeholder="wss://naval-combat.cekcok.my.id/ws"
                className="w-full bg-[#0a1524] border border-amber-500/40 rounded-lg px-2.5 py-1.5 font-mono text-xs text-amber-100 placeholder:text-stone-500 focus:outline-none focus:border-amber-400 transition"
              />
            </div>

            {/* Station Presets */}
            <div>
              <label className="block text-[8.5px] font-cinzel font-bold text-amber-300 uppercase tracking-wider mb-1">
                Station Presets
              </label>
              <div className="flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => setGatewayUrl('wss://naval-combat.cekcok.my.id/ws')}
                  className="p-2 rounded-lg bg-black/30 hover:bg-black/50 border border-amber-600/30 hover:border-amber-400 transition cursor-pointer text-left flex items-center justify-between"
                >
                  <div>
                    <div className="font-cinzel font-bold text-[10px] text-amber-100">Global Cloud Admiralty</div>
                    <div className="font-mono text-[8px] text-amber-400/70 truncate">wss://naval-combat.cekcok.my.id/ws</div>
                  </div>
                  <span className="text-[8px] font-cinzel font-bold px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    PUBLIC
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setGatewayUrl('ws://localhost:3001/ws')}
                  className="p-2 rounded-lg bg-black/30 hover:bg-black/50 border border-amber-600/30 hover:border-amber-400 transition cursor-pointer text-left flex items-center justify-between"
                >
                  <div>
                    <div className="font-cinzel font-bold text-[10px] text-amber-100">Local Naval Station</div>
                    <div className="font-mono text-[8px] text-amber-400/70 truncate">ws://localhost:3001/ws</div>
                  </div>
                  <span className="text-[8px] font-cinzel font-bold px-1 py-0.2 rounded bg-stone-800 text-stone-300 border border-stone-600">
                    DEV
                  </span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="mt-1 w-full py-2 rounded-lg bg-gradient-to-b from-amber-500 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-stone-950 font-cinzel font-black text-xs uppercase tracking-wider transition-all duration-150 shadow-lg cursor-pointer border border-amber-300/80 active:scale-95"
            >
              Re-establish Beacon Link
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
