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
    x: -25,
    z: -15,
    radius: 30,
    sandRadius: 42,
    elongation: { scaleX: 0.55, scaleZ: 2.5, angle: 0.52 },
  },
  { id: 'dead-mans-cay', x: -190, z: 130, radius: 46, sandRadius: 65 },
  { id: 'isla-de-la-muerte', x: 180, z: -160, radius: 52, sandRadius: 72 },
  { id: 'smugglers-reef', x: 130, z: 140, radius: 34, sandRadius: 48 },
  { id: 'isla-verde', x: 200, z: 45, radius: 44, sandRadius: 62 },
  { id: 'tortuga-atoll', x: -175, z: -145, radius: 38, sandRadius: 54 },
  { id: 'verdant-ridge', x: -65, z: 225, radius: 48, sandRadius: 66 },
  { id: 'cayo-de-la-selva', x: -235, z: -15, radius: 42, sandRadius: 58 },
  { id: 'black-sand-atoll', x: 45, z: -225, radius: 36, sandRadius: 52 },
];

export const SERVER_WRECKS = [
  { id: 'wreck-el-cazador', x: 0, z: 65, radius: 14, height: 8 },
  { id: 'wreck-queen-anne', x: -80, z: -40, radius: 12, height: 7 },
  { id: 'wreck-royal-fortune', x: 80, z: -60, radius: 13, height: 8 },
];

export class PhysicsEngine {
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

    // Rudder turning: turning rate scales with speed
    const effectiveTurnSpeed = config.turnSpeed * Math.min(1.0, (ship.speed + 1.5) / config.topSpeed);
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

    // Tactical Caribbean Islands Collision & Run-Aground Deceleration
    for (const isl of SERVER_ISLANDS) {
      if (isl.elongation) {
        // Oriented capsule collision for elongated barrier island
        const relX = ship.x - isl.x;
        const relZ = ship.z - isl.z;
        const cosA = Math.cos(-isl.elongation.angle);
        const sinA = Math.sin(-isl.elongation.angle);
        const localX = relX * cosA - relZ * sinA;
        const localZ = relX * sinA + relZ * cosA;

        const halfRidge = isl.sandRadius * (isl.elongation.scaleZ - isl.elongation.scaleX);
        const clampedZ = Math.max(-halfRidge, Math.min(halfRidge, localZ));
        const spineDx = localX;
        const spineDz = localZ - clampedZ;
        const dist = Math.hypot(spineDx, spineDz);
        const minSafeDist = isl.sandRadius * isl.elongation.scaleX * 1.05 + shipRadius;

        if (dist < minSafeDist && dist > 0.0001) {
          const nx = spineDx / dist;
          const nz = spineDz / dist;
          const pushLocalX = nx * minSafeDist;
          const pushLocalZ = clampedZ + nz * minSafeDist;

          const cosInv = Math.cos(isl.elongation.angle);
          const sinInv = Math.sin(isl.elongation.angle);
          ship.x = isl.x + (pushLocalX * cosInv - pushLocalZ * sinInv);
          ship.z = isl.z + (pushLocalX * sinInv + pushLocalZ * cosInv);
          ship.speed = 0; // complete halt on land impact
        }
      } else {
        // Circular island shoreline collision against visible beach radius
        const dx = ship.x - isl.x;
        const dz = ship.z - isl.z;
        const dist = Math.hypot(dx, dz);
        const minSafeDist = isl.sandRadius * 1.05 + shipRadius;
        if (dist < minSafeDist && dist > 0.001) {
          const nx = dx / dist;
          const nz = dz / dist;
          ship.x = isl.x + nx * minSafeDist;
          ship.z = isl.z + nz * minSafeDist;
          ship.speed = 0; // Stop dead on reef/sandbank
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
        ship.speed = 0; // Impact with floating timbers stops forward push
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
