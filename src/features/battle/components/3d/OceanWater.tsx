import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface OceanWaterProps {
  size?: number;
}

export const OceanWater: React.FC<OceanWaterProps> = ({ size = 1200 }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  // Custom Gerstner Wave Shader
  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uDeepWaterColor: { value: new THREE.Color('#031424') },
        uShallowWaterColor: { value: new THREE.Color('#0d4261') },
        uFoamColor: { value: new THREE.Color('#cde5f7') },
        uLightPosition: { value: new THREE.Vector3(100, 150, 100) },
      },
      vertexShader: `
        uniform float uTime;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        varying float vWaveHeight;

        struct Wave {
          vec2 direction;
          float steepness;
          float wavelength;
          float speed;
        };

        const int NUM_WAVES = 4;
        const Wave waves[NUM_WAVES] = Wave[NUM_WAVES](
          Wave(vec2(1.0, 0.3), 0.32, 52.0, 3.4),
          Wave(vec2(0.6, 0.8), 0.22, 28.0, 2.6),
          Wave(vec2(-0.3, 0.95), 0.18, 16.0, 2.0),
          Wave(vec2(-0.7, -0.7), 0.12, 8.0, 1.4)
        );

        void main() {
          vec3 pos = position;
          vec3 tangent = vec3(1.0, 0.0, 0.0);
          vec3 binormal = vec3(0.0, 0.0, 1.0);
          vec3 displaced = pos;

          for (int i = 0; i < NUM_WAVES; i++) {
            Wave w = waves[i];
            float k = 6.2831853 / w.wavelength;
            float c = w.speed;
            float a = w.steepness / k;
            vec2 d = normalize(w.direction);

            float f = k * (dot(d, pos.xz) - c * uTime);
            float cosF = cos(f);
            float sinF = sin(f);

            displaced.x += d.x * (a * cosF);
            displaced.y += a * sinF;
            displaced.z += d.y * (a * cosF);

            tangent += vec3(-d.x * d.x * (w.steepness * sinF), d.x * (w.steepness * cosF), -d.x * d.y * (w.steepness * sinF));
            binormal += vec3(-d.x * d.y * (w.steepness * sinF), d.y * (w.steepness * cosF), -d.y * d.y * (w.steepness * sinF));
          }

          vec3 calcNormal = normalize(cross(binormal, tangent));
          vNormal = calcNormal;
          vWaveHeight = displaced.y;

          vec4 worldPos = modelMatrix * vec4(displaced, 1.0);
          vWorldPosition = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform vec3 uDeepWaterColor;
        uniform vec3 uShallowWaterColor;
        uniform vec3 uFoamColor;
        uniform vec3 uLightPosition;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        varying float vWaveHeight;

        void main() {
          vec3 normal = normalize(vNormal);
          vec3 lightDir = normalize(uLightPosition - vWorldPosition);
          vec3 viewDir = normalize(cameraPosition - vWorldPosition);

          // Diffuse lighting
          float diff = max(dot(normal, lightDir), 0.0);

          // Specular highlights (sun glitter on waves)
          vec3 reflectDir = reflect(-lightDir, normal);
          float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);

          // Height gradient for water depth
          float heightFactor = clamp((vWaveHeight + 2.5) / 5.0, 0.0, 1.0);
          vec3 waterColor = mix(uDeepWaterColor, uShallowWaterColor, heightFactor);

          // Foam on wave peaks
          float foamFactor = smoothstep(1.6, 2.6, vWaveHeight);
          waterColor = mix(waterColor, uFoamColor, foamFactor * 0.7);

          // Fresnel reflection
          float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 4.0);
          vec3 finalColor = waterColor + vec3(0.1, 0.2, 0.3) * diff + vec3(1.0, 0.95, 0.8) * (spec * 0.85) + vec3(0.15) * fresnel;

          gl_FragColor = vec4(finalColor, 0.94);
        }
      `,
      transparent: true,
      wireframe: false,
    });
  }, []);

  useFrame((state) => {
    if (shaderMaterial) {
      shaderMaterial.uniforms.uTime.value = state.clock.getElapsedTime();
    }
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} material={shaderMaterial}>
      <planeGeometry args={[size, size, 128, 128]} />
    </mesh>
  );
};
