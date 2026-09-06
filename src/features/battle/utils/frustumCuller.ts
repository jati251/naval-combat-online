import * as THREE from "three";

/**
 * AAA Camera Frustum Culling Engine
 * Features zero heap allocation during gameplay (reuses internal matrices & vectors)
 * and frame-level deduplication so multiple entities calling it on the same frame
 * reuse the computed view-projection matrix without redundant matrix inversions.
 */

const _projScreenMatrix = new THREE.Matrix4();
const _frustum = new THREE.Frustum();
const _tempSphere = new THREE.Sphere();
const _tempVector = new THREE.Vector3();

let _lastFrameId: number = -1;
let _cachedFrame: number = -1;
let _cachedCam: number = -1;

/**
 * Sets the current render frame ID. Call once per frame from the main scene useFrame hook.
 */
export function setFrameId(frameId: number): void {
  _lastFrameId = frameId;
}

/**
 * Extracts frustum planes from camera.
 * Deduplicates extraction per frame+camera combo, but allows explicit force refresh.
 */
export function updateFrustum(camera: THREE.Camera, force = false): void {
  const frameId = _lastFrameId;
  const camId = camera.id;
  if (!force && frameId !== -1 && frameId === _cachedFrame && camId === _cachedCam) {
    return; // Already computed for this exact frame + camera — skip recomputation
  }
  _cachedFrame = frameId;
  _cachedCam = camId;
  camera.updateMatrixWorld();
  _projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  _frustum.setFromProjectionMatrix(_projScreenMatrix);
}

/**
 * Returns whether a 3D sphere at (x, y, z) with radius is inside or intersects the camera view frustum.
 * Includes a safety padding buffer to ensure zero visual popping when panning/rotating the camera.
 */
export function isSphereInFrustum(
  camera: THREE.Camera,
  x: number,
  y: number,
  z: number,
  radius: number,
  buffer = 0
): boolean {
  updateFrustum(camera);

  _tempVector.set(x, y, z);
  _tempSphere.center = _tempVector;
  _tempSphere.radius = Math.max(0.1, radius + buffer);

  return _frustum.intersectsSphere(_tempSphere);
}

/**
 * Returns whether an axis-aligned bounding box intersects the camera view frustum.
 */
export function isBoxInFrustum(camera: THREE.Camera, box: THREE.Box3): boolean {
  updateFrustum(camera);
  return _frustum.intersectsBox(box);
}

/**
 * Fast 2D sea-surface circle frustum test (assumes entity lies on water plane y ≈ 0).
 */
export function isSeaEntityInFrustum(
  camera: THREE.Camera,
  x: number,
  z: number,
  radius: number,
  verticalExtent = 20,
  buffer = 0
): boolean {
  // Center the sphere at half vertical extent above water
  return isSphereInFrustum(camera, x, verticalExtent * 0.5, z, radius, buffer);
}
