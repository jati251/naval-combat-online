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
    lastTargetFov: 55,
  };
}

/**
 * High-performance, butter-smooth naval chase camera update.
 * - Dynamic speed sensation & ocean swell breathing.
 * - Salvo recoil impulse & hit trauma vibration.
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

  // Lateral salvo recoil impulse
  let recoilOffset = 0;
  if (cameraState.lastRecoilDir === 'port') {
    recoilOffset = traumaSq * 1.5; // kick camera rightward
  } else if (cameraState.lastRecoilDir === 'starboard') {
    recoilOffset = -traumaSq * 1.5; // kick camera leftward
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

  // 3. Aim offsets
  let targetSide = 0;
  let targetFwd = 0;
  if (aimDirection === 'port') {
    targetSide = -CONTROL_CONFIG.CAMERA_AIM_SIDE_OFFSET;
    targetFwd = CONTROL_CONFIG.CAMERA_AIM_FORWARD_OFFSET;
  } else if (aimDirection === 'starboard') {
    targetSide = CONTROL_CONFIG.CAMERA_AIM_SIDE_OFFSET;
    targetFwd = CONTROL_CONFIG.CAMERA_AIM_FORWARD_OFFSET;
  }

  cameraState.currentAimSide = damp(cameraState.currentAimSide, targetSide, 8, delta);
  cameraState.currentAimFwd = damp(cameraState.currentAimFwd, targetFwd, 8, delta);

  const sOffset = cameraState.currentAimSide + recoilOffset;
  const fOffset = cameraState.currentAimFwd;

  const sinH = Math.sin(shipHeading);
  const cosH = Math.cos(shipHeading);

  // Dynamic distance pull-back and gentle ocean swell breathing on camera height
  const dynamicDist = CONTROL_CONFIG.CAMERA_DISTANCE + speedRatio * 2.4;
  const speedBob = Math.sin(elapsedTime * 1.9) * 0.28 * speedRatio;
  const dynamicHeight = CONTROL_CONFIG.CAMERA_HEIGHT + speedBob;

  camera.position.x = shipX - sinH * dynamicDist + cosH * sOffset + sinH * fOffset + cosH * shakeX;
  camera.position.y = shipY + dynamicHeight + shakeY;
  camera.position.z = shipZ - cosH * dynamicDist - sinH * sOffset + cosH * fOffset - sinH * shakeX + shakeZ;

  const lookAheadDist = 6.0 + speedRatio * 3.5;
  camera.lookAt(shipX + sinH * lookAheadDist, shipY + 3.5 + shakeY * 0.5, shipZ + cosH * lookAheadDist);
}
