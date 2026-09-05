import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/stores/useGameStore';
import { CONTROL_CONFIG } from '../utils/controls';

function lerpAngle(current: number, target: number, alpha: number): number {
  let diff = (target - current) % (Math.PI * 2);
  if (diff > Math.PI) diff -= Math.PI * 2;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * alpha;
}

export const useBattleCamera = () => {
  const ships = useGameStore((s) => s.ships);
  const selfId = useGameStore((s) => s.selfId);
  const aimDirection = useGameStore((s) => s.aimDirection);

  const targetShip = ships.find((s) => s.id === selfId) || ships.find((s) => !s.isSunk) || ships[0];

  // Persistent smoothed state across render frames (eliminates 30Hz server tick snapping)
  const smoothShipPos = useRef(new THREE.Vector3());
  const smoothHeading = useRef(0);
  const smoothLookAt = useRef(new THREE.Vector3());
  const isInitialized = useRef(false);

  useFrame(({ camera }, delta) => {
    if (!targetShip) return;

    const {
      CAMERA_DISTANCE,
      CAMERA_HEIGHT,
      CAMERA_AIM_SIDE_OFFSET,
      CAMERA_AIM_FORWARD_OFFSET,
      SHIP_Y_BUOYANCY_OFFSET,
    } = CONTROL_CONFIG;

    let sideOffset = 0;
    let forwardOffset = 0;
    if (aimDirection === 'port') {
      sideOffset = -CAMERA_AIM_SIDE_OFFSET;
      forwardOffset = CAMERA_AIM_FORWARD_OFFSET;
    } else if (aimDirection === 'starboard') {
      sideOffset = CAMERA_AIM_SIDE_OFFSET;
      forwardOffset = CAMERA_AIM_FORWARD_OFFSET;
    }

    const targetY = targetShip.y + SHIP_Y_BUOYANCY_OFFSET;

    // First frame initialization (snap without initial lerp sweep)
    if (!isInitialized.current) {
      smoothShipPos.current.set(targetShip.x, targetY, targetShip.z);
      smoothHeading.current = targetShip.rotationY;
      const sinH = Math.sin(smoothHeading.current);
      const cosH = Math.cos(smoothHeading.current);
      camera.position.set(
        targetShip.x - sinH * CAMERA_DISTANCE + cosH * sideOffset + sinH * forwardOffset,
        targetY + CAMERA_HEIGHT,
        targetShip.z - cosH * CAMERA_DISTANCE - sinH * sideOffset + cosH * forwardOffset
      );
      smoothLookAt.current.set(
        targetShip.x + sinH * 6,
        targetY + 3.5,
        targetShip.z + cosH * 6
      );
      camera.lookAt(smoothLookAt.current);
      isInitialized.current = true;
      return;
    }

    // 1. High-frequency smoothed ship transform (smooths 30Hz server snapshots to 120 FPS)
    const posAlpha = Math.min(1.0, 15 * delta);
    const rotAlpha = Math.min(1.0, 13 * delta);
    smoothShipPos.current.x = THREE.MathUtils.lerp(smoothShipPos.current.x, targetShip.x, posAlpha);
    smoothShipPos.current.y = THREE.MathUtils.lerp(smoothShipPos.current.y, targetY, posAlpha);
    smoothShipPos.current.z = THREE.MathUtils.lerp(smoothShipPos.current.z, targetShip.z, posAlpha);
    smoothHeading.current = lerpAngle(smoothHeading.current, targetShip.rotationY, rotAlpha);

    const cosH = Math.cos(smoothHeading.current);
    const sinH = Math.sin(smoothHeading.current);

    // 2. Camera position locked directly to smoothed ship orbit (rigid radius, zero chord cutting or shaking)
    camera.position.x =
      smoothShipPos.current.x - sinH * CAMERA_DISTANCE + cosH * sideOffset + sinH * forwardOffset;
    camera.position.y = smoothShipPos.current.y + CAMERA_HEIGHT;
    camera.position.z =
      smoothShipPos.current.z - cosH * CAMERA_DISTANCE - sinH * sideOffset + cosH * forwardOffset;

    // 3. Camera look-at target locked directly to smoothed ship transform
    smoothLookAt.current.set(
      smoothShipPos.current.x + sinH * 6,
      smoothShipPos.current.y + 3.5,
      smoothShipPos.current.z + cosH * 6
    );

    camera.lookAt(smoothLookAt.current);
  });
};
