import React, { useRef, useState, useCallback } from 'react';
import { Anchor, Flame, Crosshair } from 'lucide-react';
import { useGameStore } from '@/stores/useGameStore';
import { useShipActions } from '../../hooks/useShipActions';

export const MobileNavalControls: React.FC = () => {
  const { changeSail, setRudder, setAim, fireBattery } = useShipActions();

  const localSail = useGameStore((s) => s.localSail);
  const localRudder = useGameStore((s) => s.localRudder);
  const portProgress = useGameStore((s) => s.portReloadProgress);
  const stbdProgress = useGameStore((s) => s.starboardReloadProgress);
  const aimDirection = useGameStore((s) => s.aimDirection);

  const joystickRef = useRef<HTMLDivElement | null>(null);
  const [isDraggingWheel, setIsDraggingWheel] = useState(false);
  const [wheelVisualX, setWheelVisualX] = useState(0);
  const lastNetworkSync = useRef(0);
  const currentTouchRudder = useRef(0);

  const isPortReady = portProgress >= 1.0;
  const isStbdReady = stbdProgress >= 1.0;
  const isAimingPort = aimDirection === 'port';
  const isAimingStbd = aimDirection === 'starboard';

  const canFire = (isAimingPort && isPortReady) || (isAimingStbd && isStbdReady) || (aimDirection === 'none' && (isPortReady || isStbdReady));

  // --- Left Thumb: Virtual Helm Steering Touch Handlers ---
  const handleTouchStartWheel = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    setIsDraggingWheel(true);
    const touch = e.touches[0];
    if (!joystickRef.current) return;
    const rect = joystickRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width * 0.5;
    const deltaX = Math.max(-42, Math.min(42, touch.clientX - centerX));
    setWheelVisualX(deltaX);
    const rudder = deltaX / 42;
    currentTouchRudder.current = rudder;
    lastNetworkSync.current = performance.now();
    setRudder(rudder);
  }, [setRudder]);

  const handleTouchMoveWheel = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    if (!joystickRef.current) return;
    const touch = e.touches[0];
    const rect = joystickRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width * 0.5;
    const deltaX = Math.max(-42, Math.min(42, touch.clientX - centerX));
    setWheelVisualX(deltaX);
    const rudder = deltaX / 42;
    currentTouchRudder.current = rudder;

    // Throttle WebSocket dispatch to 20Hz (~50ms) to prevent network packet storms
    const now = performance.now();
    if (now - lastNetworkSync.current >= 50) {
      lastNetworkSync.current = now;
      setRudder(rudder);
    }
  }, [setRudder]);

  const handleTouchEndWheel = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    setIsDraggingWheel(false);
    setWheelVisualX(0);
    currentTouchRudder.current = 0;
    lastNetworkSync.current = performance.now();
    setRudder(0);
  }, [setRudder]);

  // Anti-double-fire timestamp debounce
  const lastFireTimestamp = useRef<number>(0);

  // Handle Salvo Fire (Guaranteed single side per user action)
  const handleFireSalvo = useCallback((e?: React.TouchEvent | React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      if ('preventDefault' in e && e.cancelable) e.preventDefault();
    }

    const now = performance.now();
    // Guard against synthetic click events or rapid double-tap (minimum 350ms cooldown)
    if (now - lastFireTimestamp.current < 350) return;
    lastFireTimestamp.current = now;

    if (aimDirection === 'port') {
      if (isPortReady) fireBattery('port');
    } else if (aimDirection === 'starboard') {
      if (isStbdReady) fireBattery('starboard');
    } else {
      // Default: Fire whichever single battery is ready (never both!)
      if (isStbdReady) {
        fireBattery('starboard');
      } else if (isPortReady) {
        fireBattery('port');
      }
    }
  }, [aimDirection, fireBattery, isPortReady, isStbdReady]);

  // Handle Aim Toggle (Safe touch / click single dispatch)
  const handleToggleAim = useCallback((targetSide: 'port' | 'starboard', e: React.TouchEvent | React.MouseEvent) => {
    e.stopPropagation();
    if ('preventDefault' in e && e.cancelable) e.preventDefault();
    const isCurrentlyAiming = aimDirection === targetSide;
    setAim(isCurrentlyAiming ? 'none' : targetSide, !isCurrentlyAiming);
  }, [aimDirection, setAim]);

  // Progress for radial cooldown ring (0 to 1)
  const activeCooldownProgress = isAimingPort ? portProgress : isAimingStbd ? stbdProgress : Math.max(portProgress, stbdProgress);
  const ringDashOffset = 188 - 188 * Math.min(1, activeCooldownProgress);

  return (
    <div className="fixed inset-x-0 bottom-0 pointer-events-none z-30 flex items-end justify-between p-2.5 sm:p-4 select-none touch-none">
      {/* =========================================================================
          LEFT THUMB: STEERING HELM & SAIL GEAR SHIFT (Asphalt / MLBB Style)
          ========================================================================= */}
      <div className="flex items-end gap-2 sm:gap-3 pointer-events-auto">
        {/* Virtual Mahogany Ship Helm Joystick */}
        <div
          ref={joystickRef}
          onTouchStart={handleTouchStartWheel}
          onTouchMove={handleTouchMoveWheel}
          onTouchEnd={handleTouchEndWheel}
          onTouchCancel={handleTouchEndWheel}
          className={`relative w-24 h-24 sm:w-28 sm:h-28 rounded-full pirate-panel border-2 ${isDraggingWheel ? 'border-amber-400 ring-2 ring-amber-400/50' : 'border-amber-500/60'} shadow-2xl flex items-center justify-center cursor-grab active:cursor-grabbing touch-none select-none`}
        >
          {/* Outer Brass Ring with Cardinal Guides */}
          <div className="absolute inset-1 rounded-full border border-amber-400/30 pointer-events-none" />
          <div className="absolute top-1 text-[7px] sm:text-[8px] font-cinzel font-bold text-amber-400/80">▲ AHEAD</div>
          <div className="absolute left-1 text-[7px] sm:text-[8px] font-cinzel font-bold text-amber-400/80">◄ PORT</div>
          <div className="absolute right-1 text-[7px] sm:text-[8px] font-cinzel font-bold text-amber-400/80">STBD ►</div>

          {/* Draggable Mahogany Ship's Wheel Hub */}
          <div
            className="w-14 h-14 sm:w-18 sm:h-18 rounded-full bg-[#2a1d13] border-2 border-amber-400 shadow-xl flex items-center justify-center transition-transform duration-75"
            style={{
              transform: `translateX(${wheelVisualX}px) rotate(${localRudder * 65}deg)`,
            }}
          >
            <svg viewBox="0 0 100 100" className="w-10 h-10 sm:w-14 sm:h-14">
              <circle cx="50" cy="50" r="38" fill="none" stroke="#3e2723" strokeWidth="4" />
              <circle cx="50" cy="50" r="35" fill="none" stroke="#d4af37" strokeWidth="2" />
              <circle cx="50" cy="50" r="16" fill="#1c140e" stroke="#d4af37" strokeWidth="2" />
              <circle cx="50" cy="50" r="7" fill="#d4af37" />
              {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
                <line
                  key={deg}
                  x1="50"
                  y1="5"
                  x2="50"
                  y2="42"
                  stroke="#d4af37"
                  strokeWidth="3"
                  strokeLinecap="round"
                  transform={`rotate(${deg} 50 50)`}
                />
              ))}
            </svg>
          </div>
        </div>

        {/* Tactical Sail Gear Lever Buttons (Asphalt Shift Style) */}
        <div className="flex flex-col gap-1 pirate-parchment p-1 rounded-md border border-amber-500/50 shadow-xl">
          <button
            onTouchStart={(e) => { e.stopPropagation(); changeSail('FULL_SAIL'); }}
            onClick={() => changeSail('FULL_SAIL')}
            className={`px-2 py-1 rounded text-[8px] sm:text-[9px] font-cinzel font-bold uppercase tracking-wider transition-all touch-none active:scale-95 ${
              localSail === 'FULL_SAIL'
                ? 'bg-gradient-to-r from-emerald-600 to-emerald-800 text-emerald-100 border border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                : 'bg-stone-950/80 text-stone-300 border border-stone-800'
            }`}
          >
            ▲ FULL
          </button>
          <button
            onTouchStart={(e) => { e.stopPropagation(); changeSail('HALF_SAIL'); }}
            onClick={() => changeSail('HALF_SAIL')}
            className={`px-2 py-1 rounded text-[8px] sm:text-[9px] font-cinzel font-bold uppercase tracking-wider transition-all touch-none active:scale-95 ${
              localSail === 'HALF_SAIL'
                ? 'bg-gradient-to-r from-amber-600 to-amber-800 text-amber-100 border border-amber-400 shadow-[0_0_8px_rgba(212,175,55,0.5)]'
                : 'bg-stone-950/80 text-stone-300 border border-stone-800'
            }`}
          >
            ● BATTLE
          </button>
          <button
            onTouchStart={(e) => { e.stopPropagation(); changeSail('ANCHOR'); }}
            onClick={() => changeSail('ANCHOR')}
            className={`px-2 py-1 rounded text-[8px] sm:text-[9px] font-cinzel font-bold uppercase tracking-wider transition-all touch-none active:scale-95 flex items-center justify-center gap-1 ${
              localSail === 'ANCHOR'
                ? 'bg-gradient-to-r from-rose-700 to-rose-900 text-rose-100 border border-rose-400 shadow-[0_0_8px_rgba(225,29,72,0.5)]'
                : 'bg-stone-950/80 text-stone-300 border border-stone-800'
            }`}
          >
            <Anchor className="w-2.5 h-2.5" />
            <span>ANCHOR</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          RIGHT THUMB: ARTILLERY SALVO & BROADSIDE AIM (Mobile Legends Skill Style)
          ========================================================================= */}
      <div className="relative flex items-end justify-end pointer-events-auto select-none touch-none">
        {/* Aim Port Battery (Skill 1 position) */}
        <button
          onTouchStart={(e) => handleToggleAim('port', e)}
          onClick={(e) => handleToggleAim('port', e)}
          className={`absolute -top-12 sm:-top-14 right-16 sm:right-22 w-11 h-11 sm:w-13 sm:h-13 rounded-full border-2 flex flex-col items-center justify-center transition-all shadow-xl touch-none active:scale-95 cursor-pointer ${
            isAimingPort
              ? 'bg-amber-500 text-stone-950 border-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.6)] scale-105'
              : isPortReady
              ? 'pirate-panel border-amber-400 text-amber-200 shadow-md'
              : 'bg-stone-950/80 border-stone-800 text-stone-500'
          }`}
          title="Aim Port Battery (Q)"
        >
          <Crosshair className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span className="text-[7px] sm:text-[8px] font-cinzel font-bold uppercase tracking-wider mt-0.5">
            PORT
          </span>
          <span className="text-[6px] sm:text-[7px] font-mono opacity-80">
            {isPortReady ? 'READY' : `${Math.round(portProgress * 100)}%`}
          </span>
        </button>

        {/* Aim Starboard Battery (Skill 2 position) */}
        <button
          onTouchStart={(e) => handleToggleAim('starboard', e)}
          onClick={(e) => handleToggleAim('starboard', e)}
          className={`absolute -top-20 sm:-top-24 right-3 sm:right-5 w-11 h-11 sm:w-13 sm:h-13 rounded-full border-2 flex flex-col items-center justify-center transition-all shadow-xl touch-none active:scale-95 cursor-pointer ${
            isAimingStbd
              ? 'bg-amber-500 text-stone-950 border-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.6)] scale-105'
              : isStbdReady
              ? 'pirate-panel border-amber-400 text-amber-200 shadow-md'
              : 'bg-stone-950/80 border-stone-800 text-stone-500'
          }`}
          title="Aim Starboard Battery (E)"
        >
          <Crosshair className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span className="text-[7px] sm:text-[8px] font-cinzel font-bold uppercase tracking-wider mt-0.5">
            STBD
          </span>
          <span className="text-[6px] sm:text-[7px] font-mono opacity-80">
            {isStbdReady ? 'READY' : `${Math.round(stbdProgress * 100)}%`}
          </span>
        </button>

        {/* Main Fire Salvo Action Button (Attack Button Position) */}
        <div className="relative flex items-center justify-center">
          {/* Radial Reload Ring SVG */}
          <svg className="absolute w-20 h-20 sm:w-24 sm:h-24 -rotate-90 pointer-events-none">
            <circle
              cx="50%"
              cy="50%"
              r="27"
              fill="none"
              stroke="#291c13"
              strokeWidth="3.5"
            />
            <circle
              cx="50%"
              cy="50%"
              r="27"
              fill="none"
              stroke={canFire ? '#fbbf24' : '#ef4444'}
              strokeWidth="3.5"
              strokeDasharray="188"
              strokeDashoffset={ringDashOffset}
              strokeLinecap="round"
              className="transition-all duration-75"
            />
          </svg>

          <button
            onTouchStart={handleFireSalvo}
            onClick={handleFireSalvo}
            className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 transition-all flex flex-col items-center justify-center shadow-2xl touch-none active:scale-90 cursor-pointer ${
              canFire
                ? 'bg-gradient-to-b from-rose-600 via-red-700 to-stone-950 border-amber-400 text-amber-100 ember-glow animate-pulse'
                : 'pirate-panel border-amber-600/40 text-stone-500'
            }`}
            title="Discharge Salvo (Space / LMB)"
          >
            <Flame className={`w-5 h-5 sm:w-6 sm:h-6 ${canFire ? 'text-amber-300' : 'text-stone-500'}`} />
            <span className="text-[8px] sm:text-[9px] font-cinzel font-black uppercase tracking-wider mt-0.5 gold-emboss">
              FIRE
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
