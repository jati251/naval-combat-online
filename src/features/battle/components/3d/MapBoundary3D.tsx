import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

export const ARENA_RADIUS = 500;

/**
 * Assassin's Creed IV: Black Flag Shimmering Naval Map Boundary
 * An ethereal oceanic energy barrier and floating beacon buoys at R = 500m.
 */
export const MapBoundary3D: React.FC = React.memo(() => {
  const boundaryShader = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color('#38bdf8') },
        uWarningColor: { value: new THREE.Color('#f59e0b') },
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uColor;
        uniform vec3 uWarningColor;
        varying vec3 vWorldPosition;
        varying vec2 vUv;

        void main() {
          // Vertical fade: dense at water line, fading gently as it rises up
          float heightAlpha = smoothstep(0.0, 0.15, vUv.y) * smoothstep(1.0, 0.4, vUv.y);

          // Animated horizontal pulse waves (AC Black Flag Animus barrier)
          float pulse1 = sin(vUv.y * 35.0 - uTime * 3.0);
          float pulse2 = sin(vUv.x * 240.0 + uTime * 2.0);
          float grid = smoothstep(0.75, 0.98, pulse1 * 0.5 + 0.5) * 0.6;
          grid += smoothstep(0.85, 0.99, pulse2 * 0.5 + 0.5) * 0.4;

          // Shimmering base glow
          float baseAlpha = 0.15 + 0.35 * grid;
          vec3 finalColor = mix(uColor, uWarningColor, grid * 0.4);

          gl_FragColor = vec4(finalColor, baseAlpha * heightAlpha * 0.75);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
  }, []);

  // Floating Perimeter Navigation Buoy Markers with Blinking Lanterns
  const buoys = useMemo(() => {
    const list: Array<{ id: number; x: number; z: number; angle: number }> = [];
    const count = 16;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      list.push({
        id: i,
        x: Math.sin(angle) * (ARENA_RADIUS - 4),
        z: Math.cos(angle) * (ARENA_RADIUS - 4),
        angle,
      });
    }
    return list;
  }, []);

  const buoyGroupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (boundaryShader) {
      boundaryShader.uniforms.uTime.value = t;
    }
    if (buoyGroupRef.current) {
      // Gentle ocean swell bobbing
      buoyGroupRef.current.position.y = Math.sin(t * 1.8) * 0.4;
    }
  });

  return (
    <group>
      {/* 1. Shimmering AC Black Flag Energy Curtain Wall */}
      <mesh position={[0, 18, 0]} material={boundaryShader}>
        <cylinderGeometry args={[ARENA_RADIUS, ARENA_RADIUS, 42, 64, 1, true]} />
      </mesh>

      {/* 2. Perimeter Warning Buoys */}
      <group ref={buoyGroupRef}>
        {buoys.map((b) => (
          <group key={b.id} position={[b.x, 0.5, b.z]}>
            {/* Red/White Striped Floating Buoy Hull */}
            <mesh castShadow position={[0, 1.2, 0]}>
              <cylinderGeometry args={[1.2, 1.6, 2.4, 8]} />
              <meshStandardMaterial color="#b91c1c" roughness={0.4} />
            </mesh>

            {/* Brass Cage Top */}
            <mesh position={[0, 2.8, 0]}>
              <cylinderGeometry args={[0.6, 0.8, 1.2, 6]} />
              <meshStandardMaterial color="#d97706" metalness={0.8} roughness={0.3} />
            </mesh>

            {/* Flashing Warning Beacon (Luminous emissive material without forward light pass penalty) */}
            <mesh position={[0, 3.2, 0]}>
              <sphereGeometry args={[0.38, 8, 8]} />
              <meshStandardMaterial
                color="#fef08a"
                emissive="#f59e0b"
                emissiveIntensity={2.5}
              />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
});
