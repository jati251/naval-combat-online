import { getHullWaterPose, getFastHullWaterPose } from './WaveMath.js';
import {
  type ShipSimulationState,
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
  private static readonly waterPose = { y: 0, pitch: 0, roll: 0 };
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
    if (!Number.isFinite(dt) || dt <= 0) return;
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

    // Rudder authority needs water flowing past the stern; turns shed forward speed.
    const steerage = Math.min(1, ship.speed / Math.max(1, config.topSpeed * 0.55));
    const effectiveTurnSpeed = config.turnSpeed * steerage;
    ship.speed *= Math.exp(-Math.abs(ship.rudder) * steerage * 0.075 * dt);
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

    const fwdX = Math.sin(ship.rotationY);
    const fwdZ = Math.cos(ship.rotationY);

    const { islands, wrecks } = getServerMap(mapId);

    // Multi-Point Waterline Hull Collision Probes (Bow, Mid-bow, Center, Mid-stern, Stern)
    // Eliminates bow and stern clipping into beaches, sea stacks, and shipwrecks
    const halfLen = config.length * 0.44;
    const probeRadius = Math.max(1.6, Math.min(3.8, config.width * 0.5 + 0.35));
    const probeOffsets = [halfLen * 0.88, halfLen * 0.44, 0, -halfLen * 0.44, -halfLen * 0.88];

    for (const off of probeOffsets) {
      const px = ship.x + fwdX * off;
      const pz = ship.z + fwdZ * off;

      // 1. Islands Collision & Dynamic Shoreline Deflection
      for (const isl of islands) {
        // Fast broad-phase bounding check
        const islMaxRadius = (isl.sandRadius * (isl.elongation ? Math.max(isl.elongation.scaleX, isl.elongation.scaleZ) : 1.0)) + probeRadius + 10;
        if (Math.abs(px - isl.x) > islMaxRadius || Math.abs(pz - isl.z) > islMaxRadius) {
          continue;
        }

        if (isl.elongation) {
          const rx = px - isl.x;
          const rz = pz - isl.z;
          const cosA = Math.cos(isl.elongation.angle);
          const sinA = Math.sin(isl.elongation.angle);
          const lx = rx * cosA - rz * sinA;
          const lz = rx * sinA + rz * cosA;

          const semiX = isl.sandRadius * 0.76 * isl.elongation.scaleX;
          const semiZ = isl.sandRadius * 0.76 * isl.elongation.scaleZ;
          const theta = Math.atan2(lz, lx);
          const cosT = Math.cos(theta);
          const sinT = Math.sin(theta);
          const denom = Math.sqrt((semiZ * cosT) ** 2 + (semiX * sinT) ** 2);
          const rEllipse = denom > 1e-4 ? (semiX * semiZ) / denom : semiX;
          const minSafeDist = rEllipse + probeRadius;
          const curDist = Math.hypot(lx, lz);

          if (curDist < minSafeDist) {
            const overlap = minSafeDist - curDist;
            const safeD = Math.max(0.001, curDist);
            const localNx = lx / safeD;
            const localNz = lz / safeD;

            const nx = localNx * cosA + localNz * sinA;
            const nz = -localNx * sinA + localNz * cosA;

            ship.x += nx * overlap;
            ship.z += nz * overlap;

            const dot = fwdX * nx + fwdZ * nz;
            if (dot < 0) {
              ship.speed = Math.max(1.2, Math.min(ship.speed * 0.72, 3.8));
              if (off >= 0) {
                // Bow glancing deflection along shoreline tangent
                const tangentX = -nz;
                const tangentZ = nx;
                const tangentDot = fwdX * tangentX + fwdZ * tangentZ;
                const targetYaw = Math.atan2(tangentDot >= 0 ? tangentX : -tangentX, tangentDot >= 0 ? tangentZ : -tangentZ);
                let yawDiff = targetYaw - ship.rotationY;
                while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
                while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
                ship.rotationY += yawDiff * 2.0 * dt;
              }
            }
          }
        } else {
          const dx = px - isl.x;
          const dz = pz - isl.z;
          const curDist = Math.hypot(dx, dz);
          const minSafeDist = isl.sandRadius * 0.76 + probeRadius;

          if (curDist < minSafeDist && curDist > 0.001) {
            const overlap = minSafeDist - curDist;
            const nx = dx / curDist;
            const nz = dz / curDist;

            ship.x += nx * overlap;
            ship.z += nz * overlap;

            const dot = fwdX * nx + fwdZ * nz;
            if (dot < 0) {
              ship.speed = Math.max(1.2, Math.min(ship.speed * 0.72, 3.8));
              if (off >= 0) {
                const tangentX = -nz;
                const tangentZ = nx;
                const tangentDot = fwdX * tangentX + fwdZ * tangentZ;
                const targetYaw = Math.atan2(tangentDot >= 0 ? tangentX : -tangentX, tangentDot >= 0 ? tangentZ : -tangentZ);
                let yawDiff = targetYaw - ship.rotationY;
                while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
                while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
                ship.rotationY += yawDiff * 2.0 * dt;
              }
            }
          }
        }
      }

      // 2. Floating Shipwrecks Collision
      for (const wreck of wrecks) {
        const dx = px - wreck.x;
        const dz = pz - wreck.z;
        const curDist = Math.hypot(dx, dz);
        const minSafeDist = wreck.radius * 0.72 + probeRadius;

        if (curDist < minSafeDist && curDist > 0.001) {
          const overlap = minSafeDist - curDist;
          const nx = dx / curDist;
          const nz = dz / curDist;

          ship.x += nx * overlap;
          ship.z += nz * overlap;

          const dot = fwdX * nx + fwdZ * nz;
          if (dot < 0) {
            ship.speed = Math.max(0, ship.speed * 0.4);
            if (off > 0) {
              const tangentX = -nz;
              const tangentZ = nx;
              const tangentDot = fwdX * tangentX + fwdZ * tangentZ;
              const targetYaw = Math.atan2(tangentDot >= 0 ? tangentX : -tangentX, tangentDot >= 0 ? tangentZ : -tangentZ);
              let yawDiff = targetYaw - ship.rotationY;
              while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
              while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
              ship.rotationY += yawDiff * 1.8 * dt;
            }
          }
        }
      }
    }

    // Crucial: Synchronize true post-collision velocity so client extrapolation never shoots into land
    ship.vx = (ship.x - prevX) / dt;
    ship.vz = (ship.z - prevZ) / dt;

    const pose = ship.id.startsWith('bot-')
      ? getFastHullWaterPose(ship.x, ship.z, ship.rotationY, config.length, serverTime, PhysicsEngine.waterPose)
      : getHullWaterPose(ship.x, ship.z, ship.rotationY, config.length, config.width, serverTime, PhysicsEngine.waterPose);
    const response = 1 - Math.exp(-Math.max(2.5, 7 - config.length * 0.09) * dt);
    ship.y += (pose.y - ship.y) * response;
    ship.pitch += (pose.pitch - ship.pitch) * response;
    const turnHeel = -ship.rudder * Math.min(0.075, ship.speed * ship.speed * 0.0007);
    ship.roll += (pose.roll + turnHeel - ship.roll) * response;
  }


}
