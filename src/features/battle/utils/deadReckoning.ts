import { ARENA_ISLANDS } from '../components/3d/Islands3D';
import { ARENA_SHIPWRECKS } from '../components/3d/Shipwrecks3D';

export interface DeadReckoningBuffer {
  // Snapshot baseline from server
  snapX: number;
  snapY: number;
  snapZ: number;
  snapHeading: number;
  vx: number;
  vz: number;
  packetTime: number;
  lastSeqKey: string;

  // Error vector for smooth reconciliation (prevents 33ms tick snap)
  errorX: number;
  errorZ: number;
  errorHeading: number;
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
    packetTime: performance.now(),
    lastSeqKey: '',
    errorX: 0,
    errorZ: 0,
    errorHeading: 0,
  };
}

/**
 * Updates dead reckoning buffer when a fresh server snapshot arrives.
 * Absorbs differences into smooth decay offsets rather than snapping instantly.
 */
export function pushSnapshot(
  buffer: DeadReckoningBuffer,
  currentX: number,
  currentZ: number,
  currentHeading: number,
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
  buffer.lastSeqKey = seqKey;
  buffer.packetTime = now;

  // Compute position offset between current visual position and incoming snapshot
  const rawDiffX = currentX - newX;
  const rawDiffZ = currentZ - newZ;

  // Angle difference with shortest-arc wrapping
  let diffH = (currentHeading - newHeading) % (Math.PI * 2);
  if (diffH > Math.PI) diffH -= Math.PI * 2;
  if (diffH < -Math.PI) diffH += Math.PI * 2;

  // If error is small (< 15m), absorb smoothly; if teleport/respawn (> 15m), snap immediately
  if (Math.hypot(rawDiffX, rawDiffZ) < 15.0) {
    buffer.errorX = rawDiffX;
    buffer.errorZ = rawDiffZ;
    buffer.errorHeading = diffH;
  } else {
    buffer.errorX = 0;
    buffer.errorZ = 0;
    buffer.errorHeading = 0;
  }

  buffer.snapX = newX;
  buffer.snapY = newY;
  buffer.snapZ = newZ;
  buffer.snapHeading = newHeading;
  buffer.vx = vx;
  buffer.vz = vz;
}

/**
 * Computes extrapolated target position with error decay and shoreline collision clamping.
 */
export function extrapolatePosition(
  buffer: DeadReckoningBuffer,
  delta: number,
  isSunk: boolean = false
): { x: number; y: number; z: number; heading: number } {
  const now = performance.now();
  // Cap extrapolation window to 100ms (prevents overshooting during packet drop)
  const elapsed = Math.min(0.1, (now - buffer.packetTime) / 1000);

  // Extrapolate forward with velocity
  let targetX = buffer.snapX + buffer.vx * elapsed;
  let targetZ = buffer.snapZ + buffer.vz * elapsed;
  const targetY = isSunk ? buffer.snapY : buffer.snapY + 0.85;

  // Decay reconciliation error smoothly
  const errorDecay = Math.max(0, 1.0 - 14.0 * delta);
  buffer.errorX *= errorDecay;
  buffer.errorZ *= errorDecay;
  buffer.errorHeading *= errorDecay;

  // Apply decaying error offset
  targetX += buffer.errorX;
  targetZ += buffer.errorZ;

  // Shortest-arc target heading
  const targetHeading = buffer.snapHeading + buffer.errorHeading;

  // Shoreline and Shipwreck client collision clamping
  const shipColRadius = 2.5;
  for (let i = 0; i < ARENA_ISLANDS.length; i++) {
    const isl = ARENA_ISLANDS[i];
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

  for (let i = 0; i < ARENA_SHIPWRECKS.length; i++) {
    const wreck = ARENA_SHIPWRECKS[i];
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
