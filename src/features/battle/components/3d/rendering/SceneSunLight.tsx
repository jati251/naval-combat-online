import { useMemo, useRef } from "react";
import { DirectionalLight, Object3D, MathUtils } from "three";
import { useFrame } from "@react-three/fiber";

export function SceneSunLight({ color, intensity, shadows, shadowMapSize = 1024 }: {
  color: string; intensity: number; shadows: boolean; shadowMapSize?: number;
}) {
  const light = useRef<DirectionalLight>(null);
  const target = useMemo(() => new Object3D(), []);

  useFrame(({ camera }, delta) => {
    if (!light.current) return;

    // Smoothly track camera position
    const rawX = MathUtils.damp(target.position.x, camera.position.x, 14, delta);
    const rawZ = MathUtils.damp(target.position.z, camera.position.z, 14, delta);

    // Directional shadow texel stabilization:
    // Snaps the shadow camera origin to the exact shadow texel grid to eliminate shadow crawling/shimmering
    const shadowSpan = 96; // 48 - (-48)
    const texelSize = shadowSpan / shadowMapSize;
    const snappedX = Math.round(rawX / texelSize) * texelSize;
    const snappedZ = Math.round(rawZ / texelSize) * texelSize;

    target.position.set(snappedX, 0, snappedZ);
    target.updateMatrixWorld();
    light.current.position.set(snappedX + 70, 140, snappedZ - 50);

    // Ensure shadow auto-update is consistently active to prevent 30Hz odd/even frame flicker
    if (shadows && light.current.shadow && !light.current.shadow.autoUpdate) {
      light.current.shadow.autoUpdate = true;
    }
  });

  return (
    <>
      <primitive object={target} />
      <directionalLight
        ref={light}
        target={target}
        position={[70, 140, -50]}
        color={color}
        intensity={intensity}
        castShadow={shadows}
        shadow-mapSize-width={shadowMapSize}
        shadow-mapSize-height={shadowMapSize}
        shadow-camera-near={20}
        shadow-camera-far={240}
        shadow-camera-left={-48}
        shadow-camera-right={48}
        shadow-camera-top={48}
        shadow-camera-bottom={-48}
        shadow-bias={-0.0001}
        shadow-normalBias={0.02}
      />
    </>
  );
}
