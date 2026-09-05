import React from 'react';
import { useGameStore } from '@/stores/useGameStore';
import { networkClient } from '@/services/networkClient';
import { useShipControls } from '../../hooks/useShipControls';
import { SHIP_PRESETS } from '@/types';
import { DebriefModal } from './DebriefModal';
import { CompassMinimap } from './CompassMinimap';
import { ShipStatusBar } from './ShipStatusBar';
import { SpeedRudderControl } from './SpeedRudderControl';
import { BroadsideGauges } from './BroadsideGauges';
import { AimCrosshair } from './AimCrosshair';
import { CombatLogFeed } from './CombatLogFeed';
import { BoundaryWarningAlert } from './BoundaryWarningAlert';

export const BattleHUD: React.FC = () => {
  const { changeSail, setRudder, fireBattery } = useShipControls();

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
  const aimDirection = useGameStore((s) => s.aimDirection);
  const isAiming = useGameStore((s) => s.isAiming);
  const windAngle = useGameStore((s) => s.windAngle);
  const windSpeed = useGameStore((s) => s.windSpeed);
  const combatLogs = useGameStore((s) => s.combatLogs);

  const selfShip = ships.find((s) => s.id === selfId);
  const config = selfShip ? SHIP_PRESETS[selfShip.shipClass] : SHIP_PRESETS.brig;

  const currentHp = selfShip ? Math.max(0, selfShip.health) : config.maxHealth;
  const hpPercent = Math.max(0, Math.min(100, (currentHp / config.maxHealth) * 100));
  const speedKnots = selfShip ? (Math.round(selfShip.speed * 10) / 10).toFixed(1) : '0.0';
  const aliveShips = ships.filter((s) => !s.isSunk);
  const sunkCount = ships.filter((s) => s.isSunk).length;

  const handleLeave = () => {
    if (confirm('Return to port and abandon the engagement?')) {
      networkClient.leaveRoom();
    }
  };

  const handleFire = () => {
    if (aimDirection === 'port' || aimDirection === 'starboard') {
      fireBattery(aimDirection);
    } else {
      fireBattery('starboard');
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6 select-none z-20">
      {/* Debrief Modal upon match victory / conclusion */}
      <DebriefModal />

      {/* --- TOP SECTION: SHIP STATUS, FLEET STATS & UTILITIES --- */}
      <ShipStatusBar
        shipName={selfShip?.name || currentRoom?.name || 'Armada Vessel'}
        shipClass={selfShip?.shipClass || 'brig'}
        config={config}
        currentHp={currentHp}
        hpPercent={hpPercent}
        aliveCount={aliveShips.length}
        sunkCount={sunkCount}
        ping={ping}
        isMuted={isMuted}
        onToggleMute={() => setMuted(!isMuted)}
        onLeave={handleLeave}
      />

      {/* --- CENTER SECTION: AIMING RETICLE & BOUNDARY WARNING --- */}
      <AimCrosshair isAiming={isAiming} aimDirection={aimDirection} />
      <BoundaryWarningAlert />

      {/* Sunk Notice Overlay */}
      {selfShip?.isSunk && (
        <div className="self-center backdrop-blur-md bg-slate-950/90 px-8 py-4 rounded-2xl border border-rose-500/50 shadow-2xl flex flex-col items-center gap-2 animate-bounce pointer-events-auto">
          <h2 className="font-cinzel font-black text-rose-400 text-2xl tracking-wider">
            YOUR SHIP HAS SUNK
          </h2>
          <p className="text-xs text-slate-300">Spectating remaining fleet until match concludes...</p>
        </div>
      )}

      {/* --- BOTTOM SECTION: COMPASS MINIMAP, SPEED RIGGING, BROADSIDES & COMBAT LOG --- */}
      <div className="flex items-end justify-between w-full">
        {/* Left: Nautical Circular Compass Minimap */}
        <CompassMinimap
          selfShip={selfShip}
          ships={ships}
          selfId={selfId}
          windAngle={windAngle}
          windSpeed={windSpeed}
        />

        {/* Center: Sail Speed & Rudder Steering Control */}
        <SpeedRudderControl
          localSail={localSail}
          speedKnots={speedKnots}
          localRudder={localRudder}
          onChangeSail={changeSail}
          onSetRudder={setRudder}
        />

        {/* Right: Broadside Battery Reload & Combat Log Feed */}
        <div className="flex flex-col items-end gap-4">
          <CombatLogFeed logs={combatLogs} />
          <BroadsideGauges
            portProgress={portProgress}
            stbdProgress={stbdProgress}
            aimDirection={aimDirection}
            onFireBattery={handleFire}
          />
        </div>
      </div>
    </div>
  );
};
