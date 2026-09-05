import React, { useState } from 'react';
import {
  Anchor,
  Compass,
  Plus,
  Play,
  CheckCircle,
  Users,
  Swords,
  LogOut,
  RefreshCw,
  Shield,
  Zap,
  Loader2,
  Clock,
} from 'lucide-react';
import { useGameStore } from '@/stores/useGameStore';
import { useToastStore } from '@/stores/useToastStore';
import { networkClient } from '@/services/networkClient';
import { SHIP_PRESETS, type ShipClass } from '@/types/game';
import { ShipTurntable3D } from './ShipTurntable3D';

export const LobbyView: React.FC = () => {
  const playerName = useGameStore((s) => s.playerName);
  const selectedShip = useGameStore((s) => s.selectedShip);
  const setPlayerName = useGameStore((s) => s.setPlayerName);
  const availableRooms = useGameStore((s) => s.availableRooms);
  const currentRoom = useGameStore((s) => s.currentRoom);
  const selfId = useGameStore((s) => s.selfId);
  const isConnected = useGameStore((s) => s.isConnected);
  const serverUrl = useGameStore((s) => s.serverUrl);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showServerModal, setShowServerModal] = useState(false);
  const [inputServerUrl, setInputServerUrl] = useState(serverUrl);
  const [newRoomName, setNewRoomName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    networkClient.refreshRooms();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const currentShipConfig = SHIP_PRESETS[selectedShip];
  const selfPlayer = currentRoom?.players.find((p) => p.id === selfId);
  const isHost = selfPlayer?.isHost ?? false;

  const [isDeploying, setIsDeploying] = useState(false);

  const otherPlayers = currentRoom?.players.filter((p) => p.id !== selfId) ?? [];
  const hasOtherPlayers = otherPlayers.length > 0;
  // All other captains must be ready. If solo, host can start immediately.
  const allCaptainsReady =
    currentRoom &&
    currentRoom.players.length > 0 &&
    (hasOtherPlayers ? otherPlayers.every((p) => p.isReady) : true);
  const readyCount = currentRoom?.players.filter((p) => p.isReady).length ?? 0;
  const totalCount = currentRoom?.players.length ?? 0;

  const handleStartGame = () => {
    if (!allCaptainsReady) {
      const unreadyNames = otherPlayers.filter((p) => !p.isReady).map((p) => p.name).join(', ');
      useToastStore.getState().warning(
        `Menunggu semua captain siap (${unreadyNames || 'Captain'} belum Ready)!`,
        'Captains Not Ready'
      );
      return;
    }
    setIsDeploying(true);
    networkClient.startGame();

    // Safety timeout in case server responds slowly
    setTimeout(() => {
      setIsDeploying(false);
    }, 7000);
  };

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) {
      useToastStore.getState().warning('Nama fleet armada tidak boleh kosong!', 'Input Diperlukan');
      return;
    }
    if (!playerName.trim()) {
      useToastStore.getState().warning('Harap tentukan Nama Captain Anda terlebih dahulu!', 'Nama Captain Diperlukan');
      return;
    }
    networkClient.createRoom(newRoomName.trim(), maxPlayers);
    setShowCreateModal(false);
    setNewRoomName('');
  };

  return (
    <div className="w-full h-full min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-between p-6 relative overflow-x-hidden">
      {/* Background Ambience / Gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#0c2538_0%,#020617_70%)] pointer-events-none" />

      {/* Header Bar */}
      <header className="w-full max-w-7xl flex items-center justify-between z-10 py-2 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
            <Compass className="w-7 h-7 animate-spin [animation-duration:30s]" />
          </div>
          <div>
            <h1 className="font-cinzel text-2xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500">
              NAVAL COMBAT ONLINE
            </h1>
            <p className="text-xs text-slate-400 font-medium tracking-wide">
              Real-time 3D High Seas Tactical Warfare
            </p>
          </div>
        </div>

        {/* Server Switcher & Status Badge */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs">
            <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
            <span className="text-slate-300 font-semibold">{isConnected ? 'Server Connected' : 'Connecting...'}</span>
          </div>

          <button
            onClick={() => setShowServerModal(true)}
            className="px-2.5 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 font-medium flex items-center gap-1.5 transition cursor-pointer"
            title="Configure Server Endpoint"
          >
            <span className="text-[10px] text-cyan-400 font-mono">
              {serverUrl.includes('cekcok') ? 'Test Server' : serverUrl ? 'Custom' : 'Local :3000'}
            </span>
          </button>
        </div>
      </header>

      {/* Main Content Layout */}
      <main className="w-full max-w-7xl flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 my-6 z-10 items-stretch">
        {/* Left: Captain Profile & Ship Selection Turntable (7 Cols) */}
        <section className="lg:col-span-7 flex flex-col gap-4 glass-panel rounded-3xl p-6 border border-slate-800 shadow-2xl">
          {/* Captain Name input */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">COMMANDER IDENT</span>
              <div className="flex items-center gap-2 mt-0.5">
                <Anchor className="w-4 h-4 text-amber-400" />
                <input
                  type="text"
                  value={playerName}
                  maxLength={20}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="bg-slate-900/90 border border-slate-700 text-slate-100 font-bold px-3 py-1.5 rounded-xl text-sm focus:outline-none focus:border-amber-400 transition"
                  placeholder="Enter Captain Name..."
                />
              </div>
            </div>

            {/* Ship Class Picker Tabs */}
            <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-2xl border border-slate-800">
              {(['sloop', 'brig', 'frigate'] as ShipClass[]).map((cls) => (
                <button
                  key={cls}
                  onClick={() => networkClient.selectShip(cls)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase transition tracking-wider ${
                    selectedShip === cls
                      ? 'bg-amber-500 text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  {cls}
                </button>
              ))}
            </div>
          </div>

          {/* 3D Turntable Preview */}
          <div className="w-full h-64 sm:h-72 rounded-2xl bg-gradient-to-b from-slate-900/60 to-slate-950/90 border border-slate-800 relative overflow-hidden flex items-center justify-center">
            <ShipTurntable3D shipClass={selectedShip} />

            <div className="absolute top-3 left-3 flex flex-col pointer-events-none">
              <span className="font-cinzel text-lg font-bold text-amber-300">{currentShipConfig.name}</span>
              <span className="text-xs text-slate-400">{currentShipConfig.subtitle}</span>
            </div>
          </div>

          {/* Ship Specifications */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800/90 flex flex-col">
              <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                <Shield className="w-3 h-3 text-emerald-400" /> MAX HEALTH
              </span>
              <span className="font-mono text-base font-black text-emerald-400 mt-1">
                {currentShipConfig.maxHealth} HP
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800/90 flex flex-col">
              <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                <Zap className="w-3 h-3 text-cyan-400" /> TOP SPEED
              </span>
              <span className="font-mono text-base font-black text-cyan-400 mt-1">
                {currentShipConfig.topSpeed} KTS
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800/90 flex flex-col">
              <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                <Swords className="w-3 h-3 text-amber-400" /> BROADSIDE
              </span>
              <span className="font-mono text-base font-black text-amber-400 mt-1">
                {currentShipConfig.cannonsPerSide * 2} Guns
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800/90 flex flex-col">
              <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                <RefreshCw className="w-3 h-3 text-violet-400" /> RELOAD TIME
              </span>
              <span className="font-mono text-base font-black text-violet-400 mt-1">
                {currentShipConfig.reloadTime}s
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-400 italic px-1">{currentShipConfig.description}</p>
        </section>

        {/* Right: Room Browser / Current Room Fleet Hangar (5 Cols) */}
        <section className="lg:col-span-5 flex flex-col gap-4 glass-panel rounded-3xl p-6 border border-slate-800 shadow-2xl">
          {currentRoom ? (
            /* INSIDE A ROOM */
            <div className="flex flex-col h-full justify-between gap-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">
                      ACTIVE SQUADRON
                    </span>
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      REALTIME
                    </span>
                  </div>
                  <h3 className="font-cinzel text-xl font-bold text-slate-100 mt-0.5">{currentRoom.name}</h3>
                </div>
                <button
                  onClick={() => networkClient.leaveRoom()}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-rose-950/60 border border-slate-800 hover:border-rose-700 text-slate-400 hover:text-rose-300 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                  title="Leave Room"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Leave</span>
                </button>
              </div>

              {/* Player Fleet Roster */}
              <div className="flex-1 flex flex-col gap-2 overflow-y-auto max-h-72 pr-1">
                <span className="text-xs text-slate-400 font-semibold flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span>CAPTAINS IN FORMATION</span>
                    <span className="text-[10px] text-emerald-400 font-normal">(Live Auto-Sync)</span>
                  </span>
                  <span className="font-mono">
                    {currentRoom.players.length} / {currentRoom.maxPlayers}
                  </span>
                </span>

                {currentRoom.players.map((p) => (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition ${
                      p.id === selfId
                        ? 'bg-slate-900/90 border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.15)]'
                        : 'bg-slate-950/80 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold font-cinzel text-amber-300">
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                          {p.name}
                          {p.id === selfId && (
                            <span className="text-[9px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.2 rounded border border-cyan-500/40">
                              YOU
                            </span>
                          )}
                          {p.isHost && (
                            <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded border border-amber-500/40 font-black">
                              HOST
                            </span>
                          )}
                        </span>
                        <span className="text-[10px] text-slate-400 uppercase">
                          {p.shipClass} Class
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {p.isReady ? (
                        <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" /> Ready
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-500">Preparing...</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Ready / Start Actions */}
              <div className="flex flex-col gap-2 pt-2 border-t border-slate-800">
                <button
                  onClick={() => networkClient.setReady(!selfPlayer?.isReady)}
                  className={`w-full py-3 rounded-2xl font-bold text-sm tracking-wide transition border active:scale-98 cursor-pointer ${
                    selfPlayer?.isReady
                      ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500/50 hover:bg-emerald-600/40'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                  }`}
                >
                  {selfPlayer?.isReady ? 'READY FOR BATTLE (CLICK TO CANCEL)' : 'READY UP'}
                </button>

                {isHost && (
                  <button
                    onClick={handleStartGame}
                    disabled={!allCaptainsReady || isDeploying}
                    className={`w-full py-3.5 rounded-2xl font-black text-sm tracking-wider flex items-center justify-center gap-2 shadow-lg transition active:scale-98 cursor-pointer ${
                      isDeploying
                        ? 'bg-amber-600 text-slate-950 cursor-wait'
                        : allCaptainsReady
                        ? 'bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 text-slate-950 shadow-[0_0_25px_rgba(245,158,11,0.5)] hover:brightness-110 active:scale-95'
                        : 'bg-slate-850 text-slate-400 border border-slate-750 cursor-not-allowed opacity-80'
                    }`}
                  >
                    {isDeploying ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                        <span>COMMENCING HIGH SEAS ENGAGEMENT...</span>
                      </>
                    ) : allCaptainsReady ? (
                      <>
                        <Play className="w-4 h-4 fill-current" />
                        <span>SET SAIL & COMMENCE BATTLE</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
                        <span>
                          WAITING FOR ALL CAPTAINS TO READY ({readyCount}/{totalCount})
                        </span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* ROOM BROWSER */
            <div className="flex flex-col h-full justify-between gap-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">
                      FLEET ENGAGEMENTS
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      LIVE
                    </span>
                  </div>
                  <h3 className="font-cinzel text-xl font-bold text-slate-100">Battle Arenas</h3>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500/50 text-slate-300 hover:text-cyan-300 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer active:scale-95 disabled:opacity-60"
                    title="Refresh Fleet List"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
                    <span>Refresh</span>
                  </button>

                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg transition active:scale-95 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Fleet</span>
                  </button>
                </div>
              </div>

              {/* Rooms List */}
              <div className="flex-1 flex flex-col gap-2.5 overflow-y-auto max-h-80 pr-1">
                {availableRooms.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-center text-slate-500 gap-2">
                    <Swords className="w-8 h-8 opacity-40" />
                    <p className="text-xs">No active fleet battles found.</p>
                    <p className="text-[11px] text-slate-600">Commission a new fleet to invite captains!</p>
                  </div>
                ) : (
                  availableRooms.map((room) => (
                    <div
                      key={room.id}
                      className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 flex items-center justify-between transition"
                    >
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-200">{room.name}</span>
                        <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3 text-cyan-400" />
                            {room.players.length} / {room.maxPlayers}
                          </span>
                          <span
                            className={`font-semibold ${
                              room.status === 'IN_GAME'
                                ? 'text-amber-400'
                                : room.status === 'FINISHED'
                                ? 'text-slate-500'
                                : 'text-emerald-400'
                            }`}
                          >
                            {room.status === 'IN_GAME' ? 'In Battle' : room.status}
                          </span>
                        </div>
                      </div>

                      <button
                        disabled={room.status === 'FINISHED' || room.players.length >= room.maxPlayers}
                        onClick={() => networkClient.joinRoom(room.id)}
                        className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition active:scale-95 cursor-pointer ${
                          room.status === 'IN_GAME'
                            ? 'bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400 text-slate-950'
                            : 'bg-cyan-600 hover:bg-cyan-500 text-white'
                        } disabled:bg-slate-800 disabled:text-slate-600`}
                      >
                        {room.status === 'IN_GAME' ? 'Join Battle (Live)' : 'Join Battle'}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Footer Instructions */}
      <footer className="w-full max-w-7xl z-10 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 border-t border-slate-800/80 pt-3">
        <span>Controls: [W / S] Sails • [A / D] Rudder • [Q] Port Broadside • [E] Starboard Broadside</span>
        <span>Built with React 19, Three.js & uWebSockets.js</span>
      </footer>

      {/* Create Room Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="glass-panel max-w-sm w-full rounded-3xl p-6 border border-slate-700 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in duration-200">
            <h3 className="font-cinzel text-lg font-bold text-slate-100">Commission Fleet Room</h3>

            <form onSubmit={handleCreateRoom} className="flex flex-col gap-3">
              <div>
                <label className="text-xs text-slate-400 font-semibold">FLEET ARENA NAME</label>
                <input
                  type="text"
                  required
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  placeholder="e.g. Caribbean Clash #1"
                  className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold">MAX CAPTAINS (2 - 8)</label>
                <select
                  value={maxPlayers}
                  onChange={(e) => setMaxPlayers(parseInt(e.target.value, 10))}
                  className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-400"
                >
                  <option value={2}>2 Captains (Duel)</option>
                  <option value={4}>4 Captains (Squadron)</option>
                  <option value={6}>6 Captains (Flotilla)</option>
                  <option value={8}>8 Captains (Armada)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg"
                >
                  Create & Enter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Server Endpoint Configuration Modal */}
      {showServerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="glass-panel max-w-md w-full rounded-3xl p-6 border border-slate-700 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in duration-200">
            <h3 className="font-cinzel text-lg font-bold text-slate-100">Server Connection Target</h3>
            <p className="text-xs text-slate-400">
              Select which backend server to connect to while running in development mode (<code className="text-amber-300 font-mono">pnpm run dev</code>).
            </p>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  networkClient.reconnectWithUrl('');
                  setShowServerModal(false);
                }}
                className={`p-3 rounded-2xl border text-left flex flex-col gap-1 transition ${
                  !serverUrl
                    ? 'bg-cyan-950/60 border-cyan-500 text-cyan-200'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'
                }`}
              >
                <span className="text-xs font-bold flex items-center justify-between">
                  <span>Local Dev Server</span>
                  {!serverUrl && <span className="text-[10px] bg-cyan-800 px-1.5 py-0.5 rounded">ACTIVE</span>}
                </span>
                <span className="text-[11px] font-mono text-slate-400">ws://localhost:3000/ws (via Vite proxy)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  networkClient.reconnectWithUrl('wss://naval-combat.cekcok.my.id/ws');
                  setShowServerModal(false);
                }}
                className={`p-3 rounded-2xl border text-left flex flex-col gap-1 transition ${
                  serverUrl === 'wss://naval-combat.cekcok.my.id/ws'
                    ? 'bg-cyan-950/60 border-cyan-500 text-cyan-200'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'
                }`}
              >
                <span className="text-xs font-bold flex items-center justify-between">
                  <span>Homelab Remote Test Server</span>
                  {serverUrl === 'wss://naval-combat.cekcok.my.id/ws' && (
                    <span className="text-[10px] bg-cyan-800 px-1.5 py-0.5 rounded">ACTIVE</span>
                  )}
                </span>
                <span className="text-[11px] font-mono text-slate-400">wss://naval-combat.cekcok.my.id/ws</span>
              </button>

              <div className="pt-2 border-t border-slate-800">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Or Custom WebSocket URL</label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="text"
                    value={inputServerUrl}
                    onChange={(e) => setInputServerUrl(e.target.value)}
                    placeholder="ws://192.168.1.41:3000/ws"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (inputServerUrl.trim()) {
                        networkClient.reconnectWithUrl(inputServerUrl.trim());
                        setShowServerModal(false);
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
                  >
                    Connect
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowServerModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tactical Deployment Overlay Loader */}
      {isDeploying && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="glass-panel max-w-sm w-full rounded-3xl p-8 border border-amber-500/40 shadow-[0_0_50px_rgba(245,158,11,0.25)] flex flex-col items-center text-center gap-5">
            <div className="relative flex items-center justify-center">
              <div className="w-20 h-20 rounded-full border-4 border-amber-500/20 border-t-amber-400 animate-spin" />
              <Compass className="w-10 h-10 text-amber-400 absolute animate-pulse" />
            </div>

            <div>
              <span className="text-[10px] font-bold text-amber-400 tracking-widest uppercase">
                FLEET DEPLOYMENT SEQUENCE
              </span>
              <h3 className="font-cinzel text-xl font-black text-slate-100 mt-1">
                COMMENCING BATTLE
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Dispatching armada coordinates to battle stations...
              </p>
            </div>

            <div className="w-full bg-slate-900 border border-slate-800 rounded-full h-2 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full animate-pulse w-full" />
            </div>

            <span className="text-[11px] text-amber-300/80 font-mono font-bold tracking-wider animate-pulse">
              ALL HANDS ON DECK
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
