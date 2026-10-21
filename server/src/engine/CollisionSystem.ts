import {
  type ShipSimulationState,
  type CannonballSimulationState,
  type MapId,
  SERVER_SHIP_CONFIGS,
} from '../types/protocol.js';
import { getServerMap, type ServerIsland } from '../maps/mapConfigs.js';

interface CachedIslandTrig {
  cosNegA: number;
  sinNegA: number;
  halfRidge: number;
  thresholdSq: number;
}

const islandTrigCache = new WeakMap<ServerIsland, CachedIslandTrig>();

function getCachedIslandTrig(isl: ServerIsland): CachedIslandTrig {
  let cached = islandTrigCache.get(isl);
  if (!cached && isl.elongation) {
    const threshold = isl.sandRadius * isl.elongation.scaleX;
    cached = {
      cosNegA: Math.cos(-isl.elongation.angle),
      sinNegA: Math.sin(-isl.elongation.angle),
      halfRidge: isl.sandRadius * (isl.elongation.scaleZ - isl.elongation.scaleX),
      thresholdSq: threshold * threshold,
    };
    islandTrigCache.set(isl, cached);
  }
  return cached!;
}

const SHIP_CLASS_MASS: Record<string, number> = {
  gunboat: 22,
  sloop: 38,
  corvette: 65,
  brig: 100,
  carrack: 140,
  galleon: 195,
  frigate: 260,
  man_o_war: 400,
};

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

    // Precompute active ship transforms once per tick to eliminate redundant per-projectile sin/cos math
    const targetShips: Array<{
      id: string;
      x: number;
      y: number;
      z: number;
      sinH: number;
      cosH: number;
      halfLen: number;
      halfWid: number;
      rawShip: ShipSimulationState;
    }> = [];

    for (const ship of ships.values()) {
      if (!ship.isSunk) {
        const config = SERVER_SHIP_CONFIGS[ship.shipClass];
        targetShips.push({
          id: ship.id,
          x: ship.x,
          y: ship.y,
          z: ship.z,
          sinH: Math.sin(ship.rotationY),
          cosH: Math.cos(ship.rotationY),
          halfLen: config.length * 0.5 + 1.2,
          halfWid: config.width * 0.5 + 1.4,
          rawShip: ship,
        });
      }
    }

    for (const ball of cannonballs) {
      if (serverTime - ball.createdAt > ball.maxLife) {
        continue;
      }

      const prevX = ball.x;
      const prevY = ball.y;
      const prevZ = ball.z;

      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;
      ball.z += ball.vz * dt;
      ball.vy += gravity * dt;

      // Fast splash check: cannonball submerged below water level (-0.5m)
      if (ball.y <= -0.5) {
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
          const trig = getCachedIslandTrig(isl);
          const localX = relX * trig.cosNegA - relZ * trig.sinNegA;
          const localZ = relX * trig.sinNegA + relZ * trig.cosNegA;
          const clampedZ = Math.max(-trig.halfRidge, Math.min(trig.halfRidge, localZ));
          const dz = localZ - clampedZ;
          const distSq = localX * localX + dz * dz;
          if (distSq <= trig.thresholdSq && ball.y <= 22) {
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
      for (let s = 0; s < targetShips.length; s++) {
        const target = targetShips[s];
        if (target.id === ball.ownerId) continue;
        if (isFriendly && isFriendly(ball.ownerId, target.id)) continue;

        // Bounding check using swept projectile midpoint
        const midX = (prevX + ball.x) * 0.5;
        const midY = (prevY + ball.y) * 0.5;
        const midZ = (prevZ + ball.z) * 0.5;

        const dx = midX - target.x;
        const dz = midZ - target.z;
        if (Math.abs(dx) > target.halfLen + 5 || Math.abs(dz) > target.halfLen + 5) {
          continue;
        }

        const dy = midY - target.y;
        if (dy < -2.2 || dy > 8.5) {
          continue;
        }

        // Test swept segment samples (prev, mid, current) to eliminate fast tunneling
        const testPoints = [
          { x: ball.x, y: ball.y, z: ball.z },
          { x: midX, y: midY, z: midZ },
          { x: prevX, y: prevY, z: prevZ },
        ];

        for (const pt of testPoints) {
          const ptdx = pt.x - target.x;
          const ptdz = pt.z - target.z;
          const ptdy = pt.y - target.y;

          const localX = ptdx * target.cosH - ptdz * target.sinH;
          const localZ = ptdx * target.sinH + ptdz * target.cosH;

          if (
            Math.abs(localX) <= target.halfWid &&
            Math.abs(localZ) <= target.halfLen &&
            ptdy >= -1.8 &&
            ptdy <= 7.0
          ) {
            hit = true;
            onHit(ball, target.rawShip);
            break;
          }
        }
        if (hit) break;
      }

      if (!hit) {
        activeBalls.push(ball);
      }
    }

    return activeBalls;
  }

  /**
   * Continuous 2D Capsule-to-Capsule (Segment-to-Segment) Hull Collision Detection
   * with Mass-Weighted Impulse Transfer, Glancing Friction, and Angular Deflection.
   */
  public static resolveShipCollisions(
    ships: Map<string, ShipSimulationState>,
    dt: number
  ): void {
    const aliveShips: ShipSimulationState[] = [];
    for (const ship of ships.values()) {
      if (!ship.isSunk) {
        aliveShips.push(ship);
      }
    }
    if (aliveShips.length < 2) return;

    interface HullSegment {
      ship: ShipSimulationState;
      // Start (stern) and End (bow) of centerline
      sx: number;
      sz: number;
      ex: number;
      ez: number;
      dx: number;
      dz: number;
      lenSq: number;
      radius: number;
      mass: number;
      halfLen: number;
      fwdX: number;
      fwdZ: number;
    }

    const hulls: HullSegment[] = [];
    for (let i = 0; i < aliveShips.length; i++) {
      const ship = aliveShips[i];
      const cfg = SERVER_SHIP_CONFIGS[ship.shipClass];
      const fwdX = Math.sin(ship.rotationY);
      const fwdZ = Math.cos(ship.rotationY);
      const halfLen = cfg.length * 0.42;
      const radius = cfg.width * 0.5 + 0.42;
      const mass = SHIP_CLASS_MASS[ship.shipClass] || 100;

      const sx = ship.x - fwdX * halfLen;
      const sz = ship.z - fwdZ * halfLen;
      const ex = ship.x + fwdX * halfLen;
      const ez = ship.z + fwdZ * halfLen;
      const dx = ex - sx;
      const dz = ez - sz;
      const lenSq = dx * dx + dz * dz;

      hulls.push({
        ship,
        sx,
        sz,
        ex,
        ez,
        dx,
        dz,
        lenSq,
        radius,
        mass,
        halfLen,
        fwdX,
        fwdZ,
      });
    }

    for (let i = 0; i < hulls.length; i++) {
      const hA = hulls[i];
      const shipA = hA.ship;

      for (let j = i + 1; j < hulls.length; j++) {
        const hB = hulls[j];
        const shipB = hB.ship;

        // Broad-phase bounding circle check
        const cdx = shipA.x - shipB.x;
        const cdz = shipA.z - shipB.z;
        const maxDist = hA.halfLen + hA.radius + hB.halfLen + hB.radius + 1.0;
        if (cdx * cdx + cdz * cdz > maxDist * maxDist) {
          continue;
        }

        // Exact analytical segment-to-segment closest points (Christer Ericson Real-Time Collision)
        const rx = hA.sx - hB.sx;
        const rz = hA.sz - hB.sz;

        const a = hA.lenSq;
        const b = hA.dx * hB.dx + hA.dz * hB.dz;
        const c = hB.lenSq;
        const d = hA.dx * rx + hA.dz * rz;
        const e = hB.dx * rx + hB.dz * rz;
        const denom = a * c - b * b;

        let s = 0.5;
        if (Math.abs(denom) > 1e-6) {
          s = Math.max(0, Math.min(1, (b * e - c * d) / denom));
        }

        let t = c > 1e-6 ? (b * s + e) / c : 0.5;
        if (t < 0) {
          t = 0;
          s = a > 1e-6 ? Math.max(0, Math.min(1, -d / a)) : 0;
        } else if (t > 1) {
          t = 1;
          s = a > 1e-6 ? Math.max(0, Math.min(1, (b - d) / a)) : 0;
        }

        // Closest point on Ship A centerline and Ship B centerline
        const cAx = hA.sx + s * hA.dx;
        const cAz = hA.sz + s * hA.dz;
        const cBx = hB.sx + t * hB.dx;
        const cBz = hB.sz + t * hB.dz;

        const vx = cAx - cBx;
        const vz = cAz - cBz;
        const distSq = vx * vx + vz * vz;
        const minDist = hA.radius + hB.radius;

        if (distSq < minDist * minDist) {
          const dist = Math.sqrt(distSq);
          const overlap = minDist - dist;

          let nx: number;
          let nz: number;
          if (dist > 1e-4) {
            nx = vx / dist;
            nz = vz / dist;
          } else {
            // Degenerate/identical centers: push away along center vector or perpendicular
            const centerDist = Math.hypot(cdx, cdz);
            if (centerDist > 1e-3) {
              nx = cdx / centerDist;
              nz = cdz / centerDist;
            } else {
              nx = hA.fwdZ;
              nz = -hA.fwdX;
            }
          }

          // 1. Mass-weighted positional separation
          const totalMass = hA.mass + hB.mass;
          const ratioA = hB.mass / totalMass;
          const ratioB = hA.mass / totalMass;
          const pushDist = overlap * 1.05;

          shipA.x += nx * (pushDist * ratioA);
          shipA.z += nz * (pushDist * ratioA);
          shipB.x -= nx * (pushDist * ratioB);
          shipB.z -= nz * (pushDist * ratioB);

          // 2. Angular Deflection (Yaw Torque from off-center impact)
          const rAx = cAx - shipA.x;
          const rAz = cAz - shipA.z;
          const torqueA = rAx * nz - rAz * nx;

          const rBx = cBx - shipB.x;
          const rBz = cBz - shipB.z;
          const torqueB = rBx * (-nz) - rBz * (-nx);

          const angularImpulseA = (torqueA / (hA.mass * hA.halfLen)) * 4.5 * Math.max(0.016, dt);
          const angularImpulseB = (torqueB / (hB.mass * hB.halfLen)) * 4.5 * Math.max(0.016, dt);
          shipA.rotationY += Math.max(-0.06, Math.min(0.06, angularImpulseA));
          shipB.rotationY += Math.max(-0.06, Math.min(0.06, angularImpulseB));

          // 3. Realistic Linear Momentum & Inelastic Kinetic Friction
          const mPerSec = 0.514444; // 1 knot in m/s
          let velAx = hA.fwdX * (shipA.speed * mPerSec);
          let velAz = hA.fwdZ * (shipA.speed * mPerSec);
          let velBx = hB.fwdX * (shipB.speed * mPerSec);
          let velBz = hB.fwdZ * (shipB.speed * mPerSec);

          const relVx = velAx - velBx;
          const relVz = velAz - velBz;
          const normalVel = relVx * nx + relVz * nz;

          if (normalVel < 0) {
            // Approaching collision: absorb energy with wooden hull elasticity
            const restitution = 0.22;
            const impulseMag = (-(1 + restitution) * normalVel) / (1 / hA.mass + 1 / hB.mass);

            velAx += (nx * impulseMag) / hA.mass;
            velAz += (nz * impulseMag) / hA.mass;
            velBx -= (nx * impulseMag) / hB.mass;
            velBz -= (nz * impulseMag) / hB.mass;

            // Project new velocities back to heading to preserve clean naval steerage
            const newFwdDotA = velAx * Math.sin(shipA.rotationY) + velAz * Math.cos(shipA.rotationY);
            const newFwdDotB = velBx * Math.sin(shipB.rotationY) + velBz * Math.cos(shipB.rotationY);

            shipA.speed = Math.max(0, Math.min(shipA.speed, newFwdDotA / mPerSec * 0.92));
            shipB.speed = Math.max(0, Math.min(shipB.speed, newFwdDotB / mPerSec * 0.92));
          } else {
            // Glancing scrape: shed 5% speed per tick
            shipA.speed = Math.max(0, shipA.speed * 0.95);
            shipB.speed = Math.max(0, shipB.speed * 0.95);
          }

          shipA.vx = Math.sin(shipA.rotationY) * (shipA.speed * mPerSec);
          shipA.vz = Math.cos(shipA.rotationY) * (shipA.speed * mPerSec);
          shipB.vx = Math.sin(shipB.rotationY) * (shipB.speed * mPerSec);
          shipB.vz = Math.cos(shipB.rotationY) * (shipB.speed * mPerSec);
        }
      }
    }
  }
}
