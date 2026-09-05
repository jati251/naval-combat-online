import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { SailState } from '@/types/game';

export interface ShipSailProps {
  geometry: THREE.BufferGeometry;
  texture: THREE.CanvasTexture;
  sailState: SailState;
  height: number;
  depthOffset?: number;
  type?: 'square' | 'jib' | 'lateen';
  mastIndex?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  /** Custom anchor scale limit if needed (defaults to 0.15) */
  anchorScale?: number;
  /** Custom half sail scale limit if needed (defaults to 0.65) */
  halfSailScale?: number;
}

/**
 * Realistic Animated Ship Sail Component
 * Provides:
 * 1. Butter-smooth exponential damping transition when changing sail speed modes
 *    (ANCHOR ⇄ HALF_SAIL ⇄ FULL_SAIL).
 * 2. Dynamic wind billowing and micro-flutter breathing in the Caribbean breeze.
 * 3. Authentic yardarm pinning (canvas reefs smoothly up towards the yard).
 * 4. High-performance direct Three.js buffer updates (zero React re-render overhead).
 */
export const ShipSail: React.FC<ShipSailProps> = React.memo(({
  geometry,
  texture,
  sailState,
  height,
  depthOffset = 0.2,
  type = 'square',
  mastIndex = 0,
  position: basePosition,
  rotation: baseRotation,
  anchorScale = 0.15,
  halfSailScale = 0.65,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);

  // Determine target scale based on sail speed mode
  const getTargetProgress = (state: SailState) => {
    switch (state) {
      case 'ANCHOR':
        return anchorScale;
      case 'HALF_SAIL':
        return halfSailScale;
      case 'FULL_SAIL':
      default:
        return 1.0;
    }
  };

  const currentProgress = useRef(getTargetProgress(sailState));

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    const dt = Math.min(delta, 0.1);
    const target = getTargetProgress(sailState);

    // Smooth exponential damping transition (~0.8 to 1.1s natural easing)
    currentProgress.current = THREE.MathUtils.damp(
      currentProgress.current,
      target,
      4.2,
      dt
    );

    const progress = currentProgress.current;
    const time = state.clock.elapsedTime;

    // Organic wind breathing & fluttering
    const windBreeze = Math.sin(time * 2.2 + mastIndex * 1.3) * 0.05 * progress;
    const windFlutter = Math.sin(time * 3.8 + mastIndex * 1.7) * 0.025 * progress;

    if (type === 'square') {
      // Scale: X flutters slightly, Y scales with reefing, Z billows with wind
      const scaleX = 1.0 + windFlutter * 0.35;
      const scaleY = progress;
      const scaleZ = (0.4 + 0.6 * progress) + windBreeze;
      meshRef.current.scale.set(scaleX, scaleY, scaleZ);

      // Keep top edge pinned to yardarm
      const baseY = basePosition ? basePosition[1] : 0;
      const baseX = basePosition ? basePosition[0] : 0;
      const baseZ = basePosition ? basePosition[2] : depthOffset;
      meshRef.current.position.set(baseX, baseY - height * 0.5 * progress, baseZ);

      // Gentle pitch flutter
      const rotX = (baseRotation ? baseRotation[0] : 0) + windFlutter * 0.4;
      const rotY = baseRotation ? baseRotation[1] : 0;
      const rotZ = baseRotation ? baseRotation[2] : 0;
      meshRef.current.rotation.set(rotX, rotY, rotZ);
    } else if (type === 'jib') {
      const scaleY = progress;
      const scaleZ = (0.5 + 0.5 * progress) + windBreeze;
      meshRef.current.scale.set(1.0, scaleY, scaleZ);

      if (basePosition) {
        meshRef.current.position.set(
          basePosition[0],
          basePosition[1],
          basePosition[2]
        );
      }

      const rotZ = (baseRotation ? baseRotation[2] : 0) + windFlutter * 0.3;
      meshRef.current.rotation.set(
        baseRotation ? baseRotation[0] : 0,
        baseRotation ? baseRotation[1] : 0,
        rotZ
      );
    } else if (type === 'lateen') {
      const scaleY = progress;
      const scaleZ = (0.45 + 0.55 * progress) + windBreeze;
      meshRef.current.scale.set(1.0, scaleY, scaleZ);

      const baseY = basePosition ? basePosition[1] : 0;
      const baseX = basePosition ? basePosition[0] : 0;
      const baseZ = basePosition ? basePosition[2] : depthOffset;
      meshRef.current.position.set(baseX, baseY - height * 0.42 * progress, baseZ);

      const rotX = (baseRotation ? baseRotation[0] : 0) + windFlutter * 0.3;
      meshRef.current.rotation.set(
        rotX,
        baseRotation ? baseRotation[1] : 0,
        baseRotation ? baseRotation[2] : 0
      );
    }
  });

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial
        map={texture}
        side={THREE.DoubleSide}
        roughness={0.78}
        metalness={0.01}
      />
    </mesh>
  );
});
