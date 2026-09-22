import React, { useEffect, useRef } from 'react';
import { Wind } from 'lucide-react';
import type { ShipSnapshot } from '@/types';
import { getMapConfig } from '../../maps';
import { useGameStore } from '@/stores/useGameStore';
import { mapTextureService, type MapTextureSource } from '../../services/mapTextureService';
import { localShipTelemetry } from '../../services/localShipTelemetry';

interface CompassMinimapProps {
  selfShip?: ShipSnapshot | undefined;
  ships?: ShipSnapshot[];
  selfId?: string;
  windAngle?: number;
  windSpeed?: number;
  hideWind?: boolean;
  compact?: boolean;
}

interface MinimapPoint {
  x: number;
  y: number;
}

const CANVAS_SIZE = 168; // Square display size (168x168px)
const SCALE = 0.28; // Close combat scale (~300m visible radius around ship)
const NEEDLE_OFFSET = 18;

// Module-scoped scratch point to eliminate object allocations in 60fps render loop
const scratchPoint: MinimapPoint = { x: 0, y: 0 };

/**
 * Projects a 3D world coordinate (worldX, worldZ) into Heading-Up 2D canvas minimap space.
 * Zero-allocation: modifies and returns the shared module-level scratchPoint.
 */
function projectToMinimap(
  worldX: number,
  worldZ: number,
  selfX: number,
  selfZ: number,
  sinH: number,
  cosH: number,
  scale: number,
  cx: number,
  cy: number
): MinimapPoint {
  const dx = worldX - selfX;
  const dz = worldZ - selfZ;
  scratchPoint.x = cx + (-dx * cosH + dz * sinH) * scale;
  scratchPoint.y = cy - (dx * sinH + dz * cosH) * scale;
  return scratchPoint;
}

/**
 * Draws the high-definition baked ocean & island texture along with the arena boundary ring.
 */
function drawMapTexture(
  ctx: CanvasRenderingContext2D,
  texture: MapTextureSource,
  mapCenterX: number,
  mapCenterY: number,
  heading: number,
  pixelSize: number,
  mapRadius: number,
  scale: number
): void {
  ctx.save();
  ctx.translate(mapCenterX, mapCenterY);
  ctx.rotate(heading);
  ctx.drawImage(texture, -pixelSize * 0.5, -pixelSize * 0.5, pixelSize, pixelSize);

  // Tactical combat arena boundary ring
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.45)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.arc(0, 0, mapRadius * scale, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

/**
 * Draws antique cartographic lat/long coordinate gridlines over the ocean.
 */
function drawCartographicGrid(
  ctx: CanvasRenderingContext2D,
  mapCenterX: number,
  mapCenterY: number,
  heading: number,
  mapRadius: number,
  scale: number
): void {
  ctx.save();
  ctx.translate(mapCenterX, mapCenterY);
  ctx.rotate(heading);
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.12)';
  ctx.lineWidth = 0.75;
  const gridStep = 80 * scale;
  const maxGrid = mapRadius * scale;

  ctx.beginPath();
  for (let g = -maxGrid; g <= maxGrid; g += gridStep) {
    ctx.moveTo(g, -maxGrid);
    ctx.lineTo(g, maxGrid);
    ctx.moveTo(-maxGrid, g);
    ctx.lineTo(maxGrid, g);
  }
  ctx.stroke();
  ctx.restore();
}

/**
 * Draws tactical overlays: 100m/200m broadside range rings and forward gunner sightline.
 */
function drawTacticalOverlays(ctx: CanvasRenderingContext2D, cx: number, cy: number, scale: number): void {
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.25)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, 100 * scale, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(212, 175, 55, 0.15)';
  ctx.beginPath();
  ctx.arc(cx, cy, 200 * scale, 0, Math.PI * 2);
  ctx.stroke();

  // Forward Gunner Sightline (Straight UP from player ship)
  ctx.strokeStyle = 'rgba(251, 191, 36, 0.6)';
  ctx.lineWidth = 1.2;
  ctx.setLineDash([2, 3]);
  ctx.beginPath();
  ctx.moveTo(cx, cy - 8);
  ctx.lineTo(cx, 16);
  ctx.stroke();
  ctx.setLineDash([]);
}

/**
 * Fallback procedural island rendering when baked texture is still loading.
 */
function drawProceduralFallbackIslands(
  ctx: CanvasRenderingContext2D,
  islands: ReturnType<typeof getMapConfig>['islands'],
  selfX: number,
  selfZ: number,
  sinH: number,
  cosH: number,
  scale: number,
  cx: number,
  cy: number
): void {
  for (let i = 0; i < islands.length; i++) {
    const isl = islands[i];
    const pt = projectToMinimap(isl.x, isl.z, selfX, selfZ, sinH, cosH, scale, cx, cy);
    const r = Math.max(3, isl.sandRadius * scale);

    ctx.beginPath();
    ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
    ctx.fillStyle = '#92400e';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(pt.x, pt.y, r * 0.7, 0, Math.PI * 2);
    ctx.fillStyle = '#065f46';
    ctx.fill();
  }
}

/**
 * Draws crisp, legible names for archipelago islands.
 */
function drawIslandLabels(
  ctx: CanvasRenderingContext2D,
  islands: ReturnType<typeof getMapConfig>['islands'],
  selfX: number,
  selfZ: number,
  sinH: number,
  cosH: number,
  scale: number,
  cx: number,
  cy: number,
  canvasSize: number
): void {
  ctx.font = 'bold 7.5px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fef3c7';
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
  ctx.lineWidth = 2;

  for (let i = 0; i < islands.length; i++) {
    const isl = islands[i];
    const pt = projectToMinimap(isl.x, isl.z, selfX, selfZ, sinH, cosH, scale, cx, cy);
    if (pt.x >= 10 && pt.x <= canvasSize - 10 && pt.y >= 10 && pt.y <= canvasSize - 10) {
      const text = isl.name.slice(0, 4).toUpperCase();
      ctx.strokeText(text, pt.x, pt.y);
      ctx.fillText(text, pt.x, pt.y);
    }
  }
}

/**
 * Draws sunken prize crossed bones markers.
 */
function drawShipwrecks(
  ctx: CanvasRenderingContext2D,
  wrecks: ReturnType<typeof getMapConfig>['shipwrecks'],
  selfX: number,
  selfZ: number,
  sinH: number,
  cosH: number,
  scale: number,
  cx: number,
  cy: number,
  canvasSize: number
): void {
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 1.5;

  for (let i = 0; i < wrecks.length; i++) {
    const wreck = wrecks[i];
    const pt = projectToMinimap(wreck.x, wreck.z, selfX, selfZ, sinH, cosH, scale, cx, cy);
    if (pt.x >= 6 && pt.x <= canvasSize - 6 && pt.y >= 6 && pt.y <= canvasSize - 6) {
      ctx.beginPath();
      ctx.moveTo(pt.x - 2.5, pt.y - 2.5);
      ctx.lineTo(pt.x + 2.5, pt.y + 2.5);
      ctx.moveTo(pt.x + 2.5, pt.y - 2.5);
      ctx.lineTo(pt.x - 2.5, pt.y + 2.5);
      ctx.stroke();
    }
  }
}

/**
 * Draws fleet armada warships (cyan teammates, red enemies) with relative yaw orientation.
 */
function drawFleetWarships(
  ctx: CanvasRenderingContext2D,
  ships: ShipSnapshot[],
  curId: string | undefined,
  isTeamMode: boolean,
  selfTeam: string | undefined,
  teamMap: Map<string, string | undefined>,
  selfX: number,
  selfZ: number,
  sinH: number,
  cosH: number,
  scale: number,
  cx: number,
  cy: number,
  heading: number,
  canvasSize: number
): void {
  ctx.lineWidth = 1.0;

  for (let i = 0; i < ships.length; i++) {
    const s = ships[i];
    if (s.id === curId || s.isSunk) continue;

    const isTeammate = isTeamMode && Boolean(selfTeam && teamMap.get(s.id) === selfTeam);
    const pt = projectToMinimap(s.x, s.z, selfX, selfZ, sinH, cosH, scale, cx, cy);

    // Clamp to square border if distant
    const isClamped = pt.x < 8 || pt.x > canvasSize - 8 || pt.y < 8 || pt.y > canvasSize - 8;
    const ex = Math.max(8, Math.min(canvasSize - 8, pt.x));
    const ey = Math.max(8, Math.min(canvasSize - 8, pt.y));

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

    ctx.fillStyle = isTeammate ? '#38bdf8' : '#ef4444';
    ctx.strokeStyle = isClamped ? '#fbbf24' : '#0f172a';
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

/**
 * Draws player's flagship permanently locked at center (cx, cy) pointing straight UP.
 */
function drawPlayerVessel(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.beginPath();
  ctx.moveTo(0, -7.5);
  ctx.lineTo(5.5, 6.5);
  ctx.lineTo(0, 3.2);
  ctx.lineTo(-5.5, 6.5);
  ctx.closePath();
  ctx.fillStyle = '#fbbf24';
  ctx.fill();
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.restore();
}

/**
 * Draws rotating magnetic North Fleur-de-lis needle in top-left corner.
 */
function drawTrueNorthCompassNeedle(
  ctx: CanvasRenderingContext2D,
  needleX: number,
  needleY: number,
  heading: number
): void {
  ctx.save();
  ctx.translate(needleX, needleY);
  ctx.rotate(heading);

  // North Arrow (Gold)
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.lineTo(3.5, 0);
  ctx.lineTo(0, -2);
  ctx.closePath();
  ctx.fillStyle = '#fde047';
  ctx.fill();

  // South Arrow (Slate)
  ctx.beginPath();
  ctx.moveTo(0, 10);
  ctx.lineTo(3.5, 0);
  ctx.lineTo(0, -2);
  ctx.closePath();
  ctx.fillStyle = '#64748b';
  ctx.fill();

  // Center rivet
  ctx.beginPath();
  ctx.arc(0, 0, 2, 0, Math.PI * 2);
  ctx.fillStyle = '#d4af37';
  ctx.fill();
  ctx.restore();

  // 'N' label
  ctx.font = 'bold 7px Cinzel, serif';
  ctx.fillStyle = '#fde047';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('N', needleX, needleY - 9);
}

/**
 * Draws dynamic wind streamer in top-right corner.
 */
function drawDynamicWindStreamer(
  ctx: CanvasRenderingContext2D,
  badgeX: number,
  badgeY: number,
  curWindAngle: number,
  sinH: number,
  cosH: number
): void {
  const blowX = -Math.sin(curWindAngle);
  const blowZ = -Math.cos(curWindAngle);
  const windFwd = blowX * sinH + blowZ * cosH;
  const windRight = -blowX * cosH + blowZ * sinH;
  const windRelAngle = Math.atan2(windRight, windFwd);

  ctx.save();
  ctx.translate(badgeX, badgeY);
  ctx.rotate(windRelAngle);
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(0, 8);
  ctx.lineTo(0, -8);
  ctx.lineTo(-3, -4);
  ctx.moveTo(0, -8);
  ctx.lineTo(3, -4);
  ctx.stroke();
  ctx.restore();
}

/**
 * Square Tactical Naval Minimap (60-144 FPS)
 * - Player ship is ALWAYS locked at the CENTER (cx, cy) pointing forward (Heading-Up).
 * - Close combat zoom: ocean fills 100% of the square box with zero edge seams.
 * - Subpixel-accurate synchronization between 3D world, baked canvas, and fleet overlays.
 * - Zero-allocation GC-optimized render pipeline.
 */
export const CompassMinimap: React.FC<CompassMinimapProps> = React.memo(({ hideWind = false, compact = false }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const telemetryRef = useRef<HTMLSpanElement | null>(null);
  const headingReadoutRef = useRef<HTMLSpanElement | null>(null);

  // Cached player team map to eliminate garbage collection inside 60fps loop
  const cachedTeamMap = useRef(new Map<string, string | undefined>());
  const lastPlayersRef = useRef<unknown>(null);

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
    let cachedMapId: string | null = null;
    let cachedMapConfig: ReturnType<typeof getMapConfig> | null = null;

    const cx = CANVAS_SIZE * 0.5;
    const cy = CANVAS_SIZE * 0.5;
    const windBadgeX = CANVAS_SIZE - NEEDLE_OFFSET;
    const windBadgeY = NEEDLE_OFFSET;

    const render = () => {
      frameCount++;

      const {
        selfId: curId,
        ships: curShips,
        windAngle: curWindAngle,
        windSpeed: curWindSpeed,
        currentMapId,
        currentRoom,
      } = useGameStore.getState();

      const curSelf = curShips.find((s) => s.id === curId);

      const mapIdKey = currentMapId || currentRoom?.mapId || 'caribbean';
      if (cachedMapId !== mapIdKey || !cachedMapConfig) {
        cachedMapId = mapIdKey;
        cachedMapConfig = getMapConfig(mapIdKey);
      }

      const mapRadius = cachedMapConfig.radius;
      const activeIslands = cachedMapConfig.islands;
      const activeWrecks = cachedMapConfig.shipwrecks;

      // Real-time smooth transform from client-side prediction, fallback to server snapshot
      const telemetry = localShipTelemetry.hasData() ? localShipTelemetry.get() : null;
      const selfX = telemetry ? telemetry.x : (curSelf?.x ?? 0);
      const selfZ = telemetry ? telemetry.z : (curSelf?.z ?? 0);
      const heading = telemetry ? telemetry.heading : (curSelf?.rotationY ?? 0);

      // Telemetry updates (throttled to ~6Hz)
      if (curSelf && frameCount % 10 === 0) {
        const shipHeading = heading;
        if (headingReadoutRef.current) {
          const deg = Math.round((((shipHeading * 180) / Math.PI) % 360 + 360) % 360);
          headingReadoutRef.current.textContent = `${deg.toString().padStart(3, '0')}°`;
        }

        if (!hideWind && telemetryRef.current) {
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

      const sinH = Math.sin(heading);
      const cosH = Math.cos(heading);

      // 1. Solid Ocean Water Background
      ctx.fillStyle = cachedMapConfig.water.midWaterColor || '#0077b6';
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      // 2. High-Definition Baked Ocean & Islands Texture
      const originPt = projectToMinimap(0, 0, selfX, selfZ, sinH, cosH, SCALE, cx, cy);
      const mapCenterScreenX = originPt.x;
      const mapCenterScreenY = originPt.y;
      const mapPixelSize = mapRadius * 2 * SCALE;

      const mapTexture = mapTextureService.getMapTexture(mapIdKey);
      if (mapTexture) {
        drawMapTexture(ctx, mapTexture, mapCenterScreenX, mapCenterScreenY, heading, mapPixelSize, mapRadius, SCALE);
      } else {
        drawProceduralFallbackIslands(ctx, activeIslands, selfX, selfZ, sinH, cosH, SCALE, cx, cy);
      }

      // 3. Cartographic Lat/Long Gridlines
      drawCartographicGrid(ctx, mapCenterScreenX, mapCenterScreenY, heading, mapRadius, SCALE);

      // 4. Tactical Overlays (Range rings and sightline)
      drawTacticalOverlays(ctx, cx, cy, SCALE);

      // 5. Island Inscriptions
      drawIslandLabels(ctx, activeIslands, selfX, selfZ, sinH, cosH, SCALE, cx, cy, CANVAS_SIZE);

      // 6. Shipwrecks
      drawShipwrecks(ctx, activeWrecks, selfX, selfZ, sinH, cosH, SCALE, cx, cy, CANVAS_SIZE);

      // 7. Other Warships (Cache teamMap to avoid allocating Map every frame)
      const isTeamMode = currentRoom?.gameMode === 'TEAM';
      if (isTeamMode && currentRoom?.players && currentRoom.players !== lastPlayersRef.current) {
        lastPlayersRef.current = currentRoom.players;
        cachedTeamMap.current.clear();
        for (let pIdx = 0; pIdx < currentRoom.players.length; pIdx++) {
          const p = currentRoom.players[pIdx];
          cachedTeamMap.current.set(p.id, p.team);
        }
      }
      const selfPlayer = currentRoom?.players?.find((p) => p.id === curId);
      const selfTeam = selfPlayer?.team;

      drawFleetWarships(
        ctx,
        curShips,
        curId,
        isTeamMode,
        selfTeam,
        cachedTeamMap.current,
        selfX,
        selfZ,
        sinH,
        cosH,
        SCALE,
        cx,
        cy,
        heading,
        CANVAS_SIZE
      );

      // 8. Player Ship (Locked at Center cx, cy)
      drawPlayerVessel(ctx, cx, cy);

      // 9. True Magnetic North Compass Needle
      drawTrueNorthCompassNeedle(ctx, NEEDLE_OFFSET, NEEDLE_OFFSET, heading);

      // 10. Dynamic Wind Streamer
      drawDynamicWindStreamer(ctx, windBadgeX, windBadgeY, curWindAngle, sinH, cosH);

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, []);

  const containerSizeClass = compact
    ? 'w-[104px] h-[104px] sm:w-[116px] sm:h-[116px]'
    : 'w-[156px] h-[156px] sm:w-[172px] sm:h-[172px]';

  return (
    <div className="relative flex flex-col items-center select-none pointer-events-auto shrink-0 touch-none">
      {/* Square Tactical Chart Housing with Antique Brass Bezel */}
      <div
        className={`relative flex items-center justify-center ${containerSizeClass} rounded-lg bg-stone-950/95 border-2 border-amber-600/80 shadow-[0_4px_20px_rgba(0,0,0,0.85)] p-0 overflow-hidden group`}
      >
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: '100%' }}
          className="block pointer-events-none w-full h-full"
        />

        {/* Ornate Antique Brass Corner Rivets & Brackets */}
        <div className="absolute top-1 left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-amber-400/80 pointer-events-none" />
        <div className="absolute top-1 right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-amber-400/80 pointer-events-none" />
        <div className="absolute bottom-1 left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-amber-400/80 pointer-events-none" />
        <div className="absolute bottom-1 right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-amber-400/80 pointer-events-none" />

        {/* Subtle Inner Bezel Shadow */}
        <div className="absolute inset-0 rounded-md border border-amber-400/20 pointer-events-none shadow-[inset_0_0_10px_rgba(0,0,0,0.7)]" />

        {/* Top Header Badge: True Heading Readout */}
        <div className="absolute top-1 inset-x-0 flex items-center justify-center pointer-events-none">
          <span
            ref={headingReadoutRef}
            className="px-1.5 py-0.2 bg-stone-950/85 backdrop-blur-xs border border-amber-600/30 rounded text-[7.5px] font-cinzel font-bold text-amber-300 tracking-wider tabular-nums shadow"
          >
            000°
          </span>
        </div>
      </div>

      {/* Integrated Wind & Sail Telemetry Bar */}
      {!hideWind && (
        <div className="mt-1 flex items-center justify-center w-[156px] sm:w-[172px] gap-1 px-2 py-0.5 bg-stone-950/90 backdrop-blur-sm text-[8.5px] font-cinzel border border-amber-600/40 rounded shadow-md overflow-hidden">
          <Wind className="w-2.5 h-2.5 text-amber-400 shrink-0" />
          <span ref={telemetryRef} className="text-amber-200 font-bold tracking-wide truncate tabular-nums text-center">
            -- KTS · RUNNING FREE (100%)
          </span>
        </div>
      )}
    </div>
  );
});
