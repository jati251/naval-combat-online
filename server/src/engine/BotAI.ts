import type { ShipSimulationState, SailState, MapId } from '../types/protocol.js';
import { getServerMap } from '../maps/mapConfigs.js';
import type { GameRoom } from './GameRoom.js';

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
   * Steps the Bot AI logic for a single bot ship:
   * 1. Multi-ray obstacle avoidance (never rams islands/reefs)
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

    // Dynamic lookahead distance scales with ship speed
    const lookDist = Math.max(42, speedKnots * 2.6 + 28);

    // --- 1. Multi-Ray Obstacle Detection ---
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
    const hitAhead = this.isHazard(aheadX, aheadZ, 22, mapId);
    const hitLeft = this.isHazard(leftX, leftZ, 20, mapId);
    const hitRight = this.isHazard(rightX, rightZ, 20, mapId);
    const hitWideLeft = this.isHazard(wideLeftX, wideLeftZ, 18, mapId);
    const hitWideRight = this.isHazard(wideRightX, wideRightZ, 18, mapId);

    const hasObstacleAhead = hitAhead || hitLeft || hitRight || hitWideLeft || hitWideRight;

    if (hasObstacleAhead) {
      // Emergency Avoidance: Steer sharply toward whichever side is clearer
      let leftClearanceScore = 0;
      let rightClearanceScore = 0;

      if (!hitLeft) leftClearanceScore += 2;
      if (!hitWideLeft) leftClearanceScore += 1;
      if (!hitRight) rightClearanceScore += 2;
      if (!hitWideRight) rightClearanceScore += 1;

      // Steer hard away from obstacles
      const targetRudder = leftClearanceScore >= rightClearanceScore ? -1.0 : 1.0;

      // Drop to Battle Sail for tighter turning radius when evading reefs
      const targetSail: SailState = speedKnots > 10 ? 'HALF_SAIL' : 'FULL_SAIL';

      room.handleInput(bot.id, targetRudder, targetSail);
      return;
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
