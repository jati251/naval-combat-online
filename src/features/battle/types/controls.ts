import type { SailState, AimDirection } from '@/types';

export interface ShipInputState {
  currentRudder: number;
  targetRudder: number;
  sail: SailState;
  isAiming: boolean;
  aimDirection: AimDirection;
}

export interface ShipActions {
  changeSail: (sail: SailState) => void;
  setRudder: (rudder: number) => void;
  cycleSail: (dir: 'up' | 'down') => void;
  fireBattery: (side: 'port' | 'starboard') => void;
  setAim: (direction: AimDirection, isAiming: boolean) => void;
}

export interface ControlConfig {
  CAMERA_DISTANCE: number;
  CAMERA_HEIGHT: number;
  CAMERA_AIM_SIDE_OFFSET: number;
  CAMERA_AIM_FORWARD_OFFSET: number;
  SHIP_Y_BUOYANCY_OFFSET: number;
  NETWORK_SYNC_RATE_HZ: number;
  STEER_LERP_SPEED: number;
}
