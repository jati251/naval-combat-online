import React, { useRef, useCallback } from "react";
import { Anchor, Flame } from "lucide-react";
import { useGameStore } from "@/stores/useGameStore";
import { useShipActions } from "../../hooks/useShipActions";

// --- Constants ---
const JOYSTICK_RADIUS = 36; // Max drag distance in px
const DEADZONE = 4; // px deadzone before registering input
const NETWORK_THROTTLE_MS = 50; // ~20Hz network sync
const SPRING_BACK_MS = 180; // CSS transition duration for spring-back

export const MobileNavalControls: React.FC = () => {
  const { changeSail, setRudder, fireBattery } = useShipActions();

  const localSail = useGameStore((s) => s.localSail);
  const leftProgress = useGameStore((s) => s.leftReloadProgress);
  const rightProgress = useGameStore((s) => s.rightReloadProgress);

  // --- Refs for zero-rerender dragging ---
  const joystickRef = useRef<HTMLDivElement | null>(null);
  const wheelHubRef = useRef<HTMLDivElement | null>(null);
  const activePointerId = useRef<number | null>(null);
  const lastNetworkSync = useRef(0);
  const isDragging = useRef(false);
  const currentRudderValue = useRef(0);
  const springTransitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isLeftReady = leftProgress >= 1.0;
  const isRightReady = rightProgress >= 1.0;

  // --- Direct DOM manipulation for 60fps visual updates (no React re-renders) ---
  const updateWheelVisual = useCallback((deltaX: number, rudder: number, useTransition: boolean) => {
    const hub = wheelHubRef.current;
    if (!hub) return;
    if (useTransition) {
      hub.style.transition = `transform ${SPRING_BACK_MS}ms cubic-bezier(0.25, 1, 0.5, 1)`;
    } else {
      hub.style.transition = "none";
    }
    hub.style.transform = `translateX(${deltaX}px) rotate(${rudder * 65}deg)`;
  }, []);

  // --- Update border glow state ---
  const updateDragState = useCallback((active: boolean) => {
    const el = joystickRef.current;
    if (!el) return;
    if (active) {
      el.classList.add("border-amber-400", "ring-2", "ring-amber-400/50");
      el.classList.remove("border-amber-500/60");
    } else {
      el.classList.remove("border-amber-400", "ring-2", "ring-amber-400/50");
      el.classList.add("border-amber-500/60");
    }
  }, []);

  // --- Calculate rudder from pointer position ---
  const calculateRudder = useCallback((clientX: number): { deltaX: number; rudder: number } => {
    const rect = joystickRef.current?.getBoundingClientRect();
    if (!rect) return { deltaX: 0, rudder: 0 };
    const centerX = rect.left + rect.width * 0.5;
    const rawDelta = clientX - centerX;

    // Apply deadzone
    let effectiveDelta = rawDelta;
    if (Math.abs(rawDelta) < DEADZONE) {
      effectiveDelta = 0;
    }

    // Clamp to radius
    const deltaX = Math.max(-JOYSTICK_RADIUS, Math.min(JOYSTICK_RADIUS, effectiveDelta));
    const rudder = deltaX / JOYSTICK_RADIUS;
    return { deltaX, rudder };
  }, []);

  // =========================================================================
  //  POINTER EVENTS: Proper multi-touch isolation via setPointerCapture
  // =========================================================================

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    // Only capture if no active pointer is being tracked (first touch on this element)
    if (activePointerId.current !== null) return;

    e.preventDefault();
    e.stopPropagation();

    // Capture this specific pointer — all future move/up events route here
    // even if the finger slides outside the element boundary
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    activePointerId.current = e.pointerId;
    isDragging.current = true;

    // Clear any pending spring-back transition
    if (springTransitionTimer.current) {
      clearTimeout(springTransitionTimer.current);
      springTransitionTimer.current = null;
    }

    const { deltaX, rudder } = calculateRudder(e.clientX);
    currentRudderValue.current = rudder;

    updateWheelVisual(deltaX, rudder, false);
    updateDragState(true);

    // Immediate network sync on first touch
    lastNetworkSync.current = performance.now();
    setRudder(rudder);
  }, [calculateRudder, setRudder, updateWheelVisual, updateDragState]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    // Only process the pointer we're actively tracking
    if (e.pointerId !== activePointerId.current) return;

    e.preventDefault();
    e.stopPropagation();

    const { deltaX, rudder } = calculateRudder(e.clientX);
    currentRudderValue.current = rudder;

    // Instant visual update (no throttle, runs at display refresh rate)
    updateWheelVisual(deltaX, rudder, false);

    // Throttle network dispatch to ~20Hz to prevent packet storms
    const now = performance.now();
    if (now - lastNetworkSync.current >= NETWORK_THROTTLE_MS) {
      lastNetworkSync.current = now;
      setRudder(rudder);
    }
  }, [calculateRudder, setRudder, updateWheelVisual]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== activePointerId.current) return;

    e.preventDefault();
    e.stopPropagation();

    // Release pointer capture
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Pointer may already be released
    }

    activePointerId.current = null;
    isDragging.current = false;
    currentRudderValue.current = 0;

    // Smooth spring-back to center with CSS transition
    updateWheelVisual(0, 0, true);
    updateDragState(false);

    // Clear transition after animation completes to avoid interfering with next drag
    springTransitionTimer.current = setTimeout(() => {
      const hub = wheelHubRef.current;
      if (hub) hub.style.transition = "none";
      springTransitionTimer.current = null;
    }, SPRING_BACK_MS + 10);

    // Immediate network sync: rudder = 0
    lastNetworkSync.current = performance.now();
    setRudder(0);
  }, [setRudder, updateWheelVisual, updateDragState]);

  const handlePointerCancel = handlePointerUp;

  // =========================================================================
  //  BUTTON HANDLERS (Fire / Sail) — Touch + Mouse with ghost click guard
  // =========================================================================

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
      // Filter synthetic ghost click dispatched by mobile browser ~300ms after touchstart
      if (performance.now() - lastTouchHandledTime.current < 500) {
        return;
      }
      callback();
    },
    [],
  );

  // Anti-double-tap debounces for independent broadsides
  const lastLeftFireTimestamp = useRef<number>(0);
  const lastRightFireTimestamp = useRef<number>(0);

  const handleFireLeft = useCallback(() => {
    const now = performance.now();
    if (now - lastLeftFireTimestamp.current < 300) return;
    lastLeftFireTimestamp.current = now;
    if (isLeftReady) fireBattery("left");
  }, [fireBattery, isLeftReady]);

  const handleFireRight = useCallback(() => {
    const now = performance.now();
    if (now - lastRightFireTimestamp.current < 300) return;
    lastRightFireTimestamp.current = now;
    if (isRightReady) fireBattery("right");
  }, [fireBattery, isRightReady]);

  // Progress for radial cooldown rings (0 to 138, radius=22)
  const leftDashOffset = 138 - 138 * Math.min(1, leftProgress);
  const rightDashOffset = 138 - 138 * Math.min(1, rightProgress);

  return (
    <div className="fixed inset-x-0 bottom-0 pointer-events-none z-30 flex items-end justify-between p-2 sm:p-3 select-none touch-none">
      {/* =========================================================================
          LEFT THUMB: STEERING HELM & SAIL GEAR SHIFT (Asphalt / MLBB Style)
          ========================================================================= */}
      <div className="flex items-end gap-1.5 sm:gap-2 pointer-events-auto">
        {/* Virtual Ship Helm Joystick */}
        <div
          ref={joystickRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          className="relative w-18 h-18 sm:w-22 sm:h-22 rounded-full game-hud-glass border border-amber-500/50 shadow-xl flex items-center justify-center cursor-grab active:cursor-grabbing touch-none select-none"
          style={{ touchAction: "none" }}
        >
          {/* Cardinal Guides */}
          <div className="absolute inset-1 rounded-full border border-amber-400/20 pointer-events-none" />
          <div className="absolute top-0.5 text-[6.5px] sm:text-[7.5px] font-cinzel font-bold text-amber-400/70">
            ▲ AHEAD
          </div>
          <div className="absolute left-0.5 text-[6.5px] sm:text-[7.5px] font-cinzel font-bold text-amber-400/70">
            ◄ L
          </div>
          <div className="absolute right-0.5 text-[6.5px] sm:text-[7.5px] font-cinzel font-bold text-amber-400/70">
            R ►
          </div>

          {/* Draggable Wheel Hub */}
          <div
            ref={wheelHubRef}
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#18110a]/90 border border-amber-400 shadow-md flex items-center justify-center pointer-events-none"
            style={{ transform: "translateX(0px) rotate(0deg)" }}
          >
            <svg viewBox="0 0 100 100" className="w-8 h-8 sm:w-9 sm:h-9">
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

        {/* Compact Sail Gear Pills */}
        <div className="flex flex-col gap-0.5 game-hud-glass p-0.5 rounded-lg border border-amber-500/40 shadow-md">
          <button
            onTouchStart={handleTouchButton(() => changeSail("FULL_SAIL"))}
            onClick={handleClickButton(() => changeSail("FULL_SAIL"))}
            className={`px-1.5 py-0.5 rounded text-[7.5px] sm:text-[8px] font-cinzel font-bold uppercase tracking-wider transition-all touch-none active:scale-95 ${
              localSail === "FULL_SAIL"
                ? "bg-gradient-to-r from-emerald-600 to-emerald-800 text-emerald-100 border border-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.5)]"
                : "bg-black/40 text-stone-400 hover:text-stone-200"
            }`}
          >
            ▲ FULL
          </button>
          <button
            onTouchStart={handleTouchButton(() => changeSail("HALF_SAIL"))}
            onClick={handleClickButton(() => changeSail("HALF_SAIL"))}
            className={`px-1.5 py-0.5 rounded text-[7.5px] sm:text-[8px] font-cinzel font-bold uppercase tracking-wider transition-all touch-none active:scale-95 ${
              localSail === "HALF_SAIL"
                ? "bg-gradient-to-r from-amber-600 to-amber-800 text-amber-100 border border-amber-400 shadow-[0_0_6px_rgba(212,175,55,0.5)]"
                : "bg-black/40 text-stone-400 hover:text-stone-200"
            }`}
          >
            ● HALF
          </button>
          <button
            onTouchStart={handleTouchButton(() => changeSail("ANCHOR"))}
            onClick={handleClickButton(() => changeSail("ANCHOR"))}
            className={`px-1.5 py-0.5 rounded text-[7.5px] sm:text-[8px] font-cinzel font-bold uppercase tracking-wider transition-all touch-none active:scale-95 flex items-center justify-center gap-0.5 ${
              localSail === "ANCHOR"
                ? "bg-gradient-to-r from-rose-700 to-rose-900 text-rose-100 border border-rose-400 shadow-[0_0_6px_rgba(225,29,72,0.5)]"
                : "bg-black/40 text-stone-400 hover:text-stone-200"
            }`}
          >
            <Anchor className="w-2 h-2" />
            <span>HOLD</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          RIGHT THUMB: DUAL BROADSIDE GUNNERY CLUSTER
          ========================================================================= */}
      <div className="flex items-end gap-2 sm:gap-2.5 pointer-events-auto select-none touch-none">
        {/* DISCHARGE LEFT BATTERY */}
        <div className="relative flex items-center justify-center">
          {/* Radial Reload Ring SVG */}
          <svg className="absolute w-14 h-14 sm:w-16 sm:h-16 -rotate-90 pointer-events-none">
            <circle
              cx="50%"
              cy="50%"
              r="22"
              fill="none"
              stroke="#1a110a"
              strokeWidth="3"
            />
            <circle
              cx="50%"
              cy="50%"
              r="22"
              fill="none"
              stroke={isLeftReady ? "#fbbf24" : "#ef4444"}
              strokeWidth="3"
              strokeDasharray="138"
              strokeDashoffset={leftDashOffset}
              strokeLinecap="round"
              className="transition-all duration-75"
            />
          </svg>

          <button
            onTouchStart={handleTouchButton(handleFireLeft)}
            onClick={handleClickButton(handleFireLeft)}
            disabled={!isLeftReady}
            className={`w-11 h-11 sm:w-13 sm:h-13 rounded-full border transition-all flex flex-col items-center justify-center shadow-xl touch-none active:scale-90 cursor-pointer ${
              isLeftReady
                ? "bg-gradient-to-b from-rose-600 via-red-700 to-stone-950 border-amber-400 text-amber-100 shadow-[0_0_12px_rgba(239,68,68,0.7)] animate-pulse"
                : "bg-black/50 border-stone-800 text-stone-500 opacity-75 cursor-not-allowed"
            }`}
            title="Fire Left Battery"
            aria-label="Fire Left Battery"
          >
            <Flame
              className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isLeftReady ? "text-amber-300" : "text-stone-500"}`}
            />
            <span className="text-[7px] sm:text-[8px] font-cinzel font-black uppercase tracking-wider mt-0.5 gold-emboss">
              ◄ L
            </span>
          </button>
        </div>

        {/* DISCHARGE RIGHT BATTERY */}
        <div className="relative flex items-center justify-center">
          {/* Radial Reload Ring SVG */}
          <svg className="absolute w-14 h-14 sm:w-16 sm:h-16 -rotate-90 pointer-events-none">
            <circle
              cx="50%"
              cy="50%"
              r="22"
              fill="none"
              stroke="#1a110a"
              strokeWidth="3"
            />
            <circle
              cx="50%"
              cy="50%"
              r="22"
              fill="none"
              stroke={isRightReady ? "#fbbf24" : "#ef4444"}
              strokeWidth="3"
              strokeDasharray="138"
              strokeDashoffset={rightDashOffset}
              strokeLinecap="round"
              className="transition-all duration-75"
            />
          </svg>

          <button
            onTouchStart={handleTouchButton(handleFireRight)}
            onClick={handleClickButton(handleFireRight)}
            disabled={!isRightReady}
            className={`w-11 h-11 sm:w-13 sm:h-13 rounded-full border transition-all flex flex-col items-center justify-center shadow-xl touch-none active:scale-90 cursor-pointer ${
              isRightReady
                ? "bg-gradient-to-b from-rose-600 via-red-700 to-stone-950 border-amber-400 text-amber-100 shadow-[0_0_12px_rgba(239,68,68,0.7)] animate-pulse"
                : "bg-black/50 border-stone-800 text-stone-500 opacity-75 cursor-not-allowed"
            }`}
            title="Fire Right Battery"
            aria-label="Fire Right Battery"
          >
            <Flame
              className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isRightReady ? "text-amber-300" : "text-stone-500"}`}
            />
            <span className="text-[7px] sm:text-[8px] font-cinzel font-black uppercase tracking-wider mt-0.5 gold-emboss">
              R ►
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
