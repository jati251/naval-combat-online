import React from 'react';
import {
  Compass,
  Volume2,
  VolumeX,
  LogOut,
  Crosshair,
  Anchor,
  Wind,
  ShieldAlert,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import { useGameStore } from '@/stores/useGameStore';
import { networkClient } from '@/services/networkClient';
import { useShipControls } from '../../hooks/useShipControls';
import { SHIP_PRESETS, type SailState } from '@/types/game';

export const BattleHUD: React.FC = () => {
  const { changeSail, setRudder } = useShipControls();

  const selfId = useGameStore((s) => s.selfId);
  const ships = useGameStore((s) => s.ships);
  const currentRoom = useGameStore((s) => s.currentRoom);
  const isMuted = useGameStore((s) => s.isMuted);
  const ping = useGameStore((s) => s.ping);
  const setMuted = useGameStore((s) => s.setMuted);

  const localSail = useGameStore((s) => s.localSail);
  const localRudder = useGameStore((s) => s.localRudder);
  const portProgress = useGameStore((s) => s.portReloadProgress);
  const stbdProgress = useGameStore((s) => s.starboardReloadProgress);
  const combatLogs = useGameStore((s) => s.combatLogs);

  const selfShip = ships.find((s) => s.id === selfId);
  const config = selfShip ? SHIP_PRESETS[selfShip.shipClass] : SHIP_PRESETS.brig;

  const currentHp = selfShip ? Math.max(0, selfShip.health) : config.maxHealth;
  const hpPercent = (currentHp / config.maxHealth) * 100;
  const speedKnots = selfShip ? Math.round(selfShip.speed * 10) / 10 : 0;
  const aliveShips = ships.filter((s) => !s.isSunk);

  return (
    <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-4 font-sans select-none">
      {/* Top Bar Header */}
      <div className="flex items-start justify-between w-full">
        {/* Left: Player Ship Health & Info */}
        <div className="glass-panel pointer-events-auto rounded-xl p-3.5 flex flex-col gap-2 min-w-[240px] shadow-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
              <span className="font-cinzel font-bold text-slate-100 text-sm tracking-wider uppercase">
                {selfShip?.name || 'Flagship'}
              </span>
            </div>
            <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-amber-300 font-bold border border-slate-700">
              {config.name}
            </span>
          </div>

          {/* Health Bar */}
          <div>
            <div className="flex justify-between text-[11px] font-semibold text-slate-300 mb-1">
              <span>HULL INTEGRITY</span>
              <span className={hpPercent > 30 ? 'text-emerald-400' : 'text-rose-400'}>
                {Math.round(currentHp)} / {config.maxHealth} HP
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-700">
              <div
                className={`h-full transition-all duration-300 rounded-full ${
                  hpPercent > 50 ? 'bg-gradient-to-r from-emerald-600 to-teal-400' : hpPercent > 25 ? 'bg-amber-500' : 'bg-rose-600 animate-pulse'
                }`}
                style={{ width: `${hpPercent}%` }}
              />
            </div>
          </div>

          {/* Speed Indicator */}
          <div className="flex items-center justify-between text-xs text-slate-300 pt-1 border-t border-slate-800">
            <span className="flex items-center gap-1 text-slate-400">
              <Wind className="w-3.5 h-3.5 text-cyan-400" /> SPEED
            </span>
            <span className="font-mono font-bold text-cyan-300">{speedKnots} KTS</span>
          </div>
        </div>

        {/* Center: Arena & Battle Status */}
        <div className="glass-panel pointer-events-auto px-5 py-2 rounded-full flex items-center gap-4 shadow-xl">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <span className="font-cinzel text-xs font-bold tracking-widest text-slate-200 uppercase">
              {currentRoom?.name || 'Naval War Zone'}
            </span>
          </div>
          <div className="h-4 w-px bg-slate-700" />
          <div className="text-xs text-slate-300">
            <span className="text-amber-400 font-bold">{aliveShips.length}</span> Vessels Afloat
          </div>
        </div>

        {/* Right: Ping, Mute, Leave */}
        <div className="glass-panel pointer-events-auto rounded-xl p-2.5 flex items-center gap-3 shadow-xl">
          <div className="flex items-center gap-1.5 text-xs font-mono px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300">
            <div
              className={`w-2 h-2 rounded-full ${
                ping < 80 ? 'bg-emerald-400' : ping < 150 ? 'bg-amber-400' : 'bg-rose-500'
              }`}
            />
            <span>{ping} ms</span>
          </div>

          <button
            onClick={() => setMuted(!isMuted)}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>

          <button
            onClick={() => networkClient.leaveRoom()}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-700/60 text-rose-200 text-xs font-bold transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>LEAVE</span>
          </button>
        </div>
      </div>

      {/* Sunk Notice if destroyed */}
      {selfShip?.isSunk && (
        <div className="self-center glass-panel px-8 py-4 rounded-2xl border border-rose-500/50 shadow-2xl flex flex-col items-center gap-2 animate-bounce">
          <h2 className="font-cinzel font-black text-rose-400 text-2xl tracking-wider">YOUR SHIP HAS SUNK</h2>
          <p className="text-xs text-slate-300">Spectating remaining fleet until match concludes...</p>
        </div>
      )}

      {/* Bottom Interface Controls & Feeds */}
      <div className="flex items-end justify-between w-full">
        {/* Left: Tactical Radar & Compass */}
        <div className="glass-panel pointer-events-auto p-3 rounded-2xl flex flex-col items-center gap-2 shadow-2xl">
          <div className="relative w-28 h-28 rounded-full border border-cyan-500/40 bg-slate-950/90 overflow-hidden flex items-center justify-center">
            {/* Grid concentric rings */}
            <div className="absolute w-20 h-20 rounded-full border border-cyan-500/20" />
            <div className="absolute w-10 h-10 rounded-full border border-cyan-500/20" />
            <div className="absolute w-full h-px bg-cyan-500/20" />
            <div className="absolute h-full w-px bg-cyan-500/20" />

            {/* Radar sweep */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-cyan-500/10 to-transparent rounded-full animate-spin [animation-duration:4s]" />

            {/* Cardinal Markers */}
            <span className="absolute top-1 text-[9px] font-bold text-cyan-400">N</span>
            <span className="absolute bottom-1 text-[9px] font-bold text-slate-500">S</span>
            <span className="absolute left-1.5 text-[9px] font-bold text-slate-500">W</span>
            <span className="absolute right-1.5 text-[9px] font-bold text-slate-500">E</span>

            {/* Center Player marker */}
            <div
              className="w-2.5 h-2.5 bg-cyan-400 border border-white rounded-full z-10 shadow-[0_0_8px_#22d3ee]"
              style={{
                transform: `rotate(${-(selfShip?.rotationY || 0)}rad)`,
              }}
            />

            {/* Other Ships Blips on Radar */}
            {ships
              .filter((s) => s.id !== selfId && !s.isSunk)
              .map((s) => {
                if (!selfShip) return null;
                const radarScale = 0.22; // world units to radar pixels
                const relX = (s.x - selfShip.x) * radarScale;
                const relZ = (s.z - selfShip.z) * radarScale;
                const dist = Math.sqrt(relX * relX + relZ * relZ);
                if (dist > 50) return null; // out of radar range

                return (
                  <div
                    key={s.id}
                    className="absolute w-2 h-2 rounded-full bg-rose-500 border border-white shadow-[0_0_6px_#f43f5e]"
                    style={{
                      transform: `translate(${relX}px, ${-relZ}px)`,
                    }}
                  />
                );
              })}
          </div>
          <span className="text-[10px] font-cinzel font-bold text-slate-400 tracking-wider flex items-center gap-1">
            <Compass className="w-3 h-3 text-cyan-400" /> TACTICAL RADAR
          </span>
        </div>

        {/* Center Controls: Broadside Cannons, Sails & Rudder */}
        <div className="glass-panel pointer-events-auto rounded-3xl p-4 flex flex-col items-center gap-3.5 shadow-2xl border border-slate-700/80">
          <div className="flex items-center gap-6">
            {/* PORT BROADSIDE CANNON (Left) */}
            <div className="flex flex-col items-center gap-1">
              <button
                disabled={portProgress < 1.0 || selfShip?.isSunk}
                onClick={() => networkClient.fireBroadside('port')}
                className={`relative px-4 py-3 rounded-2xl flex items-center gap-2 border font-bold text-sm tracking-wide transition shadow-lg ${
                  portProgress >= 1.0 && !selfShip?.isSunk
                    ? 'bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-slate-950 border-amber-300 active:scale-95 cursor-pointer'
                    : 'bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed opacity-75'
                }`}
              >
                <Crosshair className="w-4 h-4" />
                <span>PORT FIRE</span>
                <span className="text-[10px] bg-black/40 px-1.5 py-0.5 rounded font-mono text-white">Q</span>
              </button>
              {/* Reload Progress Bar */}
              <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-amber-400 transition-all duration-75"
                  style={{ width: `${portProgress * 100}%` }}
                />
              </div>
            </div>

            {/* RUDDER STEERING WHEEL */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-slate-950/80 border border-slate-800">
              <button
                onMouseDown={() => setRudder(-1)}
                onMouseUp={() => setRudder(0)}
                className={`p-2.5 rounded-xl border transition ${
                  localRudder < 0
                    ? 'bg-cyan-600 text-white border-cyan-400'
                    : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                }`}
                title="Turn Port (Left / A)"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              <div className="flex flex-col items-center px-2">
                <span className="text-[9px] font-bold text-slate-400">RUDDER</span>
                <span className="font-mono text-xs font-extrabold text-cyan-300">
                  {localRudder < 0 ? 'PORT' : localRudder > 0 ? 'STBD' : 'AMIDSHIPS'}
                </span>
              </div>

              <button
                onMouseDown={() => setRudder(1)}
                onMouseUp={() => setRudder(0)}
                className={`p-2.5 rounded-xl border transition ${
                  localRudder > 0
                    ? 'bg-cyan-600 text-white border-cyan-400'
                    : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                }`}
                title="Turn Starboard (Right / D)"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* STARBOARD BROADSIDE CANNON (Right) */}
            <div className="flex flex-col items-center gap-1">
              <button
                disabled={stbdProgress < 1.0 || selfShip?.isSunk}
                onClick={() => networkClient.fireBroadside('starboard')}
                className={`relative px-4 py-3 rounded-2xl flex items-center gap-2 border font-bold text-sm tracking-wide transition shadow-lg ${
                  stbdProgress >= 1.0 && !selfShip?.isSunk
                    ? 'bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-slate-950 border-amber-300 active:scale-95 cursor-pointer'
                    : 'bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed opacity-75'
                }`}
              >
                <span>STARBOARD FIRE</span>
                <span className="text-[10px] bg-black/40 px-1.5 py-0.5 rounded font-mono text-white">E</span>
                <Crosshair className="w-4 h-4" />
              </button>
              {/* Reload Progress Bar */}
              <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-amber-400 transition-all duration-75"
                  style={{ width: `${stbdProgress * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Sail Speed Selector */}
          <div className="flex items-center gap-2 pt-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1">
              <Anchor className="w-3.5 h-3.5 text-amber-400" /> RIGGING:
            </span>
            {(['ANCHOR', 'HALF_SAIL', 'FULL_SAIL'] as SailState[]).map((state) => (
              <button
                key={state}
                onClick={() => changeSail(state)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition border ${
                  localSail === state
                    ? 'bg-cyan-600 text-white border-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                {state === 'ANCHOR' ? 'Anchor' : state === 'HALF_SAIL' ? 'Half Sail (W)' : 'Full Sail (W+)'}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Live Battle Log Feed */}
        <div className="glass-panel pointer-events-auto p-3.5 rounded-2xl flex flex-col gap-1.5 max-w-xs w-72 h-36 overflow-y-auto shadow-2xl text-xs scrollbar-thin">
          <div className="text-[10px] font-cinzel font-bold text-amber-400 tracking-wider border-b border-slate-800 pb-1 flex items-center gap-1">
            <span>COMBAT LOG</span>
          </div>
          <div className="flex flex-col gap-1 overflow-y-auto">
            {combatLogs.length === 0 ? (
              <span className="text-[11px] text-slate-500 italic">No cannon fire exchanged yet...</span>
            ) : (
              combatLogs.slice(0, 5).map((log) => (
                <div
                  key={log.id}
                  className={`text-[11px] leading-tight ${
                    log.type === 'damage'
                      ? 'text-rose-400 font-semibold'
                      : log.type === 'sink'
                      ? 'text-amber-300 font-bold'
                      : 'text-slate-300'
                  }`}
                >
                  {log.text}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
