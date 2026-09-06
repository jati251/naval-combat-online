import type { ShipSimulationState, SailState, MapId } from '../types/protocol.js';
import { getServerMap } from '../maps/mapConfigs.js';
import type { GameRoom } from './GameRoom.js';
interface BotEvasionMemory {
  rudder: number;
  timer: number;
}

const botMemory = new Map<string, BotEvasionMemory>();

export class BotAI {
  /**
   * Normalizes an angle to [-PI, PI].
   */
  private static normalizeAngle(angle: number): number {
    let a = angle % (Math.PI * 2);
    if (a > Math.PI) a -= Math.PI * 2;
    if (a < -Math.PI) a += Math.PI * 2;
    return a;
  }

  /**
   * Evaluates if a given world coordinate is inside or dangerously close to an island,
   * shipwreck, or the arena boundary.
   */
  public static isHazard(x: number, z: number, margin: number = 28, mapId: MapId = 'caribbean'): boolean {
    // 1. Arena Boundary check (radius ~420m)
    if (Math.hypot(x, z) > 420 - margin) {
      return true;
    }

    const { islands, wrecks } = getServerMap(mapId);

    // 2. Island collision check
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
        const minClearance = isl.sandRadius * 0.9 * scaleFactor + margin;
        if (Math.hypot(lx, lz) < minClearance) {
          return true;
        }
      } else {
        if (Math.hypot(x - isl.x, z - isl.z) < isl.sandRadius * 0.9 + margin) {
          return true;
        }
      }
    }

    // 3. Wreck collision check
    for (const wreck of wrecks) {
      if (Math.hypot(x - wreck.x, z - wreck.z) < wreck.radius + margin) {
        return true;
      }
    }

    return false;
  }

  /**
   * Checks if a coordinate is dangerously close to another unsunk vessel.
   */
  public static isShipHazard(
    x: number,
    z: number,
    margin: number,
    selfId: string,
    room: GameRoom
  ): boolean {
    for (const ship of room.ships.values()) {
      if (ship.id === selfId || ship.isSunk) continue;
      if (Math.hypot(x - ship.x, z - ship.z) < margin) {
        return true;
      }
    }
    return false;
  }

  /**
   * Steps the Bot AI logic for a single bot ship:
   * 1. Multi-ray obstacle avoidance (never rams islands/reefs or fellow vessels)
   * 2. Target selection & pursuit
   * 3. Broadside engagement & firing
   */
  public static update(bot: ShipSimulationState, room: GameRoom): void {
    if (bot.isSunk || room.status !== 'IN_GAME') return;

    // Grace period at battle start (4.0s) so players finish loading assets before bots engage
    const matchTime = (Date.now() - room.getStartTime()) / 1000;
    if (matchTime < 4.0) {
      room.handleInput(bot.id, 0, 'ANCHOR');
      return;
    }

    const heading = bot.rotationY;
    const speedKnots = Math.max(0, bot.speed);

    // --- 0. Persistent Evasion Memory & Close-Quarters Collision Avoidance ---
    const existingMemory = botMemory.get(bot.id);

    let closestShipDist = 999;
    let closestShipBearing = 0;
    for (const other of room.ships.values()) {
      if (other.id === bot.id || other.isSunk) continue;
      const dx = other.x - bot.x;
      const dz = other.z - bot.z;
      const d = Math.hypot(dx, dz);
      if (d < closestShipDist) {
        closestShipDist = d;
        closestShipBearing = this.normalizeAngle(Math.atan2(dx, dz) - heading);
      }
    }

    const hasCloseShip = closestShipDist < 36 && Math.abs(closestShipBearing) < 1.25;

    // Dynamic lookahead distance scales with ship speed
    const lookDist = Math.max(42, speedKnots * 2.6 + 28);

    // --- 1. Multi-Ray Obstacle Detection (Islands, Wrecks & Other Ships) ---
    const aheadX = bot.x + Math.sin(heading) * lookDist;
    const aheadZ = bot.z + Math.cos(heading) * lookDist;

    const leftX = bot.x + Math.sin(heading - 0.55) * (lookDist * 0.85);
    const leftZ = bot.z + Math.cos(heading - 0.55) * (lookDist * 0.85);

    const rightX = bot.x + Math.sin(heading + 0.55) * (lookDist * 0.85);
    const rightZ = bot.z + Math.cos(heading + 0.55) * (lookDist * 0.85);

    const wideLeftX = bot.x + Math.sin(heading - 1.1) * (lookDist * 0.65);
    const wideLeftZ = bot.z + Math.cos(heading - 1.1) * (lookDist * 0.65);

    const wideRightX = bot.x + Math.sin(heading + 1.1) * (lookDist * 0.65);
    const wideRightZ = bot.z + Math.cos(heading + 1.1) * (lookDist * 0.65);

    const mapId = room.mapId;
    const hitAhead = this.isHazard(aheadX, aheadZ, 22, mapId) || this.isShipHazard(aheadX, aheadZ, 20, bot.id, room);
    const hitLeft = this.isHazard(leftX, leftZ, 20, mapId) || this.isShipHazard(leftX, leftZ, 18, bot.id, room);
    const hitRight = this.isHazard(rightX, rightZ, 20, mapId) || this.isShipHazard(rightX, rightZ, 18, bot.id, room);
    const hitWideLeft = this.isHazard(wideLeftX, wideLeftZ, 18, mapId) || this.isShipHazard(wideLeftX, wideLeftZ, 16, bot.id, room);
    const hitWideRight = this.isHazard(wideRightX, wideRightZ, 18, mapId) || this.isShipHazard(wideRightX, wideRightZ, 16, bot.id, room);

    const hasObstacleAhead = hitAhead || hitLeft || hitRight || hitWideLeft || hitWideRight;

    // If an obstacle or nearby ship is detected:
    if (hasCloseShip || hasObstacleAhead) {
      // If the bot already committed to an evasion direction, keep holding it to prevent jitter!
      if (existingMemory && existingMemory.timer > 0) {
        existingMemory.timer -= 0.033;
        room.handleInput(bot.id, existingMemory.rudder, speedKnots > 10 ? 'HALF_SAIL' : 'FULL_SAIL');
        return;
      }

      // Otherwise, decide the best evasion direction with hysteresis
      let chosenRudder: number;
      if (hasCloseShip) {
        chosenRudder = closestShipBearing >= 0 ? -1.0 : 1.0;
      } else {
        let leftClearance = 0;
        let rightClearance = 0;
        if (!hitLeft) leftClearance += 2;
        if (!hitWideLeft) leftClearance += 1;
        if (!hitRight) rightClearance += 2;
        if (!hitWideRight) rightClearance += 1;

        if (leftClearance > rightClearance) {
          chosenRudder = -1.0;
        } else if (rightClearance > leftClearance) {
          chosenRudder = 1.0;
        } else {
          // Break symmetry cleanly: preserve current rudder bias or steer starboard
          chosenRudder = bot.rudder < 0 ? -1.0 : 1.0;
        }
      }

      // Lock this evasion direction for 1.8 seconds to guarantee smooth, jitter-free navigation
      botMemory.set(bot.id, { rudder: chosenRudder, timer: 1.8 });
      room.handleInput(bot.id, chosenRudder, speedKnots > 10 ? 'HALF_SAIL' : 'FULL_SAIL');
      return;
    } else {
      // Path is clear: decay evasion timer smoothly
      if (existingMemory) {
        existingMemory.timer -= 0.033;
        if (existingMemory.timer <= 0) {
          botMemory.delete(bot.id);
        }
      }
    }

    // --- 2. Target Acquisition & Tactical Combat ---
    let nearestEnemy: ShipSimulationState | null = null;
    let minEnemyDist = 99999;

    const botPlayer = room.players.get(bot.id);
    for (const ship of room.ships.values()) {
      if (ship.id === bot.id || ship.isSunk) continue;

      // In TEAM mode, do not target teammates
      if (room.gameMode === 'TEAM') {
        const targetPlayer = room.players.get(ship.id);
        if (targetPlayer?.team && botPlayer?.team && targetPlayer.team === botPlayer.team) {
          continue;
        }
      }

      const d = Math.hypot(ship.x - bot.x, ship.z - bot.z);
      if (d < minEnemyDist) {
        minEnemyDist = d;
        nearestEnemy = ship;
      }
    }

    if (!nearestEnemy) {
      // No targets: cruise towards central arena
      const toCenterAngle = Math.atan2(-bot.x, -bot.z);
      const diff = this.normalizeAngle(toCenterAngle - heading);
      const rudder = Math.max(-0.6, Math.min(0.6, diff * 1.5));
      room.handleInput(bot.id, rudder, 'FULL_SAIL');
      return;
    }

    const dx = nearestEnemy.x - bot.x;
    const dz = nearestEnemy.z - bot.z;
    const dist = minEnemyDist;
    const angleToTarget = Math.atan2(dx, dz);
    const relBearing = this.normalizeAngle(angleToTarget - heading);

    let targetRudder: number;
    let targetSail: SailState;

    if (dist > 150) {
      // Closing distance: steer directly towards enemy
      const angleDiff = this.normalizeAngle(angleToTarget - heading);
      targetRudder = Math.max(-1.0, Math.min(1.0, angleDiff * 1.6));
      targetSail = 'FULL_SAIL';
    } else if (dist >= 45) {
      // In broadside combat range (45m - 150m):
      // Turn ship broadside to enemy (enemy at ~90° on left or right)
      const fireSide: 'left' | 'right' = relBearing >= 0 ? 'left' : 'right';

      // Desired heading aligns broadside with target
      const broadsideOffset = fireSide === 'left' ? -Math.PI * 0.5 : Math.PI * 0.5;
      const desiredHeading = angleToTarget + broadsideOffset;
      const headingDiff = this.normalizeAngle(desiredHeading - heading);

      targetRudder = Math.max(-1.0, Math.min(1.0, headingDiff * 1.8));
      targetSail = dist < 85 ? 'HALF_SAIL' : 'FULL_SAIL';

      // Broadside Gunnery: Check if enemy is in the firing arc
      // (+-30 degrees from the 90-degree broadside perpendicular)
      const broadsideAngleDiff = Math.abs(Math.abs(relBearing) - Math.PI * 0.5);
      if (broadsideAngleDiff < 0.45 && dist < 170) {
        room.handleFire(bot.id, fireSide);
      }
    } else {
      // Too close (< 45m): steer away to open up broadside maneuvering space
      const escapeHeading = angleToTarget + Math.PI;
      const headingDiff = this.normalizeAngle(escapeHeading - heading);
      targetRudder = Math.max(-1.0, Math.min(1.0, headingDiff * 2.0));
      targetSail = 'FULL_SAIL';
    }

    room.handleInput(bot.id, targetRudder, targetSail);
  }
}
