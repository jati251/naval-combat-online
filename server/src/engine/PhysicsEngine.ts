import { getWaveHeight } from './WaveMath.js';
import {
  type ShipSimulationState,
  type CannonballSimulationState,
  type MapId,
  SERVER_SHIP_CONFIGS,
} from '../types/protocol.js';
import {
  type ServerIsland,
  type ServerWreck,
  getServerMap,
  SERVER_MAPS,
} from '../maps/mapConfigs.js';

export type { ServerIsland, ServerWreck };
export const SERVER_ISLANDS = SERVER_MAPS.caribbean.islands;
export const SERVER_WRECKS = SERVER_MAPS.caribbean.wrecks;

export class PhysicsEngine {
  /**
   * Generates a guaranteed safe spawn point with ample clearance from islands and shipwrecks.
   */
  public static findSafeSpawnPoint(
    playerIndex: number,
    totalPlayers: number,
    existingShips: Array<{ x: number; z: number }> = [],
    mapId: MapId = 'caribbean'
  ): { x: number; z: number; rotationY: number } {
    const { islands, wrecks } = getServerMap(mapId);

    // Dynamic randomized spawn distribution:
    // 1. Give each match a randomized angular rotation offset so spawns are never in identical locations
    const randomAngleOffset = Math.random() * Math.PI * 2;
    // 2. Spread players across distinct dynamic sectors around the archipelago
    const sectorAngle = (Math.PI * 2) / Math.max(1, totalPlayers);
    const playerSector = randomAngleOffset + playerIndex * sectorAngle;

    // 3. Multi-tier distance bands from dynamic channels (140m) to open ocean (320m)
    const distanceBands = [160, 210, 260, 310, 180, 240];
    distanceBands.sort(() => Math.random() - 0.5);

    for (const radius of distanceBands) {
      for (let attempt = 0; attempt < 28; attempt++) {
        // Sector jitter and radial jitter
        const angleJitter = (Math.random() - 0.5) * (sectorAngle * 0.75);
        const radiusJitter = (Math.random() - 0.5) * 30;
        const angle = playerSector + angleJitter;
        const r = Math.max(120, Math.min(340, radius + radiusJitter));

        const x = Math.sin(angle) * r;
        const z = Math.cos(angle) * r;

        let safe = true;
        // Realistic island clearance (tight to visible beach, leaving open water free for spawning)
        for (const isl of islands) {
          if (isl.elongation) {
            const rx = x - isl.x;
            const rz = z - isl.z;
            const cosA = Math.cos(isl.elongation.angle);
            const sinA = Math.sin(isl.elongation.angle);
            const lx = rx * cosA - rz * sinA;
            const lz = rx * sinA + rz * cosA;
            const uX = lx / isl.elongation.scaleX;
            const uZ = lz / isl.elongation.scaleZ;
            const a = Math.atan2(uZ, uX);
            const scaleFactor = Math.hypot(Math.cos(a) * isl.elongation.scaleX, Math.sin(a) * isl.elongation.scaleZ);
            const minClearance = isl.sandRadius * 0.85 * scaleFactor + 25;
            if (Math.hypot(lx, lz) < minClearance) {
              safe = false;
              break;
            }
          } else {
            if (Math.hypot(x - isl.x, z - isl.z) < isl.sandRadius * 0.85 + 25) {
              safe = false;
              break;
            }
          }
        }

        if (safe) {
          // Check wrecks clearance
          for (const wreck of wrecks) {
            if (Math.hypot(x - wreck.x, z - wreck.z) < wreck.radius + 20) {
              safe = false;
              break;
            }
          }
        }

        if (safe) {
          // Ensure clearance from already spawned ships (at least 35m)
          for (const s of existingShips) {
            if (Math.hypot(x - s.x, z - s.z) < 35) {
              safe = false;
              break;
            }
          }
        }

        if (safe) {
          // Tactical heading: facing towards central arena with +-30deg variation
          const centerHeading = Math.atan2(-x, -z);
          const headingJitter = (Math.random() - 0.5) * 1.0;
          const rotationY = centerHeading + headingJitter;
          return { x, z, rotationY };
        }
      }
    }

    // Fallback randomized perimeter spawn
    const fallbackAngle = playerSector;
    return {
      x: Math.sin(fallbackAngle) * 200,
      z: Math.cos(fallbackAngle) * 200,
      rotationY: Math.atan2(-Math.sin(fallbackAngle), -Math.cos(fallbackAngle)),
    };
  }

  /**
   * Generates a randomized safe respawn point across the archipelago:
   * - Never spawns on or near islands (+30m sand clearance)
   * - Never spawns on shipwrecks (+25m clearance)
   * - Safe tactical distance (>= 120m) from all active opponents to avoid spawn-camping
   * - Selects the candidate that maximizes distance to the nearest opponent
   */
  public static findRandomSafeRespawnPoint(
    existingAliveShips: Array<{ x: number; z: number }> = [],
    mapId: MapId = 'caribbean'
  ): { x: number; z: number; rotationY: number } {
    const { islands, wrecks } = getServerMap(mapId);
    let bestCandidate: { x: number; z: number; rotationY: number; minOppDist: number } | null = null;

    // Generate up to 48 randomized candidates sampled across the arena
    for (let i = 0; i < 48; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 120 + Math.random() * 230; // Between 120m and 350m
      const x = Math.sin(angle) * radius;
      const z = Math.cos(angle) * radius;

      let safe = true;

      // 1. Island collision check
      for (const isl of islands) {
        if (isl.elongation) {
          const rx = x - isl.x;
          const rz = z - isl.z;
          const cosA = Math.cos(isl.elongation.angle);
          const sinA = Math.sin(isl.elongation.angle);
          const lx = rx * cosA - rz * sinA;
          const lz = rx * sinA + rz * cosA;
          const uX = lx / isl.elongation.scaleX;
          const uZ = lz / isl.elongation.scaleZ;
          const a = Math.atan2(uZ, uX);
          const scaleFactor = Math.hypot(Math.cos(a) * isl.elongation.scaleX, Math.sin(a) * isl.elongation.scaleZ);
          const minClearance = isl.sandRadius * 0.9 * scaleFactor + 30;
          if (Math.hypot(lx, lz) < minClearance) {
            safe = false;
            break;
          }
        } else {
          if (Math.hypot(x - isl.x, z - isl.z) < isl.sandRadius * 0.9 + 30) {
            safe = false;
            break;
          }
        }
      }
      if (!safe) continue;

      // 2. Wreck clearance
      for (const wreck of wrecks) {
        if (Math.hypot(x - wreck.x, z - wreck.z) < wreck.radius + 25) {
          safe = false;
          break;
        }
      }
      if (!safe) continue;

      // 3. Opponent distance evaluation
      let minOppDist = 99999;
      for (const opp of existingAliveShips) {
        const d = Math.hypot(x - opp.x, z - opp.z);
        if (d < minOppDist) minOppDist = d;
      }

      const centerHeading = Math.atan2(-x, -z);
      const headingJitter = (Math.random() - 0.5) * 1.2;
      const rotationY = centerHeading + headingJitter;

      const candidate = { x, z, rotationY, minOppDist };

      // If at least 120m from all opponents, this is a prime candidate!
      if (minOppDist >= 120) {
        return candidate;
      }

      if (!bestCandidate || minOppDist > bestCandidate.minOppDist) {
        bestCandidate = candidate;
      }
    }

    if (bestCandidate) {
      return { x: bestCandidate.x, z: bestCandidate.z, rotationY: bestCandidate.rotationY };
    }

    const fallbackAngle = Math.random() * Math.PI * 2;
    return {
      x: Math.sin(fallbackAngle) * 220,
      z: Math.cos(fallbackAngle) * 220,
      rotationY: Math.atan2(-Math.sin(fallbackAngle), -Math.cos(fallbackAngle)),
    };
  }

  /**
   * Updates ship physics for a single simulation delta time step.
   */
  public static updateShip(
    ship: ShipSimulationState,
    dt: number,
    serverTime: number,
    windAngle: number,
    windSpeed: number,
    mapId: MapId = 'caribbean'
  ): void {
    if (ship.isSunk) {
      // Sinking animation: ship sinks downwards and tilts
      ship.y -= 1.8 * dt;
      ship.pitch += 0.3 * dt;
      ship.roll += 0.2 * dt;
      return;
    }

    const config = SERVER_SHIP_CONFIGS[ship.shipClass];

    // Reload timers countdown
    if (ship.reloadTimerLeft > 0) {
      ship.reloadTimerLeft = Math.max(0, ship.reloadTimerLeft - dt);
    }
    if (ship.reloadTimerRight > 0) {
      ship.reloadTimerRight = Math.max(0, ship.reloadTimerRight - dt);
    }

    // Determine target speed based on sail state
    let targetSpeed = 0;
    if (ship.sail === 'HALF_SAIL') targetSpeed = config.topSpeed * 0.55;
    else if (ship.sail === 'FULL_SAIL') targetSpeed = config.topSpeed;

    // Wind efficiency calculation (sailing with/against wind)
    // Lightened wind gameplay effect: generous base speed (88-100%) so ships never get crippled
    const shipHeading = ship.rotationY;
    const angleDiff = Math.abs((((shipHeading - windAngle + Math.PI) % (Math.PI * 2)) - Math.PI));
    const windFactor = 0.88 + 0.12 * Math.sin(angleDiff * 0.5);
    const windSpeedMod = 1.0 + (windSpeed - 12) * 0.008;
    targetSpeed *= windFactor * windSpeedMod;

    // Accelerate or decelerate towards target speed
    if (ship.speed < targetSpeed) {
      ship.speed = Math.min(targetSpeed, ship.speed + config.acceleration * dt);
    } else {
      ship.speed = Math.max(targetSpeed, ship.speed - (config.acceleration * 1.5) * dt);
    }

    // Rudder turning: turning rate scales with speed, with responsive low-speed turning
    const effectiveTurnSpeed = config.turnSpeed * Math.max(0.65, Math.min(1.0, (ship.speed + 2.5) / config.topSpeed));
    ship.rotationY += ship.rudder * effectiveTurnSpeed * dt;

    // Anti-Cheat: Cap maximum possible speed (prevents speedhack)
    const absoluteMaxSpeed = config.topSpeed * 1.25;
    if (ship.speed > absoluteMaxSpeed) {
      ship.speed = absoluteMaxSpeed;
    }

    // Record pre-movement position to measure actual post-collision velocity
    const prevX = ship.x;
    const prevZ = ship.z;

    // Move along ship heading (yaw)
    // Standardized: 0 rad yaw points along +Z, rotation around Y
    const moveZ = Math.cos(ship.rotationY) * ship.speed * dt;
    const moveX = Math.sin(ship.rotationY) * ship.speed * dt;

    ship.x += moveX;
    ship.z += moveZ;

    // Anti-Cheat: Ocean Arena Boundaries (Radius 500m)
    const maxRadius = 500;
    const distFromCenter = Math.hypot(ship.x, ship.z);
    if (distFromCenter > maxRadius) {
      const angle = Math.atan2(ship.x, ship.z);
      ship.x = Math.sin(angle) * maxRadius;
      ship.z = Math.cos(angle) * maxRadius;
      ship.speed *= 0.2;
    }

    // Ship physical collision radius: tightened to realistic hull half-width + safety margin
    const shipRadius = Math.max(1.8, Math.min(4.0, config.width * 0.5 + 0.6));
    const fwdX = Math.sin(ship.rotationY);
    const fwdZ = Math.cos(ship.rotationY);

    const { islands, wrecks } = getServerMap(mapId);

    // Tactical Islands Collision & Run-Aground Deceleration
    for (const isl of islands) {
      if (isl.elongation) {
        // Elliptical island shoreline: reduced from sandRadius * 1.2 to 0.76 to match real beach waterline
        const relX = ship.x - isl.x;
        const relZ = ship.z - isl.z;
        const cosA = Math.cos(isl.elongation.angle);
        const sinA = Math.sin(isl.elongation.angle);
        const localX = relX * cosA - relZ * sinA;
        const localZ = relX * sinA + relZ * cosA;

        const worldDist = Math.hypot(localX, localZ);
        const uX = localX / isl.elongation.scaleX;
        const uZ = localZ / isl.elongation.scaleZ;
        const a = Math.atan2(uZ, uX);
        const scaleFactor = Math.hypot(Math.cos(a) * isl.elongation.scaleX, Math.sin(a) * isl.elongation.scaleZ);
        const minSafeDist = isl.sandRadius * 0.76 * scaleFactor + shipRadius;

        if (worldDist < minSafeDist) {
          const safeDist = Math.max(0.001, worldDist);
          const pushLocalX = (localX / safeDist) * minSafeDist;
          const pushLocalZ = (localZ / safeDist) * minSafeDist;

          ship.x = isl.x + pushLocalX * cosA + pushLocalZ * sinA;
          ship.z = isl.z - pushLocalX * sinA + pushLocalZ * cosA;

          // Outward normal in world space
          const nx = (pushLocalX / minSafeDist) * cosA + (pushLocalZ / minSafeDist) * sinA;
          const nz = -(pushLocalX / minSafeDist) * sinA + (pushLocalZ / minSafeDist) * cosA;
          const dot = fwdX * nx + fwdZ * nz;
          if (dot < 0) {
            // Decelerate smoothly to a scrape speed (retains enough steerage to turn away)
            ship.speed = Math.max(1.5, Math.min(ship.speed * 0.7, 4.0));
            // Gently glance heading along the island shoreline tangent
            const tangentX = -nz;
            const tangentZ = nx;
            const tangentDot = fwdX * tangentX + fwdZ * tangentZ;
            const targetYaw = Math.atan2(tangentDot >= 0 ? tangentX : -tangentX, tangentDot >= 0 ? tangentZ : -tangentZ);
            let yawDiff = targetYaw - ship.rotationY;
            while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
            while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
            ship.rotationY += yawDiff * 1.5 * dt;
          }
        }
      } else {
        // Circular island shoreline: reduced from sandRadius * 1.2 to 0.76
        const dx = ship.x - isl.x;
        const dz = ship.z - isl.z;
        const dist = Math.hypot(dx, dz);
        const minSafeDist = isl.sandRadius * 0.76 + shipRadius;
        if (dist < minSafeDist && dist > 0.001) {
          const nx = dx / dist;
          const nz = dz / dist;
          ship.x = isl.x + nx * minSafeDist;
          ship.z = isl.z + nz * minSafeDist;
          const dot = fwdX * nx + fwdZ * nz;
          if (dot < 0) {
            ship.speed = Math.max(1.5, Math.min(ship.speed * 0.7, 4.0));
            const tangentX = -nz;
            const tangentZ = nx;
            const tangentDot = fwdX * tangentX + fwdZ * tangentZ;
            const targetYaw = Math.atan2(tangentDot >= 0 ? tangentX : -tangentX, tangentDot >= 0 ? tangentZ : -tangentZ);
            let yawDiff = targetYaw - ship.rotationY;
            while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
            while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
            ship.rotationY += yawDiff * 1.5 * dt;
          }
        }
      }
    }

    // Floating Shipwrecks Collision: reduced from wreck.radius + 8.5m to wreck.radius * 0.65 + shipRadius
    for (const wreck of wrecks) {
      const dx = ship.x - wreck.x;
      const dz = ship.z - wreck.z;
      const dist = Math.hypot(dx, dz);
      const minSafeDist = wreck.radius * 0.65 + shipRadius;
      if (dist < minSafeDist && dist > 0.001) {
        const nx = dx / dist;
        const nz = dz / dist;
        ship.x = wreck.x + nx * minSafeDist;
        ship.z = wreck.z + nz * minSafeDist;
        const dot = fwdX * nx + fwdZ * nz;
        if (dot < 0) {
          ship.speed *= 0.3;
        }
      }
    }

    // Crucial: Synchronize true post-collision velocity so client extrapolation never shoots into land
    ship.vx = (ship.x - prevX) / dt;
    ship.vz = (ship.z - prevZ) / dt;

    // 3-Point Water Height Probing for Buoyancy and Pitch/Roll
    const halfLen = config.length * 0.5;
    const halfWid = config.width * 0.5;

    // Bow & Stern probe coordinates
    const bowX = ship.x + Math.sin(ship.rotationY) * halfLen;
    const bowZ = ship.z + Math.cos(ship.rotationY) * halfLen;
    const sternX = ship.x - Math.sin(ship.rotationY) * halfLen;
    const sternZ = ship.z - Math.cos(ship.rotationY) * halfLen;

    const bowWaterY = getWaveHeight(bowX, bowZ, serverTime);
    const sternWaterY = getWaveHeight(sternX, sternZ, serverTime);

    // Left & Right probe coordinates (lateral)
    const leftX = ship.x - Math.cos(ship.rotationY) * halfWid;
    const leftZ = ship.z + Math.sin(ship.rotationY) * halfWid;
    const rightX = ship.x + Math.cos(ship.rotationY) * halfWid;
    const rightZ = ship.z - Math.sin(ship.rotationY) * halfWid;

    const leftWaterY = getWaveHeight(leftX, leftZ, serverTime);
    const rightWaterY = getWaveHeight(rightX, rightZ, serverTime);

    // Target water height at center of mass
    const centerWaterY = (bowWaterY + sternWaterY + leftWaterY + rightWaterY) * 0.25;
    // Dampen height transition
    ship.y += (centerWaterY - ship.y) * Math.min(1.0, 10 * dt);

    // Calculate pitch (tilt along length) and roll (tilt along width)
    const targetPitch = Math.atan2(bowWaterY - sternWaterY, config.length);
    const targetRoll = Math.atan2(leftWaterY - rightWaterY, config.width) + (ship.rudder * 0.08); // slight roll into turns

    ship.pitch += (targetPitch - ship.pitch) * Math.min(1.0, 8 * dt);
    ship.roll += (targetRoll - ship.roll) * Math.min(1.0, 8 * dt);
  }


}
