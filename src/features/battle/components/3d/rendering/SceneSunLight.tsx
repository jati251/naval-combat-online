import { useMemo, useRef } from 'react';
import { DirectionalLight, Object3D, MathUtils } from 'three';
import { useFrame } from '@react-three/fiber';

export function SceneSunLight({ color, intensity, shadows }: {
  color: string; intensity: number; shadows: boolean;
}) {
  const light = useRef<DirectionalLight>(null);
  const target = useMemo(() => new Object3D(), []);
  useFrame(({ camera }, delta) => {
    if (!light.current) return;
    // Smoothly track camera position without discrete 4m jumping hitches
    const targetX = MathUtils.damp(target.position.x, camera.position.x, 12, delta);
    const targetZ = MathUtils.damp(target.position.z, camera.position.z, 12, delta);
    target.position.set(targetX, 0, targetZ);
    target.updateMatrixWorld();
    light.current.position.set(targetX + 70, 140, targetZ - 50);
  });
  return <>
    <primitive object={target} />
    <directionalLight ref={light} target={target} position={[70, 140, -50]}
      color={color} intensity={intensity} castShadow={shadows}
      shadow-mapSize-width={1024} shadow-mapSize-height={1024}
      shadow-camera-near={10} shadow-camera-far={300}
      shadow-camera-left={-60} shadow-camera-right={60}
      shadow-camera-top={60} shadow-camera-bottom={-60}
      shadow-bias={-0.0001} shadow-normalBias={0.02} />
  </>;
}
