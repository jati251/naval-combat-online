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

const CANVAS_SIZE = 148; // CSS display size (148x148px)
const RADAR_RADIUS = 64; // inner radar active clipping radius
const SCALE = CONTROL_CONFIG.RADAR_SCALE; // 0.14

/**
 * Master Navigator's 18th-Century Antique Brass Binnacle (60-144 FPS)
 * - Heading-Up Navigation: Player's vessel is locked at center pointing forward.
 * - Antique Nautical Chart rendering with vintage cartography styling.
 * - Rotating Fleur-de-lis Compass Rose with true magnetic bearing.
 * - Pure native HTML5 canvas: zero React state thrashing during 30Hz snapshots.
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

    // Detect mobile device for canvas render throttling
    const isMobileDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth <= 1024;

    let animId: number;
    let frameCount = 0;
    const render = () => {
      frameCount++;

      // Mobile: throttle canvas rendering to ~15fps (skip 3 of 4 frames) to save CPU
      if (isMobileDevice && frameCount % 4 !== 0) {
        animId = requestAnimationFrame(render);
        return;
      }

      const { selfId: curId, ships: curShips, windAngle: curWindAngle, windSpeed: curWindSpeed } = useGameStore.getState();
      const curSelf = curShips.find((s) => s.id === curId);
      const cx = CANVAS_SIZE * 0.5;
      const cy = CANVAS_SIZE * 0.5;

      // Throttle telemetry text updates to once every 15 frames (~250ms)
      if (frameCount % 15 === 0 && telemetryRef.current) {
        if (curSelf) {
          const shipHeading = curSelf.rotationY || 0;
          const angleDiff = Math.abs((((shipHeading - curWindAngle + Math.PI) % (Math.PI * 2)) - Math.PI));
          const efficiencyRatio = 0.88 + 0.12 * Math.sin(angleDiff * 0.5);
          const efficiencyPercent = Math.round(efficiencyRatio * 100);
          const stateText = efficiencyPercent < 91 ? 'CLOSE-HAULED' : efficiencyPercent < 97 ? 'CROSSWIND' : 'RUNNING FREE';
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

      // 1. Antique Nautical Chart Water (Deep Oceanic Abyss)
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, RADAR_RADIUS, 0, Math.PI * 2);
      ctx.clip();

      const bgGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, RADAR_RADIUS);
      bgGrad.addColorStop(0, '#091c2b');
      bgGrad.addColorStop(0.65, '#05111d');
      bgGrad.addColorStop(1, '#02070c');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      // Antique Cartography Lat/Long fine gridlines
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.08)';
      ctx.lineWidth = 0.75;
      for (let offset = -40; offset <= 40; offset += 20) {
        ctx.beginPath();
        ctx.moveTo(cx + offset, cy - RADAR_RADIUS);
        ctx.lineTo(cx + offset, cy + RADAR_RADIUS);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(cx - RADAR_RADIUS, cy + offset);
        ctx.lineTo(cx + RADAR_RADIUS, cy + offset);
        ctx.stroke();
      }

      // 2. Nautical Range Rings (120m & 240m) in vintage chart gold
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.22)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, 120 * SCALE, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(212, 175, 55, 0.14)';
      ctx.beginPath();
      ctx.arc(cx, cy, 240 * SCALE, 0, Math.PI * 2);
      ctx.stroke();

      // Heading-Up Gunner's Sightline (Straight UP)
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.35)';
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx, cy - RADAR_RADIUS);
      ctx.stroke();
      ctx.setLineDash([]);

      // 3. Islands (Vintage Cartography styling with golden sand and green interior)
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
        ctx.fillStyle = '#92400e';
        ctx.fill();
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 0.8;
        ctx.stroke();

        // Lush jungle interior
        ctx.beginPath();
        ctx.ellipse(0, 0, radiusX * 0.7, radiusY * 0.7, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#065f46';
        ctx.fill();
        ctx.restore();

        // Island Inscription
        ctx.fillStyle = '#fef3c7';
        ctx.font = 'bold 7px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(isl.name.slice(0, 3).toUpperCase(), ix, iy);
      }

      // 4. Shipwrecks (Sunken Prize crossed bones / markers)
      for (let i = 0; i < ARENA_SHIPWRECKS.length; i++) {
        const wreck = ARENA_SHIPWRECKS[i];
        const dx = wreck.x - curSelf.x;
        const dz = wreck.z - curSelf.z;
        const fwd = dx * sinH + dz * cosH;
        const right = -dx * cosH + dz * sinH;
        const wx = cx + right * SCALE;
        const wy = cy - fwd * SCALE;

        if (Math.hypot(wx - cx, wy - cy) <= RADAR_RADIUS) {
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 1.3;
          ctx.beginPath();
          ctx.moveTo(wx - 2.5, wy - 2.5);
          ctx.lineTo(wx + 2.5, wy + 2.5);
          ctx.moveTo(wx + 2.5, wy - 2.5);
          ctx.lineTo(wx - 2.5, wy + 2.5);
          ctx.stroke();
        }
      }

      // 5. Warships (Teammates vs Enemies)
      const curRoom = useGameStore.getState().currentRoom;
      const selfPlayer = curRoom?.players.find((p) => p.id === curId);
      const isTeamMode = curRoom?.gameMode === 'TEAM';

      for (let i = 0; i < curShips.length; i++) {
        const s = curShips[i];
        if (s.id === curId || s.isSunk) continue;

        const otherPlayer = curRoom?.players.find((p) => p.id === s.id);
        const isTeammate = isTeamMode && Boolean(selfPlayer?.team && otherPlayer?.team && selfPlayer.team === otherPlayer.team);

        const dx = s.x - curSelf.x;
        const dz = s.z - curSelf.z;
        const fwd = dx * sinH + dz * cosH;
        const right = -dx * cosH + dz * sinH;
        let ex = cx + right * SCALE;
        let ey = cy - fwd * SCALE;
        const dist = Math.hypot(ex - cx, ey - cy);

        // Clamp to edge of binnacle
        if (dist > RADAR_RADIUS - 4) {
          const clampAngle = Math.atan2(ey - cy, ex - cx);
          ex = cx + Math.cos(clampAngle) * (RADAR_RADIUS - 5);
          ey = cy + Math.sin(clampAngle) * (RADAR_RADIUS - 5);
        }

        const enemyRelAngle = heading - s.rotationY;
        ctx.save();
        ctx.translate(ex, ey);
        ctx.rotate(enemyRelAngle);

        ctx.beginPath();
        ctx.moveTo(0, -6);
        ctx.lineTo(4.5, 5);
        ctx.lineTo(0, 2.5);
        ctx.lineTo(-4.5, 5);
        ctx.closePath();
        ctx.fillStyle = isTeammate ? '#38bdf8' : '#dc2626';
        ctx.fill();
        ctx.strokeStyle = isTeammate ? '#e0f2fe' : '#fee2e2';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      }

      // 6. Dynamic Wind Rose Streamer
      const blowX = -Math.sin(curWindAngle);
      const blowZ = -Math.cos(curWindAngle);
      const windFwd = blowX * sinH + blowZ * cosH;
      const windRight = -blowX * cosH + blowZ * sinH;
      const windRelAngle = Math.atan2(windRight, -windFwd);

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(windRelAngle);
      const windGrad = ctx.createLinearGradient(0, 20, 0, -RADAR_RADIUS + 8);
      windGrad.addColorStop(0, 'rgba(212, 175, 55, 0)');
      windGrad.addColorStop(1, 'rgba(251, 191, 36, 0.45)');
      ctx.strokeStyle = windGrad;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, 20);
      ctx.lineTo(0, -RADAR_RADIUS + 8);
      ctx.stroke();
      ctx.restore();

      // End clipped ocean chart
      ctx.restore();

      // 7. Center Flagship (Heading-Up: Golden Galleon Silhouette)
      ctx.save();
      ctx.translate(cx, cy);
      ctx.beginPath();
      ctx.moveTo(0, -7.5);
      ctx.lineTo(6, 6.5);
      ctx.lineTo(0, 3.5);
      ctx.lineTo(-6, 6.5);
      ctx.closePath();
      ctx.fillStyle = '#fbbf24';
      ctx.shadowColor = '#d97706';
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.strokeStyle = '#1c1917';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();

      // 8. Rotating Compass Rose Bezel (Floating Cardinal Points N, E, S, W)
      const northAngle = Math.atan2(-sinH, -cosH);
      const drawCardinal = (angle: number, label: string, isNorth: boolean) => {
        const lx = cx + Math.sin(angle) * (RADAR_RADIUS - 7);
        const ly = cy - Math.cos(angle) * (RADAR_RADIUS - 7);

        ctx.font = isNorth ? 'bold 9px Cinzel, serif' : '600 7px Cinzel, serif';
        ctx.fillStyle = isNorth ? '#fde047' : '#94a3b8';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, lx, ly);

        if (isNorth) {
          // Fleur-de-lis / North Arrow
          const tx = cx + Math.sin(angle) * (RADAR_RADIUS - 1.5);
          const ty = cy - Math.cos(angle) * (RADAR_RADIUS - 1.5);
          ctx.save();
          ctx.translate(tx, ty);
          ctx.rotate(angle);
          ctx.beginPath();
          ctx.moveTo(0, -4);
          ctx.lineTo(3, 1.5);
          ctx.lineTo(-3, 1.5);
          ctx.closePath();
          ctx.fillStyle = '#fde047';
          ctx.fill();
          ctx.restore();
        }
      };

      drawCardinal(northAngle, 'N', true);
      drawCardinal(northAngle + Math.PI * 0.5, 'E', false);
      drawCardinal(northAngle + Math.PI, 'S', false);
      drawCardinal(northAngle - Math.PI * 0.5, 'W', false);

      // 9. Ornate Antique Brass Compass Rim with Tick Marks
      ctx.strokeStyle = '#d4af37';
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
      {/* Heavy Carved Binnacle Housing with Brass Bezel */}
      <div className="relative flex items-center justify-center w-[148px] h-[148px] rounded-full pirate-panel border-2 border-amber-600/60 shadow-2xl p-0 overflow-hidden">
        <canvas
          ref={canvasRef}
          style={{ width: `${CANVAS_SIZE}px`, height: `${CANVAS_SIZE}px` }}
          className="block pointer-events-none"
        />
        {/* Inner Brass Shadow Bezel */}
        <div className="absolute inset-0 rounded-full border border-amber-400/25 pointer-events-none shadow-[inset_0_0_12px_rgba(0,0,0,0.8)]" />
      </div>

      {/* Integrated Wind & Sail Telemetry Bar */}
      <div className="mt-1 flex items-center justify-center w-[148px] gap-1 px-1.5 py-0.5 naval-plaque text-[9px] font-fell border border-amber-600/40 rounded-sm shadow-md overflow-hidden">
        <Wind className="w-2.5 h-2.5 text-amber-400 shrink-0" />
        <span ref={telemetryRef} className="text-amber-200 font-bold tracking-wide truncate tabular-nums text-center">
          -- KTS · RUNNING FREE (100%)
        </span>
      </div>
    </div>
  );
});
