import { getWaveHeight } from './WaveMath.js';
import {
  type ShipSimulationState,
  type CannonballSimulationState,
  SERVER_SHIP_CONFIGS,
} from '../types/protocol.js';

export interface ServerIsland {
  id: string;
  x: number;
  z: number;
  radius: number;
  sandRadius: number;
  elongation?: {
    scaleX: number;
    scaleZ: number;
    angle: number;
  };
}

export const SERVER_ISLANDS: ServerIsland[] = [
  {
    id: 'isla-larga',
    x: -40,
    z: -10,
    radius: 28,
    sandRadius: 38,
    elongation: { scaleX: 0.52, scaleZ: 2.3, angle: 0.45 },
  },
  { id: 'dead-mans-cay', x: -330, z: 180, radius: 44, sandRadius: 60 },
  { id: 'isla-de-la-muerte', x: 290, z: -260, radius: 46, sandRadius: 62 },
  { id: 'smugglers-reef', x: 320, z: 160, radius: 34, sandRadius: 48 },
  { id: 'isla-verde', x: 260, z: -30, radius: 40, sandRadius: 55 },
  { id: 'tortuga-atoll', x: -280, z: -250, radius: 36, sandRadius: 50 },
  { id: 'verdant-ridge', x: -80, z: 340, radius: 45, sandRadius: 60 },
  { id: 'cayo-de-la-selva', x: -360, z: -30, radius: 40, sandRadius: 54 },
  { id: 'black-sand-atoll', x: 70, z: -340, radius: 35, sandRadius: 48 },
];

export const SERVER_WRECKS = [
  { id: 'wreck-el-cazador', x: 40, z: 110, radius: 14, height: 8 },
  { id: 'wreck-queen-anne', x: -140, z: -80, radius: 12, height: 7 },
  { id: 'wreck-royal-fortune', x: 130, z: -100, radius: 13, height: 8 },
];

export class PhysicsEngine {
  /**
   * Generates a guaranteed safe spawn point with ample clearance from islands and shipwrecks.
   */
  public static findSafeSpawnPoint(playerIndex: number, totalPlayers: number): { x: number; z: number; rotationY: number } {
    const candidateRadii = [155, 175, 135, 195, 215];
    const baseAngle = (playerIndex / Math.max(1, totalPlayers)) * Math.PI * 2;

    for (const radius of candidateRadii) {
      for (let attempt = 0; attempt < 16; attempt++) {
        const angle = baseAngle + attempt * 0.392;
        const x = Math.sin(angle) * radius;
        const z = Math.cos(angle) * radius;

        let safe = true;
        // Check islands clearance
        for (const isl of SERVER_ISLANDS) {
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
            const minSafeDist = isl.sandRadius * 1.2 * scaleFactor + 65;
            if (Math.hypot(lx, lz) < minSafeDist) {
              safe = false;
              break;
            }
          } else {
            if (Math.hypot(x - isl.x, z - isl.z) < isl.sandRadius * 1.2 + 65) {
              safe = false;
              break;
            }
          }
        }

        if (safe) {
          // Check wrecks clearance
          for (const wreck of SERVER_WRECKS) {
            if (Math.hypot(x - wreck.x, z - wreck.z) < wreck.radius + 45) {
              safe = false;
              break;
            }
          }
        }

        if (safe) {
          const rotationY = Math.atan2(-x, -z);
          return { x, z, rotationY };
        }
      }
    }

    return { x: 0, z: 220, rotationY: Math.PI };
  }

  /**
   * Updates ship physics for a single simulation delta time step.
   */
  public static updateShip(
    ship: ShipSimulationState,
    dt: number,
    serverTime: number,
    windAngle: number,
    windSpeed: number
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
    if (ship.reloadTimerPort > 0) {
      ship.reloadTimerPort = Math.max(0, ship.reloadTimerPort - dt);
    }
    if (ship.reloadTimerStarboard > 0) {
      ship.reloadTimerStarboard = Math.max(0, ship.reloadTimerStarboard - dt);
    }

    // Determine target speed based on sail state
    let targetSpeed = 0;
    if (ship.sail === 'HALF_SAIL') targetSpeed = config.topSpeed * 0.55;
    else if (ship.sail === 'FULL_SAIL') targetSpeed = config.topSpeed;

    // Wind efficiency calculation (sailing with/against wind)
    const shipHeading = ship.rotationY;
    const angleDiff = Math.abs((((shipHeading - windAngle + Math.PI) % (Math.PI * 2)) - Math.PI));
    // Best speed when broad reaching / running with wind, slower directly into wind
    const windFactor = 0.5 + 0.5 * Math.sin(angleDiff * 0.5);
    targetSpeed *= windFactor * (windSpeed / 10);

    // Accelerate or decelerate towards target speed
    if (ship.speed < targetSpeed) {
      ship.speed = Math.min(targetSpeed, ship.speed + config.acceleration * dt);
    } else {
      ship.speed = Math.max(targetSpeed, ship.speed - (config.acceleration * 1.5) * dt);
    }

    // Rudder turning: turning rate scales with speed, with responsive low-speed turning
    const effectiveTurnSpeed = config.turnSpeed * Math.max(0.45, Math.min(1.0, (ship.speed + 1.5) / config.topSpeed));
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

    // Ship physical collision radius accounts for bow & hull length
    const shipRadius = config.length * 0.42;
    const fwdX = Math.sin(ship.rotationY);
    const fwdZ = Math.cos(ship.rotationY);

    // Tactical Caribbean Islands Collision & Run-Aground Deceleration
    for (const isl of SERVER_ISLANDS) {
      if (isl.elongation) {
        // True elliptical collision matching 3D beach geometry and orientation
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
        const minSafeDist = isl.sandRadius * 1.2 * scaleFactor + shipRadius;

        if (worldDist < minSafeDist) {
          const safeDist = Math.max(0.001, worldDist);
          const pushLocalX = (localX / safeDist) * minSafeDist;
          const pushLocalZ = (localZ / safeDist) * minSafeDist;

          ship.x = isl.x + pushLocalX * cosA + pushLocalZ * sinA;
          ship.z = isl.z - pushLocalX * sinA + pushLocalZ * cosA;

          // Outward normal in world space: only stop forward speed if attempting to sail INTO land
          const nx = (pushLocalX / minSafeDist) * cosA + (pushLocalZ / minSafeDist) * sinA;
          const nz = -(pushLocalX / minSafeDist) * sinA + (pushLocalZ / minSafeDist) * cosA;
          const dot = fwdX * nx + fwdZ * nz;
          if (dot < 0) {
            ship.speed = 0;
          }
        }
      } else {
        // Circular island shoreline collision against visible beach radius
        const dx = ship.x - isl.x;
        const dz = ship.z - isl.z;
        const dist = Math.hypot(dx, dz);
        const minSafeDist = isl.sandRadius * 1.2 + shipRadius;
        if (dist < minSafeDist && dist > 0.001) {
          const nx = dx / dist;
          const nz = dz / dist;
          ship.x = isl.x + nx * minSafeDist;
          ship.z = isl.z + nz * minSafeDist;
          const dot = fwdX * nx + fwdZ * nz;
          if (dot < 0) {
            ship.speed = 0;
          }
        }
      }
    }

    // Floating Shipwrecks Collision & Scrape Slowdown (AC Black Flag Flotsam / Wreck Hulls)
    for (const wreck of SERVER_WRECKS) {
      const dx = ship.x - wreck.x;
      const dz = ship.z - wreck.z;
      const dist = Math.hypot(dx, dz);
      const minSafeDist = wreck.radius + shipRadius;
      if (dist < minSafeDist && dist > 0.001) {
        const nx = dx / dist;
        const nz = dz / dist;
        ship.x = wreck.x + nx * minSafeDist;
        ship.z = wreck.z + nz * minSafeDist;
        const dot = fwdX * nx + fwdZ * nz;
        if (dot < 0) {
          ship.speed = 0;
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

    // Port & Starboard probe coordinates (lateral)
    const portX = ship.x + Math.cos(ship.rotationY) * halfWid;
    const portZ = ship.z - Math.sin(ship.rotationY) * halfWid;
    const stbdX = ship.x - Math.cos(ship.rotationY) * halfWid;
    const stbdZ = ship.z + Math.sin(ship.rotationY) * halfWid;

    const portWaterY = getWaveHeight(portX, portZ, serverTime);
    const stbdWaterY = getWaveHeight(stbdX, stbdZ, serverTime);

    // Target water height at center of mass
    const centerWaterY = (bowWaterY + sternWaterY + portWaterY + stbdWaterY) * 0.25;
    // Dampen height transition
    ship.y += (centerWaterY - ship.y) * Math.min(1.0, 10 * dt);

    // Calculate pitch (tilt along length) and roll (tilt along width)
    const targetPitch = Math.atan2(bowWaterY - sternWaterY, config.length);
    const targetRoll = Math.atan2(portWaterY - stbdWaterY, config.width) + (ship.rudder * 0.08); // slight roll into turns

    ship.pitch += (targetPitch - ship.pitch) * Math.min(1.0, 8 * dt);
    ship.roll += (targetRoll - ship.roll) * Math.min(1.0, 8 * dt);
  }

  /**
   * Updates cannonballs, checks collision against ships, and removes expired balls.
   */
  public static updateCannonballs(
    cannonballs: CannonballSimulationState[],
    ships: Map<string, ShipSimulationState>,
    dt: number,
    serverTime: number,
    onHit: (ball: CannonballSimulationState, hitShip: ShipSimulationState) => void
  ): CannonballSimulationState[] {
    const activeBalls: CannonballSimulationState[] = [];
    const gravity = -9.81;

    for (const ball of cannonballs) {
      // Age check
      if (serverTime - ball.createdAt > ball.maxLife) {
        continue;
      }

      // Physics integration (velocity & gravity)
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;
      ball.z += ball.vz * dt;
      ball.vy += gravity * dt;

      // Water impact check
      const waterHeight = getWaveHeight(ball.x, ball.z, serverTime);
      if (ball.y <= waterHeight) {
        // Splashed in ocean!
        continue;
      }

      // Island terrain obstruction check (cannonball hits island rock/sand)
      let hitObstacle = false;
      for (const isl of SERVER_ISLANDS) {
        if (isl.elongation) {
          const relX = ball.x - isl.x;
          const relZ = ball.z - isl.z;
          const cosA = Math.cos(-isl.elongation.angle);
          const sinA = Math.sin(-isl.elongation.angle);
          const localX = relX * cosA - relZ * sinA;
          const localZ = relX * sinA + relZ * cosA;
          const halfRidge = isl.sandRadius * (isl.elongation.scaleZ - isl.elongation.scaleX);
          const clampedZ = Math.max(-halfRidge, Math.min(halfRidge, localZ));
          const dist = Math.hypot(localX, localZ - clampedZ);
          if (dist <= isl.sandRadius * isl.elongation.scaleX && ball.y <= 22) {
            hitObstacle = true;
            break;
          }
        } else {
          const distToIsl = Math.hypot(ball.x - isl.x, ball.z - isl.z);
          if (distToIsl <= isl.sandRadius && ball.y <= 24) {
            hitObstacle = true;
            break;
          }
        }
      }
      if (hitObstacle) {
        continue;
      }

      // Shipwreck collision check (cannonball hits floating wreck hull/mast)
      for (const wreck of SERVER_WRECKS) {
        const distToWreck = Math.hypot(ball.x - wreck.x, ball.z - wreck.z);
        if (distToWreck <= wreck.radius && ball.y <= wreck.height) {
          hitObstacle = true;
          break;
        }
      }
      if (hitObstacle) {
        continue;
      }

      // Check collision against other ships (excluding shooter)
      let hit = false;
      for (const [shipId, ship] of ships.entries()) {
        if (shipId === ball.ownerId || ship.isSunk) continue;

        const config = SERVER_SHIP_CONFIGS[ship.shipClass];
        // Calculate distance from cannonball to ship center
        const dx = ball.x - ship.x;
        const dz = ball.z - ship.z;
        const dy = ball.y - ship.y;

        // Bounding box approximation (aligned with ship yaw)
        const cosYaw = Math.cos(-ship.rotationY);
        const sinYaw = Math.sin(-ship.rotationY);
        const localX = dx * cosYaw - dz * sinYaw; // lateral
        const localZ = dx * sinYaw + dz * cosYaw; // longitudinal

        const halfLen = config.length * 0.5 + 0.8;
        const halfWid = config.width * 0.5 + 0.8;
        const heightThreshold = 5.0; // ship deck height allowance

        if (
          Math.abs(localX) <= halfWid &&
          Math.abs(localZ) <= halfLen &&
          dy >= -1.0 &&
          dy <= heightThreshold
        ) {
          hit = true;
          onHit(ball, ship);
          break;
        }
      }

      if (!hit) {
        activeBalls.push(ball);
      }
    }

    return activeBalls;
  }
}
