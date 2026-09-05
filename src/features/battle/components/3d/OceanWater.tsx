import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { FOG_COLOR, NIGHT_FOG_COLOR } from './Environment3D';
import { ARENA_ISLANDS } from './Islands3D';
import { useGameStore } from '@/stores/useGameStore';

interface OceanWaterProps {
  size?: number;
  isMobile?: boolean;
}

export const OceanWater: React.FC<OceanWaterProps> = React.memo(({ size = 1600, isMobile = false }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const timeOfDay = useGameStore((s) => s.timeOfDay);
  const isNight = timeOfDay === 'NIGHT';

  // Responsive vertex grid density: 120x120 on mobile (14,400 quads) for crisp wave crests,
  // 220x220 on desktop (48,400 quads) for rich geometric Gerstner swell curves.
  const segments = isMobile ? 120 : 220;
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(size, size, segments, segments);
    geo.rotateX(-Math.PI / 2);
    return geo;
  }, [size, segments]);

  // Pack arena islands data into uniform arrays: position/seed and elongation params
  const islandPositions = useMemo(() => {
    return ARENA_ISLANDS.map((isl) => new THREE.Vector4(isl.x, isl.z, isl.sandRadius, isl.seed));
  }, []);

  const islandParams = useMemo(() => {
    return ARENA_ISLANDS.map((isl) =>
      isl.elongation
        ? new THREE.Vector4(isl.elongation.scaleX, isl.elongation.scaleZ, isl.elongation.angle, 1.0)
        : new THREE.Vector4(1.0, 1.0, 0.0, 0.0)
    );
  }, []);

  // Assassin's Creed IV: Black Flag & Sea of Thieves AAA Ocean Shader
  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uDeepWaterColor: { value: new THREE.Color(isNight ? '#041026' : '#014f86') },
        uMidWaterColor: { value: new THREE.Color(isNight ? '#081c38' : '#0077b6') },
        uShallowColor: { value: new THREE.Color(isNight ? '#0b2545' : '#0096c7') },
        uLagoonColor: { value: new THREE.Color(isNight ? '#133863' : '#059669') },
        uCrestGlowColor: { value: new THREE.Color(isNight ? '#385f8a' : '#00b4d8') },
        uSubsurfaceColor: { value: new THREE.Color(isNight ? '#0d2744' : '#00e5ff') },
        uFoamColor: { value: new THREE.Color(isNight ? '#cbd5e1' : '#ffffff') },
        uSunColor: { value: new THREE.Color(isNight ? '#c5daf8' : '#fffbeb') },
        uSkyHorizonColor: { value: new THREE.Color(isNight ? NIGHT_FOG_COLOR : FOG_COLOR) },
        uLightDir: { value: new THREE.Vector3(70, 140, -50).normalize() },
        uIslandPos: { value: islandPositions },
        uIslandParams: { value: islandParams },
        uShipPos: { value: new THREE.Vector3(0, 0, 0) },
        uShipHeading: { value: 0 },
        uShipSpeed: { value: 0 },
        uIsMobile: { value: isMobile ? 1.0 : 0.0 },
        uFogDensity: { value: isMobile ? (isNight ? 0.0028 : 0.0018) : (isNight ? 0.0022 : 0.0014) },
      },
      vertexShader: `
        uniform float uTime;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        varying float vWaveHeight;
        varying float vCrestPinch;

        struct Wave {
          vec2 direction;
          float steepness;
          float wavelength;
          float speed;
        };

        // 4 Primary Gerstner wave swells synchronized with server simulation
        // Sub-grid micro ripples are handled in fragment shader capillary normals
        // to eliminate Nyquist aliasing and swimming during camera rotation.
        const int NUM_WAVES = 4;
        const Wave waves[NUM_WAVES] = Wave[NUM_WAVES](
          // 1. Dominant Caribbean rolling swell
          Wave(vec2(1.0, 0.28), 0.11, 92.0, 2.6),
          // 2. Secondary diagonal cross-swell
          Wave(vec2(0.55, 0.85), 0.085, 48.0, 2.1),
          // 3. Intermediate surface swell
          Wave(vec2(-0.35, 0.92), 0.065, 28.0, 1.7),
          // 4. Moderate wind swell
          Wave(vec2(-0.75, -0.65), 0.045, 18.0, 1.4)
        );

        void main() {
          // Compute world origin before displacement so waves stay rock-solid when mesh follows camera
          vec4 worldOrigin = modelMatrix * vec4(position, 1.0);
          vec3 pos = worldOrigin.xyz;
          vec3 displaced = pos;

          vec3 tangent = vec3(1.0, 0.0, 0.0);
          vec3 binormal = vec3(0.0, 0.0, 1.0);
          float pinchAccum = 0.0;

          for (int i = 0; i < NUM_WAVES; i++) {
            Wave w = waves[i];
            vec2 d = normalize(w.direction);
            float k = 6.2831853 / w.wavelength;
            float c = w.speed;
            float a = w.steepness / k;

            float dx = d.x;
            float dz = d.y;

            float dotProd = dx * pos.x + dz * pos.z;
            float phase = k * (dotProd - c * uTime);
            float cosP = cos(phase);
            float sinP = sin(phase);

            // Gerstner trochoidal displacement (peaks pinch, troughs flatten)
            displaced.x += dx * (a * cosP);
            displaced.y += a * sinP;
            displaced.z += dz * (a * cosP);

            // Analytical Jacobian derivatives for exact surface normals
            tangent.x -= dx * dx * (w.steepness * sinP);
            tangent.y += dx * (w.steepness * cosP);
            tangent.z -= dx * dz * (w.steepness * sinP);

            binormal.x -= dx * dz * (w.steepness * sinP);
            binormal.y += dz * (w.steepness * cosP);
            binormal.z -= dz * dz * (w.steepness * sinP);

            // Accumulate crest steepness for physics-based foam detection
            pinchAccum += w.steepness * cosP;
          }

          vec3 calcNormal = normalize(cross(binormal, tangent));
          vNormal = calcNormal;
          vWaveHeight = displaced.y;
          vCrestPinch = pinchAccum;
          vWorldPosition = displaced;

          gl_Position = projectionMatrix * viewMatrix * vec4(displaced, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uDeepWaterColor;
        uniform vec3 uMidWaterColor;
        uniform vec3 uShallowColor;
        uniform vec3 uLagoonColor;
        uniform vec3 uCrestGlowColor;
        uniform vec3 uSubsurfaceColor;
        uniform vec3 uFoamColor;
        uniform vec3 uSunColor;
        uniform vec3 uSkyHorizonColor;
        uniform vec3 uLightDir;
        uniform vec4 uIslandPos[9];
        uniform vec4 uIslandParams[9];
        uniform vec3 uShipPos;
        uniform float uShipHeading;
        uniform float uShipSpeed;
        uniform float uIsMobile;
        uniform float uFogDensity;

        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        varying float vWaveHeight;
        varying float vCrestPinch;

        // Fast hash for procedural foam web
        vec2 hash22(vec2 p) {
          p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
          return fract(sin(p) * 43758.5453123);
        }

        // Procedural Voronoi cellular foam generator
        float cellularFoam(vec2 p) {
          vec2 n = floor(p);
          vec2 f = fract(p);
          float md = 8.0;
          for (int j = -1; j <= 1; j++) {
            for (int i = -1; i <= 1; i++) {
              vec2 g = vec2(float(i), float(j));
              vec2 o = hash22(n + g);
              vec2 r = g + o - f;
              float d = dot(r, r);
              md = min(md, d);
            }
          }
          return sqrt(md);
        }

        // Multi-Scale Directional Capillary Micro-Waves (crisp liquid shimmer)
        vec3 computeCapillaryNormal(vec2 p, float time) {
          vec2 d1 = normalize(vec2(0.707, 0.707));
          vec2 d2 = normalize(vec2(-0.8, 0.6));
          vec2 d3 = normalize(vec2(0.38, -0.92));

          float k1 = 6.2831853 / 4.2;
          float k2 = 6.2831853 / 2.2;
          float k3 = 6.2831853 / 1.1;

          float phase1 = k1 * (dot(d1, p) - 2.2 * time);
          float phase2 = k2 * (dot(d2, p) - 2.8 * time);
          float phase3 = k3 * (dot(d3, p) - 3.4 * time);

          float a1 = 0.032;
          float a2 = 0.018;
          float a3 = 0.009;

          float c1 = cos(phase1);
          float c2 = cos(phase2);
          float c3 = cos(phase3);

          float dh_dx = -(d1.x * k1 * a1 * c1 + d2.x * k2 * a2 * c2 + d3.x * k3 * a3 * c3);
          float dh_dz = -(d1.y * k1 * a1 * c1 + d2.y * k2 * a2 * c2 + d3.y * k3 * a3 * c3);

          return vec3(dh_dx, 1.0, dh_dz);
        }

        void main() {
          float camDist = length(vWorldPosition - cameraPosition);

          // 0. DISTANCE LOD: Horizon Early Exit (Distant Sea > 950m)
          // Near the horizon, water blends into sky fog.
          // Direct return saves all arithmetic for distant pixels.
          if (camDist > 950.0) {
            gl_FragColor = vec4(uSkyHorizonColor, 1.0);
            return;
          }

          vec3 baseNormal = normalize(vNormal);
          vec3 lightDir = normalize(uLightDir);
          vec3 viewDir = normalize(cameraPosition - vWorldPosition);

          // 1. DISTANCE LOD: High-Frequency Micro-Wave Capillary Normal Blending (0m - 140m)
          // Capillary ripples are sub-pixel beyond 120m.
          // Fading them out saves trigonometry and completely eliminates distant specular shimmering.
          // 1. DISTANCE LOD: High-Frequency Micro-Wave Capillary Normal Blending (200m desktop, 90m mobile)
          vec3 normal = baseNormal;
          float maxCapDist = uIsMobile > 0.5 ? 90.0 : 200.0;
          if (camDist < maxCapDist) {
            float capStrength = 1.0 - smoothstep(maxCapDist * 0.35, maxCapDist, camDist);
            vec3 capNorm = computeCapillaryNormal(vWorldPosition.xz, uTime);
            normal = normalize(vec3(
              baseNormal.x + capNorm.x * (0.34 * capStrength),
              baseNormal.y,
              baseNormal.z + capNorm.z * (0.34 * capStrength)
            ));
          }

          // 2. AC Black Flag Multi-Tiered Coastal Water Depth (Island Proximity)
          float minDistToShore = 9999.0;
          float maxInfluenceDist = uIsMobile > 0.5 ? 260.0 : 420.0;
          if (camDist < maxInfluenceDist) {
            for (int i = 0; i < 9; i++) {
              vec2 relPos = vWorldPosition.xz - uIslandPos[i].xy;
              float sandR = uIslandPos[i].z;

              // Fast AABB bounding circle check: skip heavy calculation if far from this island
              float centerDistSq = dot(relPos, relPos);
              float maxInfluence = (sandR * 1.8 + 64.0);
              if (centerDistSq > maxInfluence * maxInfluence) {
                continue;
              }

              float seed = uIslandPos[i].w;
              float isElongated = uIslandParams[i].w;

              if (isElongated > 0.5) {
                float rotA = uIslandParams[i].z;
                float cosA = cos(rotA);
                float sinA = sin(rotA);
                vec2 localPos = vec2(relPos.x * cosA - relPos.y * sinA, relPos.x * sinA + relPos.y * cosA);

                float scaleX = uIslandParams[i].x;
                float scaleZ = uIslandParams[i].y;
                vec2 scaledPos = vec2(localPos.x / scaleX, localPos.y / scaleZ);
                float angle = atan(scaledPos.y, scaledPos.x);

                float coastNoise = (sin(angle * 5.0 + seed * 0.1) * 0.08 +
                                    sin(angle * 11.0 + seed * 0.3) * 0.04 +
                                    sin(angle * 17.0 + seed * 0.7) * 0.02) * sandR;

                float scaleFactor = length(vec2(cos(angle) * scaleX, sin(angle) * scaleZ));
                float worldBeachR = (sandR * 1.2 + coastNoise) * scaleFactor;
                float distToSand = length(localPos) - worldBeachR;
                minDistToShore = min(minDistToShore, distToSand);
              } else {
                float distToCenter = sqrt(centerDistSq);
                float angle = atan(relPos.y, relPos.x);
                float coastNoise = (sin(angle * 5.0 + seed * 0.1) * 0.08 +
                                    sin(angle * 11.0 + seed * 0.3) * 0.04 +
                                    sin(angle * 17.0 + seed * 0.7) * 0.02) * sandR;
                float distToSand = distToCenter - (sandR * 1.18 + coastNoise);
                minDistToShore = min(minDistToShore, distToSand);
              }
            }
          }

          // 3. AC Black Flag Seamless Optical Depth Model:
          // Deep Sea Sapphire -> Outer Shelf Cerulean -> Luminous Crystal Turquoise -> Sunlit Golden Sand Seabed
          float waveMod = clamp((vWaveHeight + 1.2) / 2.4, 0.0, 1.0);
          vec3 deepOceanColor = mix(uDeepWaterColor, uMidWaterColor, 0.14 + 0.86 * waveMod);
          vec3 waterColor = deepOceanColor;

          if (minDistToShore < 60.0) {
            // Normalized depth gradient: 0.0 at shore water edge, 1.0 at deep sea
            float shoreDepthT = smoothstep(0.0, 48.0, max(0.0, minDistToShore));

            // AC Black Flag Tropical Palette
            vec3 caribbeanTurquoise = vec3(0.02, 0.62, 0.76); // luminous turquoise reef
            vec3 crystalCyan        = vec3(0.05, 0.80, 0.86); // shallow crystal clear water
            vec3 goldenSandBed      = vec3(0.82, 0.68, 0.44); // warm golden sand seabed

            // Smooth continuous water column transition
            vec3 reefTransition = mix(crystalCyan, caribbeanTurquoise, smoothstep(2.5, 18.0, minDistToShore));
            reefTransition = mix(reefTransition, uMidWaterColor, smoothstep(18.0, 46.0, minDistToShore));

            // Optical seabed transmission: near the sand edge (< 6m), sand floor is visible through crystal water
            float sandVisibility = 1.0 - smoothstep(-1.0, 6.0, minDistToShore);
            vec3 shoreBlend = mix(reefTransition, goldenSandBed * 0.40 + crystalCyan * 0.60, sandVisibility * 0.85);

            waterColor = mix(shoreBlend, deepOceanColor, shoreDepthT);
          } else {
            waterColor = mix(waterColor, uCrestGlowColor, smoothstep(0.70, 1.0, waveMod) * 0.28);
          }

          // 4. DISTANCE LOD: Subsurface Scattering (Only computed within 220m, simplified on mobile)
          vec3 sss = vec3(0.0);
          if (camDist < (uIsMobile > 0.5 ? 80.0 : 220.0)) {
            vec3 sssLightDir = normalize(lightDir + normal * 0.35);
            float sssFactor = pow(max(dot(viewDir, -sssLightDir), 0.0), 3.2);
            float crestThickness = smoothstep(0.20, 1.1, vWaveHeight);
            float sssDistFade = 1.0 - smoothstep(uIsMobile > 0.5 ? 40.0 : 120.0, uIsMobile > 0.5 ? 80.0 : 220.0, camDist);
            sss = uSubsurfaceColor * (sssFactor * crestThickness * 0.85 * sssDistFade);
          }

          // 5. Accurate Physical Fresnel & Sky Reflection (Deep rich Caribbean water, no white wash)
          float NdotV = max(dot(viewDir, normal), 0.0);
          float fresnel = 0.02 + 0.98 * pow(1.0 - NdotV, 5.0);
          vec3 skyReflection = mix(vec3(0.04, 0.28, 0.55), vec3(0.20, 0.55, 0.85), fresnel);

          vec3 baseShaded = mix(waterColor + sss, skyReflection, fresnel * 0.28);

          // 6. DISTANCE LOD: Sun Glitter Specular Highlight (Rich, sparkling path without white washing horizon)
          vec3 halfVector = normalize(lightDir + viewDir);
          float NdotH = max(dot(normal, halfVector), 0.0);
          float specIntensity = 0.0;
          if (uIsMobile > 0.5) {
            // Mobile: focused sun path
            float specMobile = pow(NdotH, 48.0) * 0.90;
            specIntensity = specMobile;
          } else if (camDist < 240.0) {
            float specularCore    = pow(NdotH, 64.0) * 0.95;
            float specularSharp   = pow(NdotH, 180.0) * 1.80;
            float glitterNoise    = fract(sin(dot(vWorldPosition.xz * 2.2, vec2(12.9898, 78.233)) + uTime * 0.8) * 43758.5453);
            float glitter         = pow(NdotH, 220.0) * step(0.60, glitterNoise) * 2.4;
            specIntensity = specularCore + specularSharp + glitter;
          } else {
            float specularFar = pow(NdotH, 64.0) * 0.45;
            specIntensity = specularFar;
          }
          // Distance fade out: attenuates specular as it approaches horizon to eliminate whiteout
          specIntensity *= (1.0 - smoothstep(90.0, 360.0, camDist));
          baseShaded += uSunColor * specIntensity;

          // 7. DISTANCE LOD: Organic Lacy Cellular Sea Foam on Wave Crests (180m desktop, 80m mobile)
          float crestFoam = 0.0;
          float crestBreak = smoothstep(0.68, 1.25, vWaveHeight) * smoothstep(0.06, 0.28, vCrestPinch);
          float maxFoamDist = uIsMobile > 0.5 ? 80.0 : 180.0;
          if (crestBreak > 0.01 && camDist < maxFoamDist) {
            float foamCell = cellularFoam(vWorldPosition.xz * 0.85 + vec2(uTime * 0.05, -uTime * 0.03));
            float bubbleWeb = smoothstep(0.08, 0.45, foamCell) * (1.0 - smoothstep(0.50, 0.88, foamCell));
            float solidHead = 1.0 - smoothstep(0.0, 0.22, foamCell);
            float lacyFoam = clamp(bubbleWeb * 1.5 + solidHead * 0.9, 0.0, 1.0);
            float foamDistFade = 1.0 - smoothstep(maxFoamDist * 0.5, maxFoamDist, camDist);
            crestFoam = crestBreak * lacyFoam * foamDistFade;
          }

          // 8. DISTANCE LOD: Natural Shoreline Breaking Surf Foam (Skipped on mobile and beyond 280m)
          float totalShoreFoam = 0.0;
          if (uIsMobile < 0.5 && minDistToShore < 6.0 && camDist < 280.0) {
            float shoreDist = max(0.0, minDistToShore);
            float surfPulse = sin(uTime * 1.8 - shoreDist * 0.85) * 0.5 + 0.5;
            float edgeFoam = 1.0 - smoothstep(0.0, 3.6, shoreDist);
            float swashWave = smoothstep(0.5, 3.2, shoreDist) * (1.0 - smoothstep(3.2, 5.0, shoreDist)) * surfPulse;
            float shoreCell = cellularFoam(vWorldPosition.xz * 0.55 + vec2(uTime * 0.03, -uTime * 0.02));
            float shoreFroth = smoothstep(0.12, 0.55, shoreCell);
            totalShoreFoam = clamp((edgeFoam * 0.9 + swashWave * 0.6) * (0.4 + shoreFroth * 0.6), 0.0, 1.0);
          }

          // 9. Dynamic Broad-Spreading Ship Wake (Skipped on mobile)
          float shipWakeFoam = 0.0;
          if (uIsMobile < 0.5 && uShipSpeed > 0.35 && camDist < 180.0) {
            vec2 rel = vWorldPosition.xz - uShipPos.xz;
            float sinH = sin(uShipHeading);
            float cosH = cos(uShipHeading);
            // Local coordinates: X = starboard, Z = forward
            float lx = cosH * rel.x - sinH * rel.y;
            float lz = sinH * rel.x + cosH * rel.y;

            float behind = -lz;
            if (behind > -1.0 && behind < 88.0) {
              float latDist = abs(lx);

              // 1. Soft expanding Kelvin V-wake arms
              float wakeSpread = 1.2 + pow(max(0.0, behind), 0.62) * 1.35;
              float vArm = (1.0 - smoothstep(0.0, 1.6, abs(latDist - wakeSpread))) * 0.55;

              // 2. Smooth soft center churn field
              float centerSpread = 1.8 + behind * 0.12;
              float centerFroth = exp(-(latDist * latDist) / (centerSpread * centerSpread)) * 0.65;

              // 3. Subtle organic wave motion (clean, no harsh polka-dot artifacts)
              float ripple = sin(behind * 0.4 - uTime * 1.8) * 0.1 + 0.9;

              // 4. Smooth emergence from transom and backwards decay
              float leadIn = smoothstep(-0.5, 2.0, behind);
              float trailFade = exp(-max(0.0, behind) * 0.038) * (1.0 - smoothstep(45.0, 68.0, behind));

              shipWakeFoam = (vArm + centerFroth) * ripple * leadIn * trailFade * min(1.0, uShipSpeed / 2.0);
              shipWakeFoam = clamp(shipWakeFoam, 0.0, 0.65);
            }
          }

          // Combine all foam layers naturally
          float totalFoam = clamp(crestFoam * 0.75 + totalShoreFoam * 0.85 + shipWakeFoam * 0.9, 0.0, 1.0);
          vec3 finalColor = mix(baseShaded, uFoamColor, totalFoam);

          // 10. Horizon Fog Blend - Exponential squared Beer-Lambert decay
          float horizonFog = 1.0 - exp(-pow(camDist * uFogDensity, 2.0));
          finalColor = mix(finalColor, uSkyHorizonColor, horizonFog);

          gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
      transparent: false,
      wireframe: false,
    });
  }, [isNight, islandPositions, islandParams]);

  // Smoothed real-time ship state refs to prevent 30Hz server-tick wake stutter
  const smoothShipPos = useRef(new THREE.Vector3(0, 0, 0));
  const smoothShipHeading = useRef(0);
  const smoothShipSpeed = useRef(0);

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();
    if (shaderMaterial) {
      shaderMaterial.uniforms.uTime.value = t;

      // Extract self ship state in real-time with smooth frame-by-frame interpolation
      const { ships, selfId } = useGameStore.getState();
      const selfShip = ships.find((s) => s.id === selfId);
      if (selfShip && !selfShip.isSunk) {
        // High-precision smooth position and heading tracking without GC allocations
        smoothShipPos.current.x = THREE.MathUtils.lerp(smoothShipPos.current.x, selfShip.x, Math.min(1.0, 24 * delta));
        smoothShipPos.current.y = THREE.MathUtils.lerp(smoothShipPos.current.y, selfShip.y, Math.min(1.0, 24 * delta));
        smoothShipPos.current.z = THREE.MathUtils.lerp(smoothShipPos.current.z, selfShip.z, Math.min(1.0, 24 * delta));
        smoothShipHeading.current = THREE.MathUtils.lerp(smoothShipHeading.current, selfShip.rotationY, Math.min(1.0, 20 * delta));
        smoothShipSpeed.current = THREE.MathUtils.lerp(smoothShipSpeed.current, selfShip.speed ?? 0, Math.min(1.0, 14 * delta));

        shaderMaterial.uniforms.uShipPos.value.copy(smoothShipPos.current);
        shaderMaterial.uniforms.uShipHeading.value = smoothShipHeading.current;
        shaderMaterial.uniforms.uShipSpeed.value = smoothShipSpeed.current;
      } else {
        smoothShipSpeed.current = THREE.MathUtils.lerp(smoothShipSpeed.current, 0, Math.min(1.0, 10 * delta));
        shaderMaterial.uniforms.uShipSpeed.value = smoothShipSpeed.current;
      }
    }

    // Grid snapping: Snap mesh position to exact vertex grid spacing.
    // The step MUST equal size/segments so the Gerstner world-space coordinates
    // align perfectly with vertex positions after each snap, preventing flickering.
    if (meshRef.current) {
      const gridStep = size / segments;
      meshRef.current.position.x = Math.round(state.camera.position.x / gridStep) * gridStep;
      meshRef.current.position.z = Math.round(state.camera.position.z / gridStep) * gridStep;
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry} material={shaderMaterial} position={[0, -0.05, 0]} />
  );
});
