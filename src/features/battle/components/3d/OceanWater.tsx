import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { FOG_COLOR } from './Environment3D';
import { ARENA_ISLANDS } from './Islands3D';
import { useGameStore } from '@/stores/useGameStore';

interface OceanWaterProps {
  size?: number;
}

export const OceanWater: React.FC<OceanWaterProps> = React.memo(({ size = 1600 }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  // High-density 160x160 vertex grid (25,600 quads) centered dynamically on camera
  // Delivers buttery-smooth organic swells and eliminates polygon faceting
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(size, size, 160, 160);
    geo.rotateX(-Math.PI / 2);
    return geo;
  }, [size]);

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

  // Assassin's Creed IV: Black Flag & Sea of Thieves AAA Caribbean Ocean Shader
  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uDeepWaterColor: { value: new THREE.Color('#074574') }, // Rich Caribbean deep sapphire (never pitch black!)
        uMidWaterColor: { value: new THREE.Color('#0b71b0') },  // Luminous tropical sapphire
        uShallowColor: { value: new THREE.Color('#06b6d4') },   // Sunlit turquoise aqua
        uLagoonColor: { value: new THREE.Color('#10e7b8') },    // Crystal shallow shoreline lagoon
        uCrestGlowColor: { value: new THREE.Color('#38bdf8') }, // Radiant crest highlight
        uSubsurfaceColor: { value: new THREE.Color('#14b8a6') },// Bright tropical SSS transmission
        uFoamColor: { value: new THREE.Color('#ffffff') },      // Crisp clean white sea froth
        uSunColor: { value: new THREE.Color('#fffbeb') },       // Warm brilliant Caribbean sun
        uSkyHorizonColor: { value: new THREE.Color(FOG_COLOR) }, // Fog horizon match
        uLightDir: { value: new THREE.Vector3(70, 140, -50).normalize() },
        uIslandPos: { value: islandPositions },
        uIslandParams: { value: islandParams },
        uShipPos: { value: new THREE.Vector3(0, 0, 0) },
        uShipHeading: { value: 0 },
        uShipSpeed: { value: 0 },
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

          // 0. DISTANCE LOD: Horizon Early Exit (Distant Sea > 660m)
          // Near the horizon, water blends 100% into sky fog.
          // Direct return saves all arithmetic for distant pixels.
          if (camDist > 660.0) {
            gl_FragColor = vec4(uSkyHorizonColor, 1.0);
            return;
          }

          vec3 baseNormal = normalize(vNormal);
          vec3 lightDir = normalize(uLightDir);
          vec3 viewDir = normalize(cameraPosition - vWorldPosition);

          // 1. DISTANCE LOD: High-Frequency Micro-Wave Capillary Normal Blending (0m - 140m)
          // Capillary ripples are sub-pixel beyond 120m.
          // Fading them out saves trigonometry and completely eliminates distant specular shimmering.
          vec3 normal = baseNormal;
          if (camDist < 140.0) {
            float capStrength = 1.0 - smoothstep(60.0, 140.0, camDist);
            vec3 capNorm = computeCapillaryNormal(vWorldPosition.xz, uTime);
            normal = normalize(vec3(
              baseNormal.x + capNorm.x * (0.18 * capStrength),
              baseNormal.y,
              baseNormal.z + capNorm.z * (0.18 * capStrength)
            ));
          }

          // 2. DISTANCE LOD: Island Proximity & Shoreline (Culled beyond 380m)
          float minDistToShore = 9999.0;
          if (camDist < 380.0) {
            for (int i = 0; i < 9; i++) {
              vec2 relPos = vWorldPosition.xz - uIslandPos[i].xy;
              float sandR = uIslandPos[i].z;

              // Fast AABB bounding circle check: skip heavy trig if far from this island
              float centerDistSq = dot(relPos, relPos);
              float maxInfluence = (sandR * 1.6 + 32.0);
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
          float shoreProximity = (camDist < 380.0) ? (1.0 - smoothstep(0.0, 32.0, max(0.0, minDistToShore))) : 0.0;

          // 3. Multi-Depth Sunlit Tropical Gradient (Beer-Lambert optical absorption)
          float depthFactor = clamp((vWaveHeight + 1.3) / 2.6, 0.12, 1.0);
          vec3 waterColor = mix(uDeepWaterColor, uMidWaterColor, smoothstep(0.08, 0.52, depthFactor));
          waterColor = mix(waterColor, uShallowColor, smoothstep(0.40, 0.88, depthFactor));
          waterColor = mix(waterColor, uCrestGlowColor, smoothstep(0.72, 1.0, depthFactor) * 0.50);
          waterColor = max(waterColor, vec3(0.03, 0.18, 0.32));

          if (shoreProximity > 0.001) {
            waterColor = mix(waterColor, uLagoonColor, shoreProximity * 0.76);
          }

          // 4. DISTANCE LOD: Subsurface Scattering (Only computed within 220m)
          vec3 sss = vec3(0.0);
          if (camDist < 220.0) {
            vec3 sssLightDir = normalize(lightDir + normal * 0.35);
            float sssFactor = pow(max(dot(viewDir, -sssLightDir), 0.0), 3.2);
            float crestThickness = smoothstep(0.25, 1.2, vWaveHeight);
            float sssDistFade = 1.0 - smoothstep(120.0, 220.0, camDist);
            sss = uSubsurfaceColor * (sssFactor * crestThickness * 0.7 * sssDistFade);
          }

          // 5. Accurate Physical Fresnel & Sky Reflection (Schlick approximation)
          float NdotV = max(dot(viewDir, normal), 0.0);
          float fresnel = 0.02 + 0.98 * pow(1.0 - NdotV, 5.0);
          vec3 skyReflection = mix(vec3(0.18, 0.52, 0.85), vec3(0.65, 0.86, 1.0), fresnel);

          vec3 baseShaded = mix(waterColor + sss, skyReflection, fresnel * 0.55);

          // 6. DISTANCE LOD: Sun Glitter Specular Highlight (Multi-lobe near, single-lobe far)
          vec3 halfVector = normalize(lightDir + viewDir);
          float NdotH = max(dot(normal, halfVector), 0.0);
          if (camDist < 180.0) {
            float oceanBloomSheen = pow(NdotH, 14.0) * 0.40;  // Broad warm golden sun trail
            float specularCore    = pow(NdotH, 64.0) * 0.90;  // Core sun highlight
            float specularSharp   = pow(NdotH, 140.0) * 1.6;  // Brilliant crisp center
            baseShaded += uSunColor * (oceanBloomSheen + specularCore + specularSharp);
          } else {
            float specularFar = pow(NdotH, 32.0) * 0.90;
            baseShaded += uSunColor * specularFar;
          }

          // 7. DISTANCE LOD: Organic Lacy Cellular Sea Foam on Wave Crests (Skipped beyond 150m)
          float crestFoam = 0.0;
          float crestBreak = smoothstep(0.95, 1.45, vWaveHeight) * smoothstep(0.08, 0.32, vCrestPinch);
          if (crestBreak > 0.01 && camDist < 150.0) {
            float foamCell = cellularFoam(vWorldPosition.xz * 0.85 + vec2(uTime * 0.05, -uTime * 0.03));
            float bubbleWeb = smoothstep(0.08, 0.45, foamCell) * (1.0 - smoothstep(0.50, 0.88, foamCell));
            float solidHead = 1.0 - smoothstep(0.0, 0.22, foamCell);
            float lacyFoam = clamp(bubbleWeb * 1.5 + solidHead * 0.9, 0.0, 1.0);
            float foamDistFade = 1.0 - smoothstep(80.0, 150.0, camDist);
            crestFoam = crestBreak * lacyFoam * foamDistFade;
          }

          // 8. DISTANCE LOD: Natural Shoreline Breaking Surf Foam (Skipped beyond 280m)
          float totalShoreFoam = 0.0;
          if (minDistToShore < 6.0 && camDist < 280.0) {
            float shoreDist = max(0.0, minDistToShore);
            float surfPulse = sin(uTime * 1.8 - shoreDist * 0.85) * 0.5 + 0.5;
            float edgeFoam = 1.0 - smoothstep(0.0, 3.6, shoreDist);
            float swashWave = smoothstep(0.5, 3.2, shoreDist) * (1.0 - smoothstep(3.2, 5.0, shoreDist)) * surfPulse;
            float shoreCell = cellularFoam(vWorldPosition.xz * 0.55 + vec2(uTime * 0.03, -uTime * 0.02));
            float shoreFroth = smoothstep(0.12, 0.55, shoreCell);
            totalShoreFoam = clamp((edgeFoam * 0.9 + swashWave * 0.6) * (0.4 + shoreFroth * 0.6), 0.0, 1.0);
          }

          // 9. Dynamic Broad-Spreading Ship Wake with Bintik-Bintik Bubble Froth (Wide & Natural)
          float shipWakeFoam = 0.0;
          if (uShipSpeed > 0.35 && camDist < 180.0) {
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

          // 10. Horizon Fog Blend
          float horizonFog = smoothstep(120.0, 680.0, camDist);
          finalColor = mix(finalColor, uSkyHorizonColor, horizonFog);

          gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
      transparent: false,
      wireframe: false,
    });
  }, [islandPositions, islandParams]);

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

    // Grid snapping: Snap mesh position to 10m vertex grid steps.
    // This stops vertices from sliding across the world-space Gerstner coordinates
    // during camera movement or orbit, completely eliminating wave swimming & crawling!
    if (meshRef.current) {
      const gridStep = 10.0;
      meshRef.current.position.x = Math.floor(state.camera.position.x / gridStep) * gridStep;
      meshRef.current.position.z = Math.floor(state.camera.position.z / gridStep) * gridStep;
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry} material={shaderMaterial} position={[0, -0.05, 0]} />
  );
});
