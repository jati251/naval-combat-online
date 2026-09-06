import React, { useRef, useCallback } from "react";
import { Anchor, Flame } from "lucide-react";
import { useGameStore } from "@/stores/useGameStore";
import { useShipActions } from "../../hooks/useShipActions";

// --- Constants ---
const JOYSTICK_RADIUS = 48; // Max drag distance in px
const DEADZONE = 4; // px deadzone before registering input
const NETWORK_THROTTLE_MS = 50; // ~20Hz network sync
const SPRING_BACK_MS = 180; // CSS transition duration for spring-back

export const MobileNavalControls: React.FC = () => {
  const { changeSail, setRudder, fireBattery } = useShipActions();

  const localSail = useGameStore((s) => s.localSail);
  const leftProgress = useGameStore((s) => s.leftReloadProgress);
  const rightProgress = useGameStore((s) => s.rightReloadProgress);
  const speedKnots = useGameStore((s) => {
    const ship = s.ships.find((ship) => ship.id === s.selfId);
    return (Math.round((ship?.speed ?? 0) * 10) / 10).toFixed(1);
  });

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

  // --- Direct DOM manipulation for 60fps visual updates ---
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
      el.classList.remove("border-amber-500/50");
    } else {
      el.classList.remove("border-amber-400", "ring-2", "ring-amber-400/50");
      el.classList.add("border-amber-500/50");
    }
  }, []);

  // --- Calculate rudder from pointer position ---
  const calculateRudder = useCallback((clientX: number): { deltaX: number; rudder: number } => {
    const rect = joystickRef.current?.getBoundingClientRect();
    if (!rect) return { deltaX: 0, rudder: 0 };
    const centerX = rect.left + rect.width * 0.5;
    const rawDelta = clientX - centerX;

    let effectiveDelta = rawDelta;
    if (Math.abs(rawDelta) < DEADZONE) {
      effectiveDelta = 0;
    }

    const deltaX = Math.max(-JOYSTICK_RADIUS, Math.min(JOYSTICK_RADIUS, effectiveDelta));
    const rudder = deltaX / JOYSTICK_RADIUS;
    return { deltaX, rudder };
  }, []);

  // Pointer events with multi-touch isolation
  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerId.current !== null) return;

    e.preventDefault();
    e.stopPropagation();

    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    activePointerId.current = e.pointerId;
    isDragging.current = true;

    if (springTransitionTimer.current) {
      clearTimeout(springTransitionTimer.current);
      springTransitionTimer.current = null;
    }

    const { deltaX, rudder } = calculateRudder(e.clientX);
    currentRudderValue.current = rudder;

    updateWheelVisual(deltaX, rudder, false);
    updateDragState(true);

    lastNetworkSync.current = performance.now();
    setRudder(rudder);
  }, [calculateRudder, setRudder, updateWheelVisual, updateDragState]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== activePointerId.current) return;

    e.preventDefault();
    e.stopPropagation();

    const { deltaX, rudder } = calculateRudder(e.clientX);
    currentRudderValue.current = rudder;

    updateWheelVisual(deltaX, rudder, false);

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

    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Pointer might already be released
    }

    activePointerId.current = null;
    isDragging.current = false;
    currentRudderValue.current = 0;

    updateWheelVisual(0, 0, true);
    updateDragState(false);

    springTransitionTimer.current = setTimeout(() => {
      const hub = wheelHubRef.current;
      if (hub) hub.style.transition = "none";
      springTransitionTimer.current = null;
    }, SPRING_BACK_MS + 10);

    lastNetworkSync.current = performance.now();
    setRudder(0);
  }, [setRudder, updateWheelVisual, updateDragState]);

  const handlePointerCancel = handlePointerUp;

  // Button handlers with ghost-click guards
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
      if (performance.now() - lastTouchHandledTime.current < 500) {
        return;
      }
      callback();
    },
    [],
  );

  // Anti-double-tap debounces for guns
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

  // Cooldown radial arc calculation (0 to 214, radius=34)
  const leftDashOffset = 214 - 214 * Math.min(1, leftProgress);
  const rightDashOffset = 214 - 214 * Math.min(1, rightProgress);

  return (
    <div className="fixed inset-x-0 bottom-0 pointer-events-none z-30 flex items-end justify-between p-3 sm:p-5 select-none touch-none pb-safe">
      {/* =========================================================================
          LEFT CLUSTER: FLOATING NAUTICAL HELM & ENGINE TELEGRAPH
          ========================================================================= */}
      <div className="pointer-events-auto flex flex-col items-start select-none">
        {/* Floating Speed & Sail Status Header */}
        <div className="flex items-center gap-2 mb-2">
          <div className="px-3 py-1 rounded-full bg-stone-950/85 backdrop-blur-md border border-amber-500/40 shadow-xl flex items-baseline gap-1">
            <span className="text-base sm:text-lg font-cinzel font-black text-amber-100 gold-emboss tabular-nums">
              {speedKnots}
            </span>
            <span className="text-[8px] sm:text-[9px] font-cinzel font-bold text-amber-400/90 uppercase tracking-wider">
              KTS
            </span>
          </div>

          <span
            className={`text-[8.5px] sm:text-[9.5px] font-cinzel font-bold tracking-wider uppercase px-2.5 py-1 rounded-full backdrop-blur-md shadow-lg ${
              localSail === "FULL_SAIL"
                ? "bg-emerald-950/90 text-emerald-300 border border-emerald-500/60 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                : localSail === "HALF_SAIL"
                ? "bg-amber-950/90 text-amber-300 border border-amber-500/60 shadow-[0_0_8px_rgba(245,158,11,0.3)]"
                : "bg-rose-950/90 text-rose-300 border border-rose-500/60 shadow-[0_0_8px_rgba(244,63,94,0.3)]"
            }`}
          >
            {localSail === "FULL_SAIL" ? "FULL RIG" : localSail === "HALF_SAIL" ? "BATTLE" : "ANCHOR"}
          </span>
        </div>

        {/* Helm & Sail Selectors */}
        <div className="flex items-center gap-3">
          {/* Virtual Steering Wheel (Large Floating Binnacle) */}
          <div
            ref={joystickRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-gradient-to-b from-stone-900/90 via-stone-950/95 to-black/95 border-2 border-amber-500/60 shadow-[0_4px_24px_rgba(0,0,0,0.85)] flex items-center justify-center cursor-grab active:cursor-grabbing touch-none select-none shrink-0"
            style={{ touchAction: "none" }}
          >
            {/* Cardinal Navigation Guides */}
            <div className="absolute inset-1 rounded-full border border-amber-400/20 pointer-events-none" />
            <div className="absolute top-1.5 text-[7.5px] sm:text-[8.5px] font-cinzel font-bold text-amber-400/75">
              ▲ AHEAD
            </div>
            <div className="absolute left-2 text-[7.5px] sm:text-[8.5px] font-cinzel font-bold text-amber-400/75">
              ◄ PORT
            </div>
            <div className="absolute right-2 text-[7.5px] sm:text-[8.5px] font-cinzel font-bold text-amber-400/75">
              STARB ►
            </div>

            {/* Draggable Wheel Hub */}
            <div
              ref={wheelHubRef}
              className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-[#18110a]/95 border-2 border-amber-400/90 shadow-[0_0_12px_rgba(0,0,0,0.8)] flex items-center justify-center pointer-events-none"
              style={{ transform: "translateX(0px) rotate(0deg)" }}
            >
              <svg viewBox="0 0 100 100" className="w-13 h-13 sm:w-15 sm:h-15">
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
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    transform={`rotate(${deg} 50 50)`}
                  />
                ))}
              </svg>
            </div>
          </div>

          {/* Floating Sail Selector (Engine Order Telegraph) */}
          <div className="flex flex-col gap-1.5">
            <button
              onTouchStart={handleTouchButton(() => changeSail("FULL_SAIL"))}
              onClick={handleClickButton(() => changeSail("FULL_SAIL"))}
              className={`px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl text-[9.5px] sm:text-[10.5px] font-cinzel font-bold uppercase tracking-wider transition-all touch-none active:scale-95 flex items-center gap-1.5 shadow-lg backdrop-blur-md cursor-pointer ${
                localSail === "FULL_SAIL"
                  ? "bg-gradient-to-r from-emerald-600 to-emerald-800 text-emerald-100 border border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.6)]"
                  : "bg-stone-950/85 text-stone-300 hover:text-white border border-stone-800"
              }`}
            >
              <span>▲</span>
              <span>FULL</span>
            </button>
            <button
              onTouchStart={handleTouchButton(() => changeSail("HALF_SAIL"))}
              onClick={handleClickButton(() => changeSail("HALF_SAIL"))}
              className={`px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl text-[9.5px] sm:text-[10.5px] font-cinzel font-bold uppercase tracking-wider transition-all touch-none active:scale-95 flex items-center gap-1.5 shadow-lg backdrop-blur-md cursor-pointer ${
                localSail === "HALF_SAIL"
                  ? "bg-gradient-to-r from-amber-600 to-amber-800 text-amber-100 border border-amber-400 shadow-[0_0_12px_rgba(212,175,55,0.6)]"
                  : "bg-stone-950/85 text-stone-300 hover:text-white border border-stone-800"
              }`}
            >
              <span>●</span>
              <span>HALF</span>
            </button>
            <button
              onTouchStart={handleTouchButton(() => changeSail("ANCHOR"))}
              onClick={handleClickButton(() => changeSail("ANCHOR"))}
              className={`px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl text-[9.5px] sm:text-[10.5px] font-cinzel font-bold uppercase tracking-wider transition-all touch-none active:scale-95 flex items-center justify-center gap-1.5 shadow-lg backdrop-blur-md cursor-pointer ${
                localSail === "ANCHOR"
                  ? "bg-gradient-to-r from-rose-700 to-rose-900 text-rose-100 border border-rose-400 shadow-[0_0_12px_rgba(225,29,72,0.6)]"
                  : "bg-stone-950/85 text-stone-300 hover:text-white border border-stone-800"
              }`}
            >
              <Anchor className="w-3 h-3" />
              <span>HOLD</span>
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          RIGHT CLUSTER: DIRECTIONAL BROADSIDE BATTERY TRIGGERS
          ========================================================================= */}
      <div className="pointer-events-auto flex items-center gap-3 sm:gap-5 select-none pb-1 pr-1">
        {/* PORT BATTERY (FIRE LEFT) */}
        <div className="relative flex items-center justify-center">
          <svg className="absolute w-20 h-20 sm:w-24 sm:h-24 -rotate-90 pointer-events-none">
            <circle cx="50%" cy="50%" r="34" fill="none" stroke="#1c1917" strokeWidth="4" opacity="0.8" />
            <circle
              cx="50%"
              cy="50%"
              r="34"
              fill="none"
              stroke={isLeftReady ? "#fbbf24" : "#ef4444"}
              strokeWidth="4"
              strokeDasharray="214"
              strokeDashoffset={leftDashOffset}
              strokeLinecap="round"
              className="transition-all duration-75"
            />
          </svg>

          <button
            onTouchStart={handleTouchButton(handleFireLeft)}
            onClick={handleClickButton(handleFireLeft)}
            disabled={!isLeftReady}
            className={`w-16 h-16 sm:w-19 sm:h-19 rounded-full border-2 transition-all flex flex-col items-center justify-center shadow-[0_4px_24px_rgba(0,0,0,0.9)] touch-none active:scale-90 cursor-pointer ${
              isLeftReady
                ? "bg-gradient-to-b from-rose-600 via-red-700 to-stone-950 border-amber-400 text-amber-100 shadow-[0_0_24px_rgba(239,68,68,0.7)]"
                : "bg-stone-950/90 border-stone-800 text-stone-500 opacity-60 cursor-not-allowed"
            }`}
            title="Fire Port Battery (Broadside Left)"
            aria-label="Fire Port Battery"
          >
            <div className="flex items-center gap-0.5">
              <span className="text-xs sm:text-sm font-black font-cinzel">◄</span>
              <Flame className={`w-4 h-4 sm:w-5 sm:h-5 ${isLeftReady ? "text-amber-300 animate-pulse" : "text-stone-500"}`} />
            </div>
            <span className="text-[8.5px] sm:text-[9.5px] font-cinzel font-black uppercase tracking-wider mt-0.5 gold-emboss">
              PORT
            </span>
          </button>
        </div>

        {/* STARBOARD BATTERY (FIRE RIGHT) */}
        <div className="relative flex items-center justify-center">
          <svg className="absolute w-20 h-20 sm:w-24 sm:h-24 -rotate-90 pointer-events-none">
            <circle cx="50%" cy="50%" r="34" fill="none" stroke="#1c1917" strokeWidth="4" opacity="0.8" />
            <circle
              cx="50%"
              cy="50%"
              r="34"
              fill="none"
              stroke={isRightReady ? "#fbbf24" : "#ef4444"}
              strokeWidth="4"
              strokeDasharray="214"
              strokeDashoffset={rightDashOffset}
              strokeLinecap="round"
              className="transition-all duration-75"
            />
          </svg>

          <button
            onTouchStart={handleTouchButton(handleFireRight)}
            onClick={handleClickButton(handleFireRight)}
            disabled={!isRightReady}
            className={`w-16 h-16 sm:w-19 sm:h-19 rounded-full border-2 transition-all flex flex-col items-center justify-center shadow-[0_4px_24px_rgba(0,0,0,0.9)] touch-none active:scale-90 cursor-pointer ${
              isRightReady
                ? "bg-gradient-to-b from-rose-600 via-red-700 to-stone-950 border-amber-400 text-amber-100 shadow-[0_0_24px_rgba(239,68,68,0.7)]"
                : "bg-stone-950/90 border-stone-800 text-stone-500 opacity-60 cursor-not-allowed"
            }`}
            title="Fire Starboard Battery (Broadside Right)"
            aria-label="Fire Starboard Battery"
          >
            <div className="flex items-center gap-0.5">
              <Flame className={`w-4 h-4 sm:w-5 sm:h-5 ${isRightReady ? "text-amber-300 animate-pulse" : "text-stone-500"}`} />
              <span className="text-xs sm:text-sm font-black font-cinzel">►</span>
            </div>
            <span className="text-[8.5px] sm:text-[9.5px] font-cinzel font-black uppercase tracking-wider mt-0.5 gold-emboss">
              STARB
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
