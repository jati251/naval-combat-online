import { getWaveHeight } from './WaveMath.js';
import {
  type ShipSimulationState,
  type CannonballSimulationState,
  type MapId,
  SERVER_SHIP_CONFIGS,
} from '../types/protocol.js';
import { getServerMap } from '../maps/mapConfigs.js';

export class CollisionSystem {
  public static updateCannonballs(
    cannonballs: CannonballSimulationState[],
    ships: Map<string, ShipSimulationState>,
    dt: number,
    serverTime: number,
    onHit: (ball: CannonballSimulationState, hitShip: ShipSimulationState) => void,
    isFriendly?: (ownerId: string, targetId: string) => boolean,
    mapId: MapId = 'caribbean'
  ): CannonballSimulationState[] {
    const activeBalls: CannonballSimulationState[] = [];
    const gravity = -9.81;
    const { islands, wrecks } = getServerMap(mapId);

    for (const ball of cannonballs) {
      if (serverTime - ball.createdAt > ball.maxLife) {
        continue;
      }

      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;
      ball.z += ball.vz * dt;
      ball.vy += gravity * dt;

      const waterHeight = getWaveHeight(ball.x, ball.z, serverTime);
      if (ball.y <= waterHeight) {
        continue;
      }

      let hitObstacle = false;
      for (const isl of islands) {
        if (Math.abs(ball.x - isl.x) > 85 || Math.abs(ball.z - isl.z) > 85) {
          continue;
        }

        if (isl.elongation) {
          const relX = ball.x - isl.x;
          const relZ = ball.z - isl.z;
          const cosA = Math.cos(-isl.elongation.angle);
          const sinA = Math.sin(-isl.elongation.angle);
          const localX = relX * cosA - relZ * sinA;
          const localZ = relX * sinA + relZ * cosA;
          const halfRidge = isl.sandRadius * (isl.elongation.scaleZ - isl.elongation.scaleX);
          const clampedZ = Math.max(-halfRidge, Math.min(halfRidge, localZ));
          const dz = localZ - clampedZ;
          const distSq = localX * localX + dz * dz;
          const threshold = isl.sandRadius * isl.elongation.scaleX;
          if (distSq <= threshold * threshold && ball.y <= 22) {
            hitObstacle = true;
            break;
          }
        } else {
          const dx = ball.x - isl.x;
          const dz = ball.z - isl.z;
          if (dx * dx + dz * dz <= isl.sandRadius * isl.sandRadius && ball.y <= 24) {
            hitObstacle = true;
            break;
          }
        }
      }
      if (hitObstacle) {
        continue;
      }

      for (const wreck of wrecks) {
        if (Math.abs(ball.x - wreck.x) > 25 || Math.abs(ball.z - wreck.z) > 25) {
          continue;
        }

        const dx = ball.x - wreck.x;
        const dz = ball.z - wreck.z;
        if (dx * dx + dz * dz <= wreck.radius * wreck.radius && ball.y <= wreck.height) {
          hitObstacle = true;
          break;
        }
      }
      if (hitObstacle) {
        continue;
      }

      let hit = false;
      for (const ship of ships.values()) {
        if (ship.id === ball.ownerId || ship.isSunk) continue;
        if (isFriendly && isFriendly(ball.ownerId, ship.id)) continue;

        const dx = ball.x - ship.x;
        const dz = ball.z - ship.z;
        if (Math.abs(dx) > 25 || Math.abs(dz) > 25) {
          continue;
        }

        const dy = ball.y - ship.y;
        if (dy < -2.0 || dy > 7.5) {
          continue;
        }

        const config = SERVER_SHIP_CONFIGS[ship.shipClass];
        const sinH = Math.sin(ship.rotationY);
        const cosH = Math.cos(ship.rotationY);
        const localX = dx * cosH - dz * sinH;
        const localZ = dx * sinH + dz * cosH;

        const halfLen = config.length * 0.5 + 1.2;
        const halfWid = config.width * 0.5 + 1.4;
        const heightThreshold = 6.5;

        if (
          Math.abs(localX) <= halfWid &&
          Math.abs(localZ) <= halfLen &&
          dy >= -1.8 &&
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

  public static resolveShipCollisions(
    ships: Map<string, ShipSimulationState>,
    _dt: number
  ): void {
    const aliveShips: ShipSimulationState[] = [];
    for (const ship of ships.values()) {
      if (!ship.isSunk) {
        aliveShips.push(ship);
      }
    }
    if (aliveShips.length < 2) return;

    for (let i = 0; i < aliveShips.length; i++) {
      const shipA = aliveShips[i];
      const cfgA = SERVER_SHIP_CONFIGS[shipA.shipClass];
      const halfLenA = cfgA.length * 0.28;
      const radiusA = cfgA.width * 0.5 + 0.4;
      const sinA = Math.sin(shipA.rotationY);
      const cosA = Math.cos(shipA.rotationY);

      const bowAx = shipA.x + sinA * halfLenA;
      const bowAz = shipA.z + cosA * halfLenA;
      const sternAx = shipA.x - sinA * halfLenA;
      const sternAz = shipA.z - cosA * halfLenA;

      for (let j = i + 1; j < aliveShips.length; j++) {
        const shipB = aliveShips[j];
        const cfgB = SERVER_SHIP_CONFIGS[shipB.shipClass];

        const maxDist = cfgA.length * 0.65 + cfgB.length * 0.65;
        const cdx = shipA.x - shipB.x;
        const cdz = shipA.z - shipB.z;
        if (cdx * cdx + cdz * cdz > maxDist * maxDist) {
          continue;
        }

        const halfLenB = cfgB.length * 0.28;
        const radiusB = cfgB.width * 0.5 + 0.4;
        const sinB = Math.sin(shipB.rotationY);
        const cosB = Math.cos(shipB.rotationY);

        const bowBx = shipB.x + sinB * halfLenB;
        const bowBz = shipB.z + cosB * halfLenB;
        const sternBx = shipB.x - sinB * halfLenB;
        const sternBz = shipB.z - cosB * halfLenB;

        const minSphereDist = radiusA + radiusB;
        const minSphereDistSq = minSphereDist * minSphereDist;

        let maxOverlap = 0;
        let pushNx = 0;
        let pushNz = 0;

        let dx = bowAx - bowBx;
        let dz = bowAz - bowBz;
        let distSq = dx * dx + dz * dz;
        if (distSq < minSphereDistSq) {
          const dist = Math.sqrt(distSq);
          maxOverlap = minSphereDist - dist;
          if (dist > 0.001) { pushNx = dx / dist; pushNz = dz / dist; }
          else { pushNx = Math.sin(shipA.rotationY + Math.PI * 0.5); pushNz = Math.cos(shipA.rotationY + Math.PI * 0.5); }
        }

        dx = bowAx - sternBx;
        dz = bowAz - sternBz;
        distSq = dx * dx + dz * dz;
        if (distSq < minSphereDistSq) {
          const dist = Math.sqrt(distSq);
          const overlap = minSphereDist - dist;
          if (overlap > maxOverlap) {
            maxOverlap = overlap;
            if (dist > 0.001) { pushNx = dx / dist; pushNz = dz / dist; }
            else { pushNx = Math.sin(shipA.rotationY + Math.PI * 0.5); pushNz = Math.cos(shipA.rotationY + Math.PI * 0.5); }
          }
        }

        dx = sternAx - bowBx;
        dz = sternAz - bowBz;
        distSq = dx * dx + dz * dz;
        if (distSq < minSphereDistSq) {
          const dist = Math.sqrt(distSq);
          const overlap = minSphereDist - dist;
          if (overlap > maxOverlap) {
            maxOverlap = overlap;
            if (dist > 0.001) { pushNx = dx / dist; pushNz = dz / dist; }
            else { pushNx = Math.sin(shipA.rotationY + Math.PI * 0.5); pushNz = Math.cos(shipA.rotationY + Math.PI * 0.5); }
          }
        }

        dx = sternAx - sternBx;
        dz = sternAz - sternBz;
        distSq = dx * dx + dz * dz;
        if (distSq < minSphereDistSq) {
          const dist = Math.sqrt(distSq);
          const overlap = minSphereDist - dist;
          if (overlap > maxOverlap) {
            maxOverlap = overlap;
            if (dist > 0.001) { pushNx = dx / dist; pushNz = dz / dist; }
            else { pushNx = Math.sin(shipA.rotationY + Math.PI * 0.5); pushNz = Math.cos(shipA.rotationY + Math.PI * 0.5); }
          }
        }

        if (maxOverlap > 0) {
          const separation = maxOverlap * 0.52;
          shipA.x += pushNx * separation;
          shipA.z += pushNz * separation;
          shipB.x -= pushNx * separation;
          shipB.z -= pushNz * separation;

          shipA.speed = Math.max(0, shipA.speed * 0.72);
          shipB.speed = Math.max(0, shipB.speed * 0.72);

          shipA.vx = Math.sin(shipA.rotationY) * (shipA.speed * 0.514444);
          shipA.vz = Math.cos(shipA.rotationY) * (shipA.speed * 0.514444);
          shipB.vx = Math.sin(shipB.rotationY) * (shipB.speed * 0.514444);
          shipB.vz = Math.cos(shipB.rotationY) * (shipB.speed * 0.514444);
        }
      }
    }
  }
}
