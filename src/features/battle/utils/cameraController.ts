import * as THREE from 'three';
import { CONTROL_CONFIG } from './controls';
import type { CameraState } from '../types/camera';
import { damp } from './math';

export interface CameraUpdateParams {
  camera: THREE.Camera;
  delta: number;
  elapsedTime: number;
  shipX: number;
  shipY: number;
  shipZ: number;
  shipHeading: number;
  shipSpeed: number;
  aimDirection: 'none' | 'port' | 'starboard';
  cameraState: CameraState;
  shakeEvent?: { intensity: number; direction?: 'port' | 'starboard' | 'hit'; timestamp: number } | null;
}

export function createInitialCameraState(): CameraState {
  return {
    trauma: 0,
    lastShakeTime: 0,
    lastRecoilDir: undefined,
    currentAimSide: 0,
    currentAimFwd: 0,
    currentAimLookSide: 0,
    lastTargetFov: 55,
  };
}

/**
 * High-performance, butter-smooth naval chase camera update.
 * - Dynamic speed sensation & ocean swell breathing.
 * - Salvo recoil impulse & hit trauma vibration.
 * - Precision broadside gunnery sight: camera pans toward aimed broadside (Port = Left, Starboard = Right).
 * - Lazy projection matrix updates to prevent GPU stalls.
 */
export function updateChaseCamera({
  camera,
  delta,
  elapsedTime,
  shipX,
  shipY,
  shipZ,
  shipHeading,
  shipSpeed,
  aimDirection,
  cameraState,
  shakeEvent,
}: CameraUpdateParams): void {
  // 1. Process incoming camera trauma (salvo firing recoil or hull damage impact)
  if (shakeEvent && shakeEvent.timestamp !== cameraState.lastShakeTime) {
    cameraState.lastShakeTime = shakeEvent.timestamp;
    cameraState.trauma = Math.min(1.0, cameraState.trauma + shakeEvent.intensity);
    cameraState.lastRecoilDir = shakeEvent.direction;
  }

  // Exponential trauma decay
  cameraState.trauma = Math.max(0, cameraState.trauma - delta * 2.6);
  const traumaSq = cameraState.trauma * cameraState.trauma;

  // High-frequency trauma shake vibrations
  const shakeT = performance.now() * 0.055;
  const shakeX = (Math.sin(shakeT * 1.8) + Math.cos(shakeT * 2.5)) * traumaSq * 0.75;
  const shakeY = Math.cos(shakeT * 2.1) * traumaSq * 0.55;
  const shakeZ = Math.sin(shakeT * 1.4) * traumaSq * 0.45;

  // Lateral salvo recoil impulse (recoil kicks ship away from firing battery)
  let recoilOffset = 0;
  if (cameraState.lastRecoilDir === 'port') {
    recoilOffset = traumaSq * 1.5; // port salvo pushes camera/ship rightward
  } else if (cameraState.lastRecoilDir === 'starboard') {
    recoilOffset = -traumaSq * 1.5; // starboard salvo pushes camera/ship leftward
  }

  // 2. Dynamic Speed Sensation & Camera Heave
  const currentSpeed = Math.max(0, shipSpeed);
  const speedRatio = Math.min(1.2, currentSpeed / 9.5);

  // Speed FOV expansion (smoothly expands from 55 to ~62.5 FOV at full sail, plus trauma kick)
  const perspCamera = camera as THREE.PerspectiveCamera;
  if (perspCamera.isPerspectiveCamera) {
    const targetFov = 55 + speedRatio * 7.5 + (cameraState.lastRecoilDir === 'hit' ? traumaSq * 4.5 : traumaSq * 2.0);
    const newFov = damp(perspCamera.fov, targetFov, 9, delta);

    // Only update projection matrix when delta is meaningful (prevents per-frame GPU cache invalidation)
    if (Math.abs(newFov - perspCamera.fov) > 0.03 || Math.abs(newFov - cameraState.lastTargetFov) > 0.5) {
      perspCamera.fov = newFov;
      perspCamera.updateProjectionMatrix();
      cameraState.lastTargetFov = newFov;
    }
  }

  // 3. Broadside Gunnery Aim Offsets
  // Port = Left battery (-X lateral), Starboard = Right battery (+X lateral)
  let targetCamSide = 0;
  let targetCamFwd = 0;
  let targetLookSide = 0;
  let targetAimDistMod = 0;
  let targetAimHeightMod = 0;

  if (aimDirection === 'port') {
    // Camera shifts slightly starboard and forward to view over the port rail
    targetCamSide = 7.5;
    targetCamFwd = 2.0;
    targetLookSide = -35.0; // Look 35m into the left/port ocean
    targetAimDistMod = -6.0;
    targetAimHeightMod = -3.5;
  } else if (aimDirection === 'starboard') {
    // Camera shifts slightly port and forward to view over the starboard rail
    targetCamSide = -7.5;
    targetCamFwd = 2.0;
    targetLookSide = 35.0; // Look 35m into the right/starboard ocean
    targetAimDistMod = -6.0;
    targetAimHeightMod = -3.5;
  }

  cameraState.currentAimSide = damp(cameraState.currentAimSide, targetCamSide, 8, delta);
  cameraState.currentAimFwd = damp(cameraState.currentAimFwd, targetCamFwd, 8, delta);
  cameraState.currentAimLookSide = damp(cameraState.currentAimLookSide, targetLookSide, 8, delta);

  const sOffset = cameraState.currentAimSide + recoilOffset;
  const fOffset = cameraState.currentAimFwd;

  const sinH = Math.sin(shipHeading);
  const cosH = Math.cos(shipHeading);

  // Dynamic distance pull-back and gentle ocean swell breathing on camera height
  const dynamicDist = CONTROL_CONFIG.CAMERA_DISTANCE + speedRatio * 2.4 + targetAimDistMod;
  const speedBob = Math.sin(elapsedTime * 1.9) * 0.28 * speedRatio;
  const dynamicHeight = CONTROL_CONFIG.CAMERA_HEIGHT + speedBob + targetAimHeightMod;

  camera.position.x = shipX - sinH * dynamicDist + cosH * sOffset + sinH * fOffset + cosH * shakeX;
  camera.position.y = shipY + dynamicHeight + shakeY;
  camera.position.z = shipZ - cosH * dynamicDist - sinH * sOffset + cosH * fOffset - sinH * shakeX + shakeZ;

  const lookAheadDist = 6.0 + speedRatio * 3.5;
  const lookX = shipX + sinH * lookAheadDist + cosH * cameraState.currentAimLookSide;
  const lookY = shipY + 3.2 + shakeY * 0.5;
  const lookZ = shipZ + cosH * lookAheadDist - sinH * cameraState.currentAimLookSide;

  camera.lookAt(lookX, lookY, lookZ);
}
