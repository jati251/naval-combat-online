import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/stores/useGameStore';
import { CONTROL_CONFIG } from '../utils/controls';

export const useBattleCamera = () => {
  const ships = useGameStore((s) => s.ships);
  const selfId = useGameStore((s) => s.selfId);
  const aimDirection = useGameStore((s) => s.aimDirection);

  const targetShip = ships.find((s) => s.id === selfId) || ships.find((s) => !s.isSunk) || ships[0];

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

    const cosHeading = Math.cos(targetShip.rotationY);
    const sinHeading = Math.sin(targetShip.rotationY);

    const targetCamX =
      targetShip.x - sinHeading * CAMERA_DISTANCE + cosHeading * sideOffset + sinHeading * forwardOffset;
    const targetCamZ =
      targetShip.z - cosHeading * CAMERA_DISTANCE - sinHeading * sideOffset + cosHeading * forwardOffset;
    const targetCamY = targetShip.y + SHIP_Y_BUOYANCY_OFFSET + CAMERA_HEIGHT;

    camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetCamX, Math.min(1.0, 5 * delta));
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetCamY, Math.min(1.0, 5 * delta));
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetCamZ, Math.min(1.0, 5 * delta));

    const lookTarget = new THREE.Vector3(
      targetShip.x + sinHeading * 5,
      targetShip.y + SHIP_Y_BUOYANCY_OFFSET + 4,
      targetShip.z + cosHeading * 5
    );
    camera.lookAt(lookTarget);
  });
};
