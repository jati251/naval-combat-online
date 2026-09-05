import React from "react";
import type { AimDirection } from "@/types";

interface AimCrosshairProps {
  isAiming: boolean;
  aimDirection: AimDirection;
}

/**
 * 18th-Century Brass Spyglass Gunnery Sight
 * - Unobstructed open center for precision waterline targeting
 * - Antique brass hairlines and sextant range tick marks
 */
export const AimCrosshair: React.FC<AimCrosshairProps> = React.memo(
  ({ isAiming, aimDirection }) => {
    if (!isAiming || aimDirection === "none") return null;

    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
        {/* Spyglass Sight Ring */}
        <div className="relative w-16 h-16 flex items-center justify-center">
          {/* Outer Brass Ring */}
          <div className="w-14 h-14 rounded-full border border-amber-500/50 shadow-[0_0_6px_rgba(212,175,55,0.2)]" />
          <div className="w-12 h-12 rounded-full border border-amber-600/20" />

          {/* 4 Cardinal Hairlines with open 8px center clear-zone */}
          {/* Top */}
          <div className="absolute top-1 left-1/2 -translate-x-1/2 w-[1px] h-3 bg-amber-400/80" />
          {/* Bottom */}
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-[1px] h-3 bg-amber-400/80" />
          {/* Left */}
          <div className="absolute left-1 top-1/2 -translate-y-1/2 h-[1px] w-3 bg-amber-400/80" />
          {/* Right */}
          <div className="absolute right-1 top-1/2 -translate-y-1/2 h-[1px] w-3 bg-amber-400/80" />

          {/* Quadrant Elevation / Windage Tick Marks */}
          <div className="absolute left-3 top-1/2 -translate-y-1/2 h-1 w-[1px] bg-amber-400/60" />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 h-1 w-[1px] bg-amber-400/60" />

          {/* Unobstructed Center Target Pip */}
          <div className="w-1 h-1 rounded-full bg-amber-300 opacity-90 shadow-[0_0_4px_rgba(251,191,36,0.8)]" />
        </div>

        {/* Gun Battery Ready Indicator */}
        <div className="mt-1.5 flex items-center gap-1.5 px-3 py-0.5 rounded naval-plaque border border-amber-600/40 text-[10px] font-cinzel tracking-widest text-amber-100 shadow-md">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_4px_rgba(16,185,129,0.8)]" />
          <span className="font-bold uppercase tracking-wider">
            {aimDirection === "left" ? "LEFT BATTERY" : "RIGHT BATTERY"}
          </span>
          <span className="text-amber-500/60">·</span>
          <span className="text-[9px] font-mono text-amber-300/80">
            [SPACE / LMB]
          </span>
        </div>
      </div>
    );
  },
);
