import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { FOG_COLOR } from './Environment3D';

interface OceanWaterProps {
  size?: number;
}

export const OceanWater: React.FC<OceanWaterProps> = ({ size = 1600 }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  // Expansive 50x50 vertex grid across 1600m (flawless seamless horizon, zero edge artifacts)
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(size, size, 50, 50);
    geo.rotateX(-Math.PI / 2);
    return geo;
  }, [size]);

  // Assassin's Creed IV: Black Flag Radiant Caribbean Ocean Shader
  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uDeepWaterColor: { value: new THREE.Color('#034a7d') }, // Vibrant Caribbean cobalt
        uMidWaterColor: { value: new THREE.Color('#0284c7') },  // Luminous tropical azure
        uShallowColor: { value: new THREE.Color('#06b6d4') },   // Sunlit turquoise aqua
        uCrestGlowColor: { value: new THREE.Color('#2dd4bf') }, // Radiant emerald crest highlight
        uSubsurfaceColor: { value: new THREE.Color('#14b8a6') },// Bright tropical SSS transmission
        uFoamColor: { value: new THREE.Color('#ffffff') },      // Crisp clean white sea froth
        uSunColor: { value: new THREE.Color('#fffbeb') },       // Warm brilliant Caribbean sun
        uSkyHorizonColor: { value: new THREE.Color(FOG_COLOR) }, // Exact match with fog horizon
        uLightDir: { value: new THREE.Vector3(70, 140, -50).normalize() },
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

        // 4 Gerstner waves synchronized with server WaveMath.ts physics
        const int NUM_WAVES = 4;
        const Wave waves[NUM_WAVES] = Wave[NUM_WAVES](
          Wave(vec2(1.0, 0.25), 0.10, 85.0, 2.8),
          Wave(vec2(0.55, 0.85), 0.08, 44.0, 2.2),
          Wave(vec2(-0.35, 0.92), 0.06, 22.0, 1.7),
          Wave(vec2(-0.75, -0.65), 0.04, 11.0, 1.3)
        );

        void main() {
          vec3 pos = position;
          vec3 displaced = pos;

          vec3 tangent = vec3(1.0, 0.0, 0.0);
          vec3 binormal = vec3(0.0, 0.0, 1.0);

          for (int i = 0; i < NUM_WAVES; i++) {
            Wave w = waves[i];
            vec2 d = normalize(w.direction);
            float k = 6.283185 / w.wavelength;
            float c = w.speed;
            float a = w.steepness / k;

            float dx = d.x;
            float dz = d.y;

            float dotProd = dx * pos.x + dz * pos.z;
            float phase = k * (dotProd - c * uTime);
            float cosP = cos(phase);
            float sinP = sin(phase);

            displaced.x += dx * (a * cosP);
            displaced.y += a * sinP;
            displaced.z += dz * (a * cosP);

            tangent.x -= dx * dx * (w.steepness * sinP);
            tangent.y += dx * (w.steepness * cosP);
            tangent.z -= dx * dz * (w.steepness * sinP);

            binormal.x -= dx * dz * (w.steepness * sinP);
            binormal.y += dz * (w.steepness * cosP);
            binormal.z -= dz * dz * (w.steepness * sinP);
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
        uniform float uTime;
        uniform vec3 uDeepWaterColor;
        uniform vec3 uMidWaterColor;
        uniform vec3 uShallowColor;
        uniform vec3 uCrestGlowColor;
        uniform vec3 uSubsurfaceColor;
        uniform vec3 uFoamColor;
        uniform vec3 uSunColor;
        uniform vec3 uSkyHorizonColor;
        uniform vec3 uLightDir;

        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        varying float vWaveHeight;

        void main() {
          vec3 baseNormal = normalize(vNormal);
          vec3 lightDir = normalize(uLightDir);
          vec3 viewDir = normalize(cameraPosition - vWorldPosition);

          // Natural organic directional ripple chop (continuous water surface)
          float r1 = sin(vWorldPosition.x * 0.8 + vWorldPosition.z * 0.4 + uTime * 2.4);
          float r2 = sin(-vWorldPosition.x * 0.4 + vWorldPosition.z * 0.9 - uTime * 1.8);
          float r3 = sin(vWorldPosition.x * 1.5 - vWorldPosition.z * 1.2 + uTime * 3.1);
          vec3 rippleOffset = vec3((r1 + r3 * 0.35) * 0.025, 0.0, (r2 - r3 * 0.35) * 0.025);
          vec3 normal = normalize(baseNormal + rippleOffset);

          // 1. Vibrant Caribbean Sunlit Depth Gradient
          float depthFactor = clamp((vWaveHeight + 1.2) / 2.4, 0.0, 1.0);
          vec3 waterColor = mix(uDeepWaterColor, uMidWaterColor, smoothstep(0.0, 0.5, depthFactor));
          waterColor = mix(waterColor, uShallowColor, smoothstep(0.4, 0.85, depthFactor));
          waterColor = mix(waterColor, uCrestGlowColor, smoothstep(0.75, 1.0, depthFactor) * 0.45);

          // 2. Subsurface Scattering (bright tropical turquoise crest illumination)
          vec3 sssLightDir = normalize(lightDir + normal * 0.35);
          float sssFactor = pow(max(dot(viewDir, -sssLightDir), 0.0), 3.0);
          float crestThickness = smoothstep(0.3, 1.2, vWaveHeight);
          vec3 sss = uSubsurfaceColor * (sssFactor * crestThickness * 0.65);

          // 3. Fresnel reflection of brilliant Caribbean sky
          float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 3.5);
          vec3 skyReflection = mix(vec3(0.22, 0.58, 0.88), vec3(0.68, 0.88, 1.0), fresnel);
          vec3 baseShaded = mix(waterColor + sss, skyReflection, fresnel * 0.42);

          // 4. Blinn-Phong Sun Specular Glint (radiant midday sparkle)
          vec3 halfVector = normalize(lightDir + viewDir);
          float NdotH = max(dot(normal, halfVector), 0.0);
          float broadSheen = pow(NdotH, 32.0) * 0.35;
          float sharpGlint = pow(NdotH, 180.0) * 1.1;
          baseShaded += uSunColor * (broadSheen + sharpGlint);

          // 5. Natural Soft Wave Crest Foam (breaks naturally on highest swells, zero artifacts)
          float crestBreak = smoothstep(1.05, 1.38, vWaveHeight);
          vec3 finalColor = mix(baseShaded, uFoamColor, crestBreak * 0.45);

          // 6. Horizon Sky Fog (seamless blend matching scene fog 50m - 440m)
          float dist = length(vWorldPosition - cameraPosition);
          float horizonFog = smoothstep(50.0, 440.0, dist);
          finalColor = mix(finalColor, uSkyHorizonColor, horizonFog);

          gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
      transparent: false,
      wireframe: false,
    });
  }, []);

  useFrame((state) => {
    if (shaderMaterial) {
      shaderMaterial.uniforms.uTime.value = state.clock.getElapsedTime();
    }
    // Center ocean mesh horizontally around camera so water horizon never ends
    if (meshRef.current) {
      meshRef.current.position.x = state.camera.position.x;
      meshRef.current.position.z = state.camera.position.z;
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry} material={shaderMaterial} position={[0, -0.05, 0]} />
  );
};


