import type { ShipSimulationState } from '../types/protocol.js';

export const STORM_WARNING_RADIUS = 420;
export const STORM_DAMAGE_RADIUS = 500;
export const STORM_FULL_RADIUS = 760;
export const STORM_GRACE_SECONDS = 8;
export const STORM_KILLER_ID = 'environment:storm';

export function getStormIntensity(x: number, z: number): number {
  const t = Math.max(0, Math.min(1, (Math.hypot(x, z) - STORM_WARNING_RADIUS) / (STORM_FULL_RADIUS - STORM_WARNING_RADIUS)));
  return t * t * (3 - 2 * t);
}

/** Damage is authoritative and stops immediately when the vessel returns inshore. */
export function applyStormDamage(ship: ShipSimulationState, dt: number): boolean {
  if (ship.isSunk || !Number.isFinite(dt) || dt <= 0) return false;
  if (Math.hypot(ship.x, ship.z) <= STORM_DAMAGE_RADIUS) {
    ship.stormExposure = 0;
    return false;
  }
  ship.stormExposure = (ship.stormExposure ?? 0) + dt;
  if (ship.stormExposure <= STORM_GRACE_SECONDS) return false;
  const intensity = getStormIntensity(ship.x, ship.z);
  const exposure = Math.min(2, (ship.stormExposure - STORM_GRACE_SECONDS) / 35);
  const damagePerSecond = ship.maxHealth * (0.003 + intensity * intensity * 0.025) * (1 + exposure);
  ship.health = Math.max(0, ship.health - damagePerSecond * dt);
  if (ship.health > 0) return false;
  ship.isSunk = true;
  return true;
}
