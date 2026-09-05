export type CameraRecoilDirection = 'port' | 'starboard' | 'hit';

export interface CameraShakeEvent {
  intensity: number;
  direction?: CameraRecoilDirection;
  timestamp: number;
}

export interface CameraState {
  trauma: number;
  lastShakeTime: number;
  lastRecoilDir?: CameraRecoilDirection;
  currentAimSide: number;
  currentAimFwd: number;
  lastTargetFov: number;
}
