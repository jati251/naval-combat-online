import React, { useState, useCallback, useEffect } from 'react';
import { Volume2, VolumeX, LogOut, Swords, Skull, Smartphone, Trophy, Sliders } from 'lucide-react';
import { useGameStore } from '@/stores/useGameStore';
import { useModalStore } from '@/stores/useModalStore';
import { useSettingsStore } from '@/features/settings';
import { networkClient } from '@/services/networkClient';
import { navalAudio } from '../../services/navalAudio';
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
import { isMobileDevice } from '@/hooks/useMobileViewport';


/**
 * Decoupled Leaf Components:
 * Prevent 30Hz server snapshot thrashing from re-rendering the entire HUD tree.
 */

const DeathmatchObjectiveBar: React.FC<{ onOpenScoreboard: () => void; isTouch?: boolean }> = React.memo(({ onOpenScoreboard, isTouch = false }) => {
  const currentRoom = useGameStore((s) => s.currentRoom);
  const selfId = useGameStore((s) => s.selfId);
  const targetKills = currentRoom?.targetKills || 20;

  const players = currentRoom?.players || [];
  const leader = [...players].sort((a, b) => (b.kills || 0) - (a.kills || 0))[0];
  const selfPlayer = players.find((p) => p.id === selfId);

  const isTeamMode = currentRoom?.gameMode === 'TEAM';
  let redKills = 0;
  let blueKills = 0;
  if (isTeamMode) {
    for (const p of players) {
      if (p.team === 'red') redKills += p.kills || 0;
      else if (p.team === 'blue') blueKills += p.kills || 0;
    }
  }

  return (
    <div
      onClick={onOpenScoreboard}
      className="pointer-events-auto flex items-center gap-1 sm:gap-2 bg-gradient-to-b from-stone-950/95 via-stone-900/90 to-stone-950/95 backdrop-blur-md px-2 sm:px-3.5 py-1 sm:py-1.5 shadow-2xl rounded-b-lg sm:rounded-b-xl border-b-2 border-x border-amber-500/40 cursor-pointer hover:border-amber-400 transition group active:scale-95 text-[8.5px] sm:text-xs select-none"
      title="Click or tap to inspect Fleet Scoreboard"
    >
      {/* Objective Target */}
      <div className="flex items-center gap-0.5 sm:gap-1 text-amber-300 font-cinzel font-bold">
        <Swords className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-400 group-hover:rotate-12 transition-transform shrink-0" />
        <span className="font-mono font-bold text-amber-100">{targetKills}</span>
        <span className="hidden xs:inline text-[7.5px] sm:text-[8px] tracking-wider uppercase text-amber-200/80">Sinks</span>
      </div>

      <div className="w-[1px] h-2.5 sm:h-3 bg-amber-500/30 shrink-0" />

      {isTeamMode ? (
        /* Team Mode Standing */
        <div className="flex items-center gap-1 sm:gap-2 font-cinzel text-[8.5px] sm:text-xs">
          <div className="flex items-center gap-1 px-1 sm:px-1.5 py-0.5 rounded bg-rose-950/70 border border-rose-500/40">
            <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.8)] animate-pulse" />
            <span className="text-rose-300 font-bold hidden sm:inline text-[9px]">RED</span>
            <span className="font-mono font-bold text-rose-100">{redKills}</span>
          </div>
          <span className="text-amber-500/60 font-bold text-[7.5px] sm:text-[8.5px]">VS</span>
          <div className="flex items-center gap-1 px-1 sm:px-1.5 py-0.5 rounded bg-cyan-950/70 border border-cyan-500/40">
            <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.8)] animate-pulse" />
            <span className="text-cyan-300 font-bold hidden sm:inline text-[9px]">BLUE</span>
            <span className="font-mono font-bold text-cyan-100">{blueKills}</span>
          </div>
          <div className="w-[1px] h-2.5 sm:h-3 bg-amber-500/30 shrink-0 hidden sm:block" />
          <span className="text-[8px] uppercase tracking-wider hidden md:inline font-bold">
            <span className={selfPlayer?.team === 'red' ? 'text-rose-400' : 'text-cyan-400'}>
              {selfPlayer?.team === 'red' ? 'Red Fleet' : 'Blue Fleet'}
            </span>
          </span>
        </div>
      ) : (
        /* Free For All Standing */
        <>
          <div className="flex items-center gap-1 text-amber-100 font-cinzel">
            <span className="text-[7.5px] sm:text-[8px] text-amber-300/80 uppercase hidden sm:inline">Leader:</span>
            <span className="font-bold text-amber-200 truncate max-w-[45px] sm:max-w-[90px]">
              {leader ? leader.name : 'None'}
            </span>
            <span className="font-mono font-bold text-emerald-300 text-[8.5px] sm:text-xs">
              ({leader?.kills || 0}/{targetKills})
            </span>
          </div>

          <div className="w-[1px] h-2.5 sm:h-3 bg-amber-500/30 shrink-0" />

          {/* Self Progress */}
          <div className="flex items-center gap-1 font-cinzel">
            <span className="text-[7.5px] sm:text-[8px] text-amber-300/80 uppercase">You:</span>
            <span className="font-mono font-black text-amber-300 text-[8.5px] sm:text-xs">
              {selfPlayer?.kills || 0}/{targetKills}
            </span>
          </div>
        </>
      )}

      {/* Scoreboard Hint: TAB for keyboard, Trophy icon for touch */}
      {!isTouch ? (
        <div className="hidden lg:flex items-center gap-1 text-[8px] font-mono px-1.5 py-0.5 rounded bg-black/60 border border-amber-500/30 text-amber-300">
          <Trophy className="w-2.5 h-2.5 text-amber-400" />
          <span>TAB</span>
        </div>
      ) : (
        <div className="flex items-center gap-1 text-[8px] font-cinzel px-1.5 py-0.5 rounded bg-black/60 border border-amber-500/30 text-amber-300">
          <Trophy className="w-2.5 h-2.5 text-amber-400" />
          <span className="font-bold hidden xs:inline">SCORE</span>
        </div>
      )}
    </div>
  );
});

const ShipStatusContainer: React.FC<{ hasMinimap?: boolean }> = React.memo(({ hasMinimap = false }) => {
  const roomName = useGameStore((s) => s.currentRoom?.name);
  const shipClass = useGameStore((s) => s.ships.find((ship) => ship.id === s.selfId)?.shipClass ?? 'brig');
  const shipName = useGameStore((s) => s.ships.find((ship) => ship.id === s.selfId)?.name ?? roomName ?? 'Flagship Vessel');
  const currentHp = useGameStore((s) => {
    const ship = s.ships.find((ship) => ship.id === s.selfId);
    if (!ship) return SHIP_PRESETS.brig.maxHealth;
    return Math.max(0, ship.health);
  });

  const config = SHIP_PRESETS[shipClass] || SHIP_PRESETS.brig;
  const hpPercent = Math.max(0, Math.min(100, (currentHp / config.maxHealth) * 100));

  return (
    <ShipStatusBar
      shipName={shipName}
      shipClass={shipClass}
      config={config}
      currentHp={currentHp}
      hpPercent={hpPercent}
      hasMinimap={hasMinimap}
    />
  );
});

const SpeedRudderContainer: React.FC = React.memo(() => {
  const { changeSail, setRudder } = useShipActions();
  const localSail = useGameStore((s) => s.localSail);
  const localRudder = useGameStore((s) => s.localRudder);
  const speedKnots = useGameStore((s) => {
    const ship = s.ships.find((ship) => ship.id === s.selfId);
    return (Math.round((ship?.speed ?? 0) * 10) / 10).toFixed(1);
  });

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
  const leftProgress = useGameStore((s) => s.leftReloadProgress);
  const rightProgress = useGameStore((s) => s.rightReloadProgress);
  const aimDirection = useGameStore((s) => s.aimDirection);

  const handleFire = useCallback(() => {
    if (aimDirection === 'left' || aimDirection === 'right') {
      fireBattery(aimDirection);
    } else {
      fireBattery(leftProgress >= 1.0 ? 'left' : 'right');
    }
  }, [aimDirection, fireBattery, leftProgress]);

  return (
    <BroadsideGauges
      leftProgress={leftProgress}
      rightProgress={rightProgress}
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

const CombatLogContainer: React.FC<{ maxItems?: number }> = React.memo(({ maxItems = 3 }) => {
  const combatLogs = useGameStore((s) => s.combatLogs);
  return <CombatLogFeed logs={combatLogs} maxItems={maxItems} />;
});

const PingBadge: React.FC = React.memo(() => {
  const ping = useGameStore((s) => s.ping);
  return (
    <div className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-[9px] sm:text-[10px] font-mono text-amber-300 font-bold flex items-center gap-1 rounded bg-black/40 border border-amber-500/30">
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

  const [isTouchDevice] = useState(() => isMobileDevice());
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

  // Atmospheric oceanic sea ambience during naval engagement
  useEffect(() => {
    navalAudio.startAmbience();
    return () => {
      navalAudio.stopAmbience();
    };
  }, []);

  const handleLeave = useCallback(async () => {
    const confirmed = await useModalStore.getState().confirm({
      title: 'RETREAT TO SAFE HARBOR',
      message: 'Strike colors and abandon this naval engagement to return to safe harbor?',
      confirmLabel: 'Strike Colors',
      cancelLabel: 'Belay Order',
      variant: 'danger',
      icon: 'retreat',
    });
    if (confirmed) {
      networkClient.leaveRoom();
    }
  }, []);

  const handleToggleMute = useCallback(() => {
    setMuted(!isMuted);
  }, [setMuted, isMuted]);

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-0 sm:p-3 select-none z-20 font-cinzel">
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

      {/* --- TOP SECTION: VINTAGE MARITIME COMMAND PERIMETER (FLUSH TO TOP ON MOBILE) --- */}
      <div className="flex items-start justify-between w-full pointer-events-none gap-1 sm:gap-2 px-1 sm:px-2 pt-0.5 sm:pt-0">
        {/* Top-Left: Minimap (Mobile) + Captain's Vitality Crest */}
        <div className="shrink-0 pointer-events-auto flex items-center pt-0.5 sm:pt-0">
          {showTouchControls && <CompassMinimap hideWind compact />}
          <ShipStatusContainer hasMinimap={showTouchControls} />
        </div>

        {/* Top-Center: Fleet Deathmatch Objective Banner (Flush to ceiling) */}
        <div className="shrink min-w-0">
          <DeathmatchObjectiveBar onOpenScoreboard={() => setShowScoreboard(true)} isTouch={showTouchControls} />
        </div>

        {/* Top-Right: Captain's Utility Controls */}
        <div className="pointer-events-auto flex items-center gap-0.5 sm:gap-1.5 shrink-0 mt-1 sm:mt-0 bg-stone-950/85 backdrop-blur-md px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full border border-amber-500/35 shadow-2xl">
          {/* Latency Compass Pip */}
          <PingBadge />

          {/* Mobile Gamepad Touch Toggle */}
          <button
            onClick={() => setShowTouchControls(!showTouchControls)}
            className={`p-1 sm:p-1.5 rounded-full border transition cursor-pointer ${
              showTouchControls
                ? 'border-amber-400 text-amber-200 bg-amber-950/80 shadow-[0_0_8px_rgba(212,175,55,0.4)]'
                : 'border-stone-800 bg-stone-900/80 text-stone-400 hover:text-amber-200'
            }`}
            title={showTouchControls ? 'Hide Mobile Controls' : 'Show Mobile Controls'}
            aria-label="Toggle Mobile Controls"
          >
            <Smartphone className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </button>

          {/* Ship's Bell Audio Toggle */}
          <button
            onClick={handleToggleMute}
            className="p-1 sm:p-1.5 rounded-full bg-stone-900/80 hover:bg-stone-800 border border-amber-600/30 text-amber-300 hover:text-amber-100 hover:border-amber-400 transition cursor-pointer"
            title={isMuted ? 'Ring Ship Bell (Unmute)' : 'Silence Ship Bell (Mute)'}
            aria-label={isMuted ? 'Ring Ship Bell (Unmute)' : 'Silence Ship Bell (Mute)'}
          >
            {isMuted ? (
              <VolumeX className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-rose-400" />
            ) : (
              <Volume2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-300" />
            )}
          </button>

          {/* Settings Modal Toggle */}
          <button
            onClick={() => useSettingsStore.getState().openSettings()}
            className="p-1 sm:p-1.5 rounded-full bg-stone-900/80 hover:bg-stone-800 border border-amber-600/30 text-amber-300 hover:text-amber-100 hover:border-amber-400 transition cursor-pointer"
            title="Admiralty Graphic & Acoustic Settings"
            aria-label="Open Settings"
          >
            <Sliders className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-300" />
          </button>

          {/* Surrender / Return to Harbor Seal */}
          <button
            onClick={handleLeave}
            className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-rose-950/70 hover:bg-rose-900/90 border border-rose-600/60 text-rose-200 hover:text-white transition cursor-pointer flex items-center gap-1 text-[8.5px] sm:text-[10px] font-cinzel font-bold uppercase tracking-wider active:scale-95"
            title="Strike Colors and Return to Port"
          >
            <LogOut className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span className="hidden xs:inline">Retreat</span>
          </button>
        </div>
      </div>

      {/* Centered Tactical Combat Announcements (Placed cleanly below Deathmatch score banner) */}
      <div className="pointer-events-none absolute top-12 sm:top-14 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center max-w-sm sm:max-w-md w-full px-2">
        <CombatLogContainer maxItems={showTouchControls ? 1 : 2} />
      </div>

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
          <div className="flex items-end gap-2 pointer-events-auto">
            <CompassMinimap />
            <SpeedRudderContainer />
          </div>

          {/* Right: Master Gunner's Battery & Broadside Fire Control */}
          <div className="flex flex-col items-end gap-2 pointer-events-auto">
            <BroadsideGaugesContainer />
          </div>
        </div>
      )}
    </div>
  );
};
