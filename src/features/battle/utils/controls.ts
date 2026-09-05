export const BATTLE_KEY_BINDINGS = {
  STEER_PORT: ['KeyA', 'ArrowLeft'],
  STEER_STARBOARD: ['KeyD', 'ArrowRight'],
  SAIL_INCREASE: ['KeyW', 'ArrowUp'],
  SAIL_DECREASE: ['KeyS', 'ArrowDown'],
  AIM_PORT: ['KeyQ'],
  AIM_STARBOARD: ['KeyE'],
  FIRE_SALVO: ['Space'],
} as const;

export const CONTROL_CONFIG = {
  RUDDER_LERP_SPEED: 7.0, // lerp speed towards target rudder
  CAMERA_DISTANCE: 36,
  CAMERA_HEIGHT: 15,
  CAMERA_AIM_SIDE_OFFSET: 8.5,
  CAMERA_AIM_FORWARD_OFFSET: 4.0,
  SHIP_Y_BUOYANCY_OFFSET: 0.95,
  RADAR_SCALE: 0.14,
} as const;
