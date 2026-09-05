import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface OceanWaterProps {
  size?: number;
}

export const OceanWater: React.FC<OceanWaterProps> = ({ size = 1200 }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  // Custom Gerstner Wave Shader with enhanced ocean visuals & foam
  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uDeepWaterColor: { value: new THREE.Color('#011627') },
        uShallowWaterColor: { value: new THREE.Color('#035c6e') },
        uFoamColor: { value: new THREE.Color('#e0fbfc') },
        uSunColor: { value: new THREE.Color('#fff3b0') },
        uLightPosition: { value: new THREE.Vector3(120, 160, 90) },
      },
      vertexShader: `
        uniform float uTime;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        varying float vWaveHeight;
        varying float vFoamFactor;

        struct Wave {
          vec2 direction;
          float steepness;
          float wavelength;
          float speed;
        };

        const int NUM_WAVES = 4;
        const Wave waves[NUM_WAVES] = Wave[NUM_WAVES](
          Wave(vec2(1.0, 0.25), 0.28, 55.0, 3.2),
          Wave(vec2(0.5, 0.85), 0.20, 26.0, 2.4),
          Wave(vec2(-0.35, 0.93), 0.15, 14.0, 1.8),
          Wave(vec2(-0.7, -0.7), 0.10, 7.5, 1.3)
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

          // Wave crest sharpness indicates churning foam
          vFoamFactor = smoothstep(1.3, 2.2, displaced.y) * 0.85;

          vec4 worldPos = modelMatrix * vec4(displaced, 1.0);
          vWorldPosition = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform vec3 uDeepWaterColor;
        uniform vec3 uShallowWaterColor;
        uniform vec3 uFoamColor;
        uniform vec3 uSunColor;
        uniform vec3 uLightPosition;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        varying float vWaveHeight;
        varying float vFoamFactor;

        void main() {
          vec3 normal = normalize(vNormal);
          vec3 lightDir = normalize(uLightPosition - vWorldPosition);
          vec3 viewDir = normalize(cameraPosition - vWorldPosition);

          // Diffuse illumination
          float diff = max(dot(normal, lightDir), 0.0);

          // Specular highlights (brilliant sun glimmer on water surface)
          vec3 halfVector = normalize(lightDir + viewDir);
          float spec = pow(max(dot(normal, halfVector), 0.0), 48.0);

          // Subsurface scattering gradient
          float heightFactor = clamp((vWaveHeight + 2.0) / 4.2, 0.0, 1.0);
          vec3 waterColor = mix(uDeepWaterColor, uShallowWaterColor, heightFactor);

          // Dynamic foam on wave crests
          waterColor = mix(waterColor, uFoamColor, vFoamFactor);

          // Fresnel reflection (sky reflection at shallow grazing angles)
          float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 3.5);
          vec3 skyReflection = vec3(0.08, 0.16, 0.24) * fresnel;

          vec3 finalColor = waterColor + skyReflection + vec3(0.04, 0.08, 0.12) * diff + uSunColor * (spec * 0.95);

          gl_FragColor = vec4(finalColor, 0.96);
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
      <planeGeometry args={[size, size, 96, 96]} />
    </mesh>
  );
};
