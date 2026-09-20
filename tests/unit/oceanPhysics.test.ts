import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { GERSTNER_WAVES, getWaveDisplacement, getWaveHeight, getHullWaterPose } from '../../server/src/engine/WaveMath.js';
import { getWaveHeight as clientHeight } from '../../src/features/battle/utils/waveMath.js';
import { PhysicsEngine } from '../../server/src/engine/PhysicsEngine.js';
import { SERVER_SHIP_CONFIGS, type ShipSimulationState } from '../../server/src/types/protocol.js';

function ship(): ShipSimulationState {
  return { id: 'test', name: 'test', shipClass: 'brig', x: 420, y: 0, z: 0,
    vx: 0, vz: 0, speed: 0, rotationY: 0, pitch: 0, roll: 0, rudder: 1,
    sail: 'ANCHOR', health: 180, maxHealth: 180, isSunk: false, score: 0,
    reloadTimerLeft: 0, reloadTimerRight: 0 };
}

describe('Hull-scale ocean', () => {
  it('samples displaced surface coordinates rather than the undisplaced grid', () => {
    for (let t = 0; t < 12; t += 0.4) {
      const x = t * 17 - 80;
      const z = t * -11 + 40;
      const d = getWaveDisplacement(x, z, t);
      assert.ok(Math.abs(getWaveHeight(x + d.x, z + d.z, t) - d.y) < 0.002);
      assert.equal(clientHeight(x, z, t), getWaveHeight(x, z, t));
    }
  });
  it('keeps directions normalized and total steepness below self-intersection', () => {
    for (const wave of GERSTNER_WAVES) assert.ok(Math.abs(Math.hypot(...wave.direction) - 1) < 1e-10);
    assert.ok(GERSTNER_WAVES.reduce((sum, w) => sum + w.steepness, 0) < 1);
    assert.ok(GERSTNER_WAVES.reduce((sum, w) => sum + w.steepness * w.wavelength / (2 * Math.PI), 0) < 1);
  });
  it('keeps every hull class finite and within plausible heel at all headings', () => {
    for (const hull of Object.values(SERVER_SHIP_CONFIGS)) {
      for (let heading = 0; heading < 6.3; heading += 0.3) {
        const pose = getHullWaterPose(17, -34, heading, hull.length, hull.width, 5);
        assert.ok(Math.abs(pose.y) < 1);
        assert.ok(Math.abs(pose.pitch) < 0.3);
        assert.ok(Math.abs(pose.roll) < 0.4);
      }
    }
  });
  it('does not pivot an anchored stationary hull or generate velocity on a zero step', () => {
    const s = ship();
    PhysicsEngine.updateShip(s, 1 / 30, 1, 0, 12);
    assert.equal(s.rotationY, 0);
    assert.equal(s.speed, 0);
    const before = { ...s };
    PhysicsEngine.updateShip(s, 0, 1, 0, 12);
    assert.deepEqual(s, before);
  });
  it('retains steering under sail and slows the hull in a turn', () => {
    const turning = ship();
    turning.sail = 'FULL_SAIL';
    turning.speed = 12;
    const straight = { ...turning, rudder: 0 };
    PhysicsEngine.updateShip(turning, 1 / 30, 1, 0, 12);
    PhysicsEngine.updateShip(straight, 1 / 30, 1, 0, 12);
    assert.ok(turning.rotationY > 0);
    assert.ok(turning.speed < straight.speed);
  });
});
