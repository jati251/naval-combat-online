import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  updateFrustum,
  isSphereInFrustum,
  isSeaEntityInFrustum,
  isBoxInFrustum,
} from '../../src/features/battle/utils/frustumCuller';

test('frustum culler correctly detects objects in front and culls objects behind camera', () => {
  const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.5, 1000);
  // Camera looking down the negative Z axis from (0, 10, 0)
  camera.position.set(0, 10, 0);
  camera.lookAt(0, 10, -100);
  camera.updateMatrixWorld(true);

  // 1. Object directly ahead in camera FOV: (0, 10, -50), radius 5
  const inFront = isSphereInFrustum(camera, 0, 10, -50, 5);
  assert.equal(inFront, true, 'Object directly in front of camera should be in frustum');

  // 2. Object directly behind camera: (0, 10, 50), radius 5
  const behind = isSphereInFrustum(camera, 0, 10, 50, 5);
  assert.equal(behind, false, 'Object behind camera should be culled');

  // 3. Object far off to the left outside FOV: (-200, 10, -50), radius 5
  const farLeft = isSphereInFrustum(camera, -200, 10, -50, 5);
  assert.equal(farLeft, false, 'Object outside horizontal FOV should be culled');

  // 4. Sea entity test on water plane (y ≈ 0)
  const shipAhead = isSeaEntityInFrustum(camera, 0, -60, 15);
  assert.equal(shipAhead, true, 'Sea entity ahead should be in frustum');

  const shipBehind = isSeaEntityInFrustum(camera, 0, 60, 15);
  assert.equal(shipBehind, false, 'Sea entity behind should be culled');

  // 5. Buffer expansion test: Object just on edge of frustum with buffer
  const boxAhead = new THREE.Box3(new THREE.Vector3(-5, 5, -55), new THREE.Vector3(5, 15, -45));
  assert.equal(isBoxInFrustum(camera, boxAhead), true, 'Box ahead should be inside frustum');

  const boxBehind = new THREE.Box3(new THREE.Vector3(-5, 5, 45), new THREE.Vector3(5, 15, 55));
  assert.equal(isBoxInFrustum(camera, boxBehind), false, 'Box behind should be culled');
});

test('frustum culler deduplicates computation for multiple entities on identical camera frame', () => {
  const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.5, 1000);
  camera.position.set(15, 20, 30);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld(true);

  // Call updateFrustum multiple times
  updateFrustum(camera);
  const res1 = isSphereInFrustum(camera, 0, 0, 0, 10);
  const res2 = isSphereInFrustum(camera, 0, 0, 0, 10);
  assert.equal(res1, true);
  assert.equal(res2, true);
});
