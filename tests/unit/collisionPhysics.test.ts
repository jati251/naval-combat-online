import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CollisionSystem } from '../../server/src/engine/CollisionSystem.js';
import { PhysicsEngine } from '../../server/src/engine/PhysicsEngine.js';
import { SERVER_SHIP_CONFIGS, type ShipSimulationState } from '../../server/src/types/protocol.js';

function createShip(
  id: string,
  shipClass: 'gunboat' | 'sloop' | 'brig' | 'man_o_war',
  x: number,
  z: number,
  rotationY: number = 0,
  speed: number = 0
): ShipSimulationState {
  const cfg = SERVER_SHIP_CONFIGS[shipClass];
  return {
    id,
    name: id,
    shipClass,
    x,
    y: 0,
    z,
    vx: 0,
    vz: 0,
    speed,
    rotationY,
    pitch: 0,
    roll: 0,
    rudder: 0,
    sail: speed > 0 ? 'FULL_SAIL' : 'ANCHOR',
    health: cfg.maxHealth,
    maxHealth: cfg.maxHealth,
    isSunk: false,
    score: 0,
    reloadTimerLeft: 0,
    reloadTimerRight: 0,
  };
}

describe('Enhanced Ship Collision & Physics Engine', () => {
  it('detects and resolves T-bone midsection collision between ships', () => {
    // Ship B is oriented along Z axis at (0, 0)
    const shipB = createShip('victim', 'brig', 0, 0, 0, 0); // heading north along Z
    // Ship A is oriented along X axis at (-15, 0) ramming directly into Ship B's midsection
    const shipA = createShip('rammer', 'brig', -3, 0, Math.PI / 2, 10); // heading east along X

    const ships = new Map<string, ShipSimulationState>();
    ships.set(shipA.id, shipA);
    ships.set(shipB.id, shipB);

    // Initial distance between centers is 3m, while halfWidth is ~3m and halfLen is ~8m
    const initialDist = Math.hypot(shipA.x - shipB.x, shipA.z - shipB.z);
    assert.equal(initialDist, 3);

    // Resolve collision
    CollisionSystem.resolveShipCollisions(ships, 1 / 30);

    // Ships must be pushed apart
    const resolvedDist = Math.hypot(shipA.x - shipB.x, shipA.z - shipB.z);
    assert.ok(resolvedDist > initialDist, 'Ships should be pushed apart on T-bone impact');
    assert.ok(shipA.x < -3, 'Ship A should be pushed back to the west');
    assert.ok(shipB.x > 0, 'Ship B should be pushed to the east');
    assert.ok(shipA.speed < 10, 'Ramming ship speed should be damped on collision');
  });

  it('imparts mass-weighted displacement: heavy Man-of-War displaces light Sloop more', () => {
    // Man-of-War at (-2, 0), Sloop at (2, 0) overlapping along X axis
    const heavy = createShip('heavy', 'man_o_war', -2, 0, 0, 0);
    const light = createShip('light', 'sloop', 2, 0, 0, 0);

    const ships = new Map<string, ShipSimulationState>();
    ships.set(heavy.id, heavy);
    ships.set(light.id, light);

    const prevHeavyX = heavy.x;
    const prevLightX = light.x;

    CollisionSystem.resolveShipCollisions(ships, 1 / 30);

    const heavyDelta = Math.abs(heavy.x - prevHeavyX);
    const lightDelta = Math.abs(light.x - prevLightX);

    assert.ok(lightDelta > heavyDelta * 3, 'Light vessel must be pushed significantly more than heavy capital ship');
  });

  it('prevents ship bow penetration into circular and elongated island shorelines', () => {
    // Caribbean island 'tortuga-atoll' is at x: -280, z: -250, radius: 36, sandRadius: 50
    // Position a ship sailing directly east towards the island center
    // Island waterline is ~50 * 0.76 = 38m radius from center (-280, -250)
    // Place ship at x: -330 (50m west), heading east (rotationY = Math.PI / 2)
    const s = createShip('tester', 'man_o_war', -325, -250, Math.PI / 2, 10);
    const cfg = SERVER_SHIP_CONFIGS.man_o_war;

    // Simulate several physics steps driving towards the island
    for (let step = 0; step < 15; step++) {
      PhysicsEngine.updateShip(s, 1 / 30, step * 0.033, 0, 10, 'caribbean');
    }

    // Measure distance of the bow from island center
    const bowXAfter = s.x + Math.sin(s.rotationY) * cfg.length * 0.44;
    const bowDistToCenter = Math.hypot(bowXAfter - (-280), s.z - (-250));
    
    // The bow must be safely outside the island center (radius ~38m)
    assert.ok(bowDistToCenter >= 36, `Ship bow should not penetrate island terrain (bowDist: ${bowDistToCenter})`);
    assert.ok(s.speed <= 4.0, 'Ship should decelerate when scraping shoreline');
  });
});
