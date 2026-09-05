import React, { useEffect, useRef } from 'react';
import { Wind } from 'lucide-react';
import type { ShipSnapshot } from '@/types';
import { ARENA_ISLANDS } from '../3d/Islands3D';
import { ARENA_SHIPWRECKS } from '../3d/Shipwrecks3D';
import { CONTROL_CONFIG } from '../../utils/controls';
import { useGameStore } from '@/stores/useGameStore';

interface CompassMinimapProps {
  selfShip?: ShipSnapshot | undefined;
  ships?: ShipSnapshot[];
  selfId?: string;
  windAngle?: number;
  windSpeed?: number;
}

const CANVAS_SIZE = 144; // CSS display size (144x144px)
const RADAR_RADIUS = 62; // inner radar active clipping radius
const SCALE = CONTROL_CONFIG.RADAR_SCALE; // 0.14

/**
 * Ultra-Lightweight 60-144 FPS HTML5 Canvas Tactical Naval Binnacle
 * - Heading-Up Navigation Mode (Google Maps style):
 *   Player's ship is ALWAYS locked at the center pointing straight UP (forward).
 * - Ocean world, islands, wrecks, and enemies smoothly rotate relative to ship heading.
 * - Floating North compass needle & cardinal rim (N, E, S, W) show true magnetic bearing.
 * - Native 2D Canvas rendering eliminates React DOM thrashing, reflows, and memory churn.
 */
export const CompassMinimap: React.FC<CompassMinimapProps> = React.memo(() => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const telemetryRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = CANVAS_SIZE * dpr;
    canvas.height = CANVAS_SIZE * dpr;

    let animId: number;
    let frameCount = 0;
    const render = () => {
      frameCount++;
      const { selfId: curId, ships: curShips, windAngle: curWindAngle, windSpeed: curWindSpeed } = useGameStore.getState();
      const curSelf = curShips.find((s) => s.id === curId);
      const cx = CANVAS_SIZE * 0.5;
      const cy = CANVAS_SIZE * 0.5;

      // Throttle telemetry text updates to once every 15 frames (~250ms) without React re-rendering
      if (frameCount % 15 === 0 && telemetryRef.current) {
        if (curSelf) {
          const shipHeading = curSelf.rotationY || 0;
          const angleDiff = Math.abs((((shipHeading - curWindAngle + Math.PI) % (Math.PI * 2)) - Math.PI));
          const efficiencyRatio = 0.88 + 0.12 * Math.sin(angleDiff * 0.5);
          const efficiencyPercent = Math.round(efficiencyRatio * 100);
          const stateText = efficiencyPercent < 91 ? 'HEADWIND' : efficiencyPercent < 97 ? 'CROSSWIND' : 'TAILWIND';
          telemetryRef.current.textContent = `${curWindSpeed.toFixed(1)} KTS · ${stateText} (${efficiencyPercent}%)`;
        }
      }

      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      if (!curSelf) {
        ctx.restore();
        animId = requestAnimationFrame(render);
        return;
      }

      const heading = curSelf.rotationY;
      const sinH = Math.sin(heading);
      const cosH = Math.cos(heading);

      // 1. Radar Ocean Background (Dark Nautical Navy)
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, RADAR_RADIUS, 0, Math.PI * 2);
      ctx.clip();

      const bgGrad = ctx.createRadialGradient(cx, cy, 4, cx, cy, RADAR_RADIUS);
      bgGrad.addColorStop(0, '#031726');
      bgGrad.addColorStop(0.7, '#020e1a');
      bgGrad.addColorStop(1, '#01080f');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      // 2. Tactical Range Rings (120m & 240m)
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.16)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, 120 * SCALE, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(56, 189, 248, 0.10)';
      ctx.beginPath();
      ctx.arc(cx, cy, 240 * SCALE, 0, Math.PI * 2);
      ctx.stroke();

      // Heading-Up Sight Guideline (Straight UP from player ship)
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.22)';
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx, cy - RADAR_RADIUS);
      ctx.stroke();
      ctx.setLineDash([]);

      // 3. Islands (Projected in Heading-Up player coordinate space)
      for (let i = 0; i < ARENA_ISLANDS.length; i++) {
        const isl = ARENA_ISLANDS[i];
        const dx = isl.x - curSelf.x;
        const dz = isl.z - curSelf.z;
        const fwd = dx * sinH + dz * cosH;
        const right = -dx * cosH + dz * sinH;
        const ix = cx + right * SCALE;
        const iy = cy - fwd * SCALE;

        const maxR = isl.sandRadius * (isl.elongation ? Math.max(isl.elongation.scaleX, isl.elongation.scaleZ) : 1) * SCALE;
        if (Math.hypot(ix - cx, iy - cy) > RADAR_RADIUS + maxR) continue;

        const rotAngle = (isl.elongation ? -isl.elongation.angle : 0) + (heading - Math.PI);
        const radiusX = Math.max(3, isl.sandRadius * (isl.elongation?.scaleX ?? 1) * SCALE);
        const radiusY = Math.max(3, isl.sandRadius * (isl.elongation?.scaleZ ?? 1) * SCALE);

        ctx.save();
        ctx.translate(ix, iy);
        ctx.rotate(rotAngle);

        // Golden beach sand base
        ctx.beginPath();
        ctx.ellipse(0, 0, radiusX, radiusY, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#b45309';
        ctx.fill();
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 0.7;
        ctx.stroke();

        // Lush jungle canopy
        ctx.beginPath();
        ctx.ellipse(0, 0, radiusX * 0.7, radiusY * 0.7, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#047857';
        ctx.fill();
        ctx.restore();

        // Island Code Label (upright)
        ctx.fillStyle = '#fef3c7';
        ctx.font = 'bold 7px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(isl.name.slice(0, 3).toUpperCase(), ix, iy);
      }

      // 4. Shipwrecks (Flotsam cross markers)
      for (let i = 0; i < ARENA_SHIPWRECKS.length; i++) {
        const wreck = ARENA_SHIPWRECKS[i];
        const dx = wreck.x - curSelf.x;
        const dz = wreck.z - curSelf.z;
        const fwd = dx * sinH + dz * cosH;
        const right = -dx * cosH + dz * sinH;
        const wx = cx + right * SCALE;
        const wy = cy - fwd * SCALE;

        if (Math.hypot(wx - cx, wy - cy) <= RADAR_RADIUS) {
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(wx - 2.5, wy - 2.5);
          ctx.lineTo(wx + 2.5, wy + 2.5);
          ctx.moveTo(wx + 2.5, wy - 2.5);
          ctx.lineTo(wx - 2.5, wy + 2.5);
          ctx.stroke();
        }
      }

      // 5. Enemy Warships (Chevrons with true relative heading)
      for (let i = 0; i < curShips.length; i++) {
        const s = curShips[i];
        if (s.id === curId || s.isSunk) continue;

        const dx = s.x - curSelf.x;
        const dz = s.z - curSelf.z;
        const fwd = dx * sinH + dz * cosH;
        const right = -dx * cosH + dz * sinH;
        let ex = cx + right * SCALE;
        let ey = cy - fwd * SCALE;
        const dist = Math.hypot(ex - cx, ey - cy);

        // Clamp to perimeter if out of radar view so player always maintains situational awareness
        if (dist > RADAR_RADIUS - 3) {
          const clampAngle = Math.atan2(ey - cy, ex - cx);
          ex = cx + Math.cos(clampAngle) * (RADAR_RADIUS - 4);
          ey = cy + Math.sin(clampAngle) * (RADAR_RADIUS - 4);
        }

        const enemyRelAngle = heading - s.rotationY;
        ctx.save();
        ctx.translate(ex, ey);
        ctx.rotate(enemyRelAngle);

        ctx.beginPath();
        ctx.moveTo(0, -5.5);
        ctx.lineTo(4, 4.5);
        ctx.lineTo(0, 2);
        ctx.lineTo(-4, 4.5);
        ctx.closePath();
        ctx.fillStyle = '#f43f5e';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      }

      // 6. Dynamic Wind Streamer on Radar
      const blowX = -Math.sin(curWindAngle);
      const blowZ = -Math.cos(curWindAngle);
      const windFwd = blowX * sinH + blowZ * cosH;
      const windRight = -blowX * cosH + blowZ * sinH;
      const windRelAngle = Math.atan2(windRight, -windFwd);

      // Draw subtle wind flow line through center
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(windRelAngle);
      const windGrad = ctx.createLinearGradient(0, 18, 0, -RADAR_RADIUS + 6);
      windGrad.addColorStop(0, 'rgba(52, 211, 153, 0)');
      windGrad.addColorStop(1, 'rgba(52, 211, 153, 0.45)');
      ctx.strokeStyle = windGrad;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, 18);
      ctx.lineTo(0, -RADAR_RADIUS + 6);
      ctx.stroke();
      ctx.restore();

      // End clipped radar contents
      ctx.restore();

      // 7. Center Player Warship (Heading-Up: ALWAYS centered, ALWAYS points UP!)
      ctx.save();
      ctx.translate(cx, cy);
      ctx.beginPath();
      ctx.moveTo(0, -7);
      ctx.lineTo(5.5, 6);
      ctx.lineTo(0, 3);
      ctx.lineTo(-5.5, 6);
      ctx.closePath();
      ctx.fillStyle = '#f59e0b';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 6;
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.restore();

      // 8. Rotating Compass Rose Bezel (Floating Cardinal Bearings N, E, S, W)
      const northAngle = Math.atan2(-sinH, -cosH);
      const drawCardinal = (angle: number, label: string, isNorth: boolean) => {
        const lx = cx + Math.sin(angle) * (RADAR_RADIUS - 6);
        const ly = cy - Math.cos(angle) * (RADAR_RADIUS - 6);

        ctx.font = isNorth ? '900 8.5px monospace' : '700 6.5px monospace';
        ctx.fillStyle = isNorth ? '#f59e0b' : '#64748b';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, lx, ly);

        if (isNorth) {
          // Pointy North indicator arrow
          const tx = cx + Math.sin(angle) * (RADAR_RADIUS - 1);
          const ty = cy - Math.cos(angle) * (RADAR_RADIUS - 1);
          ctx.save();
          ctx.translate(tx, ty);
          ctx.rotate(angle);
          ctx.beginPath();
          ctx.moveTo(0, -3.5);
          ctx.lineTo(2.5, 1.5);
          ctx.lineTo(-2.5, 1.5);
          ctx.closePath();
          ctx.fillStyle = '#f59e0b';
          ctx.fill();
          ctx.restore();
        }
      };

      drawCardinal(northAngle, 'N', true);
      drawCardinal(northAngle + Math.PI * 0.5, 'E', false);
      drawCardinal(northAngle + Math.PI, 'S', false);
      drawCardinal(northAngle - Math.PI * 0.5, 'W', false);

      // 9. Brass Compass Rim
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.65)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, RADAR_RADIUS, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div className="relative flex flex-col items-center select-none pointer-events-auto">
      {/* Ship Binnacle Compass */}
      <div className="relative flex items-center justify-center w-36 h-36 rounded-full bg-stone-950/80 border border-amber-500/40 shadow-md p-0 overflow-hidden">
        <canvas
          ref={canvasRef}
          style={{ width: `${CANVAS_SIZE}px`, height: `${CANVAS_SIZE}px` }}
          className="block pointer-events-none"
        />
        {/* Subtle Bezel Overlay */}
        <div className="absolute inset-0 rounded-full border border-amber-300/15 pointer-events-none" />
      </div>

      {/* Integrated Wind & Sail Efficiency Telemetry Bar */}
      <div className="mt-1 flex items-center gap-1.5 px-2.5 py-0.5 naval-plaque text-[9px] font-mono shadow-sm">
        <Wind className="w-2.5 h-2.5 text-cyan-400" />
        <span ref={telemetryRef} className="text-amber-200 font-bold">
          -- KTS · TAILWIND (100%)
        </span>
      </div>
    </div>
  );
});
