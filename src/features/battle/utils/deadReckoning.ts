import { getMapConfig } from '../maps';
import { useGameStore } from '@/stores/useGameStore';

export interface DeadReckoningBuffer {
  snapX: number;
  snapY: number;
  snapZ: number;
  snapHeading: number;
  vx: number;
  vz: number;
  turnRate: number;
  packetTime: number;
  lastSeqKey: string;
}

export function createDeadReckoningBuffer(
  x: number = 0,
  y: number = 0,
  z: number = 0,
  heading: number = 0
): DeadReckoningBuffer {
  return {
    snapX: x,
    snapY: y,
    snapZ: z,
    snapHeading: heading,
    vx: 0,
    vz: 0,
    turnRate: 0,
    packetTime: performance.now(),
    lastSeqKey: '',
  };
}

/**
 * Updates dead reckoning buffer when a fresh server snapshot arrives.
 */
export function pushSnapshot(
  buffer: DeadReckoningBuffer,
  newX: number,
  newY: number,
  newZ: number,
  newHeading: number,
  vx: number = 0,
  vz: number = 0
): void {
  const seqKey = `${newX}_${newZ}_${newHeading}`;
  if (seqKey === buffer.lastSeqKey) return;

  const now = performance.now();
  const dt = Math.max(0.015, (now - buffer.packetTime) / 1000);

  // Compute smooth angular velocity from heading delta (shortest arc)
  if (buffer.packetTime > 0 && dt < 0.25) {
    const twoPi = Math.PI * 2;
    const diff = ((newHeading - buffer.snapHeading) % twoPi + twoPi + Math.PI) % twoPi - Math.PI;
    const calculatedRate = diff / dt;
    buffer.turnRate = Math.max(-2.5, Math.min(2.5, calculatedRate));
  } else {
    buffer.turnRate = 0;
  }

  buffer.lastSeqKey = seqKey;
  buffer.packetTime = now;
  buffer.snapX = newX;
  buffer.snapY = newY;
  buffer.snapZ = newZ;
  buffer.snapHeading = newHeading;
  buffer.vx = vx;
  buffer.vz = vz;
}

/**
 * Computes extrapolated target position with shoreline & shipwreck collision clamping.
 */
export function extrapolatePosition(
  buffer: DeadReckoningBuffer,
  isSunk: boolean = false
): { x: number; y: number; z: number; heading: number } {
  const now = performance.now();
  // Cap extrapolation window to 80ms (smoothly bridges 33ms server ticks)
  const elapsed = Math.min(0.08, (now - buffer.packetTime) / 1000);

  let targetX = buffer.snapX + buffer.vx * elapsed;
  let targetZ = buffer.snapZ + buffer.vz * elapsed;
  const targetY = isSunk ? buffer.snapY : buffer.snapY + 0.85;
  const targetHeading = buffer.snapHeading + buffer.turnRate * elapsed;

  const { currentMapId, currentRoom } = useGameStore.getState();
  const activeMap = getMapConfig(currentMapId || currentRoom?.mapId || 'caribbean');
  const activeIslands = activeMap.islands;
  const activeWrecks = activeMap.shipwrecks;

  // Shoreline and Shipwreck client collision clamping
  const shipColRadius = 2.5;
  for (let i = 0; i < activeIslands.length; i++) {
    const isl = activeIslands[i];
    const bound = (isl.sandRadius + 15) * (isl.elongation ? Math.max(isl.elongation.scaleX, isl.elongation.scaleZ) : 1);
    if (Math.abs(targetX - isl.x) > bound || Math.abs(targetZ - isl.z) > bound) {
      continue;
    }

    if (isl.elongation) {
      const relX = targetX - isl.x;
      const relZ = targetZ - isl.z;
      const cosA = Math.cos(isl.elongation.angle);
      const sinA = Math.sin(isl.elongation.angle);
      const localX = relX * cosA - relZ * sinA;
      const localZ = relX * sinA + relZ * cosA;

      const worldDist = Math.hypot(localX, localZ);
      const uX = localX / isl.elongation.scaleX;
      const uZ = localZ / isl.elongation.scaleZ;
      const a = Math.atan2(uZ, uX);
      const scaleFactor = Math.hypot(Math.cos(a) * isl.elongation.scaleX, Math.sin(a) * isl.elongation.scaleZ);
      const minSafeDist = isl.sandRadius * 0.76 * scaleFactor + shipColRadius;

      if (worldDist < minSafeDist) {
        const safeDist = Math.max(0.001, worldDist);
        const pushLocalX = (localX / safeDist) * minSafeDist;
        const pushLocalZ = (localZ / safeDist) * minSafeDist;

        targetX = isl.x + pushLocalX * cosA + pushLocalZ * sinA;
        targetZ = isl.z - pushLocalX * sinA + pushLocalZ * cosA;
      }
    } else {
      const dx = targetX - isl.x;
      const dz = targetZ - isl.z;
      const dist = Math.hypot(dx, dz);
      const minSafe = isl.sandRadius * 0.76 + shipColRadius;
      if (dist < minSafe && dist > 0.001) {
        targetX = isl.x + (dx / dist) * minSafe;
        targetZ = isl.z + (dz / dist) * minSafe;
      }
    }
  }

  for (let i = 0; i < activeWrecks.length; i++) {
    const wreck = activeWrecks[i];
    const bound = wreck.radius + 10;
    if (Math.abs(targetX - wreck.x) > bound || Math.abs(targetZ - wreck.z) > bound) {
      continue;
    }

    const dx = targetX - wreck.x;
    const dz = targetZ - wreck.z;
    const dist = Math.hypot(dx, dz);
    const minSafe = wreck.radius * 0.65 + shipColRadius;
    if (dist < minSafe && dist > 0.001) {
      targetX = wreck.x + (dx / dist) * minSafe;
      targetZ = wreck.z + (dz / dist) * minSafe;
    }
  }

  return {
    x: targetX,
    y: targetY,
    z: targetZ,
    heading: targetHeading,
  };
}
