import React, { useCallback } from 'react';
import { Volume2, VolumeX, LogOut, Swords, Skull } from 'lucide-react';
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

/**
 * Decoupled Leaf Components:
 * Prevent 30Hz server snapshot thrashing from re-rendering the entire HUD tree.
 */

const FleetStatusBadge: React.FC = React.memo(() => {
  const aliveCount = useGameStore((s) => s.ships.filter((ship) => !ship.isSunk).length);
  const sunkCount = useGameStore((s) => s.ships.filter((ship) => ship.isSunk).length);

  return (
    <div className="pointer-events-auto flex items-center gap-3 naval-plaque px-3.5 py-1.5 shadow-sm">
      <div className="flex items-center gap-1 text-emerald-400 font-bold">
        <Swords className="w-3.5 h-3.5 text-amber-400" />
        <span className="text-xs font-mono">{aliveCount}</span>
        <span className="text-[9px] tracking-wider uppercase text-stone-400">Afloat</span>
      </div>
      <div className="w-[1px] h-3.5 bg-stone-700" />
      <div className="flex items-center gap-1 text-rose-300 font-bold">
        <Skull className="w-3 h-3 text-rose-400" />
        <span className="text-xs font-mono">{sunkCount}</span>
        <span className="text-[9px] tracking-wider uppercase text-stone-400">Sunk</span>
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
      shipName={selfShip?.name || currentRoom?.name || 'Armada Vessel'}
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
    <div className="px-2.5 py-1 naval-plaque text-[9px] font-mono text-emerald-400 font-bold flex items-center gap-1.5 shadow-sm">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
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
    <div className="self-center naval-plaque px-6 py-3 border border-rose-600/70 shadow-lg flex flex-col items-center gap-1 pointer-events-auto">
      <div className="flex items-center gap-2">
        <Skull className="w-5 h-5 text-rose-400" />
        <h2 className="font-cinzel font-bold text-rose-300 text-lg tracking-widest">
          VESSEL CLAIMED BY THE DEEP
        </h2>
      </div>
      <p className="text-[10px] font-mono text-stone-300 tracking-wide">
        Spectating remaining armada until engagement concludes...
      </p>
    </div>
  );
});

const DamageHitVignette: React.FC = React.memo(() => {
  const cameraShake = useGameStore((s) => s.cameraShake);
  const [visible, setVisible] = React.useState(false);
  const lastTime = React.useRef(0);

  React.useEffect(() => {
    if (cameraShake && cameraShake.direction === 'hit' && cameraShake.timestamp !== lastTime.current) {
      lastTime.current = cameraShake.timestamp;
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 450);
      return () => clearTimeout(timer);
    }
  }, [cameraShake]);

  if (!visible) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-30 transition-opacity duration-300"
      style={{
        boxShadow: 'inset 0 0 75px 25px rgba(225, 29, 72, 0.45)',
      }}
    />
  );
});


/**
 * Ultra-Lightweight Tactical Battle HUD
 * The main container is structural and non-re-rendering.
 * All dynamic data is isolated in leaf components.
 */
export const BattleHUD: React.FC = () => {
  // Mount global keyboard, mouse, and steering loop singleton
  useShipControls();

  const isMuted = useGameStore((s) => s.isMuted);
  const setMuted = useGameStore((s) => s.setMuted);

  const handleLeave = useCallback(() => {
    if (confirm('Return to port and abandon the engagement?')) {
      networkClient.leaveRoom();
    }
  }, []);

  const handleToggleMute = useCallback(() => {
    setMuted(!isMuted);
  }, [setMuted, isMuted]);

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3.5 sm:p-4 select-none z-20 font-cinzel">
      {/* Red damage impact flash vignette */}
      <DamageHitVignette />

      {/* Debrief Modal upon match victory / conclusion */}
      <DebriefModal />

      {/* --- TOP SECTION: VINTAGE MARITIME COMMAND PERIMETER --- */}
      <div className="flex items-start justify-between w-full pointer-events-none">
        {/* Top-Left: Captain's Crest & Ship Vitality */}
        <ShipStatusContainer />

        {/* Top-Center: Fleet War Standard */}
        <FleetStatusBadge />

        {/* Top-Right: Captain's Nautical Utility Seals */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Latency Compass Pip */}
          <PingBadge />

          {/* Ship's Bell Audio Toggle */}
          <button
            onClick={handleToggleMute}
            className="p-1.5 naval-plaque text-amber-300 hover:text-amber-100 transition-colors cursor-pointer shadow-sm"
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            aria-label={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-amber-300" />}
          </button>

          {/* Surrender / Abandon Port Seal */}
          <button
            onClick={handleLeave}
            className="px-2.5 py-1 rounded bg-stone-950/85 border border-rose-700/60 text-rose-200 hover:text-white hover:border-rose-500 transition-colors cursor-pointer flex items-center gap-1.5 text-[11px] font-cinzel font-bold uppercase tracking-wider shadow-sm"
            title="Return to Port"
          >
            <LogOut className="w-3 h-3" />
            <span>Leave</span>
          </button>
        </div>
      </div>

      {/* --- CENTER SECTION: AIMING RETICLE & BOUNDARY WARNING --- */}
      <AimCrosshairContainer />
      <BoundaryWarningAlert />
      <SunkNoticeOverlay />

      {/* --- BOTTOM SECTION: NAVIGATION BINNACLE (LEFT) & BROADSIDE ARTILLERY (RIGHT) --- */}
      {/* The entire bottom-center is 100% free of obstructions */}
      <div className="flex items-end justify-between w-full pointer-events-none">
        {/* Left: Navigator's Binnacle & Helm Console */}
        <div className="flex items-end gap-2.5 pointer-events-auto">
          <CompassMinimap />
          <SpeedRudderContainer />
        </div>

        {/* Right: Master Gunner's Battery & Fleet Dispatches */}
        <div className="flex flex-col items-end gap-2.5 pointer-events-auto">
          <CombatLogContainer />
          <BroadsideGaugesContainer />
        </div>
      </div>
    </div>
  );
};
