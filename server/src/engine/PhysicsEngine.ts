import { getWaveHeight } from './WaveMath.js';
import {
  type ShipClass,
  type SailState,
  type ShipSimulationState,
  type CannonballSimulationState,
  SERVER_SHIP_CONFIGS,
} from '../types/protocol.js';

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

    // Move along ship heading (yaw)
    // Note: Three.js coordinates: +Z forward or -Z forward depending on orientation
    // Let's standardise: 0 rad yaw points along +Z, rotation around Y
    const moveZ = Math.cos(ship.rotationY) * ship.speed * dt;
    const moveX = Math.sin(ship.rotationY) * ship.speed * dt;

    ship.x += moveX;
    ship.z += moveZ;
    ship.vx = moveX / dt;
    ship.vz = moveZ / dt;

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
