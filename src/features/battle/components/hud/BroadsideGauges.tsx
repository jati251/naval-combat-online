import React from "react";
import { Crosshair, Flame } from "lucide-react";
import type { AimDirection } from "@/types";

interface BroadsideGaugesProps {
  leftProgress: number;
  rightProgress: number;
  aimDirection: AimDirection;
  onFireBattery: () => void;
}

export const BroadsideGauges: React.FC<BroadsideGaugesProps> = React.memo(
  ({ leftProgress, rightProgress, aimDirection, onFireBattery }) => {
    const isLeftReady = leftProgress >= 1.0;
    const isRightReady = rightProgress >= 1.0;

    const isAimingLeft = aimDirection === "left";
    const isAimingRight = aimDirection === "right";
    const canFireActiveAim =
      (isAimingLeft && isLeftReady) || (isAimingRight && isRightReady);

    return (
      <div className="pointer-events-auto flex items-center gap-3.5 naval-plaque px-4 py-2 select-none rounded-md border border-amber-600/40 shadow-xl relative">
        {/* Corner Filigree Screws */}
        <div className="absolute top-1 left-1 w-1 h-1 rounded-full bg-amber-400/80 shadow-[0_0_2px_rgba(0,0,0,0.8)]" />
        <div className="absolute top-1 right-1 w-1 h-1 rounded-full bg-amber-400/80 shadow-[0_0_2px_rgba(0,0,0,0.8)]" />
        <div className="absolute bottom-1 left-1 w-1 h-1 rounded-full bg-amber-400/80 shadow-[0_0_2px_rgba(0,0,0,0.8)]" />
        <div className="absolute bottom-1 right-1 w-1 h-1 rounded-full bg-amber-400/80 shadow-[0_0_2px_rgba(0,0,0,0.8)]" />

        {/* Left Battery (LEFT [Q]) */}
        <div
          className={`flex flex-col gap-1 w-24 transition-opacity ${isAimingRight ? "opacity-40" : "opacity-100"}`}
        >
          <div className="flex items-center justify-between text-[10px] font-mono">
            <span
              className={`font-cinzel font-bold tracking-wider ${isAimingLeft ? "text-amber-300 gold-emboss" : "text-stone-400"}`}
            >
              LEFT [Q]
            </span>
            <span
              className={`text-[9px] font-mono font-bold ${isLeftReady ? "text-emerald-400" : "text-amber-400/90"}`}
            >
              {isLeftReady ? "PRIMED" : `${Math.round(leftProgress * 100)}%`}
            </span>
          </div>
          {/* Gunpowder charge bar */}
          <div className="w-full h-2 bg-stone-950 rounded-sm overflow-hidden border border-amber-900/60 shadow-inner">
            <div
              className={`h-full rounded-sm transition-all duration-75 ${
                isLeftReady
                  ? "bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                  : "bg-gradient-to-r from-amber-700 to-amber-500"
              }`}
              style={{ width: `${Math.min(100, leftProgress * 100)}%` }}
            />
          </div>
        </div>

        {/* Broadside Salvo Hammer / Matchlock Action Button */}
        <button
          onClick={onFireBattery}
          className={`px-4 py-2 rounded-md border transition-all duration-150 cursor-pointer flex flex-col items-center justify-center min-w-[104px] shadow-md active:scale-95 ${
            canFireActiveAim
              ? "bg-gradient-to-b from-rose-700 via-rose-800 to-stone-950 border-rose-500 text-rose-100 ember-glow"
              : aimDirection !== "none"
                ? "bg-gradient-to-b from-amber-900/90 to-stone-950 border-amber-500/50 text-amber-200"
                : "bg-stone-950/80 border-stone-800 text-stone-500 hover:text-stone-300"
          }`}
          title="Discharge Broadside Cannons (Space / Left Click)"
        >
          <div className="flex items-center gap-1.5">
            {canFireActiveAim ? (
              <Flame className="w-4 h-4 text-amber-300 animate-bounce" />
            ) : (
              <Crosshair className="w-3.5 h-3.5 text-stone-400" />
            )}
            <span className="font-cinzel font-black text-xs tracking-wider gold-emboss">
              FIRE SALVO
            </span>
          </div>
          <span className="text-[8px] font-mono font-bold opacity-80 mt-0.5 tracking-tight text-amber-300/80">
            [SPACE / LMB]
          </span>
        </button>

        {/* Right Battery (RIGHT [E]) */}
        <div
          className={`flex flex-col gap-1 w-24 transition-opacity ${isAimingLeft ? "opacity-40" : "opacity-100"}`}
        >
          <div className="flex items-center justify-between text-[10px] font-mono">
            <span
              className={`font-cinzel font-bold tracking-wider ${isAimingRight ? "text-amber-300 gold-emboss" : "text-stone-400"}`}
            >
              RIGHT [E]
            </span>
            <span
              className={`text-[9px] font-mono font-bold ${isRightReady ? "text-emerald-400" : "text-amber-400/90"}`}
            >
              {isRightReady ? "PRIMED" : `${Math.round(rightProgress * 100)}%`}
            </span>
          </div>
          {/* Gunpowder charge bar */}
          <div className="w-full h-2 bg-stone-950 rounded-sm overflow-hidden border border-amber-900/60 shadow-inner">
            <div
              className={`h-full rounded-sm transition-all duration-75 ${
                isRightReady
                  ? "bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                  : "bg-gradient-to-r from-amber-700 to-amber-500"
              }`}
              style={{ width: `${Math.min(100, rightProgress * 100)}%` }}
            />
          </div>
        </div>
      </div>
    );
  },
);
