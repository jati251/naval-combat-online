import React, { useRef, useState, useCallback } from "react";
import { Anchor, Flame } from "lucide-react";
import { useGameStore } from "@/stores/useGameStore";
import { useShipActions } from "../../hooks/useShipActions";

export const MobileNavalControls: React.FC = () => {
  const { changeSail, setRudder, fireBattery } = useShipActions();

  const localSail = useGameStore((s) => s.localSail);
  const localRudder = useGameStore((s) => s.localRudder);
  const leftProgress = useGameStore((s) => s.leftReloadProgress);
  const rightProgress = useGameStore((s) => s.rightReloadProgress);

  const joystickRef = useRef<HTMLDivElement | null>(null);
  const [isDraggingWheel, setIsDraggingWheel] = useState(false);
  const [wheelVisualX, setWheelVisualX] = useState(0);
  const lastNetworkSync = useRef(0);
  const currentTouchRudder = useRef(0);

  const isLeftReady = leftProgress >= 1.0;
  const isRightReady = rightProgress >= 1.0;

  // --- Left Thumb: Virtual Helm Steering Touch Handlers ---
  const handleTouchStartWheel = useCallback(
    (e: React.TouchEvent) => {
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
    },
    [setRudder],
  );

  const handleTouchMoveWheel = useCallback(
    (e: React.TouchEvent) => {
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
    },
    [setRudder],
  );

  const handleTouchEndWheel = useCallback(
    (e: React.TouchEvent) => {
      e.stopPropagation();
      setIsDraggingWheel(false);
      setWheelVisualX(0);
      currentTouchRudder.current = 0;
      lastNetworkSync.current = performance.now();
      setRudder(0);
    },
    [setRudder],
  );

  // Track last touch timestamp to filter out synthetic ghost clicks dispatched 300ms after touchstart
  const lastTouchHandledTime = useRef<number>(0);

  const handleTouchButton = useCallback(
    (callback: () => void) => (e: React.TouchEvent) => {
      e.stopPropagation();
      lastTouchHandledTime.current = performance.now();
      callback();
    },
    [],
  );

  const handleClickButton = useCallback(
    (callback: () => void) => (e: React.MouseEvent) => {
      e.stopPropagation();
      // Filter out synthetic ghost click dispatched by mobile browser after touchstart
      if (performance.now() - lastTouchHandledTime.current < 500) {
        return;
      }
      callback();
    },
    [],
  );

  // Anti-double-tap and anti-spam debounces for independent broadsides
  const lastLeftFireTimestamp = useRef<number>(0);
  const lastRightFireTimestamp = useRef<number>(0);

  // Direct Left Broadside Fire (Discharges Left Battery)
  const handleFireLeft = useCallback(() => {
    const now = performance.now();
    if (now - lastLeftFireTimestamp.current < 300) return;
    lastLeftFireTimestamp.current = now;

    if (isLeftReady) {
      fireBattery("left");
    }
  }, [fireBattery, isLeftReady]);

  // Direct Right Broadside Fire (Discharges Right Battery)
  const handleFireRight = useCallback(() => {
    const now = performance.now();
    if (now - lastRightFireTimestamp.current < 300) return;
    lastRightFireTimestamp.current = now;

    if (isRightReady) {
      fireBattery("right");
    }
  }, [fireBattery, isRightReady]);

  // Progress for radial cooldown rings (0 to 188)
  const leftDashOffset = 188 - 188 * Math.min(1, leftProgress);
  const rightDashOffset = 188 - 188 * Math.min(1, rightProgress);

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
          className={`relative w-24 h-24 sm:w-28 sm:h-28 rounded-full pirate-panel border-2 ${
            isDraggingWheel
              ? "border-amber-400 ring-2 ring-amber-400/50"
              : "border-amber-500/60"
          } shadow-2xl flex items-center justify-center cursor-grab active:cursor-grabbing touch-none select-none`}
        >
          {/* Outer Brass Ring with Cardinal Guides */}
          <div className="absolute inset-1 rounded-full border border-amber-400/30 pointer-events-none" />
          <div className="absolute top-1 text-[7px] sm:text-[8px] font-cinzel font-bold text-amber-400/80">
            ▲ AHEAD
          </div>
          <div className="absolute left-1 text-[7px] sm:text-[8px] font-cinzel font-bold text-amber-400/80">
            ◄ LEFT
          </div>
          <div className="absolute right-1 text-[7px] sm:text-[8px] font-cinzel font-bold text-amber-400/80">
            RIGHT ►
          </div>

          {/* Draggable Mahogany Ship's Wheel Hub */}
          <div
            className="w-14 h-14 sm:w-18 sm:h-18 rounded-full bg-[#2a1d13] border-2 border-amber-400 shadow-xl flex items-center justify-center transition-transform duration-75"
            style={{
              transform: `translateX(${wheelVisualX}px) rotate(${localRudder * 65}deg)`,
            }}
          >
            <svg viewBox="0 0 100 100" className="w-10 h-10 sm:w-14 sm:h-14">
              <circle
                cx="50"
                cy="50"
                r="38"
                fill="none"
                stroke="#3e2723"
                strokeWidth="4"
              />
              <circle
                cx="50"
                cy="50"
                r="35"
                fill="none"
                stroke="#d4af37"
                strokeWidth="2"
              />
              <circle
                cx="50"
                cy="50"
                r="16"
                fill="#1c140e"
                stroke="#d4af37"
                strokeWidth="2"
              />
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
            onTouchStart={handleTouchButton(() => changeSail("FULL_SAIL"))}
            onClick={handleClickButton(() => changeSail("FULL_SAIL"))}
            className={`px-2 py-1 rounded text-[8px] sm:text-[9px] font-cinzel font-bold uppercase tracking-wider transition-all touch-none active:scale-95 ${
              localSail === "FULL_SAIL"
                ? "bg-gradient-to-r from-emerald-600 to-emerald-800 text-emerald-100 border border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                : "bg-stone-950/80 text-stone-300 border border-stone-800"
            }`}
          >
            ▲ FULL
          </button>
          <button
            onTouchStart={handleTouchButton(() => changeSail("HALF_SAIL"))}
            onClick={handleClickButton(() => changeSail("HALF_SAIL"))}
            className={`px-2 py-1 rounded text-[8px] sm:text-[9px] font-cinzel font-bold uppercase tracking-wider transition-all touch-none active:scale-95 ${
              localSail === "HALF_SAIL"
                ? "bg-gradient-to-r from-amber-600 to-amber-800 text-amber-100 border border-amber-400 shadow-[0_0_8px_rgba(212,175,55,0.5)]"
                : "bg-stone-950/80 text-stone-300 border border-stone-800"
            }`}
          >
            ● BATTLE
          </button>
          <button
            onTouchStart={handleTouchButton(() => changeSail("ANCHOR"))}
            onClick={handleClickButton(() => changeSail("ANCHOR"))}
            className={`px-2 py-1 rounded text-[8px] sm:text-[9px] font-cinzel font-bold uppercase tracking-wider transition-all touch-none active:scale-95 flex items-center justify-center gap-1 ${
              localSail === "ANCHOR"
                ? "bg-gradient-to-r from-rose-700 to-rose-900 text-rose-100 border border-rose-400 shadow-[0_0_8px_rgba(225,29,72,0.5)]"
                : "bg-stone-950/80 text-stone-300 border border-stone-800"
            }`}
          >
            <Anchor className="w-2.5 h-2.5" />
            <span>ANCHOR</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          RIGHT THUMB: DIRECT BROADSIDE SHOOTING (LEFT & RIGHT FIRE BUTTONS)
          ========================================================================= */}
      <div className="flex items-end gap-3 sm:gap-4 pointer-events-auto select-none touch-none">
        {/* DIRECT SHOOT LEFT BUTTON (DISCHARGES LEFT BATTERY) */}
        <div className="relative flex items-center justify-center">
          {/* Radial Reload Ring SVG */}
          <svg className="absolute w-18 h-18 sm:w-22 sm:h-22 -rotate-90 pointer-events-none">
            <circle
              cx="50%"
              cy="50%"
              r="30"
              fill="none"
              stroke="#291c13"
              strokeWidth="3.5"
            />
            <circle
              cx="50%"
              cy="50%"
              r="30"
              fill="none"
              stroke={isLeftReady ? "#fbbf24" : "#ef4444"}
              strokeWidth="3.5"
              strokeDasharray="188"
              strokeDashoffset={leftDashOffset}
              strokeLinecap="round"
              className="transition-all duration-75"
            />
          </svg>

          <button
            onTouchStart={handleTouchButton(handleFireLeft)}
            onClick={handleClickButton(handleFireLeft)}
            disabled={!isLeftReady}
            className={`w-15 h-15 sm:w-18 sm:h-18 rounded-full border-2 transition-all flex flex-col items-center justify-center shadow-2xl touch-none active:scale-90 cursor-pointer ${
              isLeftReady
                ? "bg-gradient-to-b from-rose-600 via-red-700 to-stone-950 border-amber-400 text-amber-100 shadow-[0_0_15px_rgba(239,68,68,0.6)] animate-pulse"
                : "pirate-panel border-stone-800 text-stone-500 opacity-80 cursor-not-allowed"
            }`}
            title="Fire Left Battery"
            aria-label="Fire Left Battery"
          >
            <Flame
              className={`w-4 h-4 sm:w-5 sm:h-5 ${isLeftReady ? "text-amber-300" : "text-stone-500"}`}
            />
            <span className="text-[7.5px] sm:text-[9px] font-cinzel font-black uppercase tracking-wider mt-0.5 gold-emboss">
              ◄ Left
            </span>
            <span className="text-[6px] sm:text-[7px] font-mono font-bold opacity-90">
              {isLeftReady ? "READY" : `${Math.round(leftProgress * 100)}%`}
            </span>
          </button>
        </div>

        {/* DIRECT SHOOT RIGHT BUTTON (DISCHARGES RIGHT BATTERY) */}
        <div className="relative flex items-center justify-center">
          {/* Radial Reload Ring SVG */}
          <svg className="absolute w-18 h-18 sm:w-22 sm:h-22 -rotate-90 pointer-events-none">
            <circle
              cx="50%"
              cy="50%"
              r="30"
              fill="none"
              stroke="#291c13"
              strokeWidth="3.5"
            />
            <circle
              cx="50%"
              cy="50%"
              r="30"
              fill="none"
              stroke={isRightReady ? "#fbbf24" : "#ef4444"}
              strokeWidth="3.5"
              strokeDasharray="188"
              strokeDashoffset={rightDashOffset}
              strokeLinecap="round"
              className="transition-all duration-75"
            />
          </svg>

          <button
            onTouchStart={handleTouchButton(handleFireRight)}
            onClick={handleClickButton(handleFireRight)}
            disabled={!isRightReady}
            className={`w-15 h-15 sm:w-18 sm:h-18 rounded-full border-2 transition-all flex flex-col items-center justify-center shadow-2xl touch-none active:scale-90 cursor-pointer ${
              isRightReady
                ? "bg-gradient-to-b from-rose-600 via-red-700 to-stone-950 border-amber-400 text-amber-100 shadow-[0_0_15px_rgba(239,68,68,0.6)] animate-pulse"
                : "pirate-panel border-stone-800 text-stone-500 opacity-80 cursor-not-allowed"
            }`}
            title="Fire Right Battery"
            aria-label="Fire Right Battery"
          >
            <Flame
              className={`w-4 h-4 sm:w-5 sm:h-5 ${isRightReady ? "text-amber-300" : "text-stone-500"}`}
            />
            <span className="text-[7.5px] sm:text-[9px] font-cinzel font-black uppercase tracking-wider mt-0.5 gold-emboss">
              Right ►
            </span>
            <span className="text-[6px] sm:text-[7px] font-mono font-bold opacity-90">
              {isRightReady ? "READY" : `${Math.round(rightProgress * 100)}%`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
