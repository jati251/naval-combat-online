export type CameraRecoilDirection = 'left' | 'right' | 'hit';

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
  currentAimLookSide: number;
  currentSailDistOffset: number;
  currentSailHeightOffset: number;
  lastTargetFov: number;
}
