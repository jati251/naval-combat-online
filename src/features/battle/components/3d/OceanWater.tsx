import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface OceanWaterProps {
  size?: number;
}

export const OceanWater: React.FC<OceanWaterProps> = ({ size = 2600 }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  // Pre-rotated horizontal XZ geometry (optimized to 140x140 for 120FPS performance)
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(size, size, 140, 140);
    geo.rotateX(-Math.PI / 2);
    return geo;
  }, [size]);

  // Assassin's Creed IV: Black Flag Caribbean Ocean Shader with Depth Texture & Organic Foam
  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uDeepWaterColor: { value: new THREE.Color('#011933') }, // Deep Caribbean abyss
        uMidWaterColor: { value: new THREE.Color('#006580') },  // Vibrant tropical azure
        uShallowColor: { value: new THREE.Color('#019da2') },   // Sunlit turquoise
        uCrestGlowColor: { value: new THREE.Color('#08d9b8') }, // Radiant crest highlight
        uSubsurfaceColor: { value: new THREE.Color('#05ffd1') },// Emerald SSS transmission
        uFoamColor: { value: new THREE.Color('#f4fbfb') },      // Crisp organic sea froth
        uSunColor: { value: new THREE.Color('#fff4d6') },       // Warm golden Caribbean sun
        uSkyHorizonColor: { value: new THREE.Color('#5ca2d2') }, // Horizon fog blend
        uLightDir: { value: new THREE.Vector3(140, 65, 110).normalize() },
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
          Wave(vec2(1.0, 0.3), 0.32, 52.0, 3.4),
          Wave(vec2(0.6, 0.8), 0.22, 28.0, 2.6),
          Wave(vec2(-0.3, 0.95), 0.18, 16.0, 2.0),
          Wave(vec2(-0.7, -0.7), 0.12, 8.0, 1.4)
        );

        void main() {
          vec3 pos = position; // pos.y is 0.0
          vec3 displaced = pos;

          vec3 tangent = vec3(1.0, 0.0, 0.0);
          vec3 binormal = vec3(0.0, 0.0, 1.0);

          for (int i = 0; i < NUM_WAVES; i++) {
            Wave w = waves[i];
            float k = 6.283185307 / w.wavelength;
            float c = w.speed;
            float a = w.steepness / k;
            float dx = w.direction.x;
            float dz = w.direction.y;

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

        // 2D Hash function for procedural organic turbulence
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
        }

        // Value noise
        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(
            mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
            mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
            u.y
          );
        }

        // Fractional Brownian Motion for natural, streak-free sea froth
        float fbm(vec2 p) {
          float v = 0.0;
          v += 0.500 * noise(p); p *= 2.02;
          v += 0.250 * noise(p); p *= 2.03;
          v += 0.125 * noise(p);
          return v;
        }

        void main() {
          vec3 baseNormal = normalize(vNormal);
          vec3 lightDir = normalize(uLightDir);
          vec3 viewDir = normalize(cameraPosition - vWorldPosition);

          // Micro-chop normal perturbation (fine surface tension)
          vec2 chopUV = vWorldPosition.xz * 1.1;
          float c1 = sin(chopUV.x * 3.2 + uTime * 2.8) * cos(chopUV.y * 3.2 + uTime * 2.1);
          float c2 = sin(chopUV.x * 6.5 - uTime * 3.6) * cos(chopUV.y * 6.0 + uTime * 3.0);
          vec3 rippleOffset = vec3((c1 + c2 * 0.4) * 0.05, 0.0, (c1 - c2 * 0.4) * 0.05);
          vec3 normal = normalize(baseNormal + rippleOffset);

          // 1. Layered Caribbean Water Depth Color Gradient
          float depthFactor = clamp((vWaveHeight + 1.8) / 3.8, 0.0, 1.0);
          vec3 waterColor = mix(uDeepWaterColor, uMidWaterColor, smoothstep(0.0, 0.55, depthFactor));
          waterColor = mix(waterColor, uShallowColor, smoothstep(0.4, 0.85, depthFactor));
          waterColor = mix(waterColor, uCrestGlowColor, smoothstep(0.75, 1.0, depthFactor) * 0.65);

          // 2. Moving Underwater Sun Caustics (adds physical optical depth)
          vec2 causticUV1 = vWorldPosition.xz * 0.12 + vec2(uTime * 0.05, uTime * 0.03);
          vec2 causticUV2 = vWorldPosition.xz * 0.18 - vec2(uTime * 0.04, uTime * 0.06);
          float caustic1 = pow(abs(sin(causticUV1.x * 5.5 + sin(causticUV1.y * 4.0))), 2.0);
          float caustic2 = pow(abs(cos(causticUV2.x * 6.5 + cos(causticUV2.y * 5.0))), 2.0);
          float caustics = (caustic1 + caustic2) * 0.5 * smoothstep(-1.2, 1.5, vWaveHeight);
          waterColor += uCrestGlowColor * (caustics * 0.18);

          // 3. Subsurface Scattering: radiant emerald/turquoise transmission through crests
          vec3 sssLightDir = normalize(lightDir + normal * 0.3);
          float sssFactor = pow(max(dot(viewDir, -sssLightDir), 0.0), 3.5);
          float crestThickness = smoothstep(0.3, 2.3, vWaveHeight);
          vec3 sss = uSubsurfaceColor * (sssFactor * crestThickness * 1.35);

          // 4. Fresnel reflection of tropical sky
          float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 4.0);
          vec3 skyReflection = mix(vec3(0.42, 0.68, 0.88), vec3(0.85, 0.94, 1.0), fresnel);

          // 5. Blinn-Phong Sun Highway Specular (calibrated, anti-glare)
          vec3 halfVector = normalize(lightDir + viewDir);
          float NdotH = max(dot(normal, halfVector), 0.0);
          float broadSheen = pow(NdotH, 32.0) * 0.18;
          float sharpGlint = pow(NdotH, 180.0) * 0.95;
          vec3 sunSpecular = uSunColor * (broadSheen + sharpGlint);

          // 6. Natural Organic Fractal Foam (replaces artificial honeycomb polka dots)
          float crestHeight = smoothstep(1.0, 2.3, vWaveHeight);
          vec2 foamUV = vWorldPosition.xz * 0.35 + vec2(uTime * 0.08, -uTime * 0.06);
          float frothNoise = fbm(foamUV * 4.5);
          float foamMask = smoothstep(0.4, 0.72, frothNoise) * crestHeight;

          // 7. Compose final water color
          vec3 finalColor = waterColor + sss + (skyReflection * fresnel * 0.85);
          finalColor += sunSpecular;
          finalColor = mix(finalColor, uFoamColor, clamp(foamMask * 0.85, 0.0, 1.0));

          // 8. Horizon Atmospheric Fog (seamless blend)
          float dist = length(vWorldPosition - cameraPosition);
          float horizonFog = smoothstep(450.0, 1600.0, dist);
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


