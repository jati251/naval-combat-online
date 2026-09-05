import React, { useState, useCallback, useEffect } from 'react';
import { Volume2, VolumeX, LogOut, Swords, Skull, Smartphone, Trophy } from 'lucide-react';
import { useGameStore } from '@/stores/useGameStore';
import { networkClient } from '@/services/networkClient';
import { useShipControls } from '../../hooks/useShipControls';
import { useShipActions } from '../../hooks/useShipActions';
import { SHIP_PRESETS } from '@/types';
import { DebriefModal } from './DebriefModal';
import { ScoreboardModal } from './ScoreboardModal';
import { CompassMinimap } from './CompassMinimap';
import { ShipStatusBar } from './ShipStatusBar';
import { SpeedRudderControl } from './SpeedRudderControl';
import { BroadsideGauges } from './BroadsideGauges';
import { AimCrosshair } from './AimCrosshair';
import { CombatLogFeed } from './CombatLogFeed';
import { BoundaryWarningAlert } from './BoundaryWarningAlert';
import { BattleDeploymentLoader } from './BattleDeploymentLoader';
import { MobileNavalControls } from './MobileNavalControls';

/**
 * Decoupled Leaf Components:
 * Prevent 30Hz server snapshot thrashing from re-rendering the entire HUD tree.
 */

const DeathmatchObjectiveBar: React.FC<{ onOpenScoreboard: () => void }> = React.memo(({ onOpenScoreboard }) => {
  const currentRoom = useGameStore((s) => s.currentRoom);
  const selfId = useGameStore((s) => s.selfId);
  const targetKills = currentRoom?.targetKills || 5;

  const players = currentRoom?.players || [];
  const leader = [...players].sort((a, b) => (b.kills || 0) - (a.kills || 0))[0];
  const selfPlayer = players.find((p) => p.id === selfId);

  return (
    <div
      onClick={onOpenScoreboard}
      className="pointer-events-auto flex items-center gap-1.5 sm:gap-2.5 naval-plaque px-2 sm:px-3 py-1 sm:py-1.5 shadow-xl rounded-md border border-amber-500/60 cursor-pointer hover:border-amber-400 transition group active:scale-95 text-[10px] sm:text-xs"
      title="Click or press [TAB] to inspect Fleet Scoreboard"
    >
      {/* Objective Target */}
      <div className="flex items-center gap-1 text-amber-300 font-cinzel font-bold">
        <Swords className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400 group-hover:rotate-12 transition-transform shrink-0" />
        <span className="font-mono font-bold">{targetKills}</span>
        <span className="hidden xs:inline text-[9px] tracking-wider uppercase text-amber-200/90">Sinks</span>
      </div>

      <div className="w-[1px] h-3 bg-amber-500/30 shrink-0" />

      {/* Leader Standing */}
      <div className="flex items-center gap-1 text-amber-100 font-cinzel">
        <span className="text-[9px] text-amber-300/80 uppercase hidden md:inline">Leader:</span>
        <span className="font-bold text-amber-200 truncate max-w-[50px] sm:max-w-[85px]">
          {leader ? leader.name : 'None'}
        </span>
        <span className="font-mono font-bold text-emerald-300 text-[10px] sm:text-xs">
          ({leader?.kills || 0}/{targetKills})
        </span>
      </div>

      <div className="w-[1px] h-3 bg-amber-500/30 shrink-0" />

      {/* Self Progress */}
      <div className="flex items-center gap-1 font-cinzel">
        <span className="text-[9px] text-amber-300/80 uppercase">You:</span>
        <span className="font-mono font-black text-amber-300 text-[10px] sm:text-xs">
          {selfPlayer?.kills || 0}/{targetKills}
        </span>
      </div>

      {/* Scoreboard Hint */}
      <div className="hidden lg:flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-500/40 text-amber-300 shadow-sm">
        <Trophy className="w-2.5 h-2.5" />
        <span>TAB</span>
      </div>
    </div>
  );
});

const ShipStatusContainer: React.FC = React.memo(() => {
  const selfId = useGameStore((s) => s.selfId);
  const currentRoom = useGameStore((s) => s.currentRoom);
  const selfShip = useGameStore((s) => s.ships.find((ship) => ship.id === selfId));

  const config = selfShip ? SHIP_PRESETS[selfShip.shipClass] : SHIP_PRESETS.brig;
  const currentHp = selfShip ? Math.max(0, selfShip.health) : config.maxHealth;
  const hpPercent = Math.max(0, Math.min(100, (currentHp / config.maxHealth) * 100));

  return (
    <ShipStatusBar
      shipName={selfShip?.name || currentRoom?.name || 'Flagship Vessel'}
      shipClass={selfShip?.shipClass || 'brig'}
      config={config}
      currentHp={currentHp}
      hpPercent={hpPercent}
    />
  );
});

const SpeedRudderContainer: React.FC = React.memo(() => {
  const { changeSail, setRudder } = useShipActions();
  const localSail = useGameStore((s) => s.localSail);
  const localRudder = useGameStore((s) => s.localRudder);
  const speed = useGameStore((s) => {
    const ship = s.ships.find((ship) => ship.id === s.selfId);
    return ship?.speed ?? 0;
  });

  const speedKnots = (Math.round(speed * 10) / 10).toFixed(1);

  return (
    <SpeedRudderControl
      localSail={localSail}
      speedKnots={speedKnots}
      localRudder={localRudder}
      onChangeSail={changeSail}
      onSetRudder={setRudder}
    />
  );
});

const BroadsideGaugesContainer: React.FC = React.memo(() => {
  const { fireBattery } = useShipActions();
  const portProgress = useGameStore((s) => s.portReloadProgress);
  const stbdProgress = useGameStore((s) => s.starboardReloadProgress);
  const aimDirection = useGameStore((s) => s.aimDirection);

  const handleFire = useCallback(() => {
    if (aimDirection === 'port' || aimDirection === 'starboard') {
      fireBattery(aimDirection);
    } else {
      fireBattery('starboard');
    }
  }, [aimDirection, fireBattery]);

  return (
    <BroadsideGauges
      portProgress={portProgress}
      stbdProgress={stbdProgress}
      aimDirection={aimDirection}
      onFireBattery={handleFire}
    />
  );
});

const AimCrosshairContainer: React.FC = React.memo(() => {
  const isAiming = useGameStore((s) => s.isAiming);
  const aimDirection = useGameStore((s) => s.aimDirection);
  return <AimCrosshair isAiming={isAiming} aimDirection={aimDirection} />;
});

const CombatLogContainer: React.FC = React.memo(() => {
  const combatLogs = useGameStore((s) => s.combatLogs);
  return <CombatLogFeed logs={combatLogs} />;
});

const PingBadge: React.FC = React.memo(() => {
  const ping = useGameStore((s) => s.ping);
  return (
    <div className="px-2.5 py-1.5 naval-plaque text-[10px] font-mono text-amber-300 font-bold flex items-center gap-1.5 shadow-md rounded-md border border-amber-600/40">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_4px_rgba(16,185,129,0.8)]" />
      <span>{ping}ms</span>
    </div>
  );
});

const SunkNoticeOverlay: React.FC<{ onOpenScoreboard: () => void }> = React.memo(({ onOpenScoreboard }) => {
  const isSunk = useGameStore((s) => {
    const selfShip = s.ships.find((ship) => ship.id === s.selfId);
    return selfShip?.isSunk ?? false;
  });

  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (!isSunk) {
      setCountdown(5);
      return;
    }
    setCountdown(5);
    const interval = setInterval(() => {
      setCountdown((c) => (c > 1 ? c - 1 : 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [isSunk]);

  if (!isSunk) return null;

  return (
    <div className="self-center pirate-parchment px-6 py-4 border-2 border-rose-600/90 shadow-2xl rounded-lg flex flex-col items-center gap-2 pointer-events-auto max-w-md text-center animate-in fade-in zoom-in-95 duration-200">
      <div className="flex items-center gap-2.5">
        <Skull className="w-6 h-6 text-rose-400 animate-pulse" />
        <h2 className="font-cinzel font-black text-rose-300 text-lg sm:text-xl tracking-widest gold-emboss">
          VESSEL FOUNDERED IN BATTLE!
        </h2>
      </div>
      <p className="text-xs font-fell italic text-amber-200/90 tracking-wide">
        Your hull took catastrophic broadside damage. Refitting at safe coordinates...
      </p>
      <div className="flex items-center gap-2 my-1 px-4 py-1.5 rounded-full bg-rose-950/80 border border-rose-600/70 text-rose-200">
        <span className="text-xs font-cinzel font-bold">RESPAWNING IN</span>
        <span className="text-lg font-mono font-black text-white px-2.5 py-0.5 rounded bg-rose-900/90 border border-rose-400 shadow-[0_0_10px_rgba(225,29,72,0.6)]">
          {countdown}s
        </span>
      </div>
      <button
        onClick={onOpenScoreboard}
        className="mt-1 px-4 py-1.5 rounded-md pirate-panel border border-amber-500/50 text-amber-300 hover:text-white hover:border-amber-300 font-cinzel font-bold text-xs uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5 shadow-md active:scale-95"
      >
        <Trophy className="w-3.5 h-3.5" />
        <span>View Fleet Scoreboard (TAB)</span>
      </button>
    </div>
  );
});

const DamageHitVignette: React.FC = React.memo(() => {
  const cameraShake = useGameStore((s) => s.cameraShake);

  if (!cameraShake || cameraShake.direction !== 'hit') return null;

  return (
    <div
      key={cameraShake.timestamp}
      className="pointer-events-none fixed inset-0 z-30 animate-hit-pulse"
      style={{
        boxShadow: 'inset 0 0 85px 30px rgba(185, 28, 28, 0.55)',
      }}
    />
  );
});

/**
 * Pirate Vintage Battle HUD
 * Isolated leaf architecture prevents DOM churn while delivering
 * an authentic 18th-century naval quarterdeck atmosphere.
 */
export const BattleHUD: React.FC = () => {
  useShipControls();

  const isMuted = useGameStore((s) => s.isMuted);
  const setMuted = useGameStore((s) => s.setMuted);
  const [showScoreboard, setShowScoreboard] = useState(false);

  const [isTouchDevice] = useState(() => {
    return (
      typeof window !== 'undefined' &&
      ('ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth <= 1024)
    );
  });
  const [showTouchControls, setShowTouchControls] = useState(isTouchDevice);

  // Tab key listener to toggle tactical Scoreboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        setShowScoreboard((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLeave = useCallback(() => {
    if (confirm('Strike colors and return to safe harbor?')) {
      networkClient.leaveRoom();
    }
  }, []);

  const handleToggleMute = useCallback(() => {
    setMuted(!isMuted);
  }, [setMuted, isMuted]);

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-2.5 sm:p-4 select-none z-20 font-cinzel">
      {/* Real multi-phase deployment loader */}
      <BattleDeploymentLoader />

      {/* Red damage impact flash vignette */}
      <DamageHitVignette />

      {/* Tactical Live Scoreboard Modal */}
      <ScoreboardModal
        isOpen={showScoreboard}
        onClose={() => setShowScoreboard(false)}
      />

      {/* Debrief Modal upon match victory / conclusion */}
      <DebriefModal />

      {/* --- TOP SECTION: VINTAGE MARITIME COMMAND PERIMETER --- */}
      <div className="flex items-center justify-between w-full pointer-events-none gap-1 sm:gap-2">
        {/* Top-Left: Captain's Crest & Ship Vitality */}
        <div className="shrink-0 pointer-events-auto">
          <ShipStatusContainer />
        </div>

        {/* Top-Center: Fleet Deathmatch Objective Banner */}
        <div className="shrink min-w-0">
          <DeathmatchObjectiveBar onOpenScoreboard={() => setShowScoreboard(true)} />
        </div>

        {/* Top-Right: Captain's Utility Controls */}
        <div className="pointer-events-auto flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Latency Compass Pip */}
          <PingBadge />

          {/* Tactical Scoreboard Trigger Button */}
          <button
            onClick={() => setShowScoreboard(true)}
            className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-md pirate-panel border border-amber-500/60 text-amber-300 hover:text-white hover:border-amber-400 transition-colors cursor-pointer flex items-center gap-1 text-[9px] sm:text-[10px] font-cinzel font-bold uppercase tracking-wider shadow-md active:scale-95"
            title="Inspect Fleet Deathmatch Scoreboard (TAB)"
            aria-label="Inspect Scoreboard"
          >
            <Trophy className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400" />
            <span className="hidden md:inline">Scoreboard</span>
            <span className="font-mono text-[9px] text-amber-400/80 hidden sm:inline">[TAB]</span>
          </button>

          {/* Mobile Gamepad Touch Toggle */}
          <button
            onClick={() => setShowTouchControls(!showTouchControls)}
            className={`p-1 sm:p-1.5 naval-plaque rounded-md border transition-colors cursor-pointer shadow-md ${
              showTouchControls
                ? 'border-amber-400 text-amber-200 bg-amber-950/60 shadow-[0_0_8px_rgba(212,175,55,0.4)]'
                : 'border-amber-600/40 text-stone-400 hover:text-amber-200'
            }`}
            title={showTouchControls ? 'Hide Mobile Controls' : 'Show Mobile Controls (MLBB / Asphalt)'}
            aria-label="Toggle Mobile Controls"
          >
            <Smartphone className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          {/* Ship's Bell Audio Toggle */}
          <button
            onClick={handleToggleMute}
            className="p-1 sm:p-1.5 naval-plaque rounded-md border border-amber-600/40 text-amber-300 hover:text-amber-100 hover:border-amber-400 transition-colors cursor-pointer shadow-md"
            title={isMuted ? 'Ring Ship Bell (Unmute)' : 'Silence Ship Bell (Mute)'}
            aria-label={isMuted ? 'Ring Ship Bell (Unmute)' : 'Silence Ship Bell (Mute)'}
          >
            {isMuted ? (
              <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-400" />
            ) : (
              <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300" />
            )}
          </button>

          {/* Surrender / Return to Harbor Seal */}
          <button
            onClick={handleLeave}
            className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-md pirate-panel border border-rose-800/60 text-rose-300 hover:text-white hover:border-rose-500 transition-colors cursor-pointer flex items-center gap-1 text-[9px] sm:text-[10px] font-cinzel font-bold uppercase tracking-wider shadow-md"
            title="Strike Colors and Return to Port"
          >
            <LogOut className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span className="hidden xs:inline">Retreat</span>
          </button>
        </div>
      </div>

      {/* Floating Tactical Modules for Mobile Landscape Touch Mode */}
      {showTouchControls && (
        <>
          <div className="pointer-events-none absolute top-12 sm:top-14 left-2 sm:left-4 z-20 scale-[0.68] sm:scale-75 origin-top-left">
            <CompassMinimap />
          </div>
          <div className="pointer-events-none absolute top-12 sm:top-14 right-2 sm:right-4 z-20 scale-[0.82] sm:scale-90 origin-top-right">
            <CombatLogContainer />
          </div>
        </>
      )}

      {/* --- CENTER SECTION: SEXTANT RETICLE & SHOAL WARNING --- */}
      <AimCrosshairContainer />
      <BoundaryWarningAlert />
      <SunkNoticeOverlay onOpenScoreboard={() => setShowScoreboard(true)} />

      {/* --- MOBILE CONTROLS (Mobile Legends / Asphalt Style) --- */}
      {showTouchControls && <MobileNavalControls />}

      {/* --- DESKTOP BOTTOM SECTION: NAVIGATION BINNACLE & BROADSIDE ARTILLERY --- */}
      {!showTouchControls && (
        <div className="flex items-end justify-between w-full pointer-events-none">
          {/* Left: Master Navigator's Binnacle & Helm Console */}
          <div className="flex items-end gap-2.5 sm:gap-3 pointer-events-auto">
            <CompassMinimap />
            <SpeedRudderContainer />
          </div>

          {/* Right: Master Gunner's Battery & Fleet Dispatches */}
          <div className="flex flex-col items-end gap-2.5 pointer-events-auto">
            <CombatLogContainer />
            <BroadsideGaugesContainer />
          </div>
        </div>
      )}
    </div>
  );
};
