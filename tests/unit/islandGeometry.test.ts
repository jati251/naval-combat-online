import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createIslandTerrainGeometry, getTerrainSurfaceY, getIslandElevation } from '../../src/features/battle/components/3d/islands/islandGeometries';
import type { IslandDefinition } from '../../src/features/battle/components/3d/islands/types';

const base: IslandDefinition = { id: 'test', name: 'Test', x: 0, z: 0, radius: 50, sandRadius: 60, height: 35, seed: 17, type: 'verdant-hills', palms: [], bushes: [], rocks: [] };
for (const type of ['volcanic', 'sea-stack', 'atoll', 'lush-flat', 'verdant-hills', 'dense-jungle'] as const) {
  test(`${type}: placement matches rendered triangles on elongated terrain`, () => {
    const island = { ...base, type, elongation: { scaleX: 1.8, scaleZ: 0.7, angle: 0.5 } };
    const geo = createIslandTerrainGeometry(island);
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial());
    mesh.position.y = getIslandElevation(island) + 2;
    mesh.scale.set(1.8, 1, 0.7);
    mesh.updateMatrixWorld();
    for (const [x, z] of [[0, 0], [12.4, 7.7], [-31.8, 15.4], [43.2, -7.4], [65.1, 14.2]]) {
      const ray = new THREE.Raycaster(new THREE.Vector3(x, 100, z), new THREE.Vector3(0, -1, 0));
      const hit = ray.intersectObject(mesh)[0];
      assert.ok(hit, 'surface must face upward');
      assert.ok(Math.abs(hit.point.y - getTerrainSurfaceY(island, x, z)) < 0.0001, `floating prop at ${x},${z}`);
    }
    for (const name of ['position', 'normal', 'color', 'uv']) {
      for (const value of geo.getAttribute(name).array) assert.ok(Number.isFinite(value));
    }
    geo.dispose(); mesh.material.dispose();
  });
}

test('settlement plateaus preserve specified elevation on stretched islands', () => {
  const island: IslandDefinition = { ...base, elongation: { scaleX: 1.7, scaleZ: 0.8, angle: 0 }, settlement: { type: 'colonial-fort', x: 12, z: 4, rotationY: 0, terraceRadius: 22, terraceElevation: 4.5 } };
  for (const [x, z] of [[12, 4], [18, 7], [5, 0]]) assert.ok(Math.abs(getTerrainSurfaceY(island, x, z) - 4.5) < 0.00001);
});

test('atoll lagoon and volcanic crater sit below their surrounding rims', () => {
  const atoll = { ...base, type: 'atoll' as const };
  assert.ok(getTerrainSurfaceY(atoll, 0, 0) < 0);
  assert.ok(getTerrainSurfaceY(atoll, 35, 0) > 1);
  const volcano = { ...base, type: 'volcanic' as const };
  assert.ok(getTerrainSurfaceY(volcano, -6.5, 4) < getTerrainSurfaceY(volcano, 7, 4));
});
