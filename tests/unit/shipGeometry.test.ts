import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createJibSailGeometry, createLateenSailGeometry, createBillowedSailGeometry, createCurvedHullGeometry } from '../../src/features/battle/components/3d/ships/common/shipGeometries';

for (const [name, create] of [
  ['jib', () => createJibSailGeometry(9, 12, 0.5)],
  ['lateen', () => createLateenSailGeometry(9, 12, 0.5)],
] as const) {
  test(`${name}: billowed interior, pinned edges, normalized UVs and valid indices`, () => {
    const geometry = create();
    const positions = geometry.getAttribute('position');
    const uv = geometry.getAttribute('uv');
    assert.ok(positions.count > 3, 'cloth needs interior vertices');
    let deepest = 0;
    for (let i = 0; i < positions.count; i++) {
      deepest = Math.max(deepest, positions.getZ(i));
      for (const value of [positions.getX(i), positions.getY(i), positions.getZ(i)]) assert.ok(Number.isFinite(value));
      assert.ok(uv.getX(i) >= -1e-6 && uv.getX(i) <= 1 + 1e-6);
      assert.ok(uv.getY(i) >= 0 && uv.getY(i) <= 1);
      if (positions.getY(i) === 0 || positions.getY(i) === 12) assert.ok(Math.abs(positions.getZ(i)) < 1e-6);
    }
    assert.ok(deepest > 0.4, 'billow must be visible');
    for (const index of geometry.index!.array) assert.ok(index >= 0 && index < positions.count);
    assert.equal(create(), geometry, 'cached sails must share geometry');
  });
}

test('square sail remains pinned along the yard', () => {
  const geometry = createBillowedSailGeometry(10, 12, 0.5);
  const positions = geometry.getAttribute('position');
  for (let i = 0; i < positions.count; i++) {
    if (positions.getY(i) === 6) assert.ok(Math.abs(positions.getZ(i)) < 1e-6);
  }
});

test('hull cache separates different class proportions', () => {
  const options = { length: 20, width: 6, depth: 3.3 };
  const hull = createCurvedHullGeometry(options);
  assert.equal(createCurvedHullGeometry(options), hull);
  assert.notEqual(createCurvedHullGeometry({ ...options, width: 8 }), hull);
  hull.computeBoundingBox();
  assert.ok(hull.boundingBox!.max.z >= 10);
  assert.equal(hull.boundingBox!.min.z, -10);
});
