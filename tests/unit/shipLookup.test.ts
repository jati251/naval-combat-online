import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findShip } from '../../src/stores/selectors/shipLookup';
import type { ShipSnapshot } from '../../src/types/ship';

const ship: ShipSnapshot = {
  id: 'captain', name: 'Captain', shipClass: 'brig', x: 0, y: 0, z: 0,
  rotationY: 0, pitch: 0, roll: 0, speed: 0, health: 180, maxHealth: 180,
  sail: 'ANCHOR', rudder: 0, isSunk: false, score: 0,
};
test('lookup follows new snapshots and does not retain removed ships', () => {
  const previous = [ship];
  const updated = [{ ...ship, x: 30 }];
  assert.equal(findShip(previous, 'captain'), ship);
  assert.equal(findShip(updated, 'captain')?.x, 30);
  assert.equal(findShip(previous, 'captain')?.x, 0);
  assert.equal(findShip([], 'captain'), undefined);
  assert.equal(findShip(updated, null), undefined);
});
