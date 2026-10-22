import { useEffect, useMemo, useRef } from "react";
import { DirectionalLight, Object3D, Vector3 } from "three";
import { useFrame } from "@react-three/fiber";
import { getLocalStorm, getLightning } from '../../../utils/weather';
import { getOceanTime } from '../../../utils/oceanTime';
import { useGameStore } from '@/stores/useGameStore';

export function SceneSunLight({ color, intensity, shadows, shadowMapSize = 1024 }: {
  color: string; intensity: number; shadows: boolean; shadowMapSize?: number;
}) {
  const light = useRef<DirectionalLight>(null);
  const target = useMemo(() => new Object3D(), []);
  const basis = useMemo(() => {
    const forward = new Vector3(70, 140, -50).normalize();
    const right = new Vector3().crossVectors(new Vector3(0, 1, 0), forward).normalize();
    return { forward, right, up: new Vector3().crossVectors(forward, right), anchor: new Vector3() };
  }, []);
  const halfSpan = shadowMapSize >= 2048 ? 95 : 62;

  useEffect(() => {
    const currentLight = light.current;
    return () => {
      currentLight?.shadow?.map?.dispose();
    };
  }, [shadowMapSize]);

  useFrame(({ camera, clock }) => {
    if (!light.current) return;
    const storm = getLocalStorm(camera.position.x, camera.position.z);
    const time = getOceanTime(useGameStore.getState(), clock.elapsedTime);
    const lightning = getLightning(time, storm);
    light.current.intensity = intensity * (1 - storm * 0.92) + lightning * 2.8;

    // Snap in the light's image plane; world X/Z snapping still crawls under an angled sun.
    const texelSize = (halfSpan * 2) / shadowMapSize;
    basis.anchor.set(camera.position.x, 0, camera.position.z);
    const right = Math.round(basis.anchor.dot(basis.right) / texelSize) * texelSize;
    const up = Math.round(basis.anchor.dot(basis.up) / texelSize) * texelSize;
    const depth = basis.anchor.dot(basis.forward);
    target.position.copy(basis.right).multiplyScalar(right)
      .addScaledVector(basis.up, up).addScaledVector(basis.forward, depth);
    target.updateMatrixWorld();
    light.current.position.copy(target.position).addScaledVector(basis.forward, 180);

    // Ensure shadow auto-update is consistently active to prevent 30Hz odd/even frame flicker
    if (shadows && light.current.shadow && !light.current.shadow.autoUpdate) {
      light.current.shadow.autoUpdate = true;
    }
  });

  return (
    <>
      <primitive object={target} />
      <directionalLight
        key={shadowMapSize}
        ref={light}
        target={target}
        position={[70, 140, -50]}
        color={color}
        intensity={intensity}
        castShadow={shadows}
        shadow-mapSize-width={shadowMapSize}
        shadow-mapSize-height={shadowMapSize}
        shadow-camera-near={50}
        shadow-camera-far={270}
        shadow-camera-left={-halfSpan}
        shadow-camera-right={halfSpan}
        shadow-camera-top={halfSpan}
        shadow-camera-bottom={-halfSpan}
        shadow-bias={shadowMapSize >= 2048 ? -0.00008 : -0.00012}
        shadow-normalBias={shadowMapSize >= 2048 ? 0.028 : 0.038}
      />
    </>
  );
}
