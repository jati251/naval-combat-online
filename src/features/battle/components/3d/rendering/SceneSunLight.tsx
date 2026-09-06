import { useMemo, useRef } from 'react';
import { DirectionalLight, Object3D } from 'three';
import { useFrame } from '@react-three/fiber';

export function SceneSunLight({ color, intensity, shadows }: {
  color: string; intensity: number; shadows: boolean;
}) {
  const light = useRef<DirectionalLight>(null);
  const target = useMemo(() => new Object3D(), []);
  useFrame(({ camera }) => {
    if (!light.current) return;
    // Keep the shadow budget around the battle camera instead of the map origin.
    const x = Math.round(camera.position.x / 4) * 4;
    const z = Math.round(camera.position.z / 4) * 4;
    if (target.position.x === x && target.position.z === z) return;
    target.position.set(x, 0, z);
    target.updateMatrixWorld();
    light.current.position.set(x + 70, 140, z - 50);
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
