import React, { useState, useCallback } from 'react';
import { Volume2, VolumeX, LogOut, Swords, Skull, Smartphone } from 'lucide-react';
import { useGameStore } from '@/stores/useGameStore';
import { networkClient } from '@/services/networkClient';
import { useShipControls } from '../../hooks/useShipControls';
import { useShipActions } from '../../hooks/useShipActions';
import { SHIP_PRESETS } from '@/types';
import { DebriefModal } from './DebriefModal';
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

const FleetStatusBadge: React.FC = React.memo(() => {
  const aliveCount = useGameStore((s) => s.ships.filter((ship) => !ship.isSunk).length);
  const sunkCount = useGameStore((s) => s.ships.filter((ship) => ship.isSunk).length);

  return (
    <div className="pointer-events-auto flex items-center gap-3 naval-plaque px-4 py-1.5 shadow-xl rounded-md border border-amber-600/40">
      <div className="flex items-center gap-1.5 text-emerald-300 font-cinzel font-bold">
        <Swords className="w-3.5 h-3.5 text-amber-400" />
        <span className="text-xs font-mono">{aliveCount}</span>
        <span className="text-[9px] tracking-wider uppercase text-amber-200/70">Afloat</span>
      </div>
      <div className="w-[1px] h-3.5 bg-amber-600/30" />
      <div className="flex items-center gap-1.5 text-rose-300 font-cinzel font-bold">
        <Skull className="w-3.5 h-3.5 text-rose-400" />
        <span className="text-xs font-mono">{sunkCount}</span>
        <span className="text-[9px] tracking-wider uppercase text-amber-200/70">Sunken</span>
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

const SunkNoticeOverlay: React.FC = React.memo(() => {
  const isSunk = useGameStore((s) => {
    const selfShip = s.ships.find((ship) => ship.id === s.selfId);
    return selfShip?.isSunk ?? false;
  });

  if (!isSunk) return null;

  return (
    <div className="self-center pirate-parchment px-8 py-4 border-2 border-rose-700/80 shadow-2xl rounded-lg flex flex-col items-center gap-1.5 pointer-events-auto">
      <div className="flex items-center gap-2.5">
        <Skull className="w-6 h-6 text-rose-400 animate-pulse" />
        <h2 className="font-cinzel font-black text-rose-300 text-xl tracking-widest gold-emboss">
          CLAIMED BY DAVY JONES' LOCKER
        </h2>
      </div>
      <p className="text-xs font-fell italic text-amber-200/80 tracking-wide">
        Your hull has foundered. Spectating remaining armada until engagement concludes...
      </p>
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

  const [isTouchDevice] = useState(() => {
    return (
      typeof window !== 'undefined' &&
      ('ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth <= 1024)
    );
  });
  const [showTouchControls, setShowTouchControls] = useState(isTouchDevice);

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

      {/* Debrief Modal upon match victory / conclusion */}
      <DebriefModal />

      {/* --- TOP SECTION: VINTAGE MARITIME COMMAND PERIMETER --- */}
      <div className="flex items-start justify-between w-full pointer-events-none gap-2">
        {/* Top-Left: Captain's Crest & Ship Vitality */}
        <ShipStatusContainer />

        {/* Top-Center: Fleet War Standard */}
        <div className="hidden sm:block">
          <FleetStatusBadge />
        </div>

        {/* Top-Right: Captain's Utility Controls */}
        <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2">
          {/* Latency Compass Pip */}
          <PingBadge />

          {/* Mobile Gamepad Touch Toggle */}
          <button
            onClick={() => setShowTouchControls(!showTouchControls)}
            className={`p-1.5 sm:p-2 naval-plaque rounded-md border transition-colors cursor-pointer shadow-md ${
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
            className="p-1.5 sm:p-2 naval-plaque rounded-md border border-amber-600/40 text-amber-300 hover:text-amber-100 hover:border-amber-400 transition-colors cursor-pointer shadow-md"
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
            className="px-2.5 sm:px-3 py-1.5 rounded-md pirate-panel border border-rose-800/60 text-rose-300 hover:text-white hover:border-rose-500 transition-colors cursor-pointer flex items-center gap-1 sm:gap-1.5 text-[9px] sm:text-[10px] font-cinzel font-bold uppercase tracking-wider shadow-md"
            title="Strike Colors and Return to Port"
          >
            <LogOut className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span className="hidden xs:inline">Retreat</span>
          </button>
        </div>
      </div>

      {/* Mobile Fleet Standard row for small screens */}
      <div className="sm:hidden self-center pointer-events-none mt-1">
        <FleetStatusBadge />
      </div>

      {/* --- CENTER SECTION: SEXTANT RETICLE & SHOAL WARNING --- */}
      <AimCrosshairContainer />
      <BoundaryWarningAlert />
      <SunkNoticeOverlay />

      {/* --- MOBILE CONTROLS (Mobile Legends / Asphalt Style) --- */}
      {showTouchControls && <MobileNavalControls />}

      {/* --- BOTTOM SECTION: NAVIGATION BINNACLE & BROADSIDE ARTILLERY --- */}
      <div className="flex items-end justify-between w-full pointer-events-none">
        {/* Left: Master Navigator's Binnacle & Helm Console */}
        <div className={`flex items-end gap-2.5 sm:gap-3 pointer-events-auto ${showTouchControls ? 'mb-28 sm:mb-32 scale-90 sm:scale-100 origin-bottom-left' : ''}`}>
          <CompassMinimap />
          {!showTouchControls && <SpeedRudderContainer />}
        </div>

        {/* Right: Master Gunner's Battery & Fleet Dispatches */}
        <div className={`flex flex-col items-end gap-2.5 pointer-events-auto ${showTouchControls ? 'mb-28 sm:mb-32 scale-90 sm:scale-100 origin-bottom-right' : ''}`}>
          <CombatLogContainer />
          {!showTouchControls && <BroadsideGaugesContainer />}
        </div>
      </div>
    </div>
  );
};
