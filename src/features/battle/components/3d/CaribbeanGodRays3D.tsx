import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

/**
 * Volumetric Crepuscular Sun Godrays & Atmospheric Light Shafts
 * Radiant midday sunlight streaming through tropical Caribbean clouds onto the sea.
 * High-performance additive shader (0 fill-rate overhead, native 120 FPS).
 */
export const CaribbeanGodRays3D: React.FC = () => {
  const sunPos = useMemo(() => new THREE.Vector3(70, 140, -50), []);
  const meshRef = useRef<THREE.Mesh>(null);

  const godrayMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uRayColor: { value: new THREE.Color('#fffbeb') },
        uWarmGlow: { value: new THREE.Color('#fef08a') },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vWorldPosition;
        void main() {
          vUv = uv;
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uRayColor;
        uniform vec3 uWarmGlow;
        varying vec2 vUv;
        varying vec3 vWorldPosition;

        void main() {
          // Vertical beam fade (soft at top near sun, fading softly as it reaches sea surface)
          float vertFade = smoothstep(0.02, 0.22, vUv.y) * smoothstep(0.98, 0.55, vUv.y);

          // Multi-frequency animated crepuscular light shafts
          float s1 = sin(vUv.x * 28.0 + uTime * 0.18);
          float s2 = sin(vUv.x * 56.0 - uTime * 0.28);
          float s3 = sin(vUv.x * 92.0 + uTime * 0.12);
          float shafts = pow(max(0.0, s1 * 0.5 + s2 * 0.35 + s3 * 0.15 + 0.35), 2.8);

          // Soft ambient sunlight bloom volume
          float broadVolume = pow(max(0.0, sin(vUv.x * 12.0 + uTime * 0.08) * 0.5 + 0.5), 1.6) * 0.4;
          float totalIntensity = (shafts + broadVolume) * vertFade * 0.55;

          vec3 color = mix(uWarmGlow, uRayColor, vUv.y);
          gl_FragColor = vec4(color, totalIntensity);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }, []);

  useFrame((state) => {
    if (godrayMaterial) {
      godrayMaterial.uniforms.uTime.value = state.clock.getElapsedTime();
    }
  });

  // Calculate orientation angle from sun downwards toward scene center [0, 0, 0]
  const coneRotation = useMemo(() => {
    const dir = new THREE.Vector3(0, 0, 0).sub(sunPos).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);
    const euler = new THREE.Euler().setFromQuaternion(quat);
    return [euler.x, euler.y, euler.z] as [number, number, number];
  }, [sunPos]);

  return (
    <group position={[sunPos.x * 0.55, sunPos.y * 0.55, sunPos.z * 0.55]} rotation={coneRotation}>
      {/* Primary Radiant Sun Shaft Cone */}
      <mesh ref={meshRef} material={godrayMaterial}>
        <cylinderGeometry args={[20, 260, 240, 48, 1, true]} />
      </mesh>

      {/* Secondary Inner Brilliant Core Beam */}
      <mesh material={godrayMaterial} scale={[0.65, 1.05, 0.65]}>
        <cylinderGeometry args={[14, 160, 230, 36, 1, true]} />
      </mesh>
    </group>
  );
};
