import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { applyStormDamage, getStormIntensity } from '../../server/src/engine/StormSystem.js';
import { PhysicsEngine } from '../../server/src/engine/PhysicsEngine.js';
import { getWaveHeight, getWaveDisplacement, MAX_WAVE_HEIGHT } from '../../server/src/engine/WaveMath.js';
import { SERVER_SHIP_CONFIGS, type ShipSimulationState } from '../../server/src/types/protocol.js';
import type { ServerMessage } from '../../server/src/types/protocol.js';
import { GameRoom } from '../../server/src/engine/GameRoom.js';
import { GameLoop } from '../../server/src/engine/GameLoop.js';

function ship(x = 800): ShipSimulationState {
  return { id: 'storm-test', name: 'Storm test', shipClass: 'brig', x, z: 0, y: 0,
    vx: 0, vz: 0, speed: 12, rotationY: Math.PI / 2, pitch: 0, roll: 0, rudder: 0,
    sail: 'FULL_SAIL', health: 180, maxHealth: 180, isSunk: false, score: 0,
    reloadTimerLeft: 0, reloadTimerRight: 0 };
}

describe('Open ocean storm boundary', () => {
  it('broadcasts one environmental sinking and respawns safely with exposure reset', (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const events: ServerMessage[] = [];
    const room = new GameRoom('test', 'Storm test', 2, 20, 'DAY', 'FFA', 'caribbean',
      (_id, message) => events.push(message), () => {});
    try {
      const s = ship();
      room.addPlayer(s.id, s.name, s.shipClass);
      room.ships.set(s.id, s);
      room.status = 'IN_GAME';
      s.health = 0.001;
      s.stormExposure = 40;
      GameLoop.step(room, 100);
      GameLoop.step(room, 200);
      const sunk = events.filter(e => e.type === 'SHIP_SUNK');
      assert.equal(sunk.length, 1);
      assert.equal(sunk[0].killerId, 'environment:storm');
      assert.equal(room.players.get(s.id)?.deaths, 1);
      assert.equal(room.players.get(s.id)?.score, 0);
      t.mock.timers.tick(5000);
      assert.equal(s.isSunk, false);
      assert.equal(s.stormExposure, 0);
      assert.equal(s.health, SERVER_SHIP_CONFIGS.brig.maxHealth);
      assert.ok(Math.hypot(s.x, s.z) < 500);
      assert.equal(events.filter(e => e.type === 'SHIP_RESPAWNED').length, 1);
    } finally { room.destroy(); }
  });
  it('allows a vessel to sail beyond the former barrier', () => {
    const s = ship(510);
    PhysicsEngine.updateShip(s, 1 / 30, 1, 0, 12);
    assert.ok(s.x > 510);
    assert.ok(s.speed > 11);
  });
  it('increases weather radially, with a calm interior and capped severity', () => {
    assert.equal(getStormIntensity(420, 0), 0);
    assert.equal(getStormIntensity(0, -760), 1);
    assert.equal(getStormIntensity(500, 0), getStormIntensity(0, 500));
    assert.ok(getStormIntensity(500, 0) < getStormIntensity(650, 0));
    assert.equal(getStormIntensity(10000, 0), 1);
  });
  it('gives eight seconds to return, then damages more quickly farther out', () => {
    const near = ship(510), far = ship(800);
    for (let i = 0; i < 8; i++) { applyStormDamage(near, 1); applyStormDamage(far, 1); }
    assert.equal(far.health, far.maxHealth);
    applyStormDamage(near, 1); applyStormDamage(far, 1);
    assert.ok(far.health < near.health && near.health < near.maxHealth);
    const before = far.health;
    far.x = 500;
    applyStormDamage(far, 1);
    assert.equal(far.health, before);
    assert.equal(far.stormExposure, 0);
    far.x = 800;
    applyStormDamage(far, 1);
    assert.equal(far.health, before);
  });
  it('eventually sinks every hull once, without granting a combat score', () => {
    for (const config of Object.values(SERVER_SHIP_CONFIGS)) {
      const s = ship();
      s.health = s.maxHealth = config.maxHealth;
      let events = 0;
      for (let i = 0; i < 3600; i++) events += Number(applyStormDamage(s, 1 / 30));
      assert.equal(events, 1);
      assert.equal(s.health, 0);
      assert.equal(s.isSunk, true);
      assert.equal(s.score, 0);
    }
  });
  it('keeps storm buoyancy on the rendered surface and below the collision bound', () => {
    for (let t = 0; t < 60; t += 0.2) {
      for (const radius of [450, 600, 800]) {
        const x = radius + t, z = t * 3;
        const d = getWaveDisplacement(x, z, t);
        assert.ok(Math.abs(d.y) <= MAX_WAVE_HEIGHT);
        assert.ok(Math.abs(getWaveHeight(x + d.x, z + d.z, t) - d.y) < 0.01);
      }
    }
  });
});
