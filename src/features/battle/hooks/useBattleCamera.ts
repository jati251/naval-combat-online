import { updateFrustum } from '../utils/frustumCuller';
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '@/stores/useGameStore';
import { CONTROL_CONFIG } from '../utils/controls';
import { createInitialCameraState, updateChaseCamera } from '../utils/cameraController';
import { dampAngle, damp } from '../utils/math';
import * as THREE from 'three';

/**
 * Unified Battle Camera Hook.
 * Controls player chase camera during battle and smoothly switches to spectator camera when sunk.
 */
export const useBattleCamera = () => {
  const cameraState = useRef(createInitialCameraState());
  const smoothPos = useRef(new THREE.Vector3());
  const smoothHeading = useRef(0);
  const isInitialized = useRef(false);

  useFrame(({ camera, clock }, delta) => {
    const { ships, selfId, aimDirection, cameraShake } = useGameStore.getState();

    // Prefer self ship; if sunk or missing, spectate first active armada vessel
    const selfShip = ships.find((s) => s.id === selfId && !s.isSunk);
    const targetShip = selfShip || ships.find((s) => !s.isSunk) || ships[0];

    if (!targetShip) return;

    const targetY = targetShip.y + CONTROL_CONFIG.SHIP_Y_BUOYANCY_OFFSET;

    // First frame initialization (snap camera without sweeping sweep)
    if (!isInitialized.current) {
      smoothPos.current.set(targetShip.x, targetY, targetShip.z);
      smoothHeading.current = targetShip.rotationY;
      isInitialized.current = true;
    } else {
      // Smooth tracking towards target ship
      smoothPos.current.x = damp(smoothPos.current.x, targetShip.x, 24, delta);
      smoothPos.current.y = damp(smoothPos.current.y, targetY, 18, delta);
      smoothPos.current.z = damp(smoothPos.current.z, targetShip.z, 24, delta);
      smoothHeading.current = dampAngle(smoothHeading.current, targetShip.rotationY, 20, delta);
    }

    updateChaseCamera({
      camera,
      delta,
      elapsedTime: clock.elapsedTime,
      shipX: smoothPos.current.x,
      shipY: smoothPos.current.y,
      shipZ: smoothPos.current.z,
      shipHeading: smoothHeading.current,
      shipSpeed: targetShip.speed ?? 0,
      sailState: targetShip.sail,
      aimDirection: selfShip ? aimDirection : 'none',
      cameraState: cameraState.current,
      shakeEvent: selfShip ? cameraShake : null,
    });
    updateFrustum(camera, true);
  });
};
